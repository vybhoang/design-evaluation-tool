import { useState } from "react";
import { Plus, Trash2, CheckCircle2, XCircle, MinusCircle, BookCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Separator } from "./ui/separator";
import { toast } from "sonner";
import type { ResearchFinding } from "./analysis-data";
import { evidenceFor, type ValidationEvidence } from "./validation-store";

type Props = {
  finding: ResearchFinding;
  validations: ValidationEvidence[];
  onAdd: (e: Omit<ValidationEvidence, "id" | "createdAt">) => void;
  onDelete: (id: string) => void;
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const verdictMeta = {
  confirmed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Confirmed" },
  refuted: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Refuted" },
  inconclusive: { icon: MinusCircle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Inconclusive" },
};

export function ValidationDialog({ finding, validations, onAdd, onDelete, trigger, open: externalOpen, onOpenChange: externalOnOpenChange }: Props) {
  const [localOpen, setLocalOpen] = useState(false);

  const open = externalOpen !== undefined ? externalOpen : localOpen;
  const setOpen = (val: boolean) => {
    setLocalOpen(val);
    externalOnOpenChange?.(val);
  };
  const [verdict, setVerdict] = useState<"confirmed" | "refuted" | "inconclusive">("confirmed");
  const [method, setMethod] = useState("Moderated test");
  const [sampleSize, setSampleSize] = useState<string>("5");
  const [note, setNote] = useState("");

  const ev = evidenceFor(validations, finding.id);

  const submit = () => {
    if (!note.trim()) {
      toast.error("Add a short note describing what real users actually did.");
      return;
    }
    onAdd({
      findingId: finding.id,
      verdict,
      method,
      sampleSize: Number(sampleSize) || undefined,
      note: note.trim(),
    });
    setNote("");
    toast.success("Evidence logged");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookCheck className="size-4" /> Real-user evidence
          </DialogTitle>
          <DialogDescription>
            Log what actual humans did with this design. Without evidence, the finding stays a hypothesis.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="font-medium">{finding.principle}</div>
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{finding.observation}</div>
        </div>

        {ev.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-auto">
            {ev.map((e) => {
              const m = verdictMeta[e.verdict];
              const Icon = m.icon;
              return (
                <div key={e.id} className={`rounded-md border p-2.5 ${m.bg}`}>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className={`gap-1 ${m.color} bg-white/50`}>
                      <Icon className="size-3" /> {m.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(e.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {e.method}{e.sampleSize ? ` · n=${e.sampleSize}` : ""}
                  </div>
                  <div className="text-sm mt-1">{e.note}</div>
                </div>
              );
            })}
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Verdict from real users</Label>
            <RadioGroup
              value={verdict}
              onValueChange={(v) => setVerdict(v as any)}
              className="grid grid-cols-3 gap-2 mt-1"
            >
              {(["confirmed", "refuted", "inconclusive"] as const).map((v) => {
                const m = verdictMeta[v];
                const Icon = m.icon;
                return (
                  <Label
                    key={v}
                    className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer ${
                      verdict === v ? m.bg : "bg-card"
                    }`}
                  >
                    <RadioGroupItem value={v} />
                    <Icon className={`size-3.5 ${m.color}`} />
                    <span className="text-xs">{m.label}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <Label className="text-xs">Method</Label>
              <Input
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="e.g. 5-second test, moderated session"
              />
            </div>
            <div className="w-20">
              <Label className="text-xs">n=</Label>
              <Input
                value={sampleSize}
                onChange={(e) => setSampleSize(e.target.value)}
                placeholder="5"
                type="number"
                min="1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">What actually happened</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="4 of 5 testers found the CTA within 3s after we increased its size."
              className="min-h-[80px]"
            />
          </div>
          <Button onClick={submit} className="w-full gap-1.5">
            <Plus className="size-3.5" /> Log evidence
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
