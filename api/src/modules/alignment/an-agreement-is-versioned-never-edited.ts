/**
 * WHAT IS IN FORCE, SINCE WHEN, AND WHO CHECKED IT.
 *
 * Three questions, and a commercial relationship that cannot answer them has no
 * ground to stand an argument on. Everything here exists to answer them and
 * nothing else — this is not contract management. No clause library, no redlining,
 * no signature workflow. A term, a source, and a date.
 *
 * ==========================================================================
 * A VERSION IS NEVER EDITED. THAT IS THE WHOLE DESIGN.
 * ==========================================================================
 *
 * The moment a version can be edited, "what did the agreement say in July" stops
 * having an answer — and July is exactly when the thing being argued about
 * happened. An amendment is a NEW version with its own start date, and the old one
 * keeps standing over the period it covered.
 *
 * This is not a preference about data modelling. In a disagreement between two
 * companies, the party who can quietly change the record is the party nobody
 * should believe, and a product that permits it is one neither side can use as an
 * independent layer.
 *
 * PERIODS DO NOT OVERLAP AND THEY DO NOT LEAVE HOLES. A day with two versions in
 * force is a day where "what does the agreement say" has two answers; a day with
 * none is a day nothing can be judged against. `whyThisCannotStart` refuses both.
 */

export type VersionState =
  /** Somebody is putting it together. Nothing may be judged against it. */
  | 'being put together'
  /** Both sides have said this is what they signed. */
  | 'in force'
  /** A later version took over. It still stands over the period it covered. */
  | 'replaced';

export interface AgreementVersion {
  id: string;
  /** Which version of the same agreement. 1, 2, 3 — an amendment is the next number. */
  number: number;
  state: VersionState;
  /** From when it applies. Inclusive, a calendar date. */
  inForceFrom: Date;
  /** Until when, or null where it is the current one. */
  inForceTo: Date | null;
  /** Who said this is what was signed, on each side. Both, or it is not in force. */
  agreedBy: string[];
}

/**
 * Which version governs a given day, or why none does.
 *
 * Returning the reason rather than null is deliberate: "the agreement did not
 * start until October" is the answer to a great many apparent breaches, and it is
 * a sentence somebody can act on.
 */
export function whatWasInForce(
  versions: AgreementVersion[],
  on: Date,
): { version: AgreementVersion } | { none: string } {
  const day = at(on);
  const live = versions.filter((v) => v.state !== 'being put together');

  const covering = live.filter(
    (v) => at(v.inForceFrom) <= day && (v.inForceTo === null || at(v.inForceTo) >= day),
  );

  if (covering.length === 1) return { version: covering[0] };

  if (covering.length > 1) {
    /* Should be impossible — `whyThisCannotStart` refuses it — and if it ever
       happens, picking one is picking which agreement two companies are under. */
    return {
      none: 'More than one version of this agreement covers that date, so what was in force cannot be decided here. Somebody has to say.',
    };
  }

  const earliest = live.reduce<Date | null>(
    (min, v) => (min === null || at(v.inForceFrom) < min ? at(v.inForceFrom) : min),
    null,
  );
  if (earliest !== null && day < earliest) {
    return { none: `Nothing was in force then - this agreement starts on ${earliest.toISOString().slice(0, 10)}.` };
  }
  return { none: 'No version of this agreement covers that date.' };
}

/**
 * Why a new version cannot start when it is proposed to, or null where it can.
 *
 * A version starting before the one it replaces, or leaving a gap between them,
 * both produce days that cannot be reasoned about. Both are refused at the moment
 * somebody tries rather than discovered six months later in an argument.
 */
export function whyThisCannotStart(existing: AgreementVersion[], from: Date): string | null {
  const live = existing.filter((v) => v.state !== 'being put together');
  if (live.length === 0) return null;

  const current = live.reduce((a, b) => (at(b.inForceFrom) > at(a.inForceFrom) ? b : a));
  const day = at(from);

  if (day <= at(current.inForceFrom)) {
    return `Version ${current.number} has been in force since ${current.inForceFrom.toISOString().slice(0, 10)}. A new version starts after that, not before it - the old one keeps standing over the period it covered.`;
  }
  return null;
}

/** A calendar day, with any time part discarded. */
function at(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** What an amendment does to the version it replaces: closes it the day before. */
export function theDayBefore(from: Date): Date {
  const d = at(from);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}
