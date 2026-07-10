// Persistance locale légère : réservations récentes et jeton de liste
// d'attente, cloisonnés par restaurant (slug).

const BOOKINGS_KEY = (slug: string) => `wr:bookings:${slug}`;
const WAITLIST_KEY = (slug: string) => `wr:waitlist:${slug}`;

const MAX_REMEMBERED = 5;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible (navigation privée…) : silencieux */
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* silencieux */
  }
}

export function getRememberedBookings(slug: string): string[] {
  const raw = safeGet(BOOKINGS_KEY(slug));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function rememberBooking(slug: string, bookingNumber: string) {
  const list = getRememberedBookings(slug).filter((n) => n !== bookingNumber);
  list.unshift(bookingNumber);
  safeSet(BOOKINGS_KEY(slug), JSON.stringify(list.slice(0, MAX_REMEMBERED)));
}

export function forgetBooking(slug: string, bookingNumber: string) {
  const list = getRememberedBookings(slug).filter((n) => n !== bookingNumber);
  safeSet(BOOKINGS_KEY(slug), JSON.stringify(list));
}

export function getWaitlistToken(slug: string): string | null {
  return safeGet(WAITLIST_KEY(slug));
}

export function rememberWaitlistToken(slug: string, token: string) {
  safeSet(WAITLIST_KEY(slug), token);
}

export function clearWaitlistToken(slug: string) {
  safeRemove(WAITLIST_KEY(slug));
}
