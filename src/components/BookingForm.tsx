import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface BookingFormProps {
  onSubmit: (data: BookingFormData) => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<BookingFormData>;
  submitLabel?: string;
}

export interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

export function BookingForm({ onSubmit, isSubmitting, defaultValues, submitLabel = "Confirmer la réservation" }: BookingFormProps) {
  const [form, setForm] = useState<BookingFormData>({
    firstName: defaultValues?.firstName ?? "",
    lastName: defaultValues?.lastName ?? "",
    email: defaultValues?.email ?? "",
    phone: defaultValues?.phone ?? "",
    notes: defaultValues?.notes ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.firstName.trim()) e.firstName = "Requis";
    if (!form.lastName.trim()) e.lastName = "Requis";
    if (!form.email.trim()) e.email = "Requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email invalide";
    if (!form.phone.trim()) e.phone = "Requis";
    else if (!/^\+?[\d\s\-()]{7,20}$/.test(form.phone)) e.phone = "Numéro invalide";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (validate()) onSubmit(form);
  }

  function update(field: keyof BookingFormData, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  }

  return (
    <motion.form
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" error={errors.firstName}>
          <Input
            placeholder="Jean"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            maxLength={100}
          />
        </Field>
        <Field label="Nom" error={errors.lastName}>
          <Input
            placeholder="Dupont"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            maxLength={100}
          />
        </Field>
      </div>

      <Field label="Email" error={errors.email}>
        <Input
          type="email"
          placeholder="jean@email.com"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          maxLength={255}
        />
      </Field>

      <Field label="Téléphone" error={errors.phone}>
        <Input
          type="tel"
          placeholder="+33 6 12 34 56 78"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          maxLength={20}
        />
      </Field>

      <Field label="Remarque (optionnel)">
        <Textarea
          placeholder="Allergies, occasion spéciale…"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          maxLength={500}
          rows={3}
        />
      </Field>

      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "w-full rounded-xl py-3.5 text-sm font-bold transition-all shadow-sm",
          "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]",
          isSubmitting && "opacity-60 cursor-not-allowed"
        )}
      >
        {isSubmitting ? "Enregistrement…" : submitLabel}
      </button>
    </motion.form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
