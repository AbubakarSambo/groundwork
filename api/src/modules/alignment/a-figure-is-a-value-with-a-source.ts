/**
 * A FIGURE IS A VALUE, A PERIOD AND WHERE IT CAME FROM — AND NOT A SENTENCE.
 *
 * Today a revenue number lives inside a paragraph inside a document. A model can
 * read it, and reads it slightly differently next month, and nothing records that
 * it read it at all. Nothing can be compared to anything, so the whole of the
 * investigative work this product is being asked to do is impossible — not hard,
 * impossible.
 *
 * This is the object that makes arithmetic possible. It is deliberately small.
 *
 * WHAT MAKES IT SAFE IS WHAT IT REFUSES TO DO.
 *
 *   IT NEVER COMPARES TWO FIGURES THAT ARE NOT COMPARABLE. Different currency,
 *   different period, different basis — a comparison across any of those produces
 *   a difference that is real arithmetic and complete nonsense, and it is the
 *   most convincing kind of wrong answer there is. `whyTheseCannotBeCompared`
 *   comes back with a sentence rather than a number.
 *
 *   IT NEVER DECIDES A FIGURE IS WRONG. A figure has a source and a person who
 *   stated it. Where two disagree, both stand and the difference is the thing
 *   that exists — see `what-does-not-add-up.ts`.
 *
 *   IT CARRIES WHO SAID SO, ALWAYS. A number nobody is attached to cannot be
 *   asked about, and asking is the whole method.
 *
 * MONEY IS HELD IN MINOR UNITS, AS AN INTEGER. Floating point loses cents, and a
 * reconciliation that is out by a cent is one nobody trusts again — the arithmetic
 * has to be exactly right or the product has no business doing it.
 */

/** Where a figure came from. Not a judgement of its quality — that is `EvidenceItem`'s job later. */
export type FigureSource =
  | 'a document somebody uploaded'
  | 'something somebody said in a check-in'
  | 'a system this organisation connected'
  | 'a person typed it in';

export interface Period {
  /** Inclusive, as a plain date. Periods are calendar things, not timestamps. */
  from: Date;
  /** Inclusive. */
  to: Date;
}

export interface Figure {
  /** What it is a figure OF, in the words the person used: "revenue", "VAT declared". */
  says: string;
  /** Minor units — cents, kobo. Integer, always. */
  minorUnits: number;
  /** ISO 4217. A comparison across two currencies is refused rather than converted. */
  currency: string;
  period: Period;
  source: FigureSource;
  /** Who stated it. A figure nobody is attached to cannot be asked about. */
  statedBy: string;
  /** Where exactly — a document name, a system, a session. */
  from: string;
}

/** Same day, ignoring any time part. Periods are calendar things. */
const sameDay = (a: Date, b: Date) =>
  a.getUTCFullYear() === b.getUTCFullYear()
  && a.getUTCMonth() === b.getUTCMonth()
  && a.getUTCDate() === b.getUTCDate();

/**
 * WHY TWO FIGURES CANNOT BE COMPARED, OR NULL WHERE THEY CAN.
 *
 * Returning the REASON rather than a boolean is the point: "these cover different
 * periods" is the beginning of a useful conversation, and `false` is the end of
 * one. Most real mismatches in a commercial relationship turn out to be exactly
 * this — one side counting a quarter the other side does not.
 */
export function whyTheseCannotBeCompared(a: Figure, b: Figure): string | null {
  if (a.currency !== b.currency) {
    return `One is in ${a.currency} and the other in ${b.currency}. Converting them here would invent a rate nobody agreed.`;
  }
  if (!sameDay(a.period.from, b.period.from) || !sameDay(a.period.to, b.period.to)) {
    return `They cover different periods — ${said(a.period)} and ${said(b.period)}. A difference between them would be arithmetic about two different things.`;
  }
  return null;
}

/** A period in the words a person reads. */
export function said(p: Period): string {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return `${day(p.from)} to ${day(p.to)}`;
}

/** Money, said. Never rounded away — the whole point of minor units. */
export function money(minorUnits: number, currency: string): string {
  const negative = minorUnits < 0;
  const whole = Math.trunc(Math.abs(minorUnits) / 100);
  const part = String(Math.abs(minorUnits) % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${currency} ${whole.toLocaleString('en-US')}.${part}`;
}

/** How a figure reads with its provenance attached, because it never travels without it. */
export function howItReads(f: Figure): string {
  return `${f.says}: ${money(f.minorUnits, f.currency)} for ${said(f.period)}, ${f.source} — ${f.from}, stated by ${f.statedBy}.`;
}

/**
 * Adding figures up. Refuses rather than guesses.
 *
 * Every part has to be comparable with every other, which in practice means one
 * currency and one period. A sum across two quarters is not a sum.
 */
export function addUp(parts: Figure[]): { total: number; currency: string } | { cannot: string } {
  if (parts.length === 0) return { cannot: 'there is nothing to add up' };

  for (const p of parts.slice(1)) {
    const why = whyTheseCannotBeCompared(parts[0], p);
    if (why) return { cannot: why };
  }

  return {
    total: parts.reduce((sum, p) => sum + p.minorUnits, 0),
    currency: parts[0].currency,
  };
}
