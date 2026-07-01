import type { HistoryEntry } from "./history-store";
import type { ValidationEvidence } from "./validation-store";
import { evidenceFor, validationStatus } from "./validation-store";
import { isDismissed } from "./disclosure-store";

const SEV_COLOR: Record<string, string> = {
  critical: "#dc2626",
  warning:  "#d97706",
  info:     "#2563eb",
  pass:     "#16a34a",
};
const SEV_BG: Record<string, string> = {
  critical: "#fef2f2",
  warning:  "#fffbeb",
  info:     "#eff6ff",
  pass:     "#f0fdf4",
};
const CONF_LABEL: Record<string, string> = {
  high:   "Deterministic",
  medium: "Heuristic",
  low:    "Speculative",
};
const VERDICT_COLOR: Record<string, string> = {
  confirmed:   "#16a34a",
  refuted:     "#dc2626",
  inconclusive:"#d97706",
};
const STATUS_LABEL: Record<string, string> = {
  unvalidated: "Unvalidated",
  confirmed:   "Confirmed by users",
  refuted:     "Refuted by users",
  mixed:       "Mixed evidence",
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function generateSnapshot(entry: HistoryEntry, validations: ValidationEvidence[]): string {
  const date = new Date(entry.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const findings = entry.result.findings;
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const warningCount  = findings.filter((f) => f.severity === "warning").length;
  const validatedCount = findings.filter((f) => validationStatus(validations, f.id) !== "unvalidated").length;

  const findingsHtml = findings.map((f, i) => {
    const ev = evidenceFor(validations, f.id);
    const status = validationStatus(validations, f.id);
    const color = SEV_COLOR[f.severity] ?? "#888";
    const bg    = SEV_BG[f.severity]  ?? "#fafafa";

    const ruleHtml = f.rule
      ? `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;background:#f8f8f8;border:1px solid #e5e7eb;border-radius:6px;padding:8px;margin-top:6px;font-size:12px;font-family:monospace">
          <div><div style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.05em">Check</div><div>${esc(f.rule.check)}</div></div>
          <div><div style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.05em">Observed</div><div style="color:${f.rule.passes ? "#16a34a" : "#dc2626"}">${esc(f.rule.observed)}</div></div>
          <div><div style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.05em">Threshold</div><div style="color:#6b7280">${esc(f.rule.threshold)}</div></div>
        </div>`
      : "";

    const evHtml = ev.length
      ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid ${color}22">
          <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Real-user evidence (${ev.length})</div>
          ${ev.map((e) => `
            <div style="margin-bottom:6px;padding:6px 8px;border-radius:4px;background:#f9fafb;border:1px solid #e5e7eb">
              <div style="font-size:11px;font-weight:600;color:${VERDICT_COLOR[e.verdict] ?? "#888"}">${esc(e.verdict.toUpperCase())}</div>
              <div style="font-size:12px;margin-top:2px">${esc(e.note)}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:2px">${esc(e.method)}${e.sampleSize ? ` · n=${e.sampleSize}` : ""}</div>
            </div>
          `).join("")}
        </div>`
      : `<div style="font-size:11px;color:#9ca3af;margin-top:8px;font-style:italic">No real-user evidence yet — this is still a hypothesis.</div>`;

    return `
      <div style="border:1px solid ${color}33;border-radius:8px;background:${bg};margin-bottom:12px;padding:14px">
        <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">
          <div style="min-width:20px;height:20px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${i + 1}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:14px">${esc(f.principle)}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
              <span style="font-size:11px;font-weight:600;color:${color};background:${color}18;padding:2px 7px;border-radius:99px;border:1px solid ${color}33">${f.severity.toUpperCase()}</span>
              <span style="font-size:11px;color:#6b7280;background:#f3f4f6;padding:2px 7px;border-radius:99px;border:1px solid #e5e7eb">${esc(CONF_LABEL[f.confidence] ?? f.confidence)}</span>
              <span style="font-size:11px;color:#6b7280;background:#f3f4f6;padding:2px 7px;border-radius:99px;border:1px solid #e5e7eb">${esc(STATUS_LABEL[status] ?? status)}</span>
            </div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px">${esc(f.source)}</div>
            <div style="font-size:13px;margin-top:8px">${esc(f.observation)}</div>
            ${ruleHtml}
            <div style="font-size:13px;margin-top:8px;color:#374151">→ <span style="color:#6b7280">Recommend:</span> ${esc(f.recommendation)}</div>
            ${evHtml}
          </div>
        </div>
      </div>`;
  }).join("\n");

  const kudosHtml = entry.result.kudos.length
    ? `<div class="section-title" style="margin-top:24px">Kudos — what's working well</div>
      <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:8px;padding:14px">
        ${entry.result.kudos.map((k) => `
          <div style="margin-bottom:10px">
            <div style="font-weight:600;font-size:13px;color:#92400e">${esc(k.title)}</div>
            <div style="font-size:12px;color:#78716c;margin-top:2px">${esc(k.observation)}</div>
          </div>`).join("\n")}
      </div>`
    : "";

  const principlesHtml = entry.result.principles.map((p) => {
    const color = SEV_COLOR[p.status] ?? "#888";
    return `
      <div style="padding:10px 0;border-bottom:1px solid #f3f4f6">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-weight:600;font-size:13px">${esc(p.name)}</span>
          <span style="font-size:11px;color:${color};background:${color}18;padding:1px 7px;border-radius:99px;border:1px solid ${color}33">${p.status.toUpperCase()}</span>
          <span style="font-size:11px;color:#6b7280;background:#f3f4f6;padding:1px 7px;border-radius:99px">${esc(p.category)}</span>
        </div>
        <div style="font-size:12px;color:#6b7280;margin-top:3px">${esc(p.description)}</div>
      </div>`;
  }).join("\n");

  const imageHtml = entry.thumbnail
    ? `<img src="${entry.thumbnail}" alt="Design screenshot" style="width:100%;max-width:480px;border-radius:6px;border:1px solid #e5e7eb;display:block;margin:0 auto 20px" />`
    : "";

  const bannerHtml = isDismissed("heuristic-first-pass") ? "" : `
    <div class="banner">
      ⚠ <strong>Heuristic pre-screen only — not a substitute for testing with real users.</strong>
      Findings are pattern-matched against published UX research. They represent hypotheses to investigate,
      not confirmed problems. Validate each finding with real users before treating it as truth.
      Confidence tiers: <strong>Deterministic</strong> (measurable rules, reliable) ·
      <strong>Heuristic</strong> (patterns, useful but not proof) ·
      <strong>Speculative</strong> (AI hypothesis, treat as exploratory).
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(entry.label)}: Heurizztik snapshot</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f9fafb; margin: 0; padding: 20px; color: #111827; line-height: 1.5; }
    .wrap { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
    .header { padding: 24px 28px; border-bottom: 1px solid #f3f4f6; }
    .body { padding: 24px 28px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; margin: 0 0 12px; }
    .banner { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; margin-bottom: 20px; font-size: 13px; color: #92400e; }
    .stat-row { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; }
    .stat { text-align: center; }
    .stat-num { font-size: 22px; font-weight: 700; line-height: 1.1; }
    .stat-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: #6b7280; margin-bottom: 20px; }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    footer { padding: 16px 28px; border-top: 1px solid #f3f4f6; font-size: 11px; color: #9ca3af; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Heurizztik · Heuristic pre-screen snapshot</div>
    <div style="font-size:22px;font-weight:700;font-family:Georgia,serif">${esc(entry.label)}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:4px">${esc(entry.context.designType)} · ${esc(entry.context.audience)} · ${date}</div>
    ${entry.context.goal ? `<div style="font-size:12px;color:#374151;margin-top:6px;font-style:italic">"${esc(entry.context.goal)}"</div>` : ""}
  </div>
  <div class="body">
    ${bannerHtml}

    ${imageHtml}

    <div class="stat-row">
      <div class="stat"><div class="stat-num">${findings.length}</div><div class="stat-label">Findings</div></div>
      <div class="stat"><div class="stat-num" style="color:#dc2626">${criticalCount}</div><div class="stat-label">Critical</div></div>
      <div class="stat"><div class="stat-num" style="color:#d97706">${warningCount}</div><div class="stat-label">Warnings</div></div>
      <div class="stat"><div class="stat-num" style="color:#16a34a">${validatedCount}</div><div class="stat-label">Validated</div></div>
      <div class="stat"><div class="stat-num">${entry.result.clarityScore}</div><div class="stat-label">Clarity score</div></div>
      <div class="stat"><div class="stat-num">${entry.result.accessibilityScore}</div><div class="stat-label">Accessibility score</div></div>
    </div>

    ${kudosHtml}

    <div class="section-title" style="margin-top:24px">Heuristic findings (${findings.length})</div>
    ${findingsHtml}

    <div class="section-title" style="margin-top:24px">Cognitive principles (${entry.result.principles.length})</div>
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:4px 12px">
      ${principlesHtml}
    </div>
  </div>
  <footer>
    Generated by Heurizztik on ${date} · Heuristic pre-screen only · Runs stay on your device, no cloud, no account.
    <br />This document is read-only. Return to the app to log real-user evidence and update validation status.
  </footer>
</div>
</body>
</html>`;
}

export function downloadSnapshot(entry: HistoryEntry, validations: ValidationEvidence[]) {
  const html = generateSnapshot(entry, validations);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cognition-snapshot-${entry.label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
