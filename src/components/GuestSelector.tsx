import { cn } from "@/lib/utils";
import { restaurantData } from "@/data/restaurant";

interface GuestSelectorProps {
  value: number;
  onChange: (n: number) => void;
}

const maxGuests = restaurantData.data.maximum_party_size;

export function GuestSelector({ value, onChange }: GuestSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition-all",
            n === value
              ? "bg-primary text-primary-foreground shadow-md scale-110"
              : "bg-card text-foreground border border-border hover:border-primary/40"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
