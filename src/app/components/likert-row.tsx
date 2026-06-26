type Props = {
  label: string;
  min: number;
  max: number;
  value: number | null;
  onChange: (n: number) => void;
};

export function LikertRow({ label, min, max, value, onChange }: Props) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="space-y-1.5">
      <div className="text-sm">{label}</div>
      <div role="radiogroup" aria-label={label} className="flex items-center gap-1.5 flex-wrap">
        {options.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(n)}
              className={`size-8 rounded-md border text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent hover:text-accent-foreground border-input"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
