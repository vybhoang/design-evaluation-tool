import { useState } from "react";
import { X } from "lucide-react";
import { DISCLOSURES, isDismissed, dismiss } from "./disclosure-store";

type Props = {
  id: string;
  icon: React.ElementType;
};

export function DisclosureBanner({ id, icon: Icon }: Props) {
  const [dismissed, setDismissed] = useState(() => isDismissed(id));
  const d = DISCLOSURES.find((x) => x.id === id);
  if (dismissed || !d) return null;

  return (
    <div className="shrink-0 rounded-lg border bg-muted/30 p-3 flex items-start gap-2.5">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="text-xs text-muted-foreground leading-relaxed flex-1">
        <span className="font-medium">{d.title}</span> {d.body}
      </div>
      <button
        onClick={() => { dismiss(id); setDismissed(true); }}
        className="text-muted-foreground hover:text-foreground ml-1 shrink-0"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
