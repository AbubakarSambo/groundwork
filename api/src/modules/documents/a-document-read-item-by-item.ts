/**
 * A DOCUMENT READ ITEM BY ITEM, WITH THE PAGE EACH ITEM CAME FROM (week 14, screens request 6c).
 *
 * The prototype's "Add a document" screen lists what the check-in took from a file, one item to a
 * line with its page, and then what it left out and why:
 *
 *   What it took from the document
 *     List prices. KES 62,000 to KES 110,000. Page 1
 *   What it left out
 *     Bank account details. Page 4. Never kept, in any document.
 *
 * WHERE THE PAGES COME FROM. A PDF with a text layer is read by pdf-parse, which ends every page
 * with a marker of its own ("-- 2 of 4 --"). Those markers are kept in the stored text, so the page
 * an item sits on is found there, by looking for the item's own number, name or date on each page.
 * The model is never asked for a page: a page it guessed would be a plausible wrong answer.
 *
 * WHERE PAGES ARE LOST, IT SAYS SO. A scanned PDF is read from a picture of its pages by the vision
 * model, which returns one block of text with no pages. Then the items are served without a page,
 * and `pagesNote` says why. A spreadsheet, a Word file or a note has no pages, and nothing is said.
 *
 * An item is given a page only when it is found on exactly one page, or first found there. When it
 * is found on none, it has no page. Nothing is guessed.
 */
import type { WhatLanded } from './what-a-document-holds';
import { byWhen, BANK_DETAILS_LEFT_OUT } from './what-a-document-holds';
import { HIDDEN } from './bank-details-are-never-kept';

/** pdf-parse's own marker after each page: "-- 3 of 4 --". */
const PAGE_MARK = /-- (\d+) of (\d+) --/g;

/** The text of each page, in order, or null when the text carries no pages. */
export function thePagesOf(content: string | null | undefined): string[] | null {
  const text = content ?? '';
  const marks = [...text.matchAll(PAGE_MARK)];
  if (!marks.length) return null;
  const pages: string[] = [];
  let from = 0;
  for (const m of marks) {
    pages.push(text.slice(from, m.index));
    from = (m.index ?? 0) + m[0].length;
  }
  return pages;
}

/** Digits without the commas and spaces people put between thousands. */
const plain = (s: string): string => s.toLowerCase().replace(/(\d)[,\s](?=\d{3}\b)/g, '$1');

/** Every way a document might write this number. */
function waysToWrite(n: number): RegExp[] {
  const out = [new RegExp(`(^|[^\\d.])${n}(?![\\d])`)];
  for (const [div, words] of [[1e6, '(m|million|mn)'], [1e3, '(k|thousand)']] as const) {
    if (n >= div && n % (div / 10) === 0) {
      const short = String(+(n / div).toFixed(1)).replace('.', '\\.');
      out.push(new RegExp(`(^|[^\\d.])${short}\\s*${words}\\b`));
    }
  }
  return out;
}

/** The first page (1-based) where every one of these is found, or undefined. */
export function thePageWhere(pages: string[] | null, find: { number?: number; words?: (string | null | undefined)[] }): number | undefined {
  if (!pages) return undefined;
  const words = (find.words ?? []).map((w) => (w ?? '').trim().toLowerCase()).filter((w) => w.length >= 2);
  for (let i = 0; i < pages.length; i++) {
    const page = plain(pages[i]);
    if (find.number !== undefined && !waysToWrite(find.number).some((re) => re.test(page))) continue;
    if (words.length && !words.every((w) => page.includes(w))) continue;
    return i + 1;
  }
  return undefined;
}

/**
 * The page each item came from, found once when the document is read and kept on `holds`.
 * The number and the name together first; the number alone after that; never the name alone,
 * because a person's name is on every page of a team sheet.
 */
export function withThePages(held: WhatLanded, content: string, fileName: string): WhatLanded {
  const pages = thePagesOf(content);
  if (!pages) {
    return /\.pdf$/i.test(fileName ?? '') ? { ...held, pagesNotKnown: true } : held;
  }
  const at = (number: number, ...words: (string | null | undefined)[]) =>
    thePageWhere(pages, { number, words }) ?? thePageWhere(pages, { number });
  const withPage = <T extends object>(x: T, page: number | undefined): T => (page ? { ...x, page } : x);
  const hiddenOn = pages.findIndex((p) => Object.values(HIDDEN).some((h) => p.includes(h)));
  return {
    ...held,
    pages: pages.length,
    forOnePerson: held.forOnePerson.map((t) => withPage(t, at(t.target, t.who, t.what) ?? at(t.target, t.who))),
    forEverybody: held.forEverybody.map((t) => withPage(t, at(t.target, t.what))),
    dates: held.dates.map((d) => withPage(d, thePageWhere(pages, { words: [d.when] }))),
    ...(held.leftOut ? { leftOut: held.leftOut.map((l) => (l.what === BANK_DETAILS_LEFT_OUT.what && hiddenOn >= 0 ? { ...l, page: hiddenOn + 1 } : l)) } : {}),
  };
}

export interface AnItemItTook {
  /** What kind of thing this is: a number for one person, a number for everyone, or a date. */
  kind: 'a number for one person' | 'a number for everyone' | 'a date';
  /** The whole item as one plain sentence, in the chat's words, with the number written in full. */
  sentence: string;
  /** What it is, in the document's own words. */
  what: string;
  /** The number or the date, as a reader sees it. */
  detail: string;
  /** Whose number it is, for a number for one person. */
  who?: string;
  page?: number;
}

export interface AnItemItLeftOut {
  what: string;
  why: string;
  page?: number;
}

export interface ADocumentReadItemByItem {
  /** How many pages it has, when it has pages we could count. */
  pages?: number;
  /** Said only when the file has pages and we could not tell which page each item came from. */
  pagesNote?: string;
  took: AnItemItTook[];
  leftOut: AnItemItLeftOut[];
}

export const PAGES_NOT_KNOWN =
  'This file was read from a picture of its pages, so we cannot say which page each item came from.';

const fmtNumber = (n: number): string => n.toLocaleString('en-GB');

/** The sentences each item is said in: theContextWeHave's, with the number written in full as the prototype does. */
export const forEveryoneSentence = (t: { what: string; target: number; kind?: string | null; by?: string | null }, fmt: (n: number) => string) =>
  t.kind === 'not to exceed'
    ? `For everyone in this check-in, ${t.what} must stay at or under ${fmt(t.target)}${byWhen(t.by)}.`
    : `For everyone in this check-in, the target for ${t.what} is ${fmt(t.target)}${byWhen(t.by)}.`;
export const forOnePersonSentence = (t: { who: string; what: string; target: number; by?: string | null }, fmt: (n: number) => string) =>
  `${t.who}'s target for ${t.what} is ${fmt(t.target)}${byWhen(t.by)}.`;
export const dateSentence = (d: { what: string; when: string }) =>
  `The date it sets for ${d.what} is ${d.when.trim().replace(/\.$/, '')}.`;

/**
 * WHAT A PERSON READS UNDER "WHAT IT TOOK" AND "WHAT IT LEFT OUT". Built from `holds` when it is
 * served, so it lists the same items the chat and the Context page said.
 */
export function aDocumentReadItemByItem(held: (WhatLanded & { pages?: number; pagesNotKnown?: boolean }) | null | undefined): ADocumentReadItemByItem | null {
  if (!held || !Array.isArray(held.forOnePerson)) return null;
  const page = (x: { page?: number }) => (x.page ? { page: x.page } : {});
  const took: AnItemItTook[] = [
    ...(held.forEverybody ?? []).map((t) => ({
      kind: 'a number for everyone' as const,
      sentence: forEveryoneSentence(t, fmtNumber),
      what: t.what,
      detail: `${t.kind === 'not to exceed' ? 'At most ' : ''}${fmtNumber(t.target)}${byWhen(t.by)}`,
      ...page(t as any),
    })),
    ...(held.forOnePerson ?? []).map((t) => ({
      kind: 'a number for one person' as const,
      sentence: forOnePersonSentence(t, fmtNumber),
      what: t.what,
      detail: `${fmtNumber(t.target)}${byWhen(t.by)}`,
      who: t.who,
      ...page(t as any),
    })),
    ...(held.dates ?? []).map((d) => ({
      kind: 'a date' as const,
      sentence: dateSentence(d),
      what: d.what,
      detail: d.when.trim().replace(/\.$/, ''),
      ...page(d as any),
    })),
  ];
  const leftOut: AnItemItLeftOut[] = [
    ...(held.leftOut ?? []).map((l) => ({ what: l.what, why: l.why, ...page(l as any) })),
    ...(held.unmatched ?? []).map((name) => ({
      what: `The numbers for ${name}`,
      why: `${name} is not on this check-in. Add them, and their numbers will go on too.`,
    })),
  ];
  return {
    ...(held.pages ? { pages: held.pages } : {}),
    ...(held.pagesNotKnown ? { pagesNote: PAGES_NOT_KNOWN } : {}),
    took,
    leftOut,
  };
}
