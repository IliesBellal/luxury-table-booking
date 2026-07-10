import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuestSelectorProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}

export function GuestSelector({ value, onChange, min = 1, max = 10 }: GuestSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Moins de convives"
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all active:scale-95",
          value <= min && "opacity-30 cursor-not-allowed"
        )}
      >
        <Minus className="h-5 w-5" />
      </button>

      <span className="text-4xl font-extrabold tabular-nums text-foreground min-w-[3ch] text-center">
        {value}
      </span>

      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Plus de convives"
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all active:scale-95",
          value >= max && "opacity-30 cursor-not-allowed"
        )}
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
