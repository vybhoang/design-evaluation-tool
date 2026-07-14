import { useState } from "react";
import { MessageCircle, Sparkles, RefreshCw, Plus, X, Beaker, Wand2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { DisclosureBanner } from "./disclosure-banner";
import type { AudienceLens } from "./analysis-data";

type Props = {
  lens: AudienceLens;
};

type Exchange = { question: string; response: string };

// Mock LLM responses — vary per persona. In production these come from Claude.
const mockResponse = (archetype: string, question: string): string => {
  const q = question.toLowerCase();
  const seeds: Record<string, string[]> = {
    "First-time visitor on mobile": [
      "Honestly I'd probably scroll past unless the headline grabs me in two seconds. The colors are nice but I'm not sure what it actually does.",
      "I think I'd tap the big purple button? Hard to tell what's clickable on a small screen.",
      "If pricing isn't above the fold I'd close the tab. I don't have patience for hunting on mobile.",
    ],
    "Evaluator comparing 3 tools": [
      "I want a feature matrix. Bullet lists of benefits are marketing fluff to me — show me what you do that the others don't.",
      "Security and integrations are deal-breakers. I'd Ctrl-F for SSO, SOC 2, and our existing stack.",
      "I'd skim the homepage in 30 seconds and bail to /pricing. If your pricing isn't transparent, I move on.",
    ],
    "Accessibility-dependent user": [
      "I'd need to actually use this with a screen reader to give you a meaningful answer — and a model can't do that.",
      "Keyboard nav and focus order would tell me more than the visual design. Have you tabbed through it?",
      "Color contrast on the secondary text looks borderline. But I'd want a real audit, not a screenshot review.",
    ],
  };
  const pool = seeds[archetype] || ["Hmm, I'd need to actually try this to tell you."];
  // Pick variation based on question characters to feel responsive
  const idx = (q.length + q.charCodeAt(0)) % pool.length;
  return pool[idx];
};

export function InterviewRehearsal({ lens }: Props) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<string[]>(lens.questionsToAsk);
  const [draft, setDraft] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);

  const addQuestion = () => {
    const q = draft.trim();
    if (!q) return;
    setQuestions([...questions, q]);
    setDraft("");
  };

  const rehearse = async () => {
    setBusy(true);
    setExchanges([]);
    // simulate streamed responses
    for (let i = 0; i < questions.length; i++) {
      await new Promise((r) => setTimeout(r, 350));
      setExchanges((prev) => [
        ...prev,
        { question: questions[i], response: mockResponse(lens.archetype, questions[i]) },
      ]);
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Wand2 className="size-3.5" /> Rehearse interview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="size-4" /> Interview rehearsal · {lens.archetype}
          </DialogTitle>
          <DialogDescription>
            A sandbox to iterate your interview script before talking to real humans.
          </DialogDescription>
        </DialogHeader>

        <DisclosureBanner id="synthetic-interview" icon={AlertTriangle} />

        <div className="flex-1 overflow-auto space-y-4 pr-1">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Interview questions
            </div>
            <div className="space-y-1.5">
              {questions.map((q, i) => (
                <div key={i} className="group flex items-start gap-2 rounded-md border bg-card p-2">
                  <span className="text-xs text-muted-foreground mt-0.5">{i + 1}.</span>
                  <span className="flex-1 text-sm">{q}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 opacity-0 group-hover:opacity-100 text-muted-foreground"
                    onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addQuestion()}
                placeholder="Add another question…"
                className="flex-1"
              />
              <Button onClick={addQuestion} size="sm" variant="outline" className="gap-1.5">
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
          </div>

          {exchanges.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Beaker className="size-3" /> Synthetic responses
                </div>
                <div className="space-y-3">
                  {exchanges.map((e, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="text-sm font-medium">{i + 1}. {e.question}</div>
                      <div className="rounded-md bg-muted/50 border-l-2 border-primary p-2.5 text-sm italic">
                        {e.response}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-md border bg-card p-3">
                  <div className="text-xs font-medium mb-1">Self-critique</div>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                    <li>Are any questions leading? Reword to be neutral.</li>
                    <li>Did the synthetic response dodge a question? It may be too abstract.</li>
                    <li>Now run the script with at least 5 real users from this archetype.</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        <Separator />
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="gap-1 text-xs">
            <Sparkles className="size-3" /> {questions.length} question{questions.length === 1 ? "" : "s"}
          </Badge>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setExchanges([])}>Clear</Button>
            <Button onClick={rehearse} disabled={busy || questions.length === 0} className="gap-1.5">
              <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
              {busy ? "Rehearsing…" : "Rehearse script"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
