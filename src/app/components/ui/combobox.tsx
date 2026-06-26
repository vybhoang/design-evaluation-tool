"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus, Sparkles } from "lucide-react";
import { cn } from "./utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";

export type ComboboxOption = { value: string; label: string };
export type ComboboxGroup = {
  heading?: string;
  options: ComboboxOption[];
  icon?: React.ComponentType<{ className?: string }>;
};

type ComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  groups: ComboboxGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  // Shows a subtle, non-textual signal (pulsing icon + skeleton rows in the
  // first group) while suggestions are still being generated.
  loading?: boolean;
  className?: string;
};

// Gold-standard combobox trigger — visually matches SelectTrigger exactly
// (border-input, bg-input-background, h-9, focus ring) but supports free text.
export function Combobox({
  value,
  onChange,
  groups,
  placeholder = "Select or type a value…",
  searchPlaceholder = "Search or type a custom value…",
  loading = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const allOptions = groups.flatMap((g) => g.options);
  const currentLabel = allOptions.find((o) => o.value === value)?.label ?? value;
  const hasExactMatch =
    query.trim() !== "" &&
    allOptions.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  const select = (v: string) => {
    onChange(v);
    setQuery("");
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "border-input dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:border-ring focus-visible:ring-ring/50 h-9",
            className
          )}
        >
          <span className={cn("truncate text-left flex-1", !value && "text-muted-foreground")}>
            {value ? currentLabel : placeholder}
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            {loading && <Sparkles className="size-3.5 text-primary animate-pulse" />}
            <ChevronDown className="size-4 opacity-50" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          <CommandList>
            {groups.map((g, gi) => {
              const showSkeleton = loading && gi === 0 && g.options.length === 0;
              if (g.options.length === 0 && !showSkeleton) return null;
              const Icon = g.icon;
              return (
                <CommandGroup key={g.heading ?? gi} heading={g.heading}>
                  {showSkeleton
                    ? [0, 1, 2].map((i) => (
                        <div key={i} className="px-2 py-1.5">
                          <div
                            className="h-3.5 rounded bg-muted animate-pulse"
                            style={{ width: `${72 - i * 14}%` }}
                          />
                        </div>
                      ))
                    : g.options.map((opt) => (
                        <CommandItem key={opt.value} value={opt.label} onSelect={() => select(opt.value)}>
                          {Icon && <Icon className="size-3.5 text-primary" />}
                          <span className="flex-1">{opt.label}</span>
                          {value === opt.value && <Check className="size-3.5" />}
                        </CommandItem>
                      ))}
                </CommandGroup>
              );
            })}
            {query.trim() && !hasExactMatch && (
              <CommandGroup>
                <CommandItem value={`use-custom-${query}`} onSelect={() => select(query)}>
                  <Plus className="size-3.5" />
                  Use "{query}"
                </CommandItem>
              </CommandGroup>
            )}
            <CommandEmpty className="px-3 py-4 text-xs text-muted-foreground">
              Keep typing to create a custom value.
            </CommandEmpty>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
