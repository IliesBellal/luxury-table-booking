import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CalendarDays, Users, Clock, Hash, X, AlertTriangle } from "lucide-react";
import { fr } from "date-fns/locale";
import { RestaurantHeader } from "@/components/RestaurantHeader";
import { Loader } from "@/components/Loader";
import { BookingForm, type BookingFormData } from "@/components/BookingForm";
import { GuestSelector } from "@/components/GuestSelector";
import { TimeSlotSelector } from "@/components/TimeSlotSelector";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { restaurantData } from "@/data/restaurant";
import {
  getBooking,
  updateBooking,
  cancelBooking,
  canModify,
  type BookingDetail,
} from "@/lib/api";

const { open_days, merchant } = restaurantData.data;

// Mock slots for modification
const MOCK_SLOTS = [
  { time: "12:00", available: true },
  { time: "12:15", available: true },
  { time: "12:30", available: true },
  { time: "12:45", available: true },
  { time: "13:00", available: true },
  { time: "19:00", available: true },
  { time: "19:15", available: true },
  { time: "19:30", available: true },
  { time: "19:45", available: true },
  { time: "20:00", available: true },
  { time: "20:15", available: true },
  { time: "20:30", available: true },
];

function isDisabled(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return true;
  if (!open_days.includes(date.getDay())) return true;
  return false;
}

export default function Reservation() {
  const { bookingNumber } = useParams<{ bookingNumber: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelBanner, setCancelBanner] = useState(false);

  // Edit state
  const [editStep, setEditStep] = useState<1 | 2 | 3>(1);
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editGuests, setEditGuests] = useState(2);
  const [editSlot, setEditSlot] = useState<string | null>(null);
  const [editSlots, setEditSlots] = useState(MOCK_SLOTS);

  const fetchBooking = useCallback(async () => {
    if (!bookingNumber) return;
    try {
      setLoading(true);
      const data = await getBooking(bookingNumber);
      setBooking(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [bookingNumber]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const openEdit = useCallback(() => {
    if (!booking) return;
    const d = new Date(booking.start_date * 1000);
    setEditDate(d);
    setEditGuests(booking.party_size);
    setEditSlot(
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    );
    setEditStep(1);
    setEditOpen(true);
  }, [booking]);

  const handleEditFindSlots = useCallback(async () => {
    if (!editDate) return;
    setActionLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setEditSlots(MOCK_SLOTS);
    setActionLoading(false);
    setEditStep(2);
  }, [editDate]);

  const handleEditConfirmSlot = useCallback(() => {
    if (editSlot) setEditStep(3);
  }, [editSlot]);

  const handleUpdate = useCallback(
    async (data: BookingFormData) => {
      if (!bookingNumber || !editDate || !editSlot) return;
      try {
        setActionLoading(true);
        const [hours, minutes] = editSlot.split(":").map(Number);
        const bookingDate = new Date(editDate);
        bookingDate.setHours(hours, minutes, 0, 0);
        const startDateUnix = Math.floor(bookingDate.getTime() / 1000);

        await updateBooking(bookingNumber, {
          customer: {
            customer_first_name: data.firstName,
            customer_last_name: data.lastName,
            customer_email: data.email,
            customer_tel: data.phone,
          },
          booking: {
            start_date: startDateUnix,
            party_size: editGuests,
            comment: data.notes,
          },
        });
        toast({
          title: "Réservation modifiée",
          description: "Vos informations ont été mises à jour.",
        });
        setEditOpen(false);
        await fetchBooking();
      } catch (e: any) {
        toast({
          title: "Erreur",
          description: e.message,
          variant: "destructive",
        });
      } finally {
        setActionLoading(false);
      }
    },
    [bookingNumber, editDate, editSlot, editGuests, fetchBooking]
  );

  const handleCancel = useCallback(async () => {
    if (!bookingNumber) return;
    try {
      setActionLoading(true);
      setCancelBanner(false);
      await cancelBooking(bookingNumber);
      toast({
        title: "Réservation annulée",
        description: "Votre réservation a bien été annulée.",
      });
      await fetchBooking();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  }, [bookingNumber, fetchBooking]);

  const startDate = booking ? new Date(booking.start_date * 1000) : null;
  const formattedDate = startDate?.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = startDate?.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const modifiable = booking ? canModify(booking) && booking.status === "confirmed" : false;
  const hoursUntil = booking ? (booking.start_date - Date.now() / 1000) / 3600 : Infinity;
  const showLimitMessage = booking && booking.cancelable_by_customer && !modifiable && booking.status === "confirmed";

  const editFormattedDate = editDate?.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>{actionLoading && <Loader />}</AnimatePresence>

      {/* Cancel Banner */}
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
                <p className="text-sm font-medium">Annuler cette réservation ? Cette action est irréversible.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setCancelBanner(false)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-destructive-foreground/20 hover:bg-destructive-foreground/30 transition-colors"
                >
                  Non
                </button>
                <button
                  onClick={handleCancel}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-destructive-foreground text-destructive hover:opacity-90 transition-colors"
                >
                  Oui, annuler
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Header */}
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <RestaurantHeader />
        </div>

        {/* Content */}
        {loading ? (
          <div className="rounded-xl bg-card p-6 shadow-sm space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl bg-card p-8 shadow-sm text-center space-y-3">
            <X className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-bold text-foreground">{error}</h2>
            <Button variant="outline" onClick={() => navigate("/")}>
              Retour à l'accueil
            </Button>
          </div>
        ) : booking ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Status */}
            <div className="rounded-xl bg-card p-6 shadow-sm text-center space-y-3">
              {booking.status === "confirmed" ? (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(152,94%,39%)]/10">
                  <Check className="h-8 w-8 text-[hsl(152,94%,39%)]" />
                </div>
              ) : booking.status === "pending_approval" ? (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(45,93%,47%)]/10">
                  <Clock className="h-8 w-8 text-[hsl(45,80%,35%)]" />
                </div>
              ) : (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <X className="h-8 w-8 text-destructive" />
                </div>
              )}
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                {booking.status === "confirmed"
                  ? "Réservation confirmée !"
                  : booking.status === "pending_approval"
                  ? "En attente de confirmation"
                  : "Réservation annulée"}
              </h2>
              <StatusBadge status={booking.status} />
              <p className="text-sm text-muted-foreground">
                {booking.customer_first_name} {booking.customer_last_name}
              </p>
            </div>

            {/* Details */}
            <div className="rounded-xl bg-card p-5 shadow-sm space-y-4">
              <DetailRow icon={Hash} label="Numéro" value={booking.booking_number} />
              <DetailRow icon={CalendarDays} label="Date" value={formattedDate ?? ""} />
              <DetailRow icon={Clock} label="Heure" value={formattedTime ?? ""} />
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

            {/* Limit message */}
            {showLimitMessage && (
              <div className="rounded-xl bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Le délai de modification est dépassé (minimum{" "}
                  {booking.cancel_booking_limit_offset_hours}h avant).
                </p>
              </div>
            )}

            {/* Actions */}
            {modifiable && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={openEdit}
                >
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setCancelBanner(true)}
                >
                  Annuler
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => navigate("/")}
            >
              Nouvelle réservation
            </Button>
          </motion.div>
        ) : null}
      </div>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent
          side="bottom"
          className="h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-t-none sm:h-full sm:max-w-md"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Modifier la réservation</SheetTitle>
            <SheetDescription>
              Modifiez la date, l'heure, ou vos coordonnées.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <AnimatePresence mode="wait">
              {/* Edit Step 1: Date & Guests */}
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
                    <GuestSelector value={editGuests} onChange={setEditGuests} />
                  </div>

                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={editDate}
                      onSelect={setEditDate}
                      disabled={isDisabled}
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
                    onClick={handleEditFindSlots}
                    className={cn(
                      "w-full rounded-xl py-3.5 text-sm font-bold transition-all shadow-sm",
                      editDate
                        ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {editDate ? `Voir les créneaux — ${editFormattedDate}` : "Sélectionnez une date"}
                  </button>
                </motion.div>
              )}

              {/* Edit Step 2: Time Slots */}
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
                      {editFormattedDate}. Durée : {merchant.default_booking_duration} min.
                    </p>
                  </div>

                  <TimeSlotSelector
                    slots={editSlots}
                    selected={editSlot}
                    onSelect={setEditSlot}
                  />

                  <button
                    disabled={!editSlot}
                    onClick={handleEditConfirmSlot}
                    className={cn(
                      "w-full rounded-xl py-3.5 text-sm font-bold transition-all shadow-sm",
                      editSlot
                        ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {editSlot ? `Continuer — ${editSlot}` : "Sélectionnez un horaire"}
                  </button>
                </motion.div>
              )}

              {/* Edit Step 3: Form */}
              {editStep === 3 && (
                <motion.div
                  key="edit-step3"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                >
                  <button
                    onClick={() => setEditStep(2)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                  >
                    ← Retour
                  </button>
                  {booking && (
                    <BookingForm
                      onSubmit={handleUpdate}
                      isSubmitting={actionLoading}
                      submitLabel="Enregistrer les modifications"
                      defaultValues={{
                        firstName: booking.customer_first_name,
                        lastName: booking.customer_last_name,
                        email: booking.customer_email,
                        phone: booking.customer_tel,
                        notes: booking.comment,
                      }}
                    />
                  )}
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
