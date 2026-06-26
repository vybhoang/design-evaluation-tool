import { useMemo } from "react";
import { ShieldAlert, Hash, Users, MessageSquare, ListChecks } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import type { InterviewResponse } from "./response-store";
import type { Code } from "./codebook-store";

// Guardrail, not a tuned constant — cells below this raw count are visually
// de-emphasized (never suppressed) because n is too small to read as a signal.
const MIN_TREND_N = 3;

type Props = {
  responses: InterviewResponse[];
  codebook: Code[];
};

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="size-8 rounded-md bg-muted flex items-center justify-center">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );
}

export function CodingView({ responses, codebook }: Props) {
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

  const verdicts = ["confirmed", "refuted", "inconclusive"] as const;

  const codeByVerdict = useMemo(() => {
    return codebook.map((c) => {
      const counts = verdicts.map((v) => ({
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
      <div className="rounded-lg border bg-amber-50 border-amber-200 p-3 flex items-start gap-2.5">
        <ShieldAlert className="size-4 text-amber-700 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-900 leading-relaxed flex-1">
          <span className="font-medium">
            Codes from {responses.length} response{responses.length === 1 ? "" : "s"} across {sessions.length} session{sessions.length === 1 ? "" : "s"} — not a statistical sample.
          </span>{" "}
          Counts reflect what was said and tagged, not how many users would say it.
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={MessageSquare} label="Total responses" value={responses.length} />
          <Stat icon={Hash} label="Codes in codebook" value={codebook.length} />
          <Stat icon={ListChecks} label="Coded responses" value={codedResponses.length} />
          <Stat icon={Users} label="Sessions represented" value={sessions.length} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-medium">Code frequency</div>
          {frequency.length === 0 ? (
            <div className="text-sm text-muted-foreground italic">No codes yet. Apply codes from the Log tab to see counts here.</div>
          ) : (
            <div className="space-y-2.5">
              {frequency.map(({ code, count }) => (
                <div key={code.id} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 truncate text-sm">{code.label}</div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(count / maxCountInTable) * 100}%` }}
                    />
                  </div>
                  <div className="w-10 text-right text-sm font-semibold">{count}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-medium">Codes × verdict</div>
          {codeByVerdict.length === 0 ? (
            <div className="text-sm text-muted-foreground italic">No codes yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left py-1 pr-3 font-normal">Code</th>
                    {verdicts.map((v) => (
                      <th key={v} className="text-left py-1 pr-3 font-normal capitalize">{v}</th>
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
            <div className="text-sm text-muted-foreground italic">No codes yet.</div>
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
