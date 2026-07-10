import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Date", "Horaire", "Coordonnées"] as const;

interface StepperProps {
  current: 1 | 2 | 3;
}

export function Stepper({ current }: StepperProps) {
  return (
    <nav aria-label={`Étape ${current} sur ${STEPS.length}`} className="px-1">
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const idx = i + 1;
          const done = idx < current;
          const active = idx === current;
          return (
            <li key={label} className={cn("flex items-center gap-2", i < STEPS.length - 1 && "flex-1")}>
              <div className="flex items-center gap-1.5">
                <motion.span
                  layout
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                    done && "bg-primary text-primary-foreground",
                    active && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                    !done && !active && "bg-secondary text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : idx}
                </motion.span>
                <span
                  className={cn(
                    "text-xs font-semibold transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                    // Sur mobile, seul le libellé de l'étape courante est affiché
                    !active && "hidden min-[400px]:inline"
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-border">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary"
                    initial={false}
                    animate={{ width: done ? "100%" : "0%" }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
