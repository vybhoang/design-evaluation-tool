import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Trash2, Search, ArrowUpDown, GitCompareArrows,
  XCircle, AlertTriangle, BookCheck,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useStore } from "../store";
import { formatRelative } from "../components/history-store";
import { validationStatus } from "../components/validation-store";

const DESIGN_TYPE_LABELS: Record<string, string> = {
  landing: "Landing page",
  checkout: "Checkout flow",
  dashboard: "Dashboard",
  onboarding: "Onboarding",
  mobile: "Mobile app screen",
  form: "Form / signup",
};

const AUDIENCE_LABELS: Record<string, string> = {
  general: "General",
  enterprise: "Enterprise",
  developers: "Developers",
  seniors: "Seniors",
  genz: "Gen Z",
};

type SortKey = "newest" | "oldest" | "mostFindings" | "mostCritical" | "mostValidated";

export default function HistoryPage() {
  const navigate = useNavigate();
  const { history, validations, deleteEntry, clearHistory } = useStore();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("all");
  const [minCritical, setMinCritical] = useState<0 | 1 | 2 | 3>(0);
  const [sort, setSort] = useState<SortKey>("newest");

  const designTypes = useMemo(
    () => [...new Set(history.map((h) => h.context.designType))],
    [history]
  );

  // Precompute per-entry metrics so filters and sort don't recalculate on every render
  const enriched = useMemo(() =>
    history.map((h) => {
      const criticalCount = h.result.findings.filter((f) => f.severity === "critical").length;
      const warningCount  = h.result.findings.filter((f) => f.severity === "warning").length;
      const validatedCount = h.result.findings.filter(
        (f) => validationStatus(validations, f.id) !== "unvalidated"
      ).length;
      return { ...h, criticalCount, warningCount, validatedCount };
    }),
    [history, validations]
  );

  const filtered = useMemo(() => {
    const todayStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
    const weekStart  = Date.now() - 7  * 24 * 60 * 60 * 1000;
    const monthStart = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return enriched
      .filter((h) => {
        if (query) {
          const q = query.toLowerCase();
          const typeLabel = (DESIGN_TYPE_LABELS[h.context.designType] ?? h.context.designType).toLowerCase();
          if (
            !h.label.toLowerCase().includes(q) &&
            !typeLabel.includes(q) &&
            !h.context.goal.toLowerCase().includes(q)
          ) return false;
        }
        if (typeFilter !== "all" && h.context.designType !== typeFilter) return false;
        if (dateRange === "today" && h.createdAt < todayStart) return false;
        if (dateRange === "week"  && h.createdAt < weekStart)  return false;
        if (dateRange === "month" && h.createdAt < monthStart) return false;
        if (minCritical > 0 && h.criticalCount < minCritical) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sort) {
          case "newest":        return b.createdAt - a.createdAt;
          case "oldest":        return a.createdAt - b.createdAt;
          case "mostFindings":  return b.result.findings.length - a.result.findings.length;
          case "mostCritical":  return b.criticalCount - a.criticalCount;
          case "mostValidated": return b.validatedCount - a.validatedCount;
        }
      });
  }, [enriched, query, typeFilter, dateRange, minCritical, sort]);

  const isFiltered = query !== "" || typeFilter !== "all" || dateRange !== "all" || minCritical > 0;
  const resetFilters = () => { setQuery(""); setTypeFilter("all"); setDateRange("all"); setMinCritical(0); };

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Runs</h1>
          <p className="text-sm text-muted-foreground">
            {isFiltered
              ? `${filtered.length} of ${history.length}`
              : history.length}{" "}
            saved {history.length === 1 ? "analysis" : "analyses"}
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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by label, type, or goal…"
              className="pl-8 h-8 w-64 text-sm"
            />
          </div>

          {/* Design type */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {designTypes.map((t) => (
                <SelectItem key={t} value={t}>{DESIGN_TYPE_LABELS[t] ?? t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date range */}
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

          {/* Min critical severity */}
          <Select value={String(minCritical)} onValueChange={(v) => setMinCritical(Number(v) as 0 | 1 | 2 | 3)}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any severity</SelectItem>
              <SelectItem value="1">≥ 1 critical</SelectItem>
              <SelectItem value="2">≥ 2 critical</SelectItem>
              <SelectItem value="3">≥ 3 critical</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <ArrowUpDown className="size-3 text-muted-foreground mr-1 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="mostFindings">Most findings</SelectItem>
              <SelectItem value="mostCritical">Most critical</SelectItem>
              <SelectItem value="mostValidated">Most validated</SelectItem>
            </SelectContent>
          </Select>

          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
              Reset
            </Button>
          )}
        </div>
      )}

      {history.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            No runs yet.{" "}
            <button onClick={() => navigate("/new")} className="underline">
              Start a new one
            </button>
            .
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <p>No runs match your filters.</p>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((h) => {
            const others = history.filter((x) => x.id !== h.id);
            const validationPct = h.result.findings.length > 0
              ? (h.validatedCount / h.result.findings.length) * 100
              : 0;

            return (
              <Card
                key={h.id}
                className="overflow-hidden group hover:border-foreground/30 transition-colors"
              >
                <button
                  onClick={() => navigate(`/analysis/${h.id}`)}
                  className="w-full text-left block"
                >
                  <img
                    src={h.thumbnail}
                    alt=""
                    className="w-full aspect-[4/3] object-cover bg-muted"
                  />
                  <div className="p-3 space-y-2">
                    {/* Title + time */}
                    <div>
                      <div className="text-sm font-medium truncate">{h.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatRelative(h.createdAt)}
                      </div>
                    </div>

                    {/* Type + audience badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {DESIGN_TYPE_LABELS[h.context.designType] ?? h.context.designType}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-normal">
                        {AUDIENCE_LABELS[h.context.audience] ?? h.context.audience}
                      </Badge>
                    </div>

                    {/* Severity summary */}
                    <div className="flex items-center gap-3 text-xs">
                      {h.criticalCount > 0 && (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="size-3" /> {h.criticalCount} critical
                        </span>
                      )}
                      {h.warningCount > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="size-3" /> {h.warningCount} warnings
                        </span>
                      )}
                      {h.criticalCount === 0 && h.warningCount === 0 && (
                        <span className="text-muted-foreground">
                          {h.result.findings.length} findings
                        </span>
                      )}
                    </div>

                    {/* Validation progress */}
                    {h.result.findings.length > 0 && (
                      <div className="flex items-center gap-2">
                        <BookCheck className="size-3 text-muted-foreground shrink-0" />
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${validationPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {h.validatedCount}/{h.result.findings.length}
                        </span>
                      </div>
                    )}
                  </div>
                </button>

                {/* Hover actions */}
                <div className="px-3 pb-3 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {others.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/compare?a=${h.id}&b=${others[0].id}`)}
                      className="text-muted-foreground h-7 px-2 gap-1 text-xs"
                    >
                      <GitCompareArrows className="size-3" /> Compare
                    </Button>
                  )}
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
            );
          })}
        </div>
      )}
    </>
  );
}
