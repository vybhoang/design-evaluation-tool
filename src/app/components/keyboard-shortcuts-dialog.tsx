import { Keyboard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const groups: { label: string; shortcuts: { keys: string[]; action: string }[] }[] = [
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["N"], action: "New analysis" },
      { keys: ["H"], action: "Runs / History" },
      { keys: ["P"], action: "Patterns" },
      { keys: ["R"], action: "Responses" },
      { keys: ["C"], action: "Compare" },
      { keys: ["?"], action: "This cheat sheet" },
    ],
  },
  {
    label: "Analysis page — findings",
    shortcuts: [
      { keys: ["↑", "↓"], action: "Navigate findings (triage order)" },
      { keys: ["Enter", "Space"], action: "Collapse active finding" },
      { keys: ["E"], action: "Log evidence for active finding" },
    ],
  },
];

export function KeyboardShortcutsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4" /> Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Shortcuts are disabled when a text field is focused.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {g.label}
              </div>
              <div className="space-y-1.5">
                {g.shortcuts.map((s) => (
                  <div key={s.action} className="flex items-center justify-between gap-4">
                    <span className="text-sm">{s.action}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-1.5 py-0.5 text-xs font-mono rounded border border-border bg-muted text-foreground leading-none"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
