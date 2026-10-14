/**
 * A NUMBER KEEPS THE UNIT AND SYMBOL THE DOCUMENT GAVE IT (B-014). People's own words are never changed,
 * so "Discount ceiling 5%" is said back as "5%", never "5", and "KES 4.5 million" as "KES 4.5 million".
 * The read hands back a bare number; this finds that figure in the document as it was written, with its
 * unit or currency, and returns those words. Where the document wrote it with no unit, nothing is returned
 * and the bare number is said as before.
 */
const SCALE: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, bn: 1e9, billion: 1e9 };
const A_FIGURE = /(?:\b(KES|KSh|Ksh|USD|NGN|GHS|UGX|TZS|ZAR|EUR|GBP|Rs)\.?\s?|([$£€₦]))?(\d[\d,]*(?:\.\d+)?)(?:\s?(%|percent\b|per cent\b|million\b|thousand\b|billion\b|bn\b|m\b|k\b))?/gi;

const wordsOf = (s: string) => (s ?? '').toLowerCase().match(/[a-z]{3,}/g) ?? [];

export function theFigureAsWritten(n: number, content: string, what?: string | null): string | null {
  if (n == null || !Number.isFinite(n) || !content) return null;
  const found: { text: string; line: string }[] = [];
  for (const line of content.split(/\n/)) {
    for (const m of line.matchAll(A_FIGURE)) {
      const [whole, code, symbol, digits, unit] = m;
      if (!code && !symbol && !unit) continue;
      const base = parseFloat(digits.replace(/,/g, ''));
      const u = (unit ?? '').toLowerCase();
      const value = u in SCALE ? base * SCALE[u] : base;
      if (Math.abs(value - n) > 1e-6 && Math.round(value) !== n) continue;
      found.push({ text: whole.trim(), line });
    }
  }
  if (!found.length) return theFigureUnderAColumnsCurrency(n, content, what);
  const words = wordsOf(what ?? '');
  const near = found.find((f) => words.some((w) => f.line.toLowerCase().includes(w)));
  return (near ?? found[0]).text;
}

/**
 * A TABLE THAT GIVES ITS CURRENCY ONCE, IN THE COLUMN'S HEADING (pilots, 13 October 2026, problem 3).
 *
 * A fee note read "Item  Amount (KES)" above "Total due  466,450.00", and the read said the total back
 * as "466,450", with its currency dropped. Where the figure has no unit on its own line, and a line above
 * it names a currency in brackets, the figure is said with that currency, and its digits as written.
 */
const A_COLUMNS_CURRENCY = /\((KES|KSh|Ksh|USD|NGN|GHS|UGX|TZS|ZAR|EUR|GBP|Rs|[$£€₦])\)/;
function theFigureUnderAColumnsCurrency(n: number, content: string, what?: string | null): string | null {
  const lines = content.split(/\n/);
  const words = wordsOf(what ?? '');
  let currency: string | null = null;
  let first: string | null = null;
  for (const line of lines) {
    const heading = A_COLUMNS_CURRENCY.exec(line);
    if (heading && !/\d[\d,]*(?:\.\d+)?\s*$/.test(line.replace(A_COLUMNS_CURRENCY, ''))) { currency = heading[1]; continue; }
    if (!currency) continue;
    for (const m of line.matchAll(/(?<![\d.,])(\d[\d,]*(?:\.\d+)?)(?![\d%])/g)) {
      const value = parseFloat(m[1].replace(/,/g, ''));
      if (Math.abs(value - n) > 1e-6 && Math.round(value) !== n) continue;
      const said = `${currency} ${m[1]}`;
      if (words.some((w) => line.toLowerCase().includes(w))) return said;
      first = first ?? said;
    }
  }
  return first;
}
