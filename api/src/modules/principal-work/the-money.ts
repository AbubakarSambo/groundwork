/**
 * MONEY, DONE IN CODE (Ebele, increment 6b; plan section 12: "All financial arithmetic must be deterministic").
 * An amount is read once into whole minor units (kobo, cents), every sum is a sum of those whole numbers, and a total is only ever added within one
 * currency. No model reads, adds or compares an amount.
 */
export interface AMoney { minor: number; currency: string | null }

const SYMBOLS: [RegExp, string][] = [[/₦|\bNGN\b|\bnaira\b/i, 'NGN'], [/\bUSD\b|\$|\bdollars?\b/i, 'USD'], [/€|\bEUR\b/i, 'EUR'], [/£|\bGBP\b/i, 'GBP'], [/\bKES\b|\bKSh\b/i, 'KES']];

export function currencyIn(text: string | null | undefined): string | null {
  const t = String(text ?? '');
  for (const [re, code] of SYMBOLS) if (re.test(t)) return code;
  return null;
}

/** "₦1,250,000.50", "NGN 1.25m", "500k", "1250000". Null when no amount can be read, so nothing is guessed. */
export function readMoney(raw: string | number | null | undefined, currencyHint?: string | null): AMoney | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const currency = currencyIn(text) ?? (currencyHint ? currencyIn(currencyHint) ?? currencyHint.trim().toUpperCase().slice(0, 3) : null);
  const m = /(-?\d[\d,]*(?:\.\d+)?)\s*(k|m|bn|b)?\b/i.exec(text.replace(/\s+/g, ' '));
  if (!m) return null;
  const number = m[1].replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(number)) return null;
  const mult = { k: 1_000, m: 1_000_000, b: 1_000_000_000, bn: 1_000_000_000 }[(m[2] ?? '').toLowerCase() as 'k'] ?? 1;
  const [whole, frac = ''] = number.replace('-', '').split('.');
  const minorOfFraction = Number((frac + '00').slice(0, 2));
  const minor = (Number(whole) * 100 + minorOfFraction) * mult;
  if (!Number.isSafeInteger(minor)) return null;
  return { minor: number.startsWith('-') ? -minor : minor, currency };
}

export const sameAmount = (a: AMoney | null, b: AMoney | null): boolean => !!a && !!b && a.minor === b.minor && (!a.currency || !b.currency || a.currency === b.currency);

/** "NGN 1,250,000" or "NGN 1,250,000.50". The kobo are shown only when there are some. */
export function sayMoney(m: AMoney): string {
  const sign = m.minor < 0 ? '-' : '';
  const abs = Math.abs(m.minor);
  const whole = Math.floor(abs / 100).toLocaleString('en-US');
  const cents = abs % 100;
  return `${m.currency ? `${m.currency} ` : ''}${sign}${whole}${cents ? `.${String(cents).padStart(2, '0')}` : ''}`;
}

/** Totals by currency, in whole minor units. An amount with no currency is totalled under "no currency", never added to another. */
export function totalsByCurrency(amounts: (AMoney | null)[]): { currency: string | null; minor: number; count: number }[] {
  const out = new Map<string, { currency: string | null; minor: number; count: number }>();
  for (const a of amounts) {
    if (!a) continue;
    const k = a.currency ?? '';
    const t = out.get(k) ?? { currency: a.currency, minor: 0, count: 0 };
    t.minor += a.minor;
    t.count += 1;
    out.set(k, t);
  }
  return [...out.values()];
}

export const sayTotals = (totals: { currency: string | null; minor: number }[]): string => totals.map((t) => sayMoney({ minor: t.minor, currency: t.currency })).join(' and ');

/** The Decimal column's text, "1250000.50", from minor units. */
export const toDecimalText = (minor: number): string => `${minor < 0 ? '-' : ''}${Math.floor(Math.abs(minor) / 100)}.${String(Math.abs(minor) % 100).padStart(2, '0')}`;
export function fromDecimal(d: unknown, currency: string | null): AMoney | null {
  const m = d === null || d === undefined ? null : readMoney(String(d), null);
  return m ? { minor: m.minor, currency } : null;
}
