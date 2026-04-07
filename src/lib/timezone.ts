import { format } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

const DEFAULT_APP_TIME_ZONE = 'America/New_York';

export function getAppTimeZone(): string {
  return (
    process.env.APP_TIME_ZONE ||
    process.env.NEXT_PUBLIC_APP_TIME_ZONE ||
    DEFAULT_APP_TIME_ZONE
  );
}

export function getAppTimeZoneDisplay(): string {
  const timeZone = getAppTimeZone();
  const abbreviation = formatInTimeZone(new Date(), timeZone, 'zzz');
  return `${timeZone} (${abbreviation})`;
}

export function localDateTimeToUtcIso(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  return fromZonedTime(value, getAppTimeZone()).toISOString();
}

export function utcIsoToLocalDateTimeInput(
  value: string | null | undefined
): string {
  if (!value) return '';
  const zonedDate = toZonedTime(value, getAppTimeZone());
  return format(zonedDate, "yyyy-MM-dd'T'HH:mm");
}

export function formatInAppTimeZone(
  value: string | Date | null | undefined,
  dateFormat = 'MMM d, yyyy, h:mm a zzz'
): string {
  if (!value) return 'TBD';
  return formatInTimeZone(value, getAppTimeZone(), dateFormat);
}

export function localDateAndTimeToUtcIso(
  date: string | null | undefined,
  time: string | null | undefined,
): string | null {
  if (!date || !time) return null;
  return fromZonedTime(`${date}T${time}`, getAppTimeZone()).toISOString();
}

export function formatAppLocalDateAndTime(
  date: string | null | undefined,
  time: string | null | undefined,
  dateFormat = 'MMM d, yyyy, h:mm a zzz',
): string {
  const iso = localDateAndTimeToUtcIso(date, time);
  if (!iso) return 'TBD';
  return formatInTimeZone(iso, getAppTimeZone(), dateFormat);
}
