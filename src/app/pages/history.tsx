import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Trash2, Search } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useStore } from "../store";
import { formatRelative } from "../components/history-store";

const DESIGN_TYPE_LABELS: Record<string, string> = {
  landing: "Landing page",
  checkout: "Checkout flow",
  dashboard: "Dashboard",
  onboarding: "Onboarding",
  mobile: "Mobile app screen",
  form: "Form / signup",
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const { history, deleteEntry, clearHistory } = useStore();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("all");

  const designTypes = useMemo(
    () => [...new Set(history.map((h) => h.context.designType))],
    [history]
  );

  const filtered = useMemo(() => {
    const todayStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
    const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const monthStart = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return history.filter((h) => {
      if (query) {
        const q = query.toLowerCase();
        const typeLabel = (DESIGN_TYPE_LABELS[h.context.designType] ?? h.context.designType).toLowerCase();
        const matches = h.label.toLowerCase().includes(q) || typeLabel.includes(q) || h.context.goal.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (typeFilter && h.context.designType !== typeFilter) return false;
      if (dateRange === "today" && h.createdAt < todayStart) return false;
      if (dateRange === "week" && h.createdAt < weekStart) return false;
      if (dateRange === "month" && h.createdAt < monthStart) return false;
      return true;
    });
  }, [history, query, typeFilter, dateRange]);

  const isFiltered = query !== "" || typeFilter !== "" || dateRange !== "all";
  const resetFilters = () => { setQuery(""); setTypeFilter(""); setDateRange("all"); };

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Runs</h1>
          <p className="text-sm text-muted-foreground">
            {isFiltered ? `${filtered.length} of ${history.length}` : history.length} saved {history.length === 1 ? "analysis" : "analyses"}
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearHistory} className="gap-1.5">
            <Trash2 className="size-4" /> Clear all
          </Button>
        )}
      </div>

      {history.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search runs…"
              className="pl-8 h-8 w-52 text-sm"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              {designTypes.map((t) => (
                <SelectItem key={t} value={t}>{DESIGN_TYPE_LABELS[t] ?? t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
              Reset filters
            </Button>
          )}
        </div>
      )}

      {history.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            No runs yet. <button onClick={() => navigate("/new")} className="underline">Start a new one</button>.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <p>No runs match your filters.</p>
            <Button variant="ghost" size="sm" onClick={resetFilters}>Reset filters</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((h) => (
            <Card key={h.id} className="overflow-hidden group hover:border-foreground/30 transition-colors">
              <button
                onClick={() => navigate(`/analysis/${h.id}`)}
                className="w-full text-left"
              >
                <img src={h.thumbnail} alt="" className="w-full aspect-[4/3] object-cover bg-muted" />
                <div className="p-3">
                  <div className="text-sm truncate">{h.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {h.result.findings.length} findings · {formatRelative(h.createdAt)}
                  </div>
                </div>
              </button>
              <div className="px-3 pb-3 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteEntry(h.id)}
                  className="text-muted-foreground hover:text-red-600 h-7 px-2 gap-1 text-xs"
                >
                  <Trash2 className="size-3" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
