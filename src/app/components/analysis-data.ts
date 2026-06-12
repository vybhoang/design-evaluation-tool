export type Severity = "critical" | "warning" | "info" | "pass";
export type Confidence = "high" | "medium" | "low";

export type ResearchFinding = {
  id: string;
  principle: string;
  source: string;
  severity: Severity;
  confidence: Confidence;
  observation: string;
  recommendation: string;
  // The deterministic rule being checked. When confidence is "high" these are
  // measurable; for "medium"/"low" they're heuristic guidelines, not guesses.
  rule?: { check: string; observed: string; threshold: string; passes: boolean };
  // normalized 0-1 coordinates of region on the design where this applies
  region: { x: number; y: number; w: number; h: number };
};

export type HeatPoint = { x: number; y: number; intensity: number };

export type CognitivePrinciple = {
  id: string;
  name: string;
  category: "Gestalt" | "Heuristic" | "Cognitive Load" | "Bias" | "Attention";
  status: Severity;
  description: string;
  impact: string;
};

// Reframed: not a "simulated user" with fake metrics, but an audience archetype
// with concrete questions and risks to validate with real humans.
export type AudienceLens = {
  id: string;
  archetype: string;
  emoji: string;
  context: string;
  questionsToAsk: string[];
  risksToValidate: { risk: string; testMethod: string }[];
};

export type AnalysisResult = {
  // Visual hierarchy and salience score — derived from rule-based heuristics
  clarityScore: number;
  // WCAG-style contrast/structure checks — relatively reliable
  accessibilityScore: number;
  // Counts of heuristic-eval items found
  findings: ResearchFinding[];
  principles: CognitivePrinciple[];
  lenses: AudienceLens[];
  heatmap: HeatPoint[];
};

export function generateAnalysis(designType: string, audience: string): AnalysisResult {
  const findings: ResearchFinding[] = [
    {
      id: "f1",
      principle: "Hick's Law",
      source: "Hick & Hyman (1952)",
      severity: "warning",
      confidence: "high",
      observation:
        "Primary navigation exposes 9 top-level items simultaneously, exceeding the 5±2 working memory threshold.",
      recommendation:
        "Group secondary items under a 'More' menu. Verify with a tree test before shipping.",
      rule: { check: "Top-level nav items", observed: "9", threshold: "≤ 7", passes: false },
      region: { x: 0.05, y: 0.02, w: 0.9, h: 0.08 },
    },
    {
      id: "f2",
      principle: "Fitts's Law",
      source: "Fitts (1954) · Apple HIG",
      severity: "critical",
      confidence: "high",
      observation:
        "Primary CTA target appears smaller than the 44×44px minimum recommended for touch.",
      recommendation:
        "Increase touch target to at least 44×44px. This is a measurable, deterministic fix.",
      rule: { check: "Primary CTA touch target", observed: "28×28px", threshold: "≥ 44×44px", passes: false },
      region: { x: 0.4, y: 0.78, w: 0.2, h: 0.08 },
    },
    {
      id: "f3",
      principle: "Von Restorff Effect",
      source: "Hedwig von Restorff (1933)",
      severity: "pass",
      confidence: "medium",
      observation:
        "Pricing card uses contrasting elevation and accent color, isolating it as the recommended choice.",
      recommendation:
        "Looks intentional. Confirm the isolated option is actually the one you want users to pick.",
      rule: { check: "Isolated focal element", observed: "1 isolated card", threshold: "≥ 1", passes: true },
      region: { x: 0.35, y: 0.4, w: 0.3, h: 0.25 },
    },
    {
      id: "f4",
      principle: "Jakob's Law",
      source: "Jakob Nielsen, NN/g",
      severity: "info",
      confidence: "medium",
      observation:
        "Navigation pattern deviates from category conventions — users may expect cart on the top right.",
      recommendation:
        "Consider matching the convention, but only your users can tell you if their mental model differs.",
      rule: { check: "Cart icon position", observed: "top-left", threshold: "top-right (convention)", passes: false },
      region: { x: 0.78, y: 0.02, w: 0.18, h: 0.06 },
    },
    {
      id: "f5",
      principle: "Aesthetic-Usability Effect",
      source: "Kurosu & Kashimura (1995)",
      severity: "info",
      confidence: "low",
      observation:
        "High visual polish may cause perceived usability to outperform measured task success.",
      recommendation:
        "Heuristic eval and AI cannot detect this — run task-based testing with real users to be sure.",
      region: { x: 0.1, y: 0.15, w: 0.8, h: 0.2 },
      // No rule — this is genuinely speculative and we don't pretend otherwise.
    },
    {
      id: "f6",
      principle: "Peak-End Rule",
      source: "Kahneman, Fredrickson (1993)",
      severity: "warning",
      confidence: "medium",
      observation:
        "Confirmation screen looks purely transactional — no positive 'end' moment.",
      recommendation:
        "Consider a small celebratory state. Validate impact with a longitudinal NPS comparison.",
      region: { x: 0.2, y: 0.88, w: 0.6, h: 0.1 },
    },
    {
      id: "f7",
      principle: "Color Contrast (WCAG AA)",
      source: "WCAG 2.2 · 1.4.3",
      severity: "warning",
      confidence: "high",
      observation:
        "Secondary text on the muted background measures ~3.8:1 — below the 4.5:1 AA threshold.",
      recommendation:
        "Darken the text color or lighten the background. This is deterministically checkable.",
      rule: { check: "Body/background contrast", observed: "3.8 : 1", threshold: "≥ 4.5 : 1", passes: false },
      region: { x: 0.05, y: 0.55, w: 0.9, h: 0.2 },
    },
  ];

  const principles: CognitivePrinciple[] = [
    {
      id: "p1",
      name: "Proximity",
      category: "Gestalt",
      status: "pass",
      description: "Related controls are visually grouped through consistent spacing.",
      impact: "Pattern matches the principle.",
    },
    {
      id: "p2",
      name: "Similarity",
      category: "Gestalt",
      status: "warning",
      description: "Primary and secondary buttons share too similar a treatment.",
      impact: "Visual hierarchy is ambiguous — worth fixing.",
    },
    {
      id: "p3",
      name: "Common Region",
      category: "Gestalt",
      status: "pass",
      description: "Card containers properly delineate sections.",
      impact: "Aids scannability.",
    },
    {
      id: "p4",
      name: "Visibility of System Status",
      category: "Heuristic",
      status: "warning",
      description: "Form submission state appears missing.",
      impact: "Check whether a loading state is shown on submit.",
    },
    {
      id: "p5",
      name: "Error Prevention",
      category: "Heuristic",
      status: "critical",
      description: "Destructive actions appear to lack a confirmation step.",
      impact: "Verify in the actual prototype.",
    },
    {
      id: "p6",
      name: "Recognition over Recall",
      category: "Heuristic",
      status: "pass",
      description: "Filter chips reveal active state without requiring memory.",
      impact: "Matches the principle.",
    },
    {
      id: "p7",
      name: "Miller's Law (7±2)",
      category: "Cognitive Load",
      status: "warning",
      description: "The settings panel exposes many toggles in a single scroll.",
      impact: "Consider chunking into grouped sections.",
    },
    {
      id: "p8",
      name: "Tesler's Law of Conservation",
      category: "Cognitive Load",
      status: "info",
      description: "Complexity may be pushed onto the user in the date range picker.",
      impact: "Consider smart defaults.",
    },
    {
      id: "p9",
      name: "Anchoring Bias",
      category: "Bias",
      status: "pass",
      description: "Pricing anchors high-tier plan first.",
      impact: "Pattern is present. Real effect size is design-specific.",
    },
    {
      id: "p10",
      name: "Banner Blindness",
      category: "Attention",
      status: "warning",
      description: "The promo strip uses ad-like styling at the top of the page.",
      impact: "Returning users may pattern-match this as an ad and skip it.",
    },
    {
      id: "p11",
      name: "Center-Stage Effect",
      category: "Attention",
      status: "pass",
      description: "Primary content is centered with strong focal weight.",
      impact: "Matches the principle.",
    },
  ];

  // Reframed: archetypes are prompts for thinking and recruiting, not predictions.
  const lenses: AudienceLens[] = [
    {
      id: "l1",
      archetype: "First-time visitor on mobile",
      emoji: "📱",
      context:
        "Discovered the product via an ad. Distracted, on cellular, 5 seconds to decide if it's worth a tap.",
      questionsToAsk: [
        "What do you think this product does, in one sentence?",
        "What would you tap first? Why?",
        "Where would you go if you wanted to know what it costs?",
      ],
      risksToValidate: [
        { risk: "Value proposition unclear above the fold", testMethod: "5-second test (n≥5)" },
        { risk: "Primary CTA missed entirely", testMethod: "First-click test" },
        { risk: "Page weight kills the experience on 4G", testMethod: "WebPageTest throttled run" },
      ],
    },
    {
      id: "l2",
      archetype: "Evaluator comparing 3 tools",
      emoji: "🔍",
      context:
        "Comparing vendors for a team. Wants pricing, integrations, security, and a feature matrix — fast.",
      questionsToAsk: [
        "Walk me through how you'd evaluate this against another tool you're considering.",
        "What's missing from this page that you'd need to make a decision?",
      ],
      risksToValidate: [
        { risk: "Integrations or security info hard to find", testMethod: "Findability test" },
        { risk: "No comparison-friendly summary", testMethod: "Concept test with 5 evaluators" },
      ],
    },
    {
      id: "l3",
      archetype: "Accessibility-dependent user",
      emoji: "♿",
      context:
        "May use screen reader, keyboard-only navigation, or 200% zoom. AI cannot meaningfully simulate this experience.",
      questionsToAsk: [
        "(For real testers) — Tab through the page. Where does focus get lost?",
        "Does the form announce its errors? Are landmarks present?",
      ],
      risksToValidate: [
        { risk: "Focus order broken or invisible focus ring", testMethod: "Keyboard-only walkthrough" },
        { risk: "Layout breaks at 200% zoom", testMethod: "Manual zoom test" },
        {
          risk: "Screen reader experience untested",
          testMethod: "Recruit 1-2 SR users (e.g. via Fable, AccessWorks)",
        },
      ],
    },
  ];

  const baseClarity = designType === "checkout" ? 62 : designType === "dashboard" ? 70 : 67;
  const audAdj = audience === "seniors" ? -6 : 0;

  const heatmap: HeatPoint[] = [
    { x: 0.5, y: 0.22, intensity: 1.0 },
    { x: 0.5, y: 0.5, intensity: 0.85 },
    { x: 0.2, y: 0.35, intensity: 0.55 },
    { x: 0.8, y: 0.32, intensity: 0.5 },
    { x: 0.5, y: 0.82, intensity: 0.35 },
    { x: 0.85, y: 0.05, intensity: 0.4 },
    { x: 0.15, y: 0.05, intensity: 0.45 },
    { x: 0.5, y: 0.65, intensity: 0.6 },
  ];

  return {
    clarityScore: Math.max(30, Math.min(95, baseClarity + audAdj)),
    accessibilityScore: audience === "seniors" ? 52 : 74,
    findings,
    principles,
    lenses,
    heatmap,
  };
}
