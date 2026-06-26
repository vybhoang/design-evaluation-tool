import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { LikertRow } from "./likert-row";
import { useStore } from "../store";
import { scoreSUS, scoreNPS, scoreSAT, scoreSEQ, SCALE_CITATIONS } from "./scoring";
import type { ScaleResponse } from "./scales-store";

const SUS_ITEM_COUNT = 10;

export function ScalesView({ analysisId }: { analysisId: string }) {
  const { scaleResponses, addScaleResponse } = useStore();
  const [participantId, setParticipantId] = useState("");
  const [susValues, setSusValues] = useState<(number | null)[]>(Array(SUS_ITEM_COUNT).fill(null));
  const [nps, setNps] = useState<number | null>(null);
  const [sat, setSat] = useState<number | null>(null);
  const [seq, setSeq] = useState<number | null>(null);

  const forAnalysis = useMemo(
    () => scaleResponses.filter((r) => r.analysisId === analysisId),
    [scaleResponses, analysisId]
  );

  const susByParticipant = useMemo(() => {
    const ids = [...new Set(forAnalysis.filter((r) => r.scale === "SUS").map((r) => r.participantId))];
    return ids
      .map((pid) => {
        const items = forAnalysis
          .filter((r) => r.scale === "SUS" && r.participantId === pid)
          .sort((a, b) => a.itemId.localeCompare(b.itemId))
          .map((r) => r.value);
        return scoreSUS(items);
      })
      .filter((s): s is number => s !== null);
  }, [forAnalysis]);

  const npsValues = useMemo(
    () => forAnalysis.filter((r) => r.scale === "NPS").map((r) => r.value),
    [forAnalysis]
  );
  const satValues = useMemo(
    () => forAnalysis.filter((r) => r.scale === "SAT").map((r) => r.value),
    [forAnalysis]
  );
  const seqValues = useMemo(
    () => forAnalysis.filter((r) => r.scale === "SEQ").map((r) => r.value),
    [forAnalysis]
  );

  const susMean = susByParticipant.length
    ? susByParticipant.reduce((s, v) => s + v, 0) / susByParticipant.length
    : null;
  const npsResult = scoreNPS(npsValues);
  const satMean = scoreSAT(satValues);
  const seqResult = scoreSEQ(seqValues);

  const canSubmit = participantId.trim().length > 0;

  const submitSUS = () => {
    if (!canSubmit || susValues.some((v) => v === null)) return;
    const rows: Omit<ScaleResponse, "id" | "createdAt">[] = susValues.map((v, i) => ({
      analysisId,
      participantId: participantId.trim(),
      scale: "SUS",
      itemId: `sus-${i + 1}`,
      value: v as number,
    }));
    addScaleResponse(rows);
    setSusValues(Array(SUS_ITEM_COUNT).fill(null));
  };

  const submitNPS = () => {
    if (!canSubmit || nps === null) return;
    addScaleResponse([{ analysisId, participantId: participantId.trim(), scale: "NPS", itemId: "nps-1", value: nps }]);
    setNps(null);
  };

  const submitSAT = () => {
    if (!canSubmit || sat === null) return;
    addScaleResponse([{ analysisId, participantId: participantId.trim(), scale: "SAT", itemId: "sat-1", value: sat }]);
    setSat(null);
  };

  const submitSEQ = () => {
    if (!canSubmit || seq === null) return;
    addScaleResponse([{ analysisId, participantId: participantId.trim(), scale: "SEQ", itemId: "seq-1", value: seq }]);
    setSeq(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="text-sm font-medium">Participant</div>
          <Input
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            placeholder="Participant ID"
            className="max-w-xs"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">SUS — System Usability Scale</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{SCALE_CITATIONS.SUS.source}</TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-3">
            {susValues.map((v, i) => (
              <LikertRow
                key={i}
                label={`${i + 1}.`}
                min={1}
                max={5}
                value={v}
                onChange={(n) =>
                  setSusValues((prev) => prev.map((p, idx) => (idx === i ? n : p)))
                }
              />
            ))}
          </div>
          <Button size="sm" onClick={submitSUS} disabled={!canSubmit || susValues.some((v) => v === null)}>
            Submit SUS
          </Button>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            {susByParticipant.length === 0 ? (
              <span className="text-muted-foreground">No SUS responses yet.</span>
            ) : (
              <span>
                SUS score: <span className="font-semibold">{susMean!.toFixed(1)}</span> (n={susByParticipant.length}{" "}
                participant{susByParticipant.length === 1 ? "" : "s"})
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">NPS — Net Promoter Score</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{SCALE_CITATIONS.NPS.source}</TooltipContent>
            </Tooltip>
          </div>
          <LikertRow
            label="How likely are you to recommend this to a friend or colleague? (0 = not at all, 10 = extremely likely)"
            min={0}
            max={10}
            value={nps}
            onChange={setNps}
          />
          <Button size="sm" onClick={submitNPS} disabled={!canSubmit || nps === null}>
            Submit NPS
          </Button>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            {npsValues.length === 0 ? (
              <span className="text-muted-foreground">No NPS responses yet.</span>
            ) : (
              <span>
                NPS score: <span className="font-semibold">{npsResult.score}</span> (n={npsValues.length}) ·{" "}
                {npsResult.promoters} promoters, {npsResult.passives} passives, {npsResult.detractors} detractors
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <span className="text-sm font-medium">Satisfaction rating</span>
          <div className="rounded-md border bg-amber-50 border-amber-200 p-2.5 text-xs text-amber-900 leading-relaxed">
            Single-item, industry convention — not a peer-reviewed instrument. No published source is cited
            because none applies to this exact metric.
          </div>
          <LikertRow
            label="Overall, how satisfied were you? (1 = very dissatisfied, 5 = very satisfied)"
            min={1}
            max={5}
            value={sat}
            onChange={setSat}
          />
          <Button size="sm" onClick={submitSAT} disabled={!canSubmit || sat === null}>
            Submit
          </Button>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            {satValues.length === 0 ? (
              <span className="text-muted-foreground">No satisfaction responses yet.</span>
            ) : (
              <span>
                Satisfaction rating: <span className="font-semibold">{satMean!.toFixed(1)}</span> (n={satValues.length})
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">SEQ — Single Ease Question</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{SCALE_CITATIONS.SEQ.source}</TooltipContent>
            </Tooltip>
          </div>
          <LikertRow
            label="Overall, this task was: (1 = very difficult, 7 = very easy)"
            min={1}
            max={7}
            value={seq}
            onChange={setSeq}
          />
          <Button size="sm" onClick={submitSEQ} disabled={!canSubmit || seq === null}>
            Submit SEQ
          </Button>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            {seqResult.n === 0 ? (
              <span className="text-muted-foreground">No SEQ responses yet.</span>
            ) : (
              <span>
                SEQ score: <span className="font-semibold">{seqResult.mean!.toFixed(1)}</span> (n={seqResult.n})
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
