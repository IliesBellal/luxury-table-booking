// Mock API layer — replace with real fetch calls when ready

export interface BookingPayload {
  customer: {
    customer_first_name: string;
    customer_last_name: string;
    customer_email: string;
    customer_tel: string;
  };
  booking: {
    start_date: number;
    party_size: number;
    comment: string;
  };
}

export interface BookingDetail {
  booking_number: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_tel: string;
  start_date: number;
  party_size: number;
  comment: string;
  cancelable_by_customer: boolean;
  cancel_booking_limit_offset_hours: number;
  status: "confirmed" | "cancelled";
}

// Simulated in-memory store for mock
const bookings = new Map<string, BookingDetail>();

export async function createBooking(payload: BookingPayload): Promise<{ booking_number: string }> {
  await new Promise((r) => setTimeout(r, 1400));
  const booking_number = `RSV-${Date.now().toString(36).toUpperCase()}`;
  bookings.set(booking_number, {
    booking_number,
    customer_first_name: payload.customer.customer_first_name,
    customer_last_name: payload.customer.customer_last_name,
    customer_email: payload.customer.customer_email,
    customer_tel: payload.customer.customer_tel,
    start_date: payload.booking.start_date,
    party_size: payload.booking.party_size,
    comment: payload.booking.comment,
    cancelable_by_customer: true,
    cancel_booking_limit_offset_hours: 2,
    status: "confirmed",
  });
  return { booking_number };
}

export async function getBooking(bookingNumber: string): Promise<BookingDetail> {
  await new Promise((r) => setTimeout(r, 800));
  const b = bookings.get(bookingNumber);
  if (!b) throw new Error("Réservation introuvable");
  return b;
}

export async function updateBooking(
  bookingNumber: string,
  payload: Partial<BookingPayload>
): Promise<BookingDetail> {
  await new Promise((r) => setTimeout(r, 1000));
  const b = bookings.get(bookingNumber);
  if (!b) throw new Error("Réservation introuvable");

  if (!canModify(b)) throw new Error("Désolé, cette réservation n'est plus modifiable.");

  if (payload.customer) {
    if (payload.customer.customer_first_name) b.customer_first_name = payload.customer.customer_first_name;
    if (payload.customer.customer_last_name) b.customer_last_name = payload.customer.customer_last_name;
    if (payload.customer.customer_email) b.customer_email = payload.customer.customer_email;
    if (payload.customer.customer_tel) b.customer_tel = payload.customer.customer_tel;
  }
  if (payload.booking) {
    if (payload.booking.party_size) b.party_size = payload.booking.party_size;
    if (payload.booking.comment !== undefined) b.comment = payload.booking.comment;
    if (payload.booking.start_date) b.start_date = payload.booking.start_date;
  }
  return b;
}

export async function cancelBooking(bookingNumber: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 800));
  const b = bookings.get(bookingNumber);
  if (!b) throw new Error("Réservation introuvable");
  if (!canModify(b)) throw new Error("Désolé, cette réservation n'est plus annulable.");
  b.status = "cancelled";
}

export function canModify(b: BookingDetail): boolean {
  if (!b.cancelable_by_customer) return false;
  const now = Date.now() / 1000;
  const hoursUntil = (b.start_date - now) / 3600;
  return hoursUntil > b.cancel_booking_limit_offset_hours;
}
