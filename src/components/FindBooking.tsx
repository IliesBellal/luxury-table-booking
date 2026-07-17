import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { getRememberedBookings } from "@/lib/storage";

interface FindBookingProps {
  slug: string;
}

/**
 * « Vous avez déjà réservé ? » — accès rapide aux réservations mémorisées
 * sur cet appareil + recherche par numéro de réservation.
 */
export function FindBooking({ slug }: FindBookingProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const remembered = useMemo(() => getRememberedBookings(slug), [slug]);

  function goTo(bookingNumber: string) {
    navigate(`/restaurant/${slug}/booking/${encodeURIComponent(bookingNumber.trim())}`);
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (number.trim()) goTo(number);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl bg-card shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Vous avez déjà réservé ?</p>
                <p className="text-xs text-muted-foreground">
                  Consultez, modifiez ou annulez votre réservation
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {remembered.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Sur cet appareil
                </p>
                {remembered.map((n) => (
                  <button
                    key={n}
                    onClick={() => goTo(n)}
                    className="w-full flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <span className="font-mono text-xs">{n}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Numéro de réservation
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex. 4F7K2M"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  maxLength={30}
                  className="font-mono"
                />
                <Button type="submit" variant="outline" disabled={!number.trim()}>
                  Ouvrir
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Le numéro figure dans votre email ou SMS de confirmation.
              </p>
            </form>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
