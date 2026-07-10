// Client API réservation publique WelloResto — routes /rsv/{slug}
// Toutes les réponses sont enveloppées { id, data } ; le succès/l'échec est
// porté par data.status (métier), pas par le code HTTP.

const DEFAULT_API_BASE_URL = "https://welloresto-api-staging.onrender.com";
const BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

// ---------------------------------------------------------------------------
// Types (miroir des modèles publics de l'API)
// ---------------------------------------------------------------------------

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show"
  | "denied";

export interface MerchantDesign {
  primary_color: string;
  text_color_on_primary_color: string;
}

export interface MerchantAddress {
  street_number: string;
  street: string;
  zip_code: string;
  city: string;
}

export interface Merchant {
  merchant_id: string;
  timezone: string;
  logo_url: string;
  business_name: string;
  handicap_access: boolean;
  phone: string;
  design: MerchantDesign;
  address: MerchantAddress;
  default_booking_duration: number;
  slot_interval_minutes: number;
  reserve_maximum_party_size: number;
  reserve_minimum_party_size: number;
  first_booking_offset_minutes: number;
  last_booking_offset_minutes: number;
  max_booking_horizon_days: number;
  pending_expiration_hours: number;
  cancelable_by_customer: boolean;
  cancel_booking_limit_offset_hours: number;
  auto_accept_reserve_bookings: boolean;
  open_hours?: Record<string, string>;
}

export interface RestaurantInfo {
  /** Jours ouverts au format JS getDay() (0 = dimanche) */
  openDays: number[];
  maximumPartySize: number;
  minimumPartySize: number;
  merchant: Merchant;
}

export interface ApiSlot {
  time: string;
  available: boolean;
  duration_minutes?: number;
  hoo_id?: string;
}

export interface MerchantPublic {
  business_name: string;
  phone: string;
  address: MerchantAddress;
  logo_url: string;
  design: MerchantDesign;
  timezone: string;
}

export interface BookingPublic {
  booking_number: string;
  status: BookingStatus;
  party_size: number;
  /** RFC3339, exprimé dans le fuseau du restaurant */
  date_from: string;
  duration_minutes: number;
  comment?: string;
  cancelable: boolean;
  modifiable: boolean;
  remaining_updates: number;
  merchant: MerchantPublic;
}

export interface WaitlistPublicEntry {
  status: "waiting" | "notified" | "seated" | "cancelled";
  party_size: number;
  customer_name: string;
  created_at: string;
  notified_at?: string;
  expires_at?: string;
}

export interface WaitlistState {
  waitlistToken: string;
  entry: WaitlistPublicEntry;
}

// Réponses brutes (data de l'enveloppe)
interface OpenHoursData {
  status?: string;
  error?: string;
  open_days?: number[];
  maximum_party_size?: number;
  merchant?: Merchant;
}

interface AvailabilityData {
  status?: string;
  error?: string;
  slots?: ApiSlot[];
}

interface PublicBookingData {
  status: string;
  error?: string;
  warning?: string;
  booking?: BookingPublic;
}

interface GenericData {
  status: string;
  error?: string;
}

interface WaitlistPublicData {
  status: string;
  error?: string;
  waitlist_id?: string;
  waitlist_token?: string;
  entry?: WaitlistPublicEntry;
}

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

const STATUS_MESSAGES: Record<string, string> = {
  "-1": "Ce restaurant est introuvable ou n'accepte plus de réservations en ligne.",
  "0": "Cette réservation est introuvable.",
  "-4": "Les informations envoyées sont invalides.",
  slot_unavailable: "Ce créneau vient d'être réservé. Merci d'en choisir un autre.",
  too_late_to_edit: "Le délai pour modifier ou annuler cette réservation est dépassé.",
  maximum_party_size_reached: "Le nombre de convives dépasse le maximum autorisé.",
  minimum_party_size_not_reached: "Le nombre de convives est inférieur au minimum requis.",
  waitlist_disabled: "La liste d'attente n'est pas disponible pour ce restaurant.",
  waitlist_full: "La liste d'attente est complète pour le moment.",
  already_closed: "Cette inscription en liste d'attente est déjà clôturée.",
  network: "Connexion impossible. Vérifiez votre réseau puis réessayez.",
};

export class ApiError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? STATUS_MESSAGES[code] ?? GENERIC_ERROR);
    this.name = "ApiError";
    this.code = code;
  }
}

function failure(status?: string): ApiError {
  return new ApiError(status ?? "unknown");
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

interface Envelope<T> {
  id: string;
  data: T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/rsv/${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("network");
  }

  let envelope: Envelope<T>;
  try {
    envelope = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(`http_${res.status}`);
  }

  if (!res.ok) throw new ApiError(`http_${res.status}`);
  return envelope.data;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function getOpenHours(slug: string): Promise<RestaurantInfo> {
  const data = await request<OpenHoursData>(`${encodeURIComponent(slug)}/open-hours`);
  if (!data.merchant) throw failure(data.status);
  return {
    // L'API renvoie 1–7 (7 = dimanche) ; JS getDay() attend 0 = dimanche.
    openDays: (data.open_days ?? []).map((d) => d % 7),
    maximumPartySize: data.maximum_party_size || data.merchant.reserve_maximum_party_size,
    minimumPartySize: Math.max(1, data.merchant.reserve_minimum_party_size || 1),
    merchant: data.merchant,
  };
}

export async function getAvailability(
  slug: string,
  date: string, // YYYY-MM-DD
  partySize: number
): Promise<ApiSlot[]> {
  const params = new URLSearchParams({ date, party_size: String(partySize) });
  const data = await request<AvailabilityData>(
    `${encodeURIComponent(slug)}/booking-availability?${params}`
  );
  if (data.status && data.status !== "1") throw failure(data.status);
  return data.slots ?? [];
}

export interface BookingInput {
  /** YYYY-MM-DD (jour choisi, fuseau du restaurant) */
  date: string;
  /** HH:MM (heure locale du restaurant, telle que renvoyée par l'availability) */
  time: string;
  partySize: number;
  comment: string;
}

export interface CustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface CreateBookingResult {
  booking: BookingPublic;
  /** ex: possible_duplicate_same_phone_same_slot */
  warning?: string;
}

export async function createBooking(
  slug: string,
  input: BookingInput,
  customer: CustomerInput,
  idempotencyKey: string
): Promise<CreateBookingResult> {
  const data = await request<PublicBookingData>(`${encodeURIComponent(slug)}/booking/create`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      booking: {
        start_date: `${input.date} ${input.time}:00`,
        party_size: input.partySize,
        comment: input.comment,
      },
      customer: {
        customer_first_name: customer.firstName,
        customer_last_name: customer.lastName,
        customer_email: customer.email,
        customer_tel: customer.phone,
      },
    }),
  });
  if (data.status !== "1" || !data.booking) throw failure(data.status);
  return { booking: data.booking, warning: data.warning };
}

export async function getBooking(slug: string, bookingNumber: string): Promise<BookingPublic> {
  const data = await request<PublicBookingData>(
    `${encodeURIComponent(slug)}/booking/${encodeURIComponent(bookingNumber)}`
  );
  if (data.status !== "1" || !data.booking) throw failure(data.status);
  return data.booking;
}

export async function updateBooking(
  slug: string,
  bookingNumber: string,
  input: BookingInput
): Promise<BookingPublic> {
  const data = await request<PublicBookingData>(
    `${encodeURIComponent(slug)}/booking/${encodeURIComponent(bookingNumber)}/update`,
    {
      method: "POST",
      body: JSON.stringify({
        booking: {
          booking_number: bookingNumber,
          start_date: `${input.date} ${input.time}:00`,
          party_size: input.partySize,
          comment: input.comment,
        },
      }),
    }
  );
  if (data.status !== "1" || !data.booking) throw failure(data.status);
  return data.booking;
}

export async function cancelBooking(slug: string, bookingNumber: string): Promise<void> {
  const data = await request<GenericData>(
    `${encodeURIComponent(slug)}/booking/${encodeURIComponent(bookingNumber)}/cancel`,
    { method: "DELETE" }
  );
  if (data.status !== "1") throw failure(data.status);
}

export interface WaitlistJoinInput {
  partySize: number;
  name: string;
  phone: string;
  notes?: string;
}

export async function joinWaitlist(slug: string, input: WaitlistJoinInput): Promise<WaitlistState> {
  const data = await request<WaitlistPublicData>(`${encodeURIComponent(slug)}/waitlist`, {
    method: "POST",
    body: JSON.stringify({
      party_size: input.partySize,
      customer_name: input.name,
      customer_phone: input.phone,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    }),
  });
  if (data.status !== "1" || !data.waitlist_token || !data.entry) throw failure(data.status);
  return { waitlistToken: data.waitlist_token, entry: data.entry };
}

export async function getWaitlistStatus(slug: string, token: string): Promise<WaitlistState> {
  const data = await request<WaitlistPublicData>(
    `${encodeURIComponent(slug)}/waitlist/${encodeURIComponent(token)}`
  );
  if (data.status !== "1" || !data.waitlist_token || !data.entry) throw failure(data.status);
  return { waitlistToken: data.waitlist_token, entry: data.entry };
}

export async function leaveWaitlist(slug: string, token: string): Promise<void> {
  const data = await request<GenericData>(
    `${encodeURIComponent(slug)}/waitlist/${encodeURIComponent(token)}`,
    { method: "DELETE" }
  );
  if (data.status !== "1" && data.status !== "already_closed") throw failure(data.status);
}

// ---------------------------------------------------------------------------
// Helpers dates
// ---------------------------------------------------------------------------

/** Clé de date locale YYYY-MM-DD (sans conversion UTC) */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse un timestamp API "YYYY-MM-DD HH:MM:SS" exprimé en UTC (waitlist) */
export function parseUtcTimestamp(value: string): Date | null {
  const date = new Date(value.replace(" ", "T") + "Z");
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Décompose date_from (RFC3339) en clé de jour et heure locales du
 * restaurant — utile pour pré-remplir le calendrier et les créneaux.
 */
export function bookingLocalParts(
  dateFrom: string,
  timezone: string
): { dateKey: string; time: string } {
  const date = new Date(dateFrom);
  try {
    const dateKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
    const time = new Intl.DateTimeFormat("fr-FR", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
    return { dateKey, time };
  } catch {
    return { dateKey: toDateKey(date), time: date.toTimeString().slice(0, 5) };
  }
}

/** Formatte date_from (RFC3339) dans le fuseau du restaurant */
export function formatBookingDate(
  dateFrom: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions
): string {
  const date = new Date(dateFrom);
  if (Number.isNaN(date.getTime())) return dateFrom;
  try {
    return new Intl.DateTimeFormat("fr-FR", { timeZone: timezone, ...options }).format(date);
  } catch {
    return new Intl.DateTimeFormat("fr-FR", options).format(date);
  }
}
