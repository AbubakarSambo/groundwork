import { displayTimezone, whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * THE TIME A PERSON READS IS THEIR OWN (B-140). "Your check-in opens in an hour, at 3:22 pm" was
 * worked out in the platform's zone (West Africa), so a person in Nairobi, where it opened at
 * 5:22 pm, was told the wrong hour. The zone is the one the roster gives for them; failing that the
 * country their WhatsApp number belongs to, where the country has one zone; failing that the
 * platform's, and the zone is named either way so the hour can never be misread.
 */
const ONE_ZONE_COUNTRIES: [string, string][] = [
  ['254', 'Africa/Nairobi'], ['255', 'Africa/Dar_es_Salaam'], ['256', 'Africa/Kampala'], ['250', 'Africa/Kigali'], ['257', 'Africa/Bujumbura'],
  ['251', 'Africa/Addis_Ababa'], ['252', 'Africa/Mogadishu'], ['234', 'Africa/Lagos'], ['233', 'Africa/Accra'], ['221', 'Africa/Dakar'],
  ['225', 'Africa/Abidjan'], ['237', 'Africa/Douala'], ['27', 'Africa/Johannesburg'], ['260', 'Africa/Lusaka'], ['263', 'Africa/Harare'],
  ['265', 'Africa/Blantyre'], ['258', 'Africa/Maputo'], ['267', 'Africa/Gaborone'], ['264', 'Africa/Windhoek'], ['20', 'Africa/Cairo'],
  ['212', 'Africa/Casablanca'], ['216', 'Africa/Tunis'], ['44', 'Europe/London'],
];

function isAZone(z: string | null | undefined): z is string {
  if (!z) return false;
  try { new Intl.DateTimeFormat('en-GB', { timeZone: z }); return true; } catch { return false; }
}

/** The zone to tell this person a time in. */
export function theirTimeZone(rosterZone: string | null | undefined, phone: string | null | undefined): string {
  if (isAZone(rosterZone)) return rosterZone;
  return thePhonesOwnZone(phone) ?? displayTimezone();
}

/** The zone of the country a number belongs to, where the country has one; null where it is not one we know. */
export function thePhonesOwnZone(phone: string | null | undefined): string | null {
  const digits = String(phone ?? '').replace(/\D/g, '');
  // The longest calling code first, so 254 is never read as 25.
  for (const [code, zone] of [...ONE_ZONE_COUNTRIES].sort((a, b) => b[0].length - a[0].length)) if (digits.startsWith(code)) return zone;
  return null;
}

/** "5:22 pm East Africa Time": the hour in that zone, with the zone named. */
export function anHourInTheirZone(at: Date, zone: string): string {
  const hour = whenItWas(at, 'hourOfDay', zone);
  const name = new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'long' }).formatToParts(at).find((p) => p.type === 'timeZoneName')?.value;
  return name ? `${hour} ${name}` : hour;
}
