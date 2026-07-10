import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, BellRing, Check, Clock, Users, X } from "lucide-react";
import { RestaurantHeader } from "@/components/RestaurantHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useRestaurant, useSlug } from "@/hooks/use-restaurant";
import {
  ApiError,
  getWaitlistStatus,
  leaveWaitlist,
  parseUtcTimestamp,
  type WaitlistState,
} from "@/lib/api";
import { clearWaitlistToken } from "@/lib/storage";

const POLL_INTERVAL_MS = 15_000;

export default function Waitlist() {
  const slug = useSlug();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: restaurant } = useRestaurant(slug);

  const [leaveBanner, setLeaveBanner] = useState(false);
  // Tick minute pour rafraîchir le compte à rebours entre deux polls
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const {
    data: state,
    isLoading,
    error,
  } = useQuery<WaitlistState, ApiError>({
    queryKey: ["waitlist", slug, token],
    queryFn: () => getWaitlistStatus(slug, token!),
    enabled: !!slug && !!token,
    retry: (count, err) => err.code !== "0" && err.code !== "-1" && count < 2,
    refetchInterval: (query) => {
      const status = query.state.data?.entry.status;
      return status === "waiting" || status === "notified" ? POLL_INTERVAL_MS : false;
    },
  });

  // Entrée introuvable : on oublie le jeton local
  useEffect(() => {
    if (error?.code === "0") clearWaitlistToken(slug);
  }, [error, slug]);

  const leaveMutation = useMutation({
    mutationFn: () => leaveWaitlist(slug, token!),
    onSuccess: () => {
      clearWaitlistToken(slug);
      queryClient.invalidateQueries({ queryKey: ["waitlist", slug, token] });
      toast({
        title: "Inscription annulée",
        description: "Vous avez quitté la liste d'attente.",
      });
    },
    onError: (e: ApiError) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
    onSettled: () => setLeaveBanner(false),
  });

  const entry = state?.entry;
  const active = entry?.status === "waiting" || entry?.status === "notified";

  const expiresAt = entry?.expires_at ? parseUtcTimestamp(entry.expires_at) : null;
  const minutesLeft = expiresAt
    ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60_000))
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Bandeau de confirmation de sortie */}
      <AnimatePresence>
        {leaveBanner && (
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
                <p className="text-sm font-medium">Quitter la liste d'attente ?</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setLeaveBanner(false)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-destructive-foreground/20 hover:bg-destructive-foreground/30 transition-colors"
                >
                  Non
                </button>
                <button
                  onClick={() => leaveMutation.mutate()}
                  disabled={leaveMutation.isPending}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-destructive-foreground text-destructive hover:opacity-90 transition-colors"
                >
                  Oui, quitter
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <RestaurantHeader
            merchant={restaurant?.merchant}
            handicapAccess={restaurant?.merchant.handicap_access}
          />
        </div>

        {isLoading ? (
          <div className="rounded-xl bg-card p-6 shadow-sm space-y-4">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
        ) : error ? (
          <div className="rounded-xl bg-card p-8 shadow-sm text-center space-y-3">
            <X className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-bold text-foreground">{error.message}</h2>
            <Button variant="outline" onClick={() => navigate(`/restaurant/${slug}`)}>
              Retour à l'accueil
            </Button>
          </div>
        ) : entry ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Statut */}
            <div className="rounded-xl bg-card p-6 shadow-sm text-center space-y-3">
              {entry.status === "waiting" && (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(45,93%,47%)]/10">
                    <WaitingDots />
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                    Vous êtes sur la liste
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {entry.customer_name}, le restaurant vous préviendra par SMS dès qu'une table
                    se libère. Gardez cette page ouverte pour suivre votre position.
                  </p>
                </>
              )}

              {entry.status === "notified" && (
                <>
                  <motion.div
                    animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(152,94%,39%)]/10"
                  >
                    <BellRing className="h-8 w-8 text-[hsl(152,94%,39%)]" />
                  </motion.div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                    Votre table est prête !
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Présentez-vous à l'accueil du restaurant
                    {minutesLeft !== null && minutesLeft > 0 ? (
                      <>
                        {" "}
                        dans les{" "}
                        <span className="font-semibold text-foreground">
                          {minutesLeft} prochaine{minutesLeft > 1 ? "s" : ""} minute
                          {minutesLeft > 1 ? "s" : ""}
                        </span>
                      </>
                    ) : null}
                    .
                  </p>
                </>
              )}

              {entry.status === "seated" && (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(152,94%,39%)]/10">
                    <Check className="h-8 w-8 text-[hsl(152,94%,39%)]" />
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                    Vous êtes installés
                  </h2>
                  <p className="text-sm text-muted-foreground">Bon appétit !</p>
                </>
              )}

              {entry.status === "cancelled" && (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                    <X className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                    Inscription clôturée
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Cette inscription en liste d'attente n'est plus active.
                  </p>
                </>
              )}
            </div>

            {/* Détails */}
            <div className="rounded-xl bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Convives</p>
                  <p className="text-sm font-semibold text-foreground">
                    {entry.party_size} personne{entry.party_size > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {(() => {
                const created = parseUtcTimestamp(entry.created_at);
                return created ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Inscrit à</p>
                      <p className="text-sm font-semibold text-foreground">
                        {created.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {active && (
              <p className="text-center text-xs text-muted-foreground">
                Actualisation automatique toutes les 15 secondes
              </p>
            )}

            {/* Actions */}
            {active && (
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setLeaveBanner(true)}
              >
                Quitter la liste d'attente
              </Button>
            )}
            <Button
              variant="ghost"
              className={cn("w-full text-muted-foreground")}
              onClick={() => navigate(`/restaurant/${slug}`)}
            >
              Réserver une table
            </Button>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function WaitingDots() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-[hsl(45,80%,45%)]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}
