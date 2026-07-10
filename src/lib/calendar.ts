// Génération d'événements calendrier (fichier .ics + lien Google Calendar)
// à partir d'une réservation publique.

import type { BookingPublic } from "@/lib/api";

interface CalendarEvent {
  startUtc: Date;
  endUtc: Date;
  title: string;
  description: string;
  location: string;
}

function toUtcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function toCalendarEvent(booking: BookingPublic): CalendarEvent {
  const startUtc = new Date(booking.date_from);
  const duration = booking.duration_minutes > 0 ? booking.duration_minutes : 90;
  const endUtc = new Date(startUtc.getTime() + duration * 60_000);
  const { merchant } = booking;
  const location = [
    `${merchant.address.street_number} ${merchant.address.street}`.trim(),
    `${merchant.address.zip_code} ${merchant.address.city}`.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    startUtc,
    endUtc,
    title: `Réservation — ${merchant.business_name}`,
    description: [
      `Réservation n° ${booking.booking_number}`,
      `${booking.party_size} personne${booking.party_size > 1 ? "s" : ""}`,
      merchant.phone ? `Restaurant : ${merchant.phone}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    location,
  };
}

export function downloadIcs(booking: BookingPublic) {
  const event = toCalendarEvent(booking);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WelloResto//Reservation//FR",
    "BEGIN:VEVENT",
    `UID:${booking.booking_number}@welloresto`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(event.startUtc)}`,
    `DTEND:${toUtcStamp(event.endUtc)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reservation-${booking.booking_number}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function googleCalendarUrl(booking: BookingPublic): string {
  const event = toCalendarEvent(booking);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toUtcStamp(event.startUtc)}/${toUtcStamp(event.endUtc)}`,
    details: event.description,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
