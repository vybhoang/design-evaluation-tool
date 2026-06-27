import { ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { DISCLOSURES } from "./disclosure-store";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DisclosuresDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-4" /> Disclaimers
          </DialogTitle>
          <DialogDescription>
            One-time notices the app shows the first time you hit a feature.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {DISCLOSURES.map((d) => (
            <div key={d.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{d.title}</div>
              <div className="text-muted-foreground text-xs mt-0.5">{d.body}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
