import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CalendarDays,
  Users,
  Clock,
  X,
  AlertTriangle,
  Hourglass,
  UtensilsCrossed,
  Sparkles,
  Ban,
  Timer,
  Loader2,
  CalendarPlus,
  Download,
} from "lucide-react";
import { fr } from "date-fns/locale";
import { AnimatedCheck } from "@/components/AnimatedCheck";
import { RestaurantHeader } from "@/components/RestaurantHeader";
import { GuestSelector } from "@/components/GuestSelector";
import { TimeSlotSelector } from "@/components/TimeSlotSelector";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useRestaurant, useSlug } from "@/hooks/use-restaurant";
import {
  ApiError,
  bookingLocalParts,
  cancelBooking,
  formatBookingDate,
  getAvailability,
  getBooking,
  toDateKey,
  updateBooking,
  type ApiSlot,
  type BookingPublic,
  type BookingStatus,
} from "@/lib/api";
import { downloadIcs, googleCalendarUrl } from "@/lib/calendar";
import { forgetBooking } from "@/lib/storage";

interface StatusScreen {
  icon: React.ElementType;
  iconClass: string;
  bubbleClass: string;
  title: string;
  subtitle?: string;
}

const STATUS_SCREENS: Record<BookingStatus, StatusScreen> = {
  pending: {
    icon: Hourglass,
    iconClass: "text-[hsl(45,80%,35%)]",
    bubbleClass: "bg-[hsl(45,93%,47%)]/10",
    title: "Demande envoyée !",
    subtitle: "Le restaurant confirme votre réservation très prochainement.",
  },
  confirmed: {
    icon: Check,
    iconClass: "text-[hsl(152,94%,39%)]",
    bubbleClass: "bg-[hsl(152,94%,39%)]/10",
    title: "Réservation confirmée !",
    subtitle: "Nous avons hâte de vous accueillir.",
  },
  seated: {
    icon: UtensilsCrossed,
    iconClass: "text-[hsl(210,90%,45%)]",
    bubbleClass: "bg-[hsl(210,90%,50%)]/10",
    title: "Vous êtes à table",
    subtitle: "Bon appétit !",
  },
  completed: {
    icon: Sparkles,
    iconClass: "text-foreground",
    bubbleClass: "bg-secondary",
    title: "Merci de votre visite !",
    subtitle: "Au plaisir de vous revoir bientôt.",
  },
  cancelled: {
    icon: X,
    iconClass: "text-destructive",
    bubbleClass: "bg-destructive/10",
    title: "Réservation annulée",
  },
  no_show: {
    icon: Timer,
    iconClass: "text-muted-foreground",
    bubbleClass: "bg-secondary",
    title: "Réservation non honorée",
    subtitle: "Cette réservation a été marquée comme absence.",
  },
  denied: {
    icon: Ban,
    iconClass: "text-destructive",
    bubbleClass: "bg-destructive/10",
    title: "Réservation refusée",
    subtitle: "Le restaurant n'a pas pu accepter votre demande pour ce créneau.",
  },
};

export default function Reservation() {
  const slug = useSlug();
  const { bookingNumber } = useParams<{ bookingNumber: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { data: restaurant } = useRestaurant(slug);

  const {
    data: booking,
    isLoading,
    error,
  } = useQuery<BookingPublic, ApiError>({
    queryKey: ["booking", slug, bookingNumber],
    queryFn: () => getBooking(slug, bookingNumber!),
    enabled: !!slug && !!bookingNumber,
    retry: (count, err) => err.code !== "0" && err.code !== "-1" && count < 2,
  });

  // Réservation supprimée du carnet local si introuvable
  useEffect(() => {
    if (error?.code === "0" && bookingNumber) forgetBooking(slug, bookingNumber);
  }, [error, slug, bookingNumber]);

  // Avertissement doublon éventuel remonté par la création
  useEffect(() => {
    const state = location.state as { warning?: string } | null;
    if (state?.warning === "possible_duplicate_same_phone_same_slot") {
      toast({
        title: "Réservation similaire détectée",
        description:
          "Une réservation avec le même téléphone existe déjà sur ce créneau. Vérifiez vos réservations pour éviter un doublon.",
      });
      // Nettoie le state pour ne pas re-toaster au refresh
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const [cancelBanner, setCancelBanner] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editStep, setEditStep] = useState<1 | 2>(1);
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editGuests, setEditGuests] = useState(2);
  const [editSlot, setEditSlot] = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");

  const timezone = booking?.merchant.timezone ?? restaurant?.merchant.timezone ?? "Europe/Paris";
  const editDateKey = editDate ? toDateKey(editDate) : null;

  const {
    data: editSlots,
    isFetching: editSlotsLoading,
    error: editSlotsError,
    refetch: refetchEditSlots,
  } = useQuery<ApiSlot[], ApiError>({
    queryKey: ["availability", slug, editDateKey, editGuests],
    queryFn: () => getAvailability(slug, editDateKey!, editGuests),
    enabled: editOpen && editStep === 2 && !!editDateKey,
    staleTime: 30 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateBooking(slug, booking!.booking_number, {
        date: editDateKey!,
        time: editSlot!,
        partySize: editGuests,
        comment: editComment,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["booking", slug, bookingNumber], updated);
      queryClient.invalidateQueries({ queryKey: ["availability", slug] });
      setEditOpen(false);
      toast({
        title: "Réservation modifiée",
        description:
          updated.status === "pending"
            ? "Votre demande a été mise à jour et attend la confirmation du restaurant."
            : "Votre réservation a été mise à jour.",
      });
    },
    onError: (e: ApiError) => {
      if (e.code === "slot_unavailable") {
        setEditSlot(null);
        refetchEditSlots();
      }
      if (e.code === "too_late_to_edit") {
        setEditOpen(false);
        queryClient.invalidateQueries({ queryKey: ["booking", slug, bookingNumber] });
      }
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(slug, booking!.booking_number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", slug, bookingNumber] });
      toast({
        title: "Réservation annulée",
        description: "Votre réservation a bien été annulée.",
      });
    },
    onError: (e: ApiError) => {
      if (e.code === "too_late_to_edit") {
        queryClient.invalidateQueries({ queryKey: ["booking", slug, bookingNumber] });
      }
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
    onSettled: () => setCancelBanner(false),
  });

  const openEdit = useCallback(() => {
    if (!booking) return;
    const { dateKey, time } = bookingLocalParts(booking.date_from, timezone);
    const [y, m, d] = dateKey.split("-").map(Number);
    setEditDate(new Date(y, m - 1, d));
    setEditGuests(booking.party_size);
    setEditSlot(time);
    setEditComment(booking.comment ?? "");
    setEditStep(1);
    setEditOpen(true);
  }, [booking, timezone]);

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

  const formattedDate = booking
    ? formatBookingDate(booking.date_from, timezone, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const formattedTime = booking
    ? formatBookingDate(booking.date_from, timezone, {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
    : "";

  const screen = booking ? STATUS_SCREENS[booking.status] ?? STATUS_SCREENS.pending : null;
  const actionable = booking ? booking.modifiable || booking.cancelable : false;
  const showLimitMessage =
    booking &&
    !actionable &&
    (booking.status === "confirmed" || booking.status === "pending");

  const editFormattedDate = useMemo(
    () =>
      editDate?.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [editDate]
  );

  const headerMerchant = booking?.merchant ?? restaurant?.merchant;

  return (
    <div className="min-h-screen bg-background">
      {/* Bandeau de confirmation d'annulation */}
      <AnimatePresence>
        {cancelBanner && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground px-4 py-3 shadow-lg"
          >
            <div className="mx-auto max-w-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p className="text-sm font-medium">
                  Annuler cette réservation ? Cette action est irréversible.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setCancelBanner(false)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-destructive-foreground/20 hover:bg-destructive-foreground/30 transition-colors"
                >
                  Non
                </button>
                <button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-destructive-foreground text-destructive hover:opacity-90 transition-colors disabled:opacity-70"
                >
                  {cancelMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  {cancelMutation.isPending ? "Annulation…" : "Oui, annuler"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Header */}
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <RestaurantHeader merchant={headerMerchant} />
        </div>

        {/* Contenu */}
        {isLoading ? (
          <div className="rounded-xl bg-card p-6 shadow-sm space-y-4">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl bg-card p-8 shadow-sm text-center space-y-3">
            <X className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-bold text-foreground">{error.message}</h2>
            <Button variant="outline" onClick={() => navigate(`/restaurant/${slug}`)}>
              Retour à l'accueil
            </Button>
          </div>
        ) : booking && screen ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Statut */}
            <div className="rounded-xl bg-card p-6 shadow-sm text-center space-y-3">
              {booking.status === "confirmed" ? (
                <AnimatedCheck className="mx-auto h-16 w-16 text-[hsl(152,94%,39%)]" />
              ) : (
                <div
                  className={cn(
                    "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
                    screen.bubbleClass
                  )}
                >
                  <screen.icon className={cn("h-8 w-8", screen.iconClass)} />
                </div>
              )}
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                {screen.title}
              </h2>
              <StatusBadge status={booking.status} />
              {screen.subtitle && (
                <p className="text-sm text-muted-foreground">{screen.subtitle}</p>
              )}
            </div>

            {/* Détails — carte billet */}
            <div className="rounded-xl bg-card shadow-sm overflow-hidden">
              <div className="p-5 text-center space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Réservation n°
                </p>
                <p className="font-mono text-2xl font-extrabold tracking-widest text-foreground">
                  {booking.booking_number}
                </p>
              </div>

              {/* Perforation du billet */}
              <div className="relative flex items-center" aria-hidden="true">
                <span className="absolute -left-3 h-6 w-6 rounded-full bg-background" />
                <span className="absolute -right-3 h-6 w-6 rounded-full bg-background" />
                <div className="mx-5 w-full border-t-2 border-dashed border-border" />
              </div>

              <div className="p-5 space-y-4">
                <DetailRow icon={CalendarDays} label="Date" value={formattedDate} />
                <DetailRow
                  icon={Clock}
                  label="Heure"
                  value={
                    booking.duration_minutes > 0
                      ? `${formattedTime} · ${booking.duration_minutes} min`
                      : formattedTime
                  }
                />
                <DetailRow
                  icon={Users}
                  label="Convives"
                  value={`${booking.party_size} personne${booking.party_size > 1 ? "s" : ""}`}
                />
                {booking.comment && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Remarque</p>
                    <p className="text-sm text-foreground mt-1">{booking.comment}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ajouter au calendrier */}
            {(booking.status === "confirmed" || booking.status === "pending") && (
              <div className="rounded-xl bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">Ajouter à mon agenda</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      window.open(googleCalendarUrl(booking), "_blank", "noopener,noreferrer")
                    }
                  >
                    Google Agenda
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => downloadIcs(booking)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Apple / Outlook
                  </Button>
                </div>
              </div>
            )}

            {/* Délai dépassé / non modifiable */}
            {showLimitMessage && (
              <div className="rounded-xl bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Cette réservation ne peut plus être modifiée en ligne. Pour tout changement,
                  contactez le restaurant
                  {headerMerchant?.phone ? (
                    <>
                      {" "}
                      au{" "}
                      <a href={`tel:${headerMerchant.phone}`} className="font-semibold underline">
                        {headerMerchant.phone}
                      </a>
                    </>
                  ) : null}
                  .
                </p>
              </div>
            )}

            {/* Actions */}
            {actionable && (
              <div className="space-y-2">
                <div className="flex gap-3">
                  {booking.modifiable && (
                    <Button variant="outline" className="flex-1" onClick={openEdit}>
                      Modifier
                    </Button>
                  )}
                  {booking.cancelable && (
                    <Button
                      variant="ghost"
                      className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setCancelBanner(true)}
                    >
                      Annuler
                    </Button>
                  )}
                </div>
                {booking.modifiable && booking.remaining_updates < 3 && (
                  <p className="text-center text-xs text-muted-foreground">
                    {booking.remaining_updates > 0
                      ? `Encore ${booking.remaining_updates} modification${booking.remaining_updates > 1 ? "s" : ""} possible${booking.remaining_updates > 1 ? "s" : ""}`
                      : "Plus aucune modification possible"}
                  </p>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => navigate(`/restaurant/${slug}`)}
            >
              Nouvelle réservation
            </Button>
          </motion.div>
        ) : null}
      </div>

      {/* Sheet de modification (date, horaire, convives, remarque) */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent
          side="bottom"
          className="h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-t-none sm:h-full sm:max-w-md"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Modifier la réservation</SheetTitle>
            <SheetDescription>
              Changez la date, l'horaire, le nombre de convives ou votre remarque.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <AnimatePresence mode="wait">
              {editStep === 1 && (
                <motion.div
                  key="edit-step1"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">
                      Nombre de convives
                    </label>
                    <GuestSelector
                      value={editGuests}
                      onChange={setEditGuests}
                      min={restaurant?.minimumPartySize ?? 1}
                      max={restaurant?.maximumPartySize ?? 10}
                    />
                  </div>

                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={editDate}
                      onSelect={setEditDate}
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
                    disabled={!editDate}
                    onClick={() => {
                      setEditSlot(null);
                      setEditStep(2);
                    }}
                    className={cn(
                      "w-full rounded-xl py-3.5 text-sm font-bold transition-all shadow-sm",
                      editDate
                        ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {editDate
                      ? `Voir les créneaux — ${editFormattedDate}`
                      : "Sélectionnez une date"}
                  </button>
                </motion.div>
              )}

              {editStep === 2 && (
                <motion.div
                  key="edit-step2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div>
                    <button
                      onClick={() => setEditStep(1)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                    >
                      ← Retour
                    </button>
                    <p className="text-sm text-muted-foreground">
                      Pour {editGuests} personne{editGuests > 1 ? "s" : ""} le{" "}
                      {editFormattedDate}.
                    </p>
                  </div>

                  {editSlotsLoading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-11 rounded-xl" />
                      ))}
                    </div>
                  ) : editSlotsError ? (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-sm text-muted-foreground">{editSlotsError.message}</p>
                      <Button variant="outline" size="sm" onClick={() => refetchEditSlots()}>
                        Réessayer
                      </Button>
                    </div>
                  ) : (
                    <TimeSlotSelector
                      slots={editSlots ?? []}
                      selected={editSlot}
                      onSelect={setEditSlot}
                    />
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">
                      Remarque (optionnel)
                    </label>
                    <Textarea
                      placeholder="Allergies, occasion spéciale…"
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      maxLength={500}
                      rows={3}
                    />
                  </div>

                  <button
                    disabled={!editSlot || updateMutation.isPending}
                    onClick={() => updateMutation.mutate()}
                    className={cn(
                      "w-full rounded-xl py-3.5 text-sm font-bold transition-all shadow-sm",
                      "inline-flex items-center justify-center gap-2",
                      editSlot && !updateMutation.isPending
                        ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {updateMutation.isPending
                      ? "Enregistrement…"
                      : editSlot
                        ? `Enregistrer — ${editSlot}`
                        : "Sélectionnez un horaire"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
