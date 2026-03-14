import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fr } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { RestaurantHeader } from "@/components/RestaurantHeader";
import { GuestSelector } from "@/components/GuestSelector";
import { TimeSlotSelector } from "@/components/TimeSlotSelector";
import { BookingForm, type BookingFormData } from "@/components/BookingForm";
import { Loader } from "@/components/Loader";
import { restaurantData } from "@/data/restaurant";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { createBooking } from "@/lib/api";

const { open_days, maximum_party_size, merchant } = restaurantData.data;

type Step = 1 | 2 | 3;

interface Slot {
  time: string;
  available: boolean;
}

// Mock API response
const MOCK_SLOTS: Slot[] = [
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

const pageVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

export default function Index() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const handleFindTable = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setSlots(MOCK_SLOTS);
    setSelectedSlot(null);
    setLoading(false);
    setStep(2);
  }, [date]);

  const handleSlotSelect = useCallback((time: string) => {
    setSelectedSlot(time);
  }, []);

  const handleConfirmSlot = useCallback(() => {
    if (selectedSlot) setStep(3);
  }, [selectedSlot]);

  const handleBack = useCallback(() => {
    if (step === 2) {
      setStep(1);
      setSelectedSlot(null);
    } else if (step === 3) {
      setStep(2);
    }
  }, [step]);

  const handleSubmitBooking = useCallback(
    async (data: BookingFormData) => {
      if (!date || !selectedSlot) return;
      setLoading(true);
      try {
        const [hours, minutes] = selectedSlot.split(":").map(Number);
        const bookingDate = new Date(date);
        bookingDate.setHours(hours, minutes, 0, 0);
        const startDateUnix = Math.floor(bookingDate.getTime() / 1000);

        const result = await createBooking({
          customer: {
            customer_first_name: data.firstName,
            customer_last_name: data.lastName,
            customer_email: data.email,
            customer_tel: data.phone,
          },
          booking: {
            start_date: startDateUnix,
            party_size: guests,
            comment: data.notes,
          },
        });
        navigate(`/reservation/${result.booking_number}`);
      } catch (e: any) {
        toast({
          title: "Erreur",
          description: e.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [guests, date, selectedSlot, navigate]
  );

  const formattedDate = date?.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>{loading && <Loader />}</AnimatePresence>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Header */}
        <div className="rounded-xl bg-card p-4 shadow-sm flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1">
            <RestaurantHeader />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ──────── STEP 1 ──────── */}
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
              <div className="space-y-1 px-1">
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                  Réserver une table
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pour une réservation de plus de {maximum_party_size} personnes,
                  veuillez contacter l'établissement.
                </p>
              </div>

              <div className="rounded-xl bg-card p-5 shadow-sm space-y-3">
                <label className="text-sm font-semibold text-foreground">
                  Nombre de convives
                </label>
                <GuestSelector value={guests} onChange={setGuests} />
              </div>

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
                {date
                  ? `Trouver une table — ${formattedDate}`
                  : "Sélectionnez une date"}
              </button>
            </motion.div>
          )}

          {/* ──────── STEP 2 ──────── */}
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
                  Pour {guests} personne{guests > 1 ? "s" : ""} le{" "}
                  {formattedDate}. Les réservations sont d'une durée de{" "}
                  {merchant.default_booking_duration} min.
                </p>
              </div>

              <div className="rounded-xl bg-card p-5 shadow-sm">
                <TimeSlotSelector
                  slots={slots}
                  selected={selectedSlot}
                  onSelect={handleSlotSelect}
                />
              </div>

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
                {selectedSlot
                  ? `Continuer — ${selectedSlot}`
                  : "Sélectionnez un horaire"}
              </button>
            </motion.div>
          )}

          {/* ──────── STEP 3 ──────── */}
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
                  {guests} personne{guests > 1 ? "s" : ""} · {formattedDate} ·{" "}
                  {selectedSlot}
                </p>
              </div>

              <div className="rounded-xl bg-card p-5 shadow-sm">
                <BookingForm onSubmit={handleSubmitBooking} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
