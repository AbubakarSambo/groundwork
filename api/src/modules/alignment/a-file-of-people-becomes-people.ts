import type { Person } from './a-total-splits-by-what-people-did';

/**
 * THE EXPORT THEY ALREADY HAVE, RATHER THAN A CONNECTOR THEY DO NOT.
 *
 * "I should be able to read the CRM and do whatever the fuck is needed to help me set targets per
 * person. I am not an API user."
 *
 * The right answer is not a CRM integration. It is the file every CRM already exports, dropped in,
 * read in front of the person, and turned into rows they can correct before anything is proposed.
 * A connector would be slower to build, slower to sell, and worse: with a file, what the product
 * read is on the screen and wrong columns are obvious in a second.
 *
 * WHAT IT DOES NOT DO. It does not guess at a column it cannot find. A file with no tenure in it
 * produces people with no tenure, and the split says so, rather than assuming everybody is new or
 * everybody is established - either of which quietly moves every number on the page.
 */

/** The words a header might use for each thing, lowercased. First match wins, in this order. */
export const HEADER_WORDS: Record<'key' | 'lastPeriod' | 'months', string[]> = {
  key: ['name', 'rep', 'salesperson', 'person', 'owner', 'seller', 'full name', 'employee'],
  lastPeriod: ['closed', 'units', 'sold', 'deals', 'last year', 'total', 'volume', 'count', 'won'],
  months: ['months', 'tenure', 'months with us', 'length of service', 'service'],
};

const norm = (s: string) => s.toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Which column is which, by header. Null where the file does not have one. */
export function whichColumns(header: string[]): Record<'key' | 'lastPeriod' | 'months', number | null> {
  const cells = header.map(norm);
  const find = (words: string[]) => {
    for (const w of words) {
      const exact = cells.findIndex((c) => c === w);
      if (exact >= 0) return exact;
    }
    for (const w of words) {
      const partial = cells.findIndex((c) => c.includes(w));
      if (partial >= 0) return partial;
    }
    return null;
  };
  return { key: find(HEADER_WORDS.key), lastPeriod: find(HEADER_WORDS.lastPeriod), months: find(HEADER_WORDS.months) };
}

/**
 * A YEAR AND A HALF IS EIGHTEEN MONTHS, AND SO IS "18".
 *
 * Tenure arrives as whatever somebody typed: 18, "18 months", "1.5 years", "1 yr 6 mo". Read what
 * is there; anything unreadable is nothing rather than a guess, because a guessed tenure moves the
 * person's number without anybody choosing to.
 */
export function monthsFrom(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : null;
  const t = norm(String(raw));
  const years = t.match(/([\d.]+)\s*(?:years?|yrs?|y)\b/);
  const months = t.match(/([\d.]+)\s*(?:months?|mos?|m)\b/);
  if (years || months) {
    const y = years ? parseFloat(years[1]) : 0;
    const m = months ? parseFloat(months[1]) : 0;
    const total = y * 12 + m;
    return Number.isFinite(total) && total > 0 ? Math.round(total) : null;
  }
  const bare = parseFloat(t.replace(/[^\d.]/g, ''));
  return Number.isFinite(bare) && bare > 0 ? Math.round(bare) : null;
}

const numberFrom = (raw: string | number | null | undefined): number | null => {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export interface WhatWeRead {
  people: (Person & { monthsKnown: boolean })[];
  /** Columns the file did not have, named so the reader can see what is missing before proposing. */
  missing: ('name' | 'what they closed' | 'how long they have been here')[];
  /** Rows that had no name or no figure, counted rather than silently dropped. */
  skipped: number;
}

export function peopleFrom(rows: (string | number | null)[][]): WhatWeRead {
  if (!rows.length) return { people: [], missing: ['name', 'what they closed', 'how long they have been here'], skipped: 0 };
  const [header, ...body] = rows;
  const at = whichColumns(header.map((h) => String(h ?? '')));

  const missing: WhatWeRead['missing'] = [];
  if (at.key == null) missing.push('name');
  if (at.lastPeriod == null) missing.push('what they closed');
  if (at.months == null) missing.push('how long they have been here');

  let skipped = 0;
  const people = body.flatMap((row) => {
    const key = at.key == null ? null : String(row[at.key] ?? '').trim();
    const closed = at.lastPeriod == null ? null : numberFrom(row[at.lastPeriod]);
    if (!key || closed == null) {
      /* A blank line at the end of an export is not a skipped person. */
      if (row.some((c) => String(c ?? '').trim())) skipped += 1;
      return [];
    }
    const months = at.months == null ? null : monthsFrom(row[at.months]);
    return [{
      key,
      lastPeriod: closed,
      /* No tenure means no tenure. Twelve is the neutral reading - a full year, no part-year
         adjustment - and `monthsKnown` says it was not theirs, so nothing pretends otherwise. */
      months: months ?? 12,
      monthsKnown: months != null,
    }];
  });

  return { people, missing, skipped };
}
