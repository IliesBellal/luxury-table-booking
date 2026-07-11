import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Slot {
  time: string;
  available: boolean;
}

interface TimeSlotSelectorProps {
  slots: Slot[];
  selected: string | null;
  onSelect: (time: string) => void;
}

export function TimeSlotSelector({ slots, selected, onSelect }: TimeSlotSelectorProps) {
  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Aucun créneau disponible pour cette date.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {slots.map((slot, i) => (
        <motion.button
          key={slot.time}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.25 }}
          onClick={() => slot.available && onSelect(slot.time)}
          disabled={!slot.available}
          aria-disabled={!slot.available}
          className={cn(
            "rounded-xl py-3 text-sm font-semibold transition-all border",
            !slot.available
              ? "bg-muted text-muted-foreground border-border/50 opacity-50 cursor-not-allowed"
              : selected === slot.time
                ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                : "bg-card text-foreground border-border hover:border-primary/40 hover:shadow-sm"
          )}
        >
          {slot.time}
        </motion.button>
      ))}
    </div>
  );
}
