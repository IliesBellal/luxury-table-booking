import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { restaurantData } from "@/data/restaurant";

interface GuestSelectorProps {
  value: number;
  onChange: (n: number) => void;
  max?: number;
}

const defaultMax = restaurantData.data.maximum_party_size;

export function GuestSelector({ value, onChange, max = defaultMax }: GuestSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button
        type="button"
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all active:scale-95",
          value <= 1 && "opacity-30 cursor-not-allowed"
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
