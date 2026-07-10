import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fr } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Hourglass, SearchX } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RestaurantHeader } from "@/components/RestaurantHeader";
import { GuestSelector } from "@/components/GuestSelector";
import { TimeSlotSelector } from "@/components/TimeSlotSelector";
import { BookingForm, type BookingFormData } from "@/components/BookingForm";
import { FindBooking } from "@/components/FindBooking";
import { WaitlistSheet } from "@/components/WaitlistSheet";
import { Loader } from "@/components/Loader";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useRestaurant, useSlug } from "@/hooks/use-restaurant";
import {
  ApiError,
  createBooking,
  getAvailability,
  toDateKey,
  type ApiSlot,
} from "@/lib/api";
import { getWaitlistToken, rememberBooking } from "@/lib/storage";

type Step = 1 | 2 | 3;

const pageVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

export default function Index() {
  const slug = useSlug();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: restaurant, isLoading: restaurantLoading, error: restaurantError } =
    useRestaurant(slug);

  const [step, setStep] = useState<Step>(1);
  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const idempotencyKey = useRef<string>("");
  const existingWaitlistToken = useMemo(() => getWaitlistToken(slug), [slug]);

  const minGuests = restaurant?.minimumPartySize ?? 1;
  const maxGuests = restaurant?.maximumPartySize ?? 10;

  // Cale le nombre de convives dans les bornes du restaurant une fois connues
  useEffect(() => {
    if (!restaurant) return;
    setGuests((g) => Math.min(Math.max(g, restaurant.minimumPartySize), restaurant.maximumPartySize));
  }, [restaurant]);

  const dateKey = date ? toDateKey(date) : null;

  const {
    data: slots,
    isFetching: slotsLoading,
    error: slotsError,
    refetch: refetchSlots,
  } = useQuery<ApiSlot[], ApiError>({
    queryKey: ["availability", slug, dateKey, guests],
    queryFn: () => getAvailability(slug, dateKey!, guests),
    enabled: step >= 2 && !!dateKey,
    staleTime: 30 * 1000,
  });

  const isDisabledDay = useCallback(
    (d: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) return true;
      if (restaurant) {
        if (!restaurant.openDays.includes(d.getDay())) return true;
        const horizon = restaurant.merchant.max_booking_horizon_days;
        if (horizon > 0) {
          const limit = new Date(today);
          limit.setDate(limit.getDate() + horizon);
          if (d > limit) return true;
        }
      }
      return false;
    },
    [restaurant]
  );

  const createMutation = useMutation({
    mutationFn: (form: BookingFormData) =>
      createBooking(
        slug,
        { date: dateKey!, time: selectedSlot!, partySize: guests, comment: form.notes },
        { name: form.name, email: form.email, phone: form.phone },
        idempotencyKey.current
      ),
    onSuccess: ({ booking, warning }) => {
      rememberBooking(slug, booking.booking_number);
      queryClient.setQueryData(["booking", slug, booking.booking_number], booking);
      navigate(`/restaurant/${slug}/reservation/${booking.booking_number}`, {
        state: { warning, justCreated: true },
      });
    },
    onError: (e: ApiError) => {
      // La clé a été consommée : nouvelle clé pour la prochaine tentative
      idempotencyKey.current = crypto.randomUUID();
      if (e.code === "slot_unavailable") {
        setSelectedSlot(null);
        setStep(2);
        refetchSlots();
      }
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
  });

  const handleFindTable = useCallback(() => {
    if (!date) return;
    setSelectedSlot(null);
    setStep(2);
  }, [date]);

  const handleConfirmSlot = useCallback(() => {
    if (!selectedSlot) return;
    idempotencyKey.current = crypto.randomUUID();
    setStep(3);
  }, [selectedSlot]);

  const handleBack = useCallback(() => {
    if (step === 2) {
      setStep(1);
      setSelectedSlot(null);
    } else if (step === 3) {
      setStep(2);
    }
  }, [step]);

  const formattedDate = useMemo(
    () =>
      date?.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [date]
  );

  // ── Restaurant introuvable ──
  if (restaurantError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-4 py-6">
          <div className="rounded-xl bg-card p-8 shadow-sm text-center space-y-3">
            <SearchX className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold text-foreground">Restaurant introuvable</h2>
            <p className="text-sm text-muted-foreground">{restaurantError.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>{createMutation.isPending && <Loader />}</AnimatePresence>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Header */}
        <div className="rounded-xl bg-card p-4 shadow-sm flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={handleBack}
              aria-label="Retour"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1">
            <RestaurantHeader
              merchant={restaurant?.merchant}
              handicapAccess={restaurant?.merchant.handicap_access}
            />
          </div>
        </div>

        {restaurantLoading ? (
          <div className="space-y-6">
            <div className="space-y-2 px-1">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="rounded-xl bg-card p-5 shadow-sm">
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="rounded-xl bg-card p-4 shadow-sm">
              <Skeleton className="h-72 w-full" />
            </div>
          </div>
        ) : restaurant ? (
          <AnimatePresence mode="wait">
            {/* ──────── STEP 1 : Date & convives ──────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                {existingWaitlistToken && (
                  <button
                    onClick={() => navigate(`/restaurant/${slug}/attente/${existingWaitlistToken}`)}
                    className="w-full rounded-xl bg-card p-4 shadow-sm flex items-center gap-3 text-left hover:shadow-md transition-shadow"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(45,93%,47%)]/10">
                      <Hourglass className="h-4 w-4 text-[hsl(45,80%,35%)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Vous êtes sur la liste d'attente
                      </p>
                      <p className="text-xs text-muted-foreground">Voir ma position →</p>
                    </div>
                  </button>
                )}

                <div className="space-y-1 px-1">
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                    Réserver une table
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Pour une réservation de plus de {maxGuests} personnes, veuillez contacter
                    l'établissement.
                  </p>
                </div>

                <div className="rounded-xl bg-card p-5 shadow-sm space-y-3">
                  <label className="text-sm font-semibold text-foreground">
                    Nombre de convives
                  </label>
                  <GuestSelector value={guests} onChange={setGuests} min={minGuests} max={maxGuests} />
                </div>

                <div className="rounded-xl bg-card p-4 shadow-sm flex justify-center">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={isDisabledDay}
                    locale={fr}
                    className={cn("p-0 pointer-events-auto")}
                    classNames={{
                      day_today: "ring-1 ring-primary/40 text-foreground font-semibold",
                      day_selected:
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    }}
                  />
                </div>

                <button
                  disabled={!date}
                  onClick={handleFindTable}
                  className={cn(
                    "w-full rounded-xl py-3.5 text-sm font-bold transition-all shadow-sm",
                    date
                      ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {date ? `Trouver une table — ${formattedDate}` : "Sélectionnez une date"}
                </button>

                <FindBooking slug={slug} />
              </motion.div>
            )}

            {/* ──────── STEP 2 : Horaires ──────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                <div className="space-y-1 px-1">
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                    Choisissez un horaire
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Pour {guests} personne{guests > 1 ? "s" : ""} le {formattedDate}.
                  </p>
                </div>

                <div className="rounded-xl bg-card p-5 shadow-sm">
                  {slotsLoading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-11 rounded-xl" />
                      ))}
                    </div>
                  ) : slotsError ? (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-sm text-muted-foreground">{slotsError.message}</p>
                      <Button variant="outline" size="sm" onClick={() => refetchSlots()}>
                        Réessayer
                      </Button>
                    </div>
                  ) : (
                    <TimeSlotSelector
                      slots={slots ?? []}
                      selected={selectedSlot}
                      onSelect={setSelectedSlot}
                    />
                  )}
                </div>

                {/* Aucun créneau : proposer la liste d'attente */}
                {!slotsLoading && !slotsError && (slots ?? []).every((s) => !s.available) && (
                  <div className="rounded-xl bg-card p-5 shadow-sm space-y-3 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                      <Hourglass className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Complet ce jour-là ? Inscrivez-vous sur la liste d'attente et soyez prévenu
                      dès qu'une table se libère.
                    </p>
                    <Button variant="outline" className="w-full" onClick={() => setWaitlistOpen(true)}>
                      Rejoindre la liste d'attente
                    </Button>
                  </div>
                )}

                <button
                  disabled={!selectedSlot}
                  onClick={handleConfirmSlot}
                  className={cn(
                    "w-full rounded-xl py-3.5 text-sm font-bold transition-all shadow-sm",
                    selectedSlot
                      ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {selectedSlot ? `Continuer — ${selectedSlot}` : "Sélectionnez un horaire"}
                </button>
              </motion.div>
            )}

            {/* ──────── STEP 3 : Coordonnées ──────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                <div className="space-y-1 px-1">
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                    Vos coordonnées
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {guests} personne{guests > 1 ? "s" : ""} · {formattedDate} · {selectedSlot}
                  </p>
                </div>

                <div className="rounded-xl bg-card p-5 shadow-sm">
                  <BookingForm
                    onSubmit={(data) => createMutation.mutate(data)}
                    isSubmitting={createMutation.isPending}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : null}
      </div>

      <WaitlistSheet
        slug={slug}
        partySize={guests}
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
      />
    </div>
  );
}
