import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import type { InterviewResponse } from "./response-store";
import type { Code } from "./codebook-store";

// Guardrail, not a tuned constant — cells below this raw count are visually
// de-emphasized (never suppressed) because n is too small to read as a signal.
const MIN_TREND_N = 3;

const verdictHeaderColor = {
  confirmed: "text-emerald-700",
  refuted: "text-red-600",
  inconclusive: "text-amber-600",
} as const;

const VERDICTS = ["confirmed", "refuted", "inconclusive"] as const;

type Props = {
  responses: InterviewResponse[];
  codebook: Code[];
  onRenameCode: (id: string, label: string) => void;
  onDeleteCode: (id: string) => void;
};

function CodeFrequencyRow({
  code, count, maxCount, onRename, onDelete,
}: {
  code: Code;
  count: number;
  maxCount: number;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(code.label);
  const [confirming, setConfirming] = useState(false);

  const commit = () => {
    const label = draft.trim();
    if (label && label !== code.label) onRename(code.id, label);
    else setDraft(code.label);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 group">
      <div className="w-36 shrink-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setDraft(code.label); setEditing(false); }
            }}
            className="w-full text-sm bg-transparent border-b border-primary outline-none pb-px"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-left hover:underline underline-offset-2 truncate w-full"
          >
            {code.label}
          </button>
        )}
      </div>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${(count / maxCount) * 100}%` }} />
      </div>
      <div className="w-8 text-right text-sm font-semibold tabular-nums">{count}</div>
      {confirming ? (
        <div className="flex items-center gap-2 text-xs shrink-0">
          <button type="button" onClick={() => onDelete(code.id)} className="text-destructive hover:underline">
            Delete
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="opacity-0 group-hover:opacity-100 shrink-0 size-5 flex items-center justify-center text-muted-foreground hover:text-destructive transition-opacity"
          aria-label={`Delete ${code.label}`}
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums leading-none">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export function CodingView({ responses, codebook, onRenameCode, onDeleteCode }: Props) {
  const sessions = useMemo(() => [...new Set(responses.map((r) => r.sessionLabel))], [responses]);
  const codedResponses = useMemo(() => responses.filter((r) => (r.codes?.length ?? 0) > 0), [responses]);

  const frequency = useMemo(() => {
    return codebook
      .map((c) => ({
        code: c,
        count: responses.filter((r) => r.codes?.includes(c.id)).length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [codebook, responses]);

  const maxCountInTable = useMemo(
    () => Math.max(1, ...frequency.map((f) => f.count)),
    [frequency]
  );

  const codeByVerdict = useMemo(() => {
    return codebook.map((c) => {
      const counts = VERDICTS.map((v) => ({
        verdict: v,
        count: responses.filter((r) => r.codes?.includes(c.id) && r.verdict === v).length,
      }));
      return { code: c, counts };
    });
  }, [codebook, responses]);

  const codeBySession = useMemo(() => {
    return codebook.map((c) => {
      const counts = sessions.map((s) => ({
        session: s,
        count: responses.filter((r) => r.codes?.includes(c.id) && r.sessionLabel === s).length,
      }));
      return { code: c, counts };
    });
  }, [codebook, responses, sessions]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <Stat label="Responses" value={responses.length} />
          <Stat label="Codes" value={codebook.length} />
          <Stat label="Coded" value={codedResponses.length} />
          <Stat label="Sessions" value={sessions.length} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-medium">Code frequency</div>
          {frequency.length === 0 ? (
            <div className="text-sm text-muted-foreground">No codes yet.</div>
          ) : (
            <div className="space-y-2.5">
              {frequency.map(({ code, count }) => (
                <CodeFrequencyRow
                  key={code.id}
                  code={code}
                  count={count}
                  maxCount={maxCountInTable}
                  onRename={onRenameCode}
                  onDelete={onDeleteCode}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-medium">Codes × verdict</div>
          {codeByVerdict.length === 0 ? (
            <div className="text-sm text-muted-foreground">No codes yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left py-1 pr-3 font-normal">Code</th>
                    {VERDICTS.map((v) => (
                      <th key={v} className={`text-left py-1 pr-3 font-medium capitalize ${verdictHeaderColor[v]}`}>{v}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {codeByVerdict.map(({ code, counts }) => (
                    <tr key={code.id} className="border-t">
                      <td className="py-1.5 pr-3">{code.label}</td>
                      {counts.map(({ verdict, count }) => (
                        <td key={verdict} className="py-1.5 pr-3">
                          <span className={count > 0 && count < MIN_TREND_N ? "text-muted-foreground" : count === 0 ? "text-muted-foreground/60" : "font-medium"}>
                            {count}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-medium">Codes × session</div>
          {codeBySession.length === 0 || sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No codes yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left py-1 pr-3 font-normal">Code</th>
                    {sessions.map((s) => (
                      <th key={s} className="text-left py-1 pr-3 font-normal">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {codeBySession.map(({ code, counts }) => (
                    <tr key={code.id} className="border-t">
                      <td className="py-1.5 pr-3">{code.label}</td>
                      {counts.map(({ session, count }) => (
                        <td key={session} className="py-1.5 pr-3">
                          <span className={count > 0 && count < MIN_TREND_N ? "text-muted-foreground" : count === 0 ? "text-muted-foreground/60" : "font-medium"}>
                            {count}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Badge variant="outline" className="text-[10px]">n &lt; {MIN_TREND_N}</Badge>
        cells are muted — too few responses to read as a pattern, shown for completeness rather than hidden.
      </div>
    </div>
  );
}
