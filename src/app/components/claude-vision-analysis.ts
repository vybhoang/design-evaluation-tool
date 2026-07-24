import type { AnalysisContext } from "./design-canvas";
import type { AnalysisResult, ResearchFinding, CognitivePrinciple, Kudos, Severity, Confidence } from "./analysis-data";
import { generateAnalysis } from "./analysis-data";

// The Anthropic key itself never reaches the client — it's injected server-side
// by api/anthropic/[...path].ts (Vercel) or the vite.config.ts dev proxy. This
// flag is just a non-secret switch for whether to attempt the live call at all.
export function isLiveAnalysisEnabled(): boolean {
  const val = import.meta.env.VITE_ENABLE_LIVE_ANALYSIS;
  console.log("[cognition] VITE_ENABLE_LIVE_ANALYSIS =", JSON.stringify(val), "| live:", val === "true");
  return val === "true";
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const VALID_MEDIA_TYPES = new Set<string>(["image/jpeg", "image/png", "image/gif", "image/webp"]);

// Claude's vision API only accepts these four types — anything else (e.g. image/svg+xml)
// falls back to image/png rather than silently forwarding an unsupported mime type.
function toMediaType(mime: string): ImageMediaType {
  return VALID_MEDIA_TYPES.has(mime) ? (mime as ImageMediaType) : "image/png";
}

async function imageToBase64(url: string): Promise<{
  data: string;
  media_type: ImageMediaType;
}> {
  if (url.startsWith("data:")) {
    const [header, data] = url.split(",");
    const media_type = toMediaType(header.split(":")[1].split(";")[0]);
    return { data, media_type };
  }
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const [header, data] = result.split(",");
      const media_type = toMediaType(header.split(":")[1].split(";")[0]);
      resolve({ data, media_type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

type ClaudeImage = { data: string; media_type: ImageMediaType };

// Shared by both callers below — sends one image + text prompt to the
// Claude Vision endpoint and hands back the raw text plus stop_reason
// (needed to tell a genuine parse failure apart from a truncated response).
// Neither caller talks to `fetch` directly anymore, so the request shape
// (model, endpoint, content layout) only needs to be right in one place.
async function callClaudeVision(opts: {
  image: ClaudeImage;
  promptText: string;
  maxTokens: number;
  signal?: AbortSignal;
}): Promise<{ rawText: string; stopReason: unknown }> {
  const response = await fetch("/api/anthropic/v1/messages", {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    signal: opts.signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: opts.maxTokens,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: opts.image.media_type, data: opts.image.data } },
            { type: "text", text: opts.promptText },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Claude API ${response.status}: ${errText}`);
  }

  const payload = await response.json();
  return { rawText: payload.content?.[0]?.text ?? "", stopReason: payload.stop_reason };
}

function buildGoalSuggestionPrompt(context: AnalysisContext): string {
  return `Look at this ${context.designType} screenshot, intended for ${context.audience}. Based on what you actually see (product, copy, layout, calls to action), suggest 5 concise primary goals a team might set for this specific design (5-10 words each, action-oriented, e.g. "Reduce signup form abandonment").

Return ONLY a JSON array of 5 strings — no markdown, no explanation, no preamble.`;
}

export async function suggestGoalsFromImage(context: AnalysisContext): Promise<string[]> {
  if (!isLiveAnalysisEnabled() || !context.imageUrl) return [];

  const image = await imageToBase64(context.imageUrl);
  const { rawText } = await callClaudeVision({
    image,
    promptText: buildGoalSuggestionPrompt(context),
    maxTokens: 512,
  });

  const match = rawText.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON array found in Claude response");

  const arr = JSON.parse(match[0]);
  if (!Array.isArray(arr)) return [];
  return arr.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 6);
}

function buildPrompt(ctx: AnalysisContext): string {
  return `You are a senior UX researcher conducting a heuristic evaluation of the UI screenshot provided.

Design context:
- Type: ${ctx.designType}
- Target audience: ${ctx.audience}
- Goal: "${ctx.goal || "not specified"}"

Return ONLY a valid JSON object — no markdown fences, no preamble, no explanation outside the JSON.

{
  "findings": [
    {
      "principle": "Short UX principle name (e.g. Hick's Law, Fitts's Law, WCAG AA Contrast)",
      "source": "Author, Year or Standard (e.g. Nielsen 1994, WCAG 2.2 § 1.4.3, Fitts 1954)",
      "severity": "critical | warning | info | pass",
      "confidence": "medium | low",
      "observation": "Describe exactly what you see in THIS screenshot that triggers this finding — be specific about layout, text, colour, element positions",
      "recommendation": "Concrete fix. End with what to validate with real users.",
      "region": { "x": 0.0, "y": 0.0, "w": 1.0, "h": 0.15 },
      "rule": null
    }
  ],
  "principles": [
    {
      "id": "p1",
      "name": "Principle name",
      "category": "Gestalt | Heuristic | Cognitive Load | Bias | Attention",
      "status": "critical | warning | info | pass",
      "description": "Specific observation about this principle in the visible design",
      "impact": "Practical usability consequence for the target audience"
    }
  ],
  "clarityScore": 72,
  "accessibilityScore": 65,
  "kudos": [
    {
      "title": "Short praise headline (e.g. 'Confident, on-brand typography')",
      "observation": "What specifically you see that earns this — be concrete about the element, not generic flattery.",
      "region": { "x": 0.0, "y": 0.0, "w": 1.0, "h": 0.15 }
    }
  ]
}

RULES — follow these exactly:
1. Only flag issues you can actually SEE in this screenshot. Do not invent hypothetical issues.
2. Confidence must be "medium" (established heuristic pattern) or "low" (interpretive — you cannot be certain). Never use "high" — that requires programmatic measurement you cannot do.
3. Every finding must cite a real published source (Nielsen 10 heuristics, WCAG, Kahneman, Fitts, Gestalt laws, etc.).
4. Regions are 0.0–1.0 normalized coordinates from the top-left corner, and are OPTIONAL. Include one only when the finding points at a specific, identifiable element (a button, a text block, a form field) — estimate its position carefully in that case. For broad or holistic findings that describe the design as a whole rather than one spot (e.g. Jakob's Law, Aesthetic-Usability Effect, general information architecture) — omit "region" entirely rather than guessing a location. A missing region is correct and expected for those; do not invent coordinates just to fill the field.
5. Return 6–10 findings and 6–10 principles covering different areas of the design.
6. Scores are 0–100. Calibrate them: 50–65 = noticeable issues, 66–80 = professional quality with some gaps, 81–95 = strong design. Do not default to 50 or 100.
7. severity "pass" is valid — use it for things the design does well, not only for problems.
8. "kudos" is genuine praise, separate from findings — no citation required. Only include an item for something specifically well-executed or creative (typography, color, layout, copy voice, micro-interaction intent, composition). Region is optional — omit it if the praise isn't tied to one spot. If this design has critical or warning findings that outweigh its strengths, or nothing genuinely stands out, return an empty array. Do not pad this list to hit a quota — 0 is a valid and common answer.
9. Be skeptical of your own contrast findings, especially on dark backgrounds. Semi-transparent white text (e.g. white at 60-80% opacity) composites to a lighter grey against a dark background — it can look visually "muted" or "dim" in a screenshot while still being far above the WCAG AA 4.5:1 threshold, because contrast is a luminance ratio against the immediate background, not how saturated or "washed out" the text looks to the eye. You cannot compute the actual ratio from a screenshot, so do not flag text as low-contrast just because it reads as grey-on-dark or looks softer than pure white — only flag it when the text is genuinely difficult to make out (letterforms hard to distinguish from the background, not merely a lighter shade).`;
}

type RawRegion = { x?: unknown; y?: unknown; w?: unknown; h?: unknown };
type RawFinding = {
  principle?: unknown;
  source?: unknown;
  severity?: unknown;
  confidence?: unknown;
  observation?: unknown;
  recommendation?: unknown;
  region?: RawRegion;
  rule?: unknown;
};
type RawPrinciple = {
  id?: unknown;
  name?: unknown;
  category?: unknown;
  status?: unknown;
  description?: unknown;
  impact?: unknown;
};
type RawKudos = { title?: unknown; observation?: unknown; region?: RawRegion };

function clamp(v: unknown, min = 0, max = 1): number {
  const n = typeof v === "number" ? v : 0;
  return Math.max(min, Math.min(max, n));
}
function clamp100(v: unknown): number {
  return Math.max(0, Math.min(100, Math.round(typeof v === "number" ? v : 70)));
}

// Only produce a region when Claude actually gave real numeric coordinates.
// Findings routinely omit it on purpose now (broad/holistic principles aren't
// tied to one spot) — treating a missing/malformed region as "0,0" here would
// silently reintroduce a pin scattered in the top-left corner instead of no
// pin at all.
function toRegion(r?: RawRegion): { x: number; y: number; w: number; h: number } | undefined {
  if (!r || typeof r.x !== "number" || typeof r.y !== "number") return undefined;
  return {
    x: clamp(r.x),
    y: clamp(r.y),
    w: clamp(r.w, 0.05),
    h: clamp(r.h, 0.03),
  };
}

// Same problem as region, different shape: the prompt's schema shows "rule":
// null as the example, and rule 2 tells Claude vision findings are never
// deterministic — so a well-behaved response omits rule entirely. When Claude
// sends a rule object anyway, it was previously passed straight through
// un-validated, so an empty/partial object (e.g. blank "" strings instead of
// real values) rendered as a Check/Observed/Threshold box with headers but no
// content. Only accept it when every field is actually a non-empty string
// (and passes is a real boolean) — otherwise drop it, same as a missing rule.
function toRule(r: unknown): ResearchFinding["rule"] {
  if (!r || typeof r !== "object") return undefined;
  const raw = r as { check?: unknown; observed?: unknown; threshold?: unknown; passes?: unknown };
  const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
  if (!isNonEmptyString(raw.check) || !isNonEmptyString(raw.observed) || !isNonEmptyString(raw.threshold)) {
    return undefined;
  }
  return {
    check: raw.check,
    observed: raw.observed,
    threshold: raw.threshold,
    passes: typeof raw.passes === "boolean" ? raw.passes : false,
  };
}

const VALID_SEVERITY = new Set(["critical", "warning", "info", "pass"]);
const VALID_CONFIDENCE = new Set(["medium", "low"]);
const VALID_CATEGORY = new Set(["Gestalt", "Heuristic", "Cognitive Load", "Bias", "Attention"]);

type ParsedAnalysis = {
  findings?: RawFinding[];
  principles?: RawPrinciple[];
  kudos?: RawKudos[];
  clarityScore?: unknown;
  accessibilityScore?: unknown;
};

// Claude sometimes wraps JSON in markdown fences or adds preamble — extract
// the object rather than assuming rawText is pure JSON. stopReason lets us
// tell a genuine malformed response apart from one that was simply cut off
// mid-generation (by far the most common cause of a broken JSON tail here),
// so the thrown message points straight at the fix.
function parseClaudeAnalysisJson(rawText: string, stopReason: unknown): ParsedAnalysis {
  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in Claude response");

  try {
    return JSON.parse(match[0]);
  } catch (e) {
    const truncated = stopReason === "max_tokens";
    const parseMsg = e instanceof Error ? e.message : String(e);
    throw new Error(
      truncated
        ? `Claude's response was cut off before finishing (hit the max_tokens limit) — the JSON is incomplete: ${parseMsg}`
        : `Could not parse Claude's response as JSON: ${parseMsg}`
    );
  }
}

function mapFindings(raw: RawFinding[] | undefined): ResearchFinding[] {
  return (raw ?? []).map((f, i) => ({
    id: `cv-${Date.now()}-${i}`,
    principle: String(f.principle ?? `Finding ${i + 1}`),
    source: String(f.source ?? "Heuristic evaluation"),
    severity: (typeof f.severity === "string" && VALID_SEVERITY.has(f.severity) ? f.severity : "info") as Severity,
    // Downgrade "high" to "medium" — Vision cannot do deterministic checks
    confidence: (f.confidence === "high"
      ? "medium"
      : typeof f.confidence === "string" && VALID_CONFIDENCE.has(f.confidence)
        ? f.confidence
        : "low") as Confidence,
    observation: String(f.observation ?? ""),
    recommendation: String(f.recommendation ?? ""),
    region: toRegion(f.region),
    rule: toRule(f.rule),
  }));
}

function mapPrinciples(raw: RawPrinciple[] | undefined): CognitivePrinciple[] {
  return (raw ?? []).map((p, i) => ({
    id: String(p.id ?? `p${i + 1}`),
    name: String(p.name ?? `Principle ${i + 1}`),
    category: (typeof p.category === "string" && VALID_CATEGORY.has(p.category)
      ? p.category
      : "Heuristic") as CognitivePrinciple["category"],
    status: (typeof p.status === "string" && VALID_SEVERITY.has(p.status) ? p.status : "info") as Severity,
    description: String(p.description ?? ""),
    impact: String(p.impact ?? ""),
  }));
}

// An empty kudos array is a meaningful result (the design didn't earn any
// praise), so unlike findings/principles it never falls back to the mock generator.
function mapKudos(raw: RawKudos[] | undefined): Kudos[] {
  return (raw ?? [])
    .map((k, i) => ({
      id: `kv-${Date.now()}-${i}`,
      title: String(k.title ?? `Highlight ${i + 1}`),
      observation: String(k.observation ?? ""),
      region: toRegion(k.region),
    }))
    .filter((k: Kudos) => k.observation.trim().length > 0);
}

export async function analyzeWithClaude(
  context: AnalysisContext,
  onStage?: (s: string) => void,
  signal?: AbortSignal
): Promise<AnalysisResult> {
  if (!isLiveAnalysisEnabled()) {
    // Defensive fallback — callers are expected to check isLiveAnalysisEnabled()
    // themselves first (home.tsx does, and tags its own mock reason there), so
    // this only fires if analyzeWithClaude is ever called directly without that
    // check. Still tag it so a silent, unlabeled mock result can never happen.
    return {
      ...generateAnalysis(context.designType, context.audience),
      mock: { reason: "Live analysis is disabled (VITE_ENABLE_LIVE_ANALYSIS is not \"true\") — showing sample heuristic data, not a real analysis of this screenshot." },
    };
  }

  onStage?.("Preparing design for analysis…");
  const image = await imageToBase64(context.imageUrl!);
  if (signal?.aborted) throw new DOMException("Analysis cancelled", "AbortError");

  onStage?.("Analyzing design against UX research…");
  const { rawText, stopReason } = await callClaudeVision({
    image,
    promptText: buildPrompt(context),
    // 6-10 findings + 6-10 principles + kudos, each with a full observation
    // and recommendation, routinely runs past 4096 tokens and gets cut off
    // mid-array — the JSON parse below then fails on the truncated tail.
    // Raised to leave real headroom for the full schema.
    maxTokens: 8192,
    signal,
  });

  onStage?.("Parsing heuristic findings…");
  const parsed = parseClaudeAnalysisJson(rawText, stopReason);

  const findings = mapFindings(parsed.findings);
  const principles = mapPrinciples(parsed.principles);
  const kudos = mapKudos(parsed.kudos);

  // Lenses and heatmap stay as context-based mock — they're audience archetypes, not image-derived
  const mock = generateAnalysis(context.designType, context.audience);

  return {
    clarityScore: clamp100(parsed.clarityScore),
    accessibilityScore: clamp100(parsed.accessibilityScore),
    findings: findings.length > 0 ? findings : mock.findings,
    principles: principles.length > 0 ? principles : mock.principles,
    lenses: mock.lenses,
    heatmap: mock.heatmap,
    kudos,
  };
}
