import type { AnalysisContext } from "./design-canvas";
import type { AnalysisResult, ResearchFinding, CognitivePrinciple } from "./analysis-data";
import { generateAnalysis } from "./analysis-data";

// The Anthropic key itself never reaches the client — it's injected server-side
// by api/anthropic/[...path].ts (Vercel) or the vite.config.ts dev proxy. This
// flag is just a non-secret switch for whether to attempt the live call at all.
export function isLiveAnalysisEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_LIVE_ANALYSIS === "true";
}

async function imageToBase64(url: string): Promise<{
  data: string;
  media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}> {
  if (url.startsWith("data:")) {
    const [header, data] = url.split(",");
    const media_type = header.split(":")[1].split(";")[0] as any;
    return { data, media_type };
  }
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const [header, data] = result.split(",");
      const media_type = header.split(":")[1].split(";")[0] as any;
      resolve({ data, media_type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function suggestGoalsFromImage(context: AnalysisContext): Promise<string[]> {
  if (!isLiveAnalysisEnabled() || !context.imageUrl) return [];

  const image = await imageToBase64(context.imageUrl);
  const response = await fetch("/api/anthropic/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: image.media_type, data: image.data } },
            {
              type: "text",
              text: `Look at this ${context.designType} screenshot, intended for ${context.audience}. Based on what you actually see (product, copy, layout, calls to action), suggest 5 concise primary goals a team might set for this specific design (5-10 words each, action-oriented, e.g. "Reduce signup form abandonment").

Return ONLY a JSON array of 5 strings — no markdown, no explanation, no preamble.`,
            },
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
  const rawText: string = payload.content?.[0]?.text ?? "";
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
  "accessibilityScore": 65
}

RULES — follow these exactly:
1. Only flag issues you can actually SEE in this screenshot. Do not invent hypothetical issues.
2. Confidence must be "medium" (established heuristic pattern) or "low" (interpretive — you cannot be certain). Never use "high" — that requires programmatic measurement you cannot do.
3. Every finding must cite a real published source (Nielsen 10 heuristics, WCAG, Kahneman, Fitts, Gestalt laws, etc.).
4. Regions are 0.0–1.0 normalized coordinates from the top-left corner. Estimate carefully based on where the element appears in the image.
5. Return 6–10 findings and 6–10 principles covering different areas of the design.
6. Scores are 0–100. Calibrate them: 50–65 = noticeable issues, 66–80 = professional quality with some gaps, 81–95 = strong design. Do not default to 50 or 100.
7. severity "pass" is valid — use it for things the design does well, not only for problems.`;
}

function clamp(v: unknown, min = 0, max = 1): number {
  const n = typeof v === "number" ? v : 0;
  return Math.max(min, Math.min(max, n));
}
function clamp100(v: unknown): number {
  return Math.max(0, Math.min(100, Math.round(typeof v === "number" ? v : 70)));
}

export async function analyzeWithClaude(
  context: AnalysisContext,
  onStage?: (s: string) => void,
  signal?: AbortSignal
): Promise<AnalysisResult> {
  if (!isLiveAnalysisEnabled()) {
    return generateAnalysis(context.designType, context.audience);
  }

  try {
    onStage?.("Preparing design for analysis…");
    const image = await imageToBase64(context.imageUrl!);

    if (signal?.aborted) throw new DOMException("Analysis cancelled", "AbortError");

    onStage?.("Analyzing design against UX research…");
    const response = await fetch("/api/anthropic/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      signal,
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: image.media_type, data: image.data },
              },
              { type: "text", text: buildPrompt(context) },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Claude API ${response.status}: ${errText}`);
    }

    onStage?.("Parsing heuristic findings…");
    const payload = await response.json();
    const rawText: string = payload.content?.[0]?.text ?? "";

    // Claude sometimes wraps JSON in markdown fences or adds preamble — extract the object
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in Claude response");

    const parsed = JSON.parse(match[0]);

    const VALID_SEVERITY = new Set(["critical", "warning", "info", "pass"]);
    const VALID_CONFIDENCE = new Set(["medium", "low"]);
    const VALID_CATEGORY = new Set(["Gestalt", "Heuristic", "Cognitive Load", "Bias", "Attention"]);

    const findings: ResearchFinding[] = (parsed.findings ?? []).map((f: any, i: number) => ({
      id: `cv-${Date.now()}-${i}`,
      principle: String(f.principle ?? `Finding ${i + 1}`),
      source: String(f.source ?? "Heuristic evaluation"),
      severity: VALID_SEVERITY.has(f.severity) ? f.severity : "info",
      // Downgrade "high" to "medium" — Vision cannot do deterministic checks
      confidence: f.confidence === "high" ? "medium" : (VALID_CONFIDENCE.has(f.confidence) ? f.confidence : "low"),
      observation: String(f.observation ?? ""),
      recommendation: String(f.recommendation ?? ""),
      region: {
        x: clamp(f.region?.x),
        y: clamp(f.region?.y),
        w: clamp(f.region?.w, 0.05),
        h: clamp(f.region?.h, 0.03),
      },
      rule: f.rule ?? undefined,
    }));

    const principles: CognitivePrinciple[] = (parsed.principles ?? []).map((p: any, i: number) => ({
      id: String(p.id ?? `p${i + 1}`),
      name: String(p.name ?? `Principle ${i + 1}`),
      category: VALID_CATEGORY.has(p.category) ? p.category : "Heuristic",
      status: VALID_SEVERITY.has(p.status) ? p.status : "info",
      description: String(p.description ?? ""),
      impact: String(p.impact ?? ""),
    }));

    // Lenses and heatmap stay as context-based mock — they're audience archetypes, not image-derived
    const mock = generateAnalysis(context.designType, context.audience);

    return {
      clarityScore: clamp100(parsed.clarityScore),
      accessibilityScore: clamp100(parsed.accessibilityScore),
      findings: findings.length > 0 ? findings : mock.findings,
      principles: principles.length > 0 ? principles : mock.principles,
      lenses: mock.lenses,
      heatmap: mock.heatmap,
    };
  } catch (err) {
    throw err;
  }
}
