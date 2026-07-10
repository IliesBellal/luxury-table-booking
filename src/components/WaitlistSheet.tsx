import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { ApiError, joinWaitlist } from "@/lib/api";
import { rememberWaitlistToken } from "@/lib/storage";

interface WaitlistSheetProps {
  slug: string;
  partySize: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WaitlistSheet({ slug, partySize, open, onOpenChange }: WaitlistSheetProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const joinMutation = useMutation({
    mutationFn: () =>
      joinWaitlist(slug, { partySize, name: name.trim(), phone: phone.trim(), notes }),
    onSuccess: ({ waitlistToken }) => {
      rememberWaitlistToken(slug, waitlistToken);
      onOpenChange(false);
      navigate(`/restaurant/${slug}/attente/${waitlistToken}`);
    },
    onError: (e: ApiError) => {
      toast({ title: "Inscription impossible", description: e.message, variant: "destructive" });
    },
  });

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Requis";
    if (!phone.trim()) e.phone = "Requis";
    else if (!/^\+?[\d\s\-()]{7,20}$/.test(phone)) e.phone = "Numéro invalide";
    setErrors(e);
    if (Object.keys(e).length === 0) joinMutation.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl sm:rounded-t-none sm:max-w-md overflow-y-auto"
      >
        <SheetHeader className="text-left">
          <SheetTitle>Rejoindre la liste d'attente</SheetTitle>
          <SheetDescription>
            Le restaurant vous préviendra par SMS dès qu'une table pour {partySize} personne
            {partySize > 1 ? "s" : ""} se libère.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5 pb-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Nom complet</label>
            <Input
              placeholder="Jean Dupont"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Téléphone</label>
            <Input
              type="tel"
              placeholder="+33 6 12 34 56 78"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">Remarque (optionnel)</label>
            <Textarea
              placeholder="Poussette, terrasse de préférence…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={joinMutation.isPending}
            className={cn(
              "w-full rounded-xl py-3.5 text-sm font-bold transition-all shadow-sm",
              "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]",
              "inline-flex items-center justify-center gap-2",
              joinMutation.isPending && "opacity-60 cursor-not-allowed"
            )}
          >
            {joinMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {joinMutation.isPending ? "Inscription…" : "Rejoindre la liste d'attente"}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
