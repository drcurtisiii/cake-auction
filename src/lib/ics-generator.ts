/**
 * ICS Calendar File Generator
 *
 * Generates valid .ics (iCalendar) file content for auction pickup events.
 */

interface ICSEvent {
  title: string;
  description: string;
  startDate: string; // ISO 8601 or similar parseable date string
  endDate: string;
  location: string;
}

/**
 * Convert a date string to ICS UTC format: YYYYMMDDTHHMMSSZ
 */
function toICSDate(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Generate a unique UID for the calendar event.
 */
function generateUID(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}@cakeauction`;
}

/**
 * Escape special characters in ICS text fields.
 * ICS spec requires escaping backslashes, semicolons, commas, and newlines.
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate a valid .ics calendar file string for a given event.
 */
export function generateICS(event: ICSEvent | ICSEvent[]): string {
  const now = toICSDate(new Date().toISOString());
  const events = Array.isArray(event) ? event : [event];

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CakeAuction//Pickup Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'END:VCALENDAR',
  ];

  const eventLines = events.flatMap((item) => [
    'BEGIN:VEVENT',
    `UID:${generateUID()}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toICSDate(item.startDate)}`,
    `DTEND:${toICSDate(item.endDate)}`,
    `SUMMARY:${escapeICSText(item.title)}`,
    `DESCRIPTION:${escapeICSText(item.description)}`,
    `LOCATION:${escapeICSText(item.location)}`,
    'END:VEVENT',
  ]);

  lines.splice(lines.length - 1, 0, ...eventLines);

  // ICS files use CRLF line endings per RFC 5545
  return lines.join('\r\n') + '\r\n';
}
