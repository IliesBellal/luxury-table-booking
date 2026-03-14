import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CalendarDays, Users, Clock, Hash, X } from "lucide-react";
import { RestaurantHeader } from "@/components/RestaurantHeader";
import { Loader } from "@/components/Loader";
import { BookingForm, type BookingFormData } from "@/components/BookingForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  getBooking,
  updateBooking,
  cancelBooking,
  canModify,
  type BookingDetail,
} from "@/lib/api";

export default function Reservation() {
  const { bookingNumber } = useParams<{ bookingNumber: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleCancel = useCallback(async () => {
    if (!bookingNumber) return;
    try {
      setActionLoading(true);
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

  const handleUpdate = useCallback(
    async (data: BookingFormData) => {
      if (!bookingNumber) return;
      try {
        setActionLoading(true);
        await updateBooking(bookingNumber, {
          customer: {
            customer_first_name: data.firstName,
            customer_last_name: data.lastName,
            customer_email: data.email,
            customer_tel: data.phone,
          },
          booking: {
            start_date: booking!.start_date,
            party_size: booking!.party_size,
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
    [bookingNumber, booking, fetchBooking]
  );

  const startDate = booking
    ? new Date(booking.start_date * 1000)
    : null;
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

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>{actionLoading && <Loader />}</AnimatePresence>

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
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                    Réservation confirmée !
                  </h2>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <X className="h-8 w-8 text-destructive" />
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                    Réservation annulée
                  </h2>
                </>
              )}
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

            {/* Actions */}
            {modifiable && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditOpen(true)}
                >
                  Modifier
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10">
                      Annuler
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Annuler la réservation ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Votre réservation pour le{" "}
                        {formattedDate} à {formattedTime} sera annulée.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Non, garder</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancel}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Oui, annuler
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la réservation</DialogTitle>
            <DialogDescription>
              Mettez à jour vos coordonnées ci-dessous.
            </DialogDescription>
          </DialogHeader>
          {booking && (
            <BookingForm
              onSubmit={handleUpdate}
              isSubmitting={actionLoading}
              defaultValues={{
                firstName: booking.customer_first_name,
                lastName: booking.customer_last_name,
                email: booking.customer_email,
                phone: booking.customer_tel,
                notes: booking.comment,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
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
