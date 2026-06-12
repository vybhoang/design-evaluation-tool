import { History, Trash2, ArrowRight, GitCompareArrows } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { formatRelative, type HistoryEntry } from "./history-store";

type Props = {
  entries: HistoryEntry[];
  onOpen: (e: HistoryEntry) => void;
  onCompare: (e: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
};

function scoreColor(s: number) {
  if (s >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (s >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

export function HistoryDrawer({ entries, onOpen, onCompare, onDelete, onClear }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <History className="size-4" />
          History
          {entries.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {entries.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-5 pb-3">
          <SheetTitle className="flex items-center gap-2">
            <History className="size-4" /> Analysis history
          </SheetTitle>
          <SheetDescription>
            Past runs are stored locally on this device.
          </SheetDescription>
        </SheetHeader>
        <Separator />
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {entries.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-12">
                No runs yet. Analyze a design and it will appear here.
              </div>
            )}
            {entries.map((e) => (
              <div
                key={e.id}
                className="group flex items-start gap-3 p-2 rounded-lg border hover:bg-muted/40 transition-colors"
              >
                <div className="size-14 rounded-md bg-muted overflow-hidden shrink-0">
                  <img src={e.thumbnail} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{e.label}</span>
                    <Badge variant="outline" className={`text-[10px] ${scoreColor(e.result.clarityScore)}`}>
                      {e.result.clarityScore}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.context.designType} · {e.context.audience} · {formatRelative(e.createdAt)}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onOpen(e)}>
                      <ArrowRight className="size-3" /> Open
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onCompare(e)}>
                      <GitCompareArrows className="size-3" /> Compare
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 ml-auto text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(e.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        {entries.length > 0 && (
          <>
            <Separator />
            <div className="p-3 flex justify-end">
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onClear}>
                Clear all
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
