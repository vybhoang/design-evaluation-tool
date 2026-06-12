import { useState } from "react";
import { Users, Copy, Check, ExternalLink, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import type { AnalysisResult } from "./analysis-data";

type Props = { result: AnalysisResult };

export function HumanTestingPanel({ result }: Props) {
  const [emails, setEmails] = useState("");
  const [copied, setCopied] = useState(false);

  const allQuestions = result.lenses.flatMap((l) =>
    l.questionsToAsk.map((q) => `[${l.archetype}] ${q}`)
  );
  const allRisks = result.lenses.flatMap((l) => l.risksToValidate);

  const scriptText = [
    "# Moderated test script",
    "",
    "## Top hypotheses to validate",
    ...allRisks.map((r, i) => `${i + 1}. ${r.risk}  —  suggested method: ${r.testMethod}`),
    "",
    "## Questions to ask",
    ...allQuestions.map((q) => `- ${q}`),
    "",
    "## Tasks (fill in with your real flow)",
    "1. ",
    "2. ",
    "3. ",
  ].join("\n");

  const copyScript = async () => {
    await navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Test script copied to clipboard");
  };

  const handoff = (vendor: string) => {
    toast(`Would open ${vendor} with the test script prefilled (demo).`);
  };

  const sendInvites = () => {
    const list = emails.split(/[,\s]+/).filter((e) => e.includes("@"));
    if (list.length === 0) {
      toast.error("Add at least one tester email.");
      return;
    }
    toast.success(`Invite stub sent to ${list.length} tester${list.length === 1 ? "" : "s"}.`);
    setEmails("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4" /> Send to real humans
        </CardTitle>
        <CardDescription>
          AI eval is a first pass. The hypotheses below are starting points —
          validate them with actual users before treating them as truth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Generated test script</span>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-xs">{allQuestions.length} questions</Badge>
              <Badge variant="secondary" className="text-xs">{allRisks.length} risks</Badge>
            </div>
          </div>
          <Textarea
            value={scriptText}
            readOnly
            className="font-mono text-xs h-40 resize-none"
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 mt-2"
            onClick={copyScript}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy script"}
          </Button>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">Send to a research platform</div>
          <div className="grid grid-cols-2 gap-2">
            {["UserTesting", "Maze", "Lyssna", "Fable (a11y)"].map((v) => (
              <Button
                key={v}
                variant="outline"
                size="sm"
                className="justify-between"
                onClick={() => handoff(v)}
              >
                {v} <ExternalLink className="size-3.5 text-muted-foreground" />
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Stubs for now — connect your account to enable real handoff.
          </p>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">Or invite testers directly</div>
          <div className="flex items-center gap-2">
            <Input
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="alex@…, jordan@…"
              className="flex-1"
            />
            <Button onClick={sendInvites} className="gap-1.5" size="sm">
              <Send className="size-3.5" /> Invite
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
