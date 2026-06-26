import type { InterviewResponse } from "./response-store";
import type { Code } from "./codebook-store";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateResponsesCsv(responses: InterviewResponse[], codebook: Code[]): string {
  const baseHeaders = [
    "id", "createdAt", "sessionLabel", "analysisLabel", "question", "response", "verdict", "findingPrinciple",
  ];
  const codeHeaders = codebook.map((c) => csvEscape(c.label));
  const headers = [...baseHeaders, ...codeHeaders];

  const rows = responses.map((r) => {
    const base = [
      r.id,
      new Date(r.createdAt).toISOString(),
      r.sessionLabel,
      r.analysisLabel ?? "",
      r.question,
      r.response,
      r.verdict ?? "",
      r.findingPrinciple ?? "",
    ].map((v) => csvEscape(String(v)));
    const codeCols = codebook.map((c) => (r.codes?.includes(c.id) ? "1" : "0"));
    return [...base, ...codeCols].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function downloadResponsesCsv(responses: InterviewResponse[], codebook: Code[]) {
  const csv = generateResponsesCsv(responses, codebook);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cognition-responses.csv";
  a.click();
  URL.revokeObjectURL(url);
}
