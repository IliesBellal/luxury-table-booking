import { useState } from "react";
import { fr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { RestaurantHeader } from "@/components/RestaurantHeader";
import { GuestSelector } from "@/components/GuestSelector";
import { restaurantData } from "@/data/restaurant";
import { cn } from "@/lib/utils";

const { open_days, maximum_party_size } = restaurantData.data;

function isOpenDay(date: Date) {
  return open_days.includes(date.getDay());
}

function isDisabled(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return true;
  if (!isOpenDay(date)) return true;
  return false;
}

export default function Index() {
  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState<Date | undefined>(undefined);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Header */}
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <RestaurantHeader />
        </div>

        {/* Title */}
        <div className="space-y-1 px-1">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Réserver une table
          </h2>
          <p className="text-sm text-muted-foreground">
            Pour une réservation de plus de {maximum_party_size} personnes,
            veuillez contacter l'établissement.
          </p>
        </div>

        {/* Guest selector */}
        <div className="rounded-xl bg-card p-5 shadow-sm space-y-3">
          <label className="text-sm font-semibold text-foreground">
            Nombre de convives
          </label>
          <GuestSelector value={guests} onChange={setGuests} />
        </div>

        {/* Calendar */}
        <div className="rounded-xl bg-card p-4 shadow-sm flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={isDisabled}
            locale={fr}
            className={cn("p-0 pointer-events-auto")}
            classNames={{
              day_today:
                "ring-1 ring-primary/40 text-foreground font-semibold",
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            }}
          />
        </div>

        {/* CTA */}
        <button
          disabled={!date}
          className={cn(
            "w-full rounded-xl py-3.5 text-sm font-bold transition-all shadow-sm",
            date
              ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {date
            ? `Continuer — ${date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`
            : "Sélectionnez une date"}
        </button>
      </div>
    </div>
  );
}
