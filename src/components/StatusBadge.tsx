import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/api";

const config: Record<BookingStatus, { label: string; className: string; pulse?: boolean }> = {
  pending: {
    label: "En attente",
    className: "bg-[hsl(45,93%,47%)]/15 text-[hsl(45,80%,25%)]",
    pulse: true,
  },
  confirmed: {
    label: "Confirmée",
    className: "bg-[hsl(152,94%,39%)]/10 text-[hsl(152,94%,30%)]",
  },
  seated: {
    label: "À table",
    className: "bg-[hsl(210,90%,50%)]/10 text-[hsl(210,90%,38%)]",
  },
  completed: {
    label: "Terminée",
    className: "bg-secondary text-muted-foreground",
  },
  cancelled: {
    label: "Annulée",
    className: "bg-destructive/10 text-destructive",
  },
  no_show: {
    label: "Non honorée",
    className: "bg-secondary text-muted-foreground",
  },
  denied: {
    label: "Refusée",
    className: "bg-destructive/10 text-destructive",
  },
};

interface StatusBadgeProps {
  status: BookingStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const c = config[status] ?? config.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        c.className,
        c.pulse && "animate-pulse"
      )}
    >
      {c.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {c.label}
    </span>
  );
}
