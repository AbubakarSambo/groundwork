import type { ACriterion } from '../board/a-deals-four-criteria';
import { STALLED_AFTER_WORKING_DAYS } from '../board/a-deal-that-has-stalled';
import { theLostLine } from '../board/a-deal-that-was-dropped';
import { aDayKey, aDayInWords } from './a-sales-report-read-from-the-deals';
import type { TheSalesWeek, APersonsSalesWeek, AMoveThisWeek } from './the-sales-week-in-numbers';
import { COMES_FROM, type AThingToDo, type WhatChanged } from './the-weekly-report';

/**
 * WHAT A SALES WEEK SHOWS, WHAT CHANGED, AND WHAT TO DO NEXT WEEK, FROM THE DEALS (Hafsah's points 24 and 25, 18 October 2026;
 * behind Release 1's switch; the kit's B4-reports-every-check-in/sales-weekly-report.txt).
 *
 * Grace's weekly report read "Kevin Omondi named M-Pesa, Kilele Hotel and KES and 13 more this week": a count of the words a
 * person named, which says nothing about the people or the work. The kit reads "People are busy, but some sales move forward
 * much more than others. Aisha and Miriam consistently get to specific customer needs and next steps...". So, for a sales
 * check-in, "What this week shows" is built from the deals on record for the week (TheSalesWeek, kept when a check-in comes
 * in): how far each person's deals moved, how many closed and with what proof, which of their deals went quiet, and which of
 * the four things a deal needs to be qualified are still not on record. No model writes it, so nothing is said that the record
 * does not hold, and no word is a label on a person: it says what happened to the deals.
 *
 * "What changed" reads the deals the same way ("Nyama Choma Palace bought. There is a payment record."), not commitments said
 * done. "For you to do next week" adds each deal at the stall rule to what only the lead can settle, as the plan's own rule.
 *
 * WHO READS WHAT. Whoever reads the whole check-in reads every person; a person in it reads only what is about their own
 * deals, and nothing that compares them with anybody else. Names come from the caller, as this reader may read them.
 */

export interface AReaderOfTheWeek {
  /** Reads the whole check-in: the lead, or an admin who may read it. */
  whole: boolean;
  /** The reader's own row in the check-in, or null. */
  me: string | null;
}

/** How a person is said to this reader: their name, or "you". */
export type HowSomebodyIsSaid = (participantId: string | null) => string;

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const small = (n: number) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
const Cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const listed = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');
const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** What a missing criterion is called in a sentence. */
const PLAIN: Record<ACriterion, string> = {
  need: 'what the customer needs',
  budget: 'the budget',
  'decision maker': 'who decides',
  'buying date': 'the buying date',
};

function theDay(iso: string, zone: string): string {
  return aDayInWords(aDayKey(new Date(iso), zone));
}

/* --------------------------------------------------------------------------------------------- what this week shows */

/** The opening sentence about the team, for a reader of the whole check-in. Null where nobody's deals are on record. */
export function theTeamsWeekInASentence(people: readonly APersonsSalesWeek[]): string | null {
  const withDeals = people.filter((p) => p.deals > 0);
  if (!withDeals.length) return null;
  const forward = withDeals.map((p) => p.closed + p.movedOn);
  const total = forward.reduce((a, b) => a + b, 0);
  if (total === 0) return 'No sale moved forward this week.';
  const most = Math.max(...forward);
  const least = Math.min(...forward);
  if (withDeals.length >= 2 && most >= 2 && least * 2 <= most) return 'Sales moved forward this week, but much more for some people than for others.';
  if (withDeals.length >= 2 && least > 0) return 'Sales moved forward this week for everyone with deals on record.';
  return `${Cap(small(total))} ${s(total, 'deal', 'deals')} moved forward this week.`;
}

/** What one person's own deals did this week, in one or two sentences. */
export function aPersonsSalesWeek(p: APersonsSalesWeek, w: TheSalesWeek, sayAs: HowSomebodyIsSaid, zone: string): string {
  const who = sayAs(p.participantId);
  const isYou = who.toLowerCase() === 'you';
  const Who = Cap(who);
  const whose = isYou ? 'your' : `${who}'s`;
  if (p.deals === 0) return isYou ? 'You have no deal on record yet.' : `There is no deal on record for ${who} yet.`;

  /* What moved. */
  let first: string;
  if (p.closed > 0 && p.movedOn > 0) first = `${Who} closed ${small(p.closed)} ${s(p.closed, 'sale', 'sales')} and moved ${small(p.movedOn)} other ${s(p.movedOn, 'deal', 'deals')} forward this week.`;
  else if (p.closed > 0) first = `${Who} closed ${small(p.closed)} ${s(p.closed, 'sale', 'sales')} this week.`;
  else if (p.movedOn > 0) first = `${Who} moved ${small(p.movedOn)} ${s(p.movedOn, 'deal', 'deals')} forward this week.`;
  else first = `No deal moved forward for ${who} this week.`;

  const second = theOneThingTheRecordShowsNext(p, w, sayAs, zone);
  return second ? `${first} ${second}` : first;
}

/**
 * The one thing the record shows next about a person's deals, in this order: a customer gone quiet, a sale with no payment record
 * (left out where the sentence before already says what proves each sale), the criteria not on record. Empty where none holds.
 */
export function theOneThingTheRecordShowsNext(p: APersonsSalesWeek, w: TheSalesWeek, sayAs: HowSomebodyIsSaid, zone: string, opts: { notThePayment?: boolean; onlyAQuietCustomer?: boolean } = {}): string {
  const who = sayAs(p.participantId);
  const isYou = who.toLowerCase() === 'you';
  const whose = isYou ? 'your' : `${who}'s`;
  const quiet = (w.stalledDeals ?? []).filter((d) => d.ownerParticipantId === p.participantId);
  const unpaid = (w.moves ?? []).filter((m) => m.ownerParticipantId === p.participantId && m.won && !m.paid);
  let second = '';
  if (quiet.length) {
    const since = quiet.map((d) => d.since).sort()[0];
    second = `${listed(quiet.map((d) => d.name))} ${quiet.length === 1 ? 'has' : 'have'} not answered ${isYou ? 'you' : who} since ${theDay(since, zone)}.`;
  } else if (opts.onlyAQuietCustomer) {
    return '';
  } else if (unpaid.length && !opts.notThePayment) {
    second = `Nothing written shows a payment yet for ${listed(unpaid.map((m) => m.name))}.`;
  } else if (p.open > 0 && p.complete === p.open) {
    second = p.open === 1
      ? `For ${whose} open deal, what the customer needs, the budget, who decides and the buying date are all on record.`
      : `For each of ${whose} ${small(p.open)} open deals, what the customer needs, the budget, who decides and the buying date are all on record.`;
  } else if (p.open > 0) {
    const order: ACriterion[] = ['decision maker', 'buying date', 'budget', 'need'];
    const most = order.reduce((a, k) => ((p.missing[k] ?? 0) > (p.missing[a] ?? 0) ? k : a), order[0]);
    const k = p.missing[most] ?? 0;
    if (k > 0) {
      second = k === p.open
        ? `${Cap(PLAIN[most])} is not on record yet for ${p.open === 1 ? `${whose} open deal` : `any of ${whose} ${small(p.open)} open deals`}.`
        : `For ${small(k)} of ${whose} ${small(p.open)} open deals, ${PLAIN[most]} is not on record yet.`;
    }
  }
  return second;
}

export interface WhatTheSalesWeekShows {
  /** The paragraphs, in the kit's order: the team in one sentence (whole readers only), then each person. */
  paragraphs: string[];
  /** Each person's own sentences, for the rest of the page. */
  eachPerson: { participantId: string; says: string }[];
}

export function whatTheSalesWeekShows(w: TheSalesWeek, reader: AReaderOfTheWeek, sayAs: HowSomebodyIsSaid, zone: string): WhatTheSalesWeekShows | null {
  if (!w.people) return null;
  /* A person reads only about their own deals. Somebody with no deals who did not check in is not someone the week is about. */
  const about = w.people
    .filter((p) => reader.whole || p.participantId === reader.me)
    .filter((p) => p.deals > 0 || p.checkedIn);
  const eachPerson = about.map((p) => ({ participantId: p.participantId, says: aPersonsSalesWeek(p, w, sayAs, zone) }));
  const opening = reader.whole ? theTeamsWeekInASentence(w.people) : null;
  const paragraphs = [opening, eachPerson.map((x) => x.says).join(' ')].filter((x): x is string => !!x && !!x.trim());
  return { paragraphs, eachPerson };
}

/* ----------------------------------------------------------------------------------------------------- what changed */

export const NO_DEAL_DROPPED = 'No deal was lost this week.';
export const NO_SALE_YET = 'No sale so far this week.';

/** "Nyama Choma Palace bought. There is a payment record.", as the kit says it. */
export function aDealThatMoved(m: AMoveThisWeek, sayAs: HowSomebodyIsSaid): string {
  if (m.won) {
    if (m.paid) return `${m.name} bought. There is a payment record.`;
    if (m.proven) return `${m.name} bought. A document backs it, but it does not show a payment.`;
    const who = sayAs(m.ownerParticipantId);
    return `${m.name} bought. Nothing written shows it yet, only what ${who.toLowerCase() === 'you' ? 'you' : who} said.`;
  }
  return `${m.name} moved forward, from ${m.from} to ${m.to}.${m.proven ? ' A photo or document backs it.' : ''}`;
}

/** What changed this week, read from the deals. A person reads only their own deals. */
export function whatChangedInTheSalesWeek(w: TheSalesWeek, reader: AReaderOfTheWeek, sayAs: HowSomebodyIsSaid): WhatChanged | null {
  if (!w.moves) return null;
  const mine = w.moves.filter((m) => reader.whole || (!!reader.me && m.ownerParticipantId === reader.me));
  /* Sales first, as the kit has them, then the other deals that moved forward. */
  const moved = [...mine.filter((m) => m.won), ...mine.filter((m) => !m.won)].map((m) => aDealThatMoved(m, sayAs));
  const won = mine.filter((m) => m.won);
  const paid = won.filter((m) => m.paid).length;
  const result = won.length === 0
    ? NO_SALE_YET
    : `${won.length} ${s(won.length, 'sale', 'sales')} so far this week${paid === won.length
      ? `, ${won.length === 1 ? 'with' : 'all with'} proof of payment`
      : paid === 0 ? `, ${won.length === 1 ? 'with no proof of payment yet' : 'none with proof of payment yet'}` : `, ${paid} with proof of payment`}.`;
  /* Each deal dropped this week, with its reason in the rep's own words (Drop Access run 1, A5; the kit's "Dropped"). */
  const dropped = (w.droppedDeals ?? [])
    .filter((d) => reader.whole || (!!reader.me && d.ownerParticipantId === reader.me))
    .map((d) => theLostLine(d.name, { on: d.on, line: d.line, because: d.because }, d.ownerParticipantId ? sayAs(d.ownerParticipantId) : null));
  return { moved: moved.length ? moved : ['No deal moved forward this week yet.'], dropped: dropped.length ? dropped : [NO_DEAL_DROPPED], result: [result] };
}

/* ------------------------------------------------------------------------------------------ for you to do next week */

/** Each deal at the stall rule, by its owner, as something for whoever runs the check-in to do. */
export function theStalledDealsToAskAbout(w: TheSalesWeek, sayAs: HowSomebodyIsSaid, zone: string): AThingToDo[] {
  const by = new Map<string, { names: string[]; since: string }>();
  for (const d of w.stalledDeals ?? []) {
    const key = d.ownerParticipantId ?? '';
    const had = by.get(key) ?? { names: [], since: d.since };
    had.names.push(d.name);
    if (d.since < had.since) had.since = d.since;
    by.set(key, had);
  }
  return [...by.entries()].map(([owner, v]) => {
    const said = owner ? sayAs(owner) : null;
    /* Her own deal is hers to decide, never "Ask you". */
    const who = said && said.toLowerCase() !== 'you' ? said : null;
    const one = v.names.length === 1;
    const them = listed(v.names);
    return {
      do: who ? `Ask ${who} about ${them}.` : `Decide what happens with ${them}.`,
      why: `${them} ${one ? 'has' : 'have'} not answered since ${theDay(v.since, zone)}. ${typeof w.stallDays === 'number' ? 'Your' : 'The'} stall rule says to drop a deal when the customer has not answered for ${w.stallDays ?? STALLED_AFTER_WORKING_DAYS} working days.`,
      comesFrom: COMES_FROM['the plan'],
    };
  });
}
