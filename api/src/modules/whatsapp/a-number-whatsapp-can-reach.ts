/**
 * ONE WAY TO WRITE A PHONE NUMBER, THE WAY WHATSAPP SENDS IT (survey item 6).
 *
 * WhatsApp names the person writing by their number in international form: the country code and the
 * rest, digits only ("2348012345678"). Numbers typed by people were kept as typed, or with only the
 * spaces taken out, so "+234 801 234 5678" in an admin's roster entry and "0801 234 5678" in Settings
 * never matched the number WhatsApp sent, and the person was told their number was not recognised.
 *
 * Every number is now kept in one form: a plus, the country code, and the rest, digits only
 * ("+2348012345678", the same digits WhatsApp sends with a plus in front). A local number starting
 * with 0 needs the organisation's country to become that; without it, it is refused with a plain
 * sentence asking for the full number. Numbers already stored are matched in either form.
 */

export const WRITE_THE_FULL_NUMBER = 'Please write the whole number with the country code at the start, for example +234 801 234 5678.';
export const NOT_A_FULL_NUMBER = 'That does not look like a whole phone number. Please write it with the country code at the start, for example +234 801 234 5678.';

/*
 * Country calling codes are one, two or three digits, and no shorter code is the start of a longer
 * one (ITU E.164). 1 and 7 are the one-digit codes; these are the two-digit ones; everything else is three.
 */
const TWO_DIGIT_CODES = new Set([
  '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45', '46', '47', '48', '49',
  '51', '52', '53', '54', '55', '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86',
  '90', '91', '92', '93', '94', '95', '98',
]);

/** The country calling code at the start of an international number, digits only ("234" for "2348012345678"). */
export function callingCodeOf(international: string | null | undefined): string | null {
  const d = (international ?? '').replace(/\D/g, '');
  if (d.length < 8 || d.startsWith('0')) return null;
  if (d[0] === '1' || d[0] === '7') return d[0];
  if (TWO_DIGIT_CODES.has(d.slice(0, 2))) return d.slice(0, 2);
  return d.slice(0, 3);
}

export type ATidiedNumber = { number: string } | { refused: string };

/**
 * A number as somebody typed it, in the one stored form. `countryCode` is the organisation's calling
 * code ("234"), needed only for a local number that starts with 0.
 */
export function tidyANumber(raw: string, countryCode?: string | null): ATidiedNumber {
  let t = (raw ?? '').trim();
  if (!t) return { refused: NOT_A_FULL_NUMBER };
  /* "+44 (0)7700 900123": the bracketed 0 is the local prefix, never dialled with the country code. */
  t = t.replace(/\(\s*0\s*\)/g, '');
  if (/[a-z]/i.test(t)) return { refused: NOT_A_FULL_NUMBER };
  const plus = t.startsWith('+');
  let digits = t.replace(/\D/g, '');
  if (plus) {
    /* "+0801...": a local number with a plus put in front of it, which is how a local number used to be stored. */
    if (digits.startsWith('0')) {
      if (!countryCode) return { refused: WRITE_THE_FULL_NUMBER };
      digits = countryCode + digits.replace(/^0+/, '');
    }
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    if (!countryCode) return { refused: WRITE_THE_FULL_NUMBER };
    digits = countryCode + digits.replace(/^0+/, '');
  }
  if (digits.length < 8 || digits.length > 15 || digits.startsWith('0')) return { refused: NOT_A_FULL_NUMBER };
  return { number: `+${digits}` };
}

/**
 * EVERY FORM THE SAME NUMBER MAY ALREADY BE STORED IN, for looking one up. The international form
 * with and without its plus, and the local form with a 0 (with and without a stray plus, the way a
 * local number used to be stored). A row found by its local form belongs to the number only when its
 * organisation's country is the number's country; `aLocalForm` says which rows need that check.
 */
export function formsOfTheSameNumber(raw: string): string[] {
  const digits = (raw ?? '').replace(/\D/g, '').replace(/^00/, '');
  if (!digits) return [];
  const forms = new Set<string>([`+${digits}`, digits]);
  const code = callingCodeOf(digits);
  if (code) {
    const national = digits.slice(code.length);
    if (national) { forms.add(`0${national}`); forms.add(`+0${national}`); }
  }
  return [...forms];
}

/** Whether a stored number is in a local form, so it is only the same number in its own country. */
export function aLocalForm(stored: string | null | undefined): boolean {
  return /^\+?0(?!0)/.test((stored ?? '').trim());
}
