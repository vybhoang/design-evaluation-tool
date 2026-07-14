import { Link, useNavigate } from "react-router";
import { ArrowRight, BookOpen, Brain, Users, Accessibility, Eye, ShieldAlert, Quote, type LucideIcon } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useStore } from "../store";
import { formatRelative } from "../components/history-store";

export default function Landing() {
  const navigate = useNavigate();
  const { history, validations } = useStore();

  return (
    <div className="-mx-6 -my-6">
      {/* Hero */}
      <section className="px-6 pt-16 pb-20 border-b">
        <div className="max-w-3xl">
          <div className="text-xs tracking-[0.2em] text-muted-foreground mb-4">
            Heurizztik
          </div>
          <h1 className="font-serif text-5xl md:text-6xl tracking-tight leading-[1.05] mb-6">
            Screen it<br />
            <span className="text-muted-foreground italic">before you mean it.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            Heurizztik checks your design against the UX research you'd cite in a critique:
            Nielsen heuristics, WCAG, cognitive-load literature. Then it hands you a script
            to validate what matters with real humans.
          </p>
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <Button size="lg" onClick={() => navigate("/new")} className="gap-2">
              Run a review <ArrowRight className="size-4" />
            </Button>
            {history.length > 0 && (
              <Button size="lg" variant="ghost" asChild>
                <Link to={`/analysis/${history[0].id}`}>
                  Continue last run · {formatRelative(history[0].createdAt)}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Honest about what it is */}
      <section className="px-6 py-16 border-b bg-muted/30">
        <div className="max-w-3xl">
          <div className="flex items-start gap-3 mb-6">
            <ShieldAlert className="size-5 mt-1 shrink-0" />
            <div>
              <h2 className="font-serif text-2xl tracking-tight mb-2">
                What this is, and what it isn't.
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                It's a heuristic pass backed by published UX research, and a workflow to
                validate what it finds with real people. It is <em>not</em> a synthetic user,
                and it cannot tell you whether your design "works." LLMs are yes-men.
                Simulating user feedback with one is theater. The job here is to catch the
                obvious before real users see it, help you write a sharper test plan, and
                keep track of what actually gets confirmed once real people try it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 border-b">
        <div className="max-w-5xl">
          <h2 className="font-serif text-3xl tracking-tight mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Step
              n="01"
              title="Drop a design"
              body="Screenshot, Figma export, wireframe. Add the audience and the goal so checks weigh accordingly."
            />
            <Step
              n="02"
              title="Heuristic review"
              body="Deterministic rules (contrast, target size) plus pattern-matched heuristics, with the source for every finding."
            />
            <Step
              n="03"
              title="Human validation"
              body="Run a moderated session inside the tool. Tag observations to findings. Patterns emerge across runs."
            />
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="px-6 py-20 border-b bg-muted/30">
        <div className="max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="font-serif text-3xl tracking-tight mb-4">What you'll see</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Findings come with a confidence label so you know which to trust outright
                and which to treat as a hypothesis. Every flag points at a real principle:
                Nielsen's 10, Hick's law, Fitts's law, WCAG 2.2. So the recommendation
                isn't an opinion, it's a citation.
              </p>
              <ul className="space-y-3 text-sm">
                <Bullet icon={Eye}>Visual hierarchy & salience cues</Bullet>
                <Bullet icon={Accessibility}>WCAG contrast, target size, focus order</Bullet>
                <Bullet icon={Brain}>Cognitive load: Hick, Miller, Fitts, Gestalt grouping</Bullet>
                <Bullet icon={BookOpen}>Pattern coverage: NN/g, Material, HIG conventions</Bullet>
                <Bullet icon={Users}>Auto-generated interview prompts per finding</Bullet>
              </ul>
            </div>
            <SampleFinding />
          </div>
        </div>
      </section>

      {/* Workflow positioning */}
      <section className="px-6 py-20 border-b">
        <div className="max-w-3xl">
          <Quote className="size-6 text-muted-foreground mb-4" />
          <p className="font-serif text-2xl tracking-tight leading-relaxed">
            "Generate UI with AI tools. Validate the output against UX principles, not synthetic
            users. Test with real humans for actual validation."
          </p>
          <div className="text-sm text-muted-foreground mt-4">how good teams ship in 2026</div>
        </div>
      </section>

      {/* Live stats / CTA */}
      <section className="px-6 py-20">
        <div className="max-w-5xl grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <h2 className="font-serif text-3xl tracking-tight mb-3">Ready when you are.</h2>
            <p className="text-muted-foreground">
              No sign-up. Runs stay on your machine.
            </p>
            {(history.length > 0 || validations.length > 0) && (
              <div className="mt-4 flex gap-6 text-sm text-muted-foreground">
                {history.length > 0 && <span><strong className="text-foreground">{history.length}</strong> past run{history.length === 1 ? "" : "s"}</span>}
                {validations.length > 0 && <span><strong className="text-foreground">{validations.length}</strong> evidence log{validations.length === 1 ? "" : "s"}</span>}
              </div>
            )}
          </div>
          <Button size="lg" onClick={() => navigate("/new")} className="gap-2">
            Start a review <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="font-serif text-3xl text-muted-foreground/60 mb-3">{n}</div>
      <h3 className="font-serif text-xl tracking-tight mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function Bullet({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="size-4 mt-0.5 text-muted-foreground shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function SampleFinding() {
  return (
    <Card className="bg-background">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <span className="font-medium">Primary CTA below the fold</span>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
            Heuristic
          </span>
        </div>
        <div className="text-xs text-muted-foreground mb-3">
          Nielsen: Visibility of system status · NN/g, 2020
        </div>
        <p className="text-sm mb-4">
          The "Start trial" button sits at 880px on a 720px viewport. 73% of first-time visitors
          may never see it without scrolling.
        </p>
        <div className="rounded-md border bg-muted/40 p-2 grid grid-cols-3 gap-2 text-xs mb-4">
          <Cell label="Check" value="cta_y_position" />
          <Cell label="Observed" value="880px" red />
          <Cell label="Threshold" value="≤ 720px" />
        </div>
        <div className="text-sm flex items-start gap-2">
          <ArrowRight className="size-4 mt-0.5 text-foreground shrink-0" />
          <span><span className="text-muted-foreground">Recommend:</span> Promote primary action above the fold; demote secondary links.</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Cell({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-mono ${red ? "text-red-700" : ""}`}>{value}</div>
    </div>
  );
}
