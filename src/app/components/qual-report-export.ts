import type { InterviewResponse } from "./response-store";
import type { Code } from "./codebook-store";

type CodeFrequency = { code: Code; count: number };

export function generateQualReport(
  starred: InterviewResponse[],
  codeFrequency: CodeFrequency[],
  codebook: Code[]
): string {
  const lines: string[] = [];
  lines.push(`# Qualitative Research Report`);
  lines.push(``);
  lines.push(`> This is a curated selection of real participant quotes, manually selected by the researcher. It is not a random or representative sample — codes are human-applied, not statistically validated.`);
  lines.push(``);

  const byCode = new Map<string, InterviewResponse[]>();
  const uncoded: InterviewResponse[] = [];
  starred.forEach((r) => {
    if (!r.codes || r.codes.length === 0) {
      uncoded.push(r);
      return;
    }
    r.codes.forEach((codeId) => {
      const list = byCode.get(codeId) ?? [];
      list.push(r);
      byCode.set(codeId, list);
    });
  });

  lines.push(`## Starred quotes (${starred.length})`);
  lines.push(``);

  codebook.forEach((c) => {
    const quotes = byCode.get(c.id);
    if (!quotes || quotes.length === 0) return;
    lines.push(`### ${c.label} (${quotes.length})`);
    lines.push(``);
    quotes.forEach((r) => {
      lines.push(`> "${r.response}"`);
      lines.push(`> — ${r.sessionLabel}${r.question ? ` · Q: ${r.question}` : ""}`);
      lines.push(``);
    });
  });

  if (uncoded.length > 0) {
    lines.push(`### Uncoded`);
    lines.push(``);
    uncoded.forEach((r) => {
      lines.push(`> "${r.response}"`);
      lines.push(`> — ${r.sessionLabel}${r.question ? ` · Q: ${r.question}` : ""}`);
      lines.push(``);
    });
  }

  lines.push(`## Code frequency summary`);
  lines.push(``);
  lines.push(`| Code | n |`);
  lines.push(`|---|---|`);
  codeFrequency.forEach(({ code, count }) => {
    lines.push(`| ${code.label} | ${count} |`);
  });

  return lines.join("\n");
}
