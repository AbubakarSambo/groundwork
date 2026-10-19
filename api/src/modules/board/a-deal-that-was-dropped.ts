import { theWordsNameTheDeal } from './a-deals-proof-is-about-that-deal';
import { cleanText } from '../reports/what-the-record-actually-holds';

/**
 * A DEAL THE CUSTOMER TURNED DOWN, OR THE REP GAVE UP, IS DROPPED (Drop Access, Release 1's first ten-day run, 18 October; finding
 * A5). Grace's board kept four deals under "Possible" that were over:
 *
 *  - Kamau Electricals: Kevin said "Kamau Electricals said no because they already buy from Aqua Pure."
 *  - Upper Hill Offices: "I've stopped chasing them. I called three times with no reply, so I'm moving on."
 *  - The kiosk at Thika Road Mall: Joseph said "Brian said they are not interested this year."
 *  - Ngong Road Minimart: "Still no reply. I'm moving on from them."
 *
 * The prototype's How we work says "Lost needs a reason" (templates.txt), and the weekly report has "Dropped". A dropped deal is
 * not open: it leaves the open groups and every count of open deals, and it is shown once, as dropped, with its reason in the
 * rep's own words. A deal at the last stage is never dropped, and a later line saying the customer bought, ordered, paid or said
 * yes opens it again. "Wanjiru says she won't buy this month." is not dropped: this month is not never.
 *
 * Read from the record only: the deal owner's own lines about the deal, where the record's own note on a line names the customer
 * too ("Still no reply [INFERRED: from Ngong Road Minimart].").
 */

const TURNED_DOWN = /\bshut (?:me|us|him|her|them) down\b|\balready (?:had|have|has) (?:a|another|their own) supplier\b|\bsaid no\b|\bturned (?:us|it|me|him|her|them|the offer) down\b|\bturned down\b|\b(?:not|no longer) interested\b|\bdeclined\b|\balready buys? from\b|\bnot on my list any ?more\b|\bhappy with (?:their|the|its) (?:current )?supplier\b/i;
const GAVE_UP = /\b(?:stopped|stop|quit) chasing\b|\b(?:moving|moved) on from\b|\b(?:i['’]?m|i am|we['’]?re|we are) moving on\b|\bso i['’]?m moving on\b|\b(?:gave|giving) up on\b|\bdropp(?:ed|ing) (?:it|them|the deal|the lead)\b|\bletting (?:it|them) go\b|\bno longer (?:chasing|pursuing)\b/i;
const OPENED_AGAIN = /\b(?:paid|ordered|signed|bought|said yes|agreed to buy|changed (?:his|her|their) mind|wants? to buy|will buy|['’]ll buy)\b/i;
const NEGATED = /\b(?:not|no|never|won['’]?t|hasn['’]?t|haven['’]?t|didn['’]?t|isn['’]?t)\b/i;

export interface ADroppedDeal {
  /** The day it was dropped, as YYYY-MM-DD. */
  on: string;
  /** The owner's line that dropped it, as they said it. */
  line: string;
  /** What the line gives as the reason, after "because", or null where it gives none. */
  because: string | null;
  /** A document came in with the line that lost it, so proof shows it. */
  shown?: boolean;
}

/** Whether a line says the deal is over: the customer said no, or the rep gave it up. */
export function aLineDropsADeal(text: string): boolean {
  const t = cleanText(String(text ?? ''));
  return TURNED_DOWN.test(t) || GAVE_UP.test(t);
}

/**
 * Whether the deal was dropped, from its owner's lines. `lines` may be any lines on the check-in; only the owner's, about this
 * deal, are read.
 */
export function theDealWasDropped(
  deal: { name: string; stage?: string | null; ownerParticipantId?: string | null; fields?: Record<string, string> | null },
  lines: readonly { text: string; participantId?: string | null; createdAt: Date | string; disputedAt?: Date | string | null; anchoredDocumentId?: string | null }[],
  opts: { lastStage?: string | null; peopleThere?: readonly string[]; saidInTheCheckIn?: { on: string; line: string } | null } = {},
): ADroppedDeal | null {
  if (opts.lastStage && String(deal.stage ?? '').trim().toLowerCase() === opts.lastStage.trim().toLowerCase()) return null;
  const about = (raw: string) => theWordsNameTheDeal(raw, deal)
    || (opts.peopleThere ?? []).some((p) => theWordsNameTheDeal(raw, { name: '', fields: { Contact: p } }));
  const theirs = lines
    .filter((l) => !l.disputedAt && (!deal.ownerParticipantId || l.participantId === deal.ownerParticipantId))
    .filter((l) => about(String(l.text ?? '')))
    .map((l) => ({ raw: String(l.text ?? ''), text: cleanText(String(l.text ?? '')), at: new Date(l.createdAt), shown: !!l.anchoredDocumentId }))
    .filter((l) => !Number.isNaN(l.at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  let dropped: { line: string; at: Date; shown: boolean } | null = null;
  let withAReason: { line: string; at: Date; shown: boolean } | null = null;
  /* What its owner said of it in the check-in, in a sentence that did not name it (what-the-owner-said-of-each-deal), counts from its day. */
  const inTheCheckIn = opts.saidInTheCheckIn && typeof opts.saidInTheCheckIn.line === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(String(opts.saidInTheCheckIn.on))
    ? { text: cleanText(opts.saidInTheCheckIn.line), at: new Date(`${opts.saidInTheCheckIn.on}T23:59:59Z`), shown: false } : null;
  if (inTheCheckIn) {
    dropped = { line: inTheCheckIn.text, at: inTheCheckIn.at, shown: false };
    if (/\bbecause\b/i.test(inTheCheckIn.text)) withAReason = dropped;
  }
  for (const l of inTheCheckIn ? theirs.filter((x) => x.at.toISOString().slice(0, 10) > opts.saidInTheCheckIn!.on || aLineDropsADeal(x.text)) : theirs) {
    if (aLineDropsADeal(l.text)) {
      dropped = { line: l.text, at: l.at, shown: l.shown };
      if (/\bbecause\b/i.test(l.text)) withAReason = { line: l.text, at: l.at, shown: l.shown };
    } else if (dropped && OPENED_AGAIN.test(l.text) && !NEGATED.test(l.text)) {
      dropped = null;
      withAReason = null;
    }
  }
  if (!dropped) return null;
  const said = withAReason ?? dropped;
  const because = /\bbecause\s+(.+?)[.!?]*$/i.exec(said.line)?.[1]?.trim() ?? null;
  return { on: said.at.toISOString().slice(0, 10), line: said.line, because, ...(said.shown ? { shown: true } : {}) };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ended = (s: string) => (/[.!?”"]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/*
 * A LOST DEAL, AS THE PROTOTYPE'S BOARD READS IT (Hafsah, 18 October: "Lost deals: add a lost stage. When the person says the
 * customer said no, the deal shows as lost, with their own words as the record, and drops out of the open pipeline totals.").
 * The prototype's "Lost deals, and why" (board-part-2-sales-team.txt): one row per lost deal, with what, whose, when, the reason,
 * what shows the reason, and what it teaches; "A reason with no source stays unverified. An unknown reason is flagged, because it
 * can't be learned from." How we work there says "Lost needs a reason".
 *
 *  - The reason is the rep's own words: what follows "because", or the line that lost it ("I've stopped chasing them. I called
 *    three times with no reply, so I'm moving on."). A line that only says the customer said no gives no reason.
 *  - What shows it: "Proof shows it." where a document came in with the line, "Kevin said it." (or "You said it.") where the
 *    reason is somebody's word, and "No reason given." where there is none.
 *  - What it teaches: only what the record supports. Nothing on record draws a lesson from a lost deal yet, so none is given,
 *    except where no reason was given: How we work's own rule, "Every lost deal needs a reason."
 */
const ONLY_SAID_NO = /^\s*(?:[A-Za-z0-9'’.&-]+\s+){0,6}said no(?:\s+to\s+(?:us|me|it|them|our\s+\w+|the\s+\w+|the\s+offer))?\s*[.!]?\s*$/i;

export const EVERY_LOST_DEAL_NEEDS_A_REASON = 'Every lost deal needs a reason.';
export const NO_REASON_GIVEN = 'No reason given.';

export interface ALostDeal {
  /** The reason in the rep's own words, or null where none was given (or this reader may not read their words). */
  reason: string | null;
  /** What shows the reason. */
  reasonFrom: string;
  /** What it teaches, only where the record supports it. */
  lesson: string | null;
  /** The one line said about it, in full sentences. */
  says: string;
}

/** The reason in the rep's own words, or null where the line gives none. */
export function theReasonTheyGave(d: ADroppedDeal): string | null {
  if (d.because) return ended(cap(d.because));
  if (ONLY_SAID_NO.test(d.line)) return null;
  return ended(d.line);
}

/**
 * The lost deal as a reader reads it. `who` is the owner as this reader names them ("You", "Kevin"), or null where this reader may
 * not read the owner's words.
 */
export function theLostDeal(name: string, d: ADroppedDeal, who: string | null): ALostDeal {
  const given = theReasonTheyGave(d);
  const reason = who ? given : (d.because ? ended(cap(d.because)) : null);
  const reasonFrom = !given ? NO_REASON_GIVEN : d.shown ? 'Proof shows it.' : who ? `${cap(who)} said it.` : 'Somebody said it.';
  return { reason, reasonFrom, lesson: given ? null : EVERY_LOST_DEAL_NEEDS_A_REASON, says: theLostLine(name, d, who) };
}

/**
 * The one line a reader reads about a lost deal, in full sentences: "Kamau Electricals was lost, because they already buy from
 * Aqua Pure." or "Upper Hill Offices was lost. Kevin said, “I've stopped chasing them...”". `who` as above.
 */
export function theLostLine(name: string, d: ADroppedDeal, who: string | null): string {
  if (d.because) return `${cap(name)} was lost, because ${d.because}.`;
  if (!who) return `${cap(name)} was lost.`;
  if (!theReasonTheyGave(d)) return `${cap(name)} was lost, and no reason was given.`;
  return `${cap(name)} was lost. ${cap(who)} said, “${ended(d.line)}”`;
}
