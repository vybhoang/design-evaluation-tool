import { Navigate, useNavigate, useParams, useSearchParams, Link } from "react-router";
import { ArrowLeft, Gauge, MousePointerClick, ListChecks, LayoutGrid, HeartHandshake } from "lucide-react";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScalesView } from "../components/scales-view";
import { FirstClickView } from "../components/first-click-view";
import { TaskCompletionView } from "../components/task-completion-view";
import { CardSortView } from "../components/card-sort-view";
import { EmpathyMapView } from "../components/empathy-map-view";
import { useStore } from "../store";

const TAB_VALUES = ["scales", "first-click", "task-completion", "card-sort", "empathy-map"] as const;

export default function InstrumentsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { history } = useStore();
  const entry = history.find((h) => h.id === id);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number]) ? tabParam! : "scales";

  if (!entry && history.length > 0) return <Navigate to="/history" replace />;
  if (!entry) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/analysis/${entry.id}`)} className="gap-1.5">
            <ArrowLeft className="size-4" /> Back to analysis
          </Button>
          <div className="min-w-0">
            <h1 className="font-serif text-xl tracking-tight truncate">Instruments</h1>
            <div className="text-xs text-muted-foreground truncate">
              For: <Link to={`/analysis/${entry.id}`} className="underline underline-offset-2">{entry.label}</Link>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setSearchParams(v === "scales" ? {} : { tab: v }, { replace: true })}
        className="flex flex-col"
      >
        <TabsList className="shrink-0 grid grid-cols-2 sm:grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="scales" className="gap-1.5">
            <Gauge className="size-4" /> Scales
          </TabsTrigger>
          <TabsTrigger value="first-click" className="gap-1.5">
            <MousePointerClick className="size-4" /> First-click
          </TabsTrigger>
          <TabsTrigger value="task-completion" className="gap-1.5">
            <ListChecks className="size-4" /> Task completion
          </TabsTrigger>
          <TabsTrigger value="card-sort" className="gap-1.5">
            <LayoutGrid className="size-4" /> Card sort
          </TabsTrigger>
          <TabsTrigger value="empathy-map" className="gap-1.5">
            <HeartHandshake className="size-4" /> Empathy map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scales" className="mt-3">
          <ScalesView analysisId={entry.id} />
        </TabsContent>
        <TabsContent value="first-click" className="mt-3">
          <FirstClickView entry={entry} />
        </TabsContent>
        <TabsContent value="task-completion" className="mt-3">
          <TaskCompletionView entry={entry} />
        </TabsContent>
        <TabsContent value="card-sort" className="mt-3">
          <CardSortView entry={entry} />
        </TabsContent>
        <TabsContent value="empathy-map" className="mt-3">
          <EmpathyMapView entry={entry} />
        </TabsContent>
      </Tabs>
    </>
  );
}
