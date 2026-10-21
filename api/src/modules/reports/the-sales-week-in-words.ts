import { aDepositSaid } from '../board/a-deals-proof-is-about-that-deal';
import type { ADealOnRecord } from '../board/a-sales-aim-is-counted-from-the-deals';
import { theCriteriaOnRecord, THE_FOUR } from '../board/a-deals-four-criteria';
import { aLineIsAbout } from '../board/a-deals-value-and-buying-date';
import { theContactOf } from '../board/a-deal-that-has-stalled';
import { whatToCoachThisWeek } from '../board/what-to-coach-this-week';
import { thePromisesCarriedOver } from '../board/a-promise-carried-over';
import { theDecisionsTheLeadPromised } from '../board/a-decision-the-lead-promised';
import { theCallsNotAnswered, theDaysInWords } from '../board/what-needs-you-and-what-to-do';
import { aDayKey, aDayInWords } from './a-sales-report-read-from-the-deals';
import { theUnitsOf } from './the-sales-team-report-from-the-record';
import type { AThingForTheLead } from './the-weekly-report';

/**
 * A SALES WEEK IN WORDS, FROM THE RECORD (Hafsah's quality pass of 18 October, section 6, W-3 to W-8; behind Release 1's switch;
 * the kit's B4-reports-every-check-in/sales-weekly-report.txt).
 *
 * Grace's weekly report for 12 to 14 October said "Mercy Wairimu closed one sale and moved one other deal forward this week",
 * "Nothing happened three check-ins in a row this week." while Joseph had promised the samples in all three, "people said 99 things
 * ... 10 have a photo or document" with two documents attached, counted Mama Pima's first mention as a move, had no Adapted row, and
 * asked her to tell Mercy about "the order confirmation process", which nobody said. Each part here is read from the deals, the
 * waits, the lines and the conversation as they stood at the end of the week, and kept WITHOUT NAMES: a person is their report
 * label ("Participant A"), swapped for their name only when the report is served, through the same wrapper as every other line.
 * A customer's name is the deal's. No model writes any of it.
 */

export interface APriceOnlySaid { ownerParticipantId: string | null; deal: string; amount: string; kind: 'quote' | 'deposit' }

export interface TheSalesWeekInWords {
  /** What this week shows, about each person's own deals: what they sold, then one line about the work. */
  shows: { participantId: string; says: string; aboutTheWork?: boolean }[];
  /** Things that happened in three check-ins in a row: a promise carried over, by the person who made it. */
  threeInARow: { participantId: string; says: string }[];
  /** Prices said this week that nothing written backs, each with its owner, for "What people said, and what the proof shows". */
  pricesOnlySaid: APriceOnlySaid[];
  /** How somebody changed the way they work this week, in their own answer: "Participant A will ask about ... (14 October)." */
  adapted: { participantId: string; says: string }[];
  /** For whoever runs it to do next week, in order: answers people wait on, decisions she promised, promises carried over, the sale rule, customers gone quiet. */
  forTheLead: AThingForTheLead[];
  /** The kit's amber strip under What this week shows: "Participant C’s two deals and Participant B’s Tuskys Westgate all wait on one person each." */
  oneEach: string | null;
}

interface ALine { text: string; type: string | null; participantId: string | null; checkInId: string | null; createdAt: Date; anchoredDocumentId: string | null }
interface AWait { id: string; fromParticipantId: string | null; onParticipantId: string | null; onLabel?: string | null; what: string | null; then?: string | null; status: string; clearedAt?: Date | null; dueOn?: Date | null; createdAt: Date }

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const small = (n: number) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
const Cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const listed = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');
const stop = (s: string) => String(s ?? '').trim().replace(/[.\s]+$/, '');
const field = (d: { fields?: Record<string, string> | null }, k: string) => String(d.fields?.[k] ?? '').trim();
const isOpen = (w: AWait) => String(w.status).toUpperCase() !== 'CLEARED' && !w.clearedAt;

export function theSalesWeekInWords(input: {
  people: { id: string; label: string; isTheLead: boolean }[];
  deals: readonly ADealOnRecord[];
  lastStage: string;
  waits: readonly AWait[];
  lines: readonly ALine[];
  turns: readonly { checkInId: string; role: string; content: string }[];
  checkIns: readonly { id: string; participantId: string; status: string; isSetup?: boolean | null; completedAt: Date | null }[];
  documents: readonly { id: string; createdAt: Date }[];
  targets: readonly { participantId: string; target: number }[];
  /** The lead's own rule for what counts as a sale, where she set one: a payment or a signed order. */
  aSaleNeedsProof: boolean;
  /** The lead's stall rule: null where none is set. */
  stallDays: number | null | undefined;
  buyingDateOf: (d: ADealOnRecord) => string | null;
  start: Date;
  at: Date;
  zone: string;
}): TheSalesWeekInWords {
  const by = (t: Date) => t.getTime() <= input.at.getTime();
  const inTheWeek = (t: Date) => t.getTime() >= input.start.getTime() && by(t);
  const labelOf = (pid: string | null) => input.people.find((p) => p.id === pid)?.label ?? null;
  const lead = input.people.find((p) => p.isTheLead) ?? null;
  const lines = input.lines.filter((l) => by(l.createdAt));
  const waits = input.waits.filter((w) => by(w.createdAt));
  const deals = input.deals.filter((d) => by(d.firstOnRecordAt));
  const won = (d: ADealOnRecord) => String(d.stage ?? '').toLowerCase() === input.lastStage.toLowerCase();
  const open = deals.filter((d) => !won(d) && !d.dropped && String(d.stage ?? '').trim());
  const day = (t: Date) => aDayInWords(aDayKey(t, input.zone));

  /* W-3: what each person sold, and one line about the work (the board's own coaching line, what-to-coach-this-week). */
  const coached = deals.filter((d) => !d.dropped).map((d) => {
    const c = theCriteriaOnRecord(d.fields, input.buyingDateOf(d), { readTheDetails: true });
    return { name: d.name, ownerParticipantId: d.ownerParticipantId, stage: d.stage, fields: d.fields, buyingDate: input.buyingDateOf(d), criteria: THE_FOUR.map((k) => ({ criterion: k, met: !!c[k] })) };
  });
  const shows: { participantId: string; says: string; aboutTheWork?: boolean }[] = [];
  for (const p of input.people.filter((x) => !x.isTheLead)) {
    const L = p.label;
    const theirWon = deals.filter((d) => d.ownerParticipantId === p.id && won(d) && !d.dropped);
    const sold: string[] = theirWon.map((d) => {
      const u = theUnitsOf(d);
      const units = u === null ? '' : `${u} ${u === 1 ? 'unit' : 'units'}`;
      /* A deposit only is never "paid" (final real-model check, item 10). */
      if (d.paid && d.deposit) return `${L} sold ${units || 'it'} to ${d.name} on a deposit. ${aDepositSaid(d.deposit)}`;
      if (d.paid) return `${L} sold ${units || 'it'}, paid, to ${d.name}.`;
      if (d.signed) return `${L} has ${units ? `${units} on a signed order` : 'a signed order'} from ${d.name}.`;
      /* Her rule says a sale counts only with a payment or a signed order: one with neither is not counted, and never said as sold (item 14). */
      if (input.aSaleNeedsProof && !d.proven) return `${d.name} is on record as sold by ${L}, and nothing written shows a payment or a signed order, so it is not counted as sold.`;
      /* A document she added backs it (engine test: Mercy's mama-rose-receipt.txt, Friday 16 October): never "nothing written". */
      if (d.proven) return `${L} counts ${units ? `${units} sold to` : 'a sale to'} ${d.name}. A document backs it, but it does not show a payment.`;
      return `${L} counts ${units ? `${units} sold to` : 'a sale to'} ${d.name}, and nothing written shows it yet.`;
    });
    const target = input.targets.find((t) => t.participantId === p.id);
    if (!sold.length && target) sold.push(`${L} has sold none of the ${target.target} units yet.`);
    const coach = whatToCoachThisWeek(p.id, L, coached, waits.filter(isOpen), lines as any[], labelOf);
    const work = coach ? coach.replace(/^Quoted\b/, `${L} quoted`) : '';
    const says = [sold.join(' '), work].filter(Boolean).join(' ');
    if (says) shows.push({ participantId: p.id, says, ...(work ? { aboutTheWork: true } : {}) });
  }

  /* W-4: a promise carried over three check-ins running, by whoever made it (a-promise-carried-over; standing decision 5). */
  const dealNames = deals.map((d) => d.name);
  const namingADeal = (w: AWait) => Number(dealNames.some((n) => String(w.what ?? '').includes(n)));
  const carriedEach = thePromisesCarriedOver(
    [...waits].sort((a, b) => namingADeal(b) - namingADeal(a)) as any[],
    input.checkIns.filter((c) => c.completedAt && by(c.completedAt)) as any[],
    lines as any[], input.turns, dealNames,
  );
  /* One per person and the person waiting: Mercy's two waits on Joseph's samples are one promise. */
  const once = new Set<string>();
  const carried = carriedEach.filter((c) => {
    const key = `${c.participantId}|${waits.find((w) => w.id === c.waitId)?.fromParticipantId ?? ''}`;
    if (once.has(key)) return false;
    once.add(key);
    return true;
  });
  const threeInARow = carried.map((c) => ({ participantId: c.participantId, says: c.says }));

  /* W-5: prices said this week that nothing written backs: each quote on an open deal, and each deposit a customer said they would pay. */
  const pricesOnlySaid: APriceOnlySaid[] = [];
  for (const d of open) {
    const deposit = waits.find((w) => isOpen(w) && !w.onParticipantId && w.fromParticipantId === d.ownerParticipantId && inTheWeek(w.createdAt)
      && String(w.onLabel ?? '').trim().toLowerCase() === field(d, 'Contact').toLowerCase() && /\bdeposit\b/i.test(String(w.what ?? '')));
    const amount = deposit ? (String(deposit.what).match(/KES\s?[\d,]+/i) ?? [])[0] : null;
    if (amount) pricesOnlySaid.push({ ownerParticipantId: d.ownerParticipantId, deal: d.name, amount, kind: 'deposit' });
  }
  for (const d of open) {
    const quoted = field(d, 'Quoted');
    if (quoted && !d.proven) pricesOnlySaid.push({ ownerParticipantId: d.ownerParticipantId, deal: d.name, amount: quoted, kind: 'quote' });
  }

  /* W-6: how somebody changed the way they work, in their own answer to a question about going forward. */
  const adapted: { participantId: string; says: string }[] = [];
  for (const c of input.checkIns.filter((x) => x.completedAt && inTheWeek(x.completedAt))) {
    const here = input.turns.filter((t) => t.checkInId === c.id);
    for (let i = 1; i < here.length; i += 1) {
      if (String(here[i].role).toUpperCase() !== 'PERSON' || String(here[i - 1].role).toUpperCase() === 'PERSON') continue;
      if (!/\b(?:going forward|from now on|next time|in future|in the future)\b/i.test(here[i - 1].content)) continue;
      const m = /\bI(?:['’]ll| will)\s+(?:make sure to|always|start to|start)\s+([^.!?]+)/i.exec(here[i].content);
      const L = labelOf(c.participantId);
      if (!m || !L) continue;
      const what = m[1].replace(/\bmy\b/gi, 'the').replace(/\bme\b/gi, L).trim();
      adapted.push({ participantId: c.participantId, says: `${L} will ${what} (${day(c.completedAt as Date)}).` });
    }
  }

  /* W-7: for whoever runs it, in this order. */
  const forTheLead: AThingForTheLead[] = [];
  /* a. Answers people wait on from her, with the deal each decides. */
  for (const w of waits.filter((x) => isOpen(x) && lead && x.onParticipantId === lead.id && x.fromParticipantId !== lead.id)) {
    const L = labelOf(w.fromParticipantId) ?? 'Somebody';
    const amount = (String(w.what ?? '').match(/\d[\d,]*/) ?? [])[0]?.replace(/,/g, '') ?? null;
    const priced = amount ? deals.find((d) => d.ownerParticipantId === w.fromParticipantId && field(d, 'Price each').replace(/,/g, '').includes(amount)) : undefined;
    const u = priced ? theUnitsOf(priced) : null;
    const contact = priced ? theContactOf(priced.fields) : null;
    forTheLead.push(priced && u !== null
      ? {
        do: `Answer ${L} on ${u} units at ${field(priced, 'Price each')} for ${priced.name}`,
        why: contact && /\bcall\s+(?:him|her|them)\s+back\b/i.test(String(w.then ?? '')) ? `${contact} is waiting for ${L} to call back.` : `${L} asked you on ${day(w.createdAt)}.`,
        from: 'a blocker',
      }
      : { do: `Answer ${L} on ${stop(String(w.what ?? 'what they asked')).replace(/^an?\s+answer\s+(?:on|about)\s+/i, '')}`, why: `${L} asked you on ${day(w.createdAt)}.`, from: 'a blocker' });
  }
  /* b. A decision she said she would make, that a customer is still waiting on (a-decision-the-lead-promised). */
  if (lead) {
    const promised = theDecisionsTheLeadPromised(
      open.map((d) => ({ ...d, id: d.id, buyingDate: input.buyingDateOf(d) })) as any[],
      lines.filter((l) => l.participantId === lead.id) as any[],
      lines.filter((l) => l.participantId !== lead.id) as any[],
      labelOf, () => false,
    );
    for (const p of promised) forTheLead.push({ do: p.question, why: p.why, from: 'a blocker' });
  }
  /* c. A promise carried over three check-ins running. */
  for (const c of carried) {
    const w = waits.find((x) => x.id === c.waitId);
    const thing = c.says.replace(/,\s*promised three check-ins running.*$/, '');
    const waiter = labelOf(w?.fromParticipantId ?? null);
    forTheLead.push({
      do: `Decide what to do about ${thing.charAt(0).toLowerCase()}${thing.slice(1)}`,
      why: `${labelOf(c.participantId) ?? 'Somebody'} promised it three check-ins running, and ${waiter ?? 'somebody'} is still waiting.`,
      from: 'a blocker that keeps coming back',
    });
  }
  /* d. Her rule for a sale, where somebody counted one before there was a payment or a signed order. */
  if (input.aSaleNeedsProof) {
    const early = deals.filter((d) => won(d) && !d.dropped).map((d) => {
      /* The day it was said to be sold, from the line that said it, where that came before the record kept it (item 14: the Githurai shop
         was said on Tuesday 13 October and kept when the next check-in ended, on the 14th). */
      const keptOn = (d.stagesKept ?? []).filter((s) => String(s.stage).toLowerCase() === input.lastStage.toLowerCase()).map((s) => new Date(s.on)).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
      const saidOn = d.stageSaidOn && (d.stagesKept ?? []).some((s) => String(s.stage).toLowerCase() === input.lastStage.toLowerCase() && s.by === 'check-in') ? new Date(d.stageSaidOn) : null;
      const wonOn = keptOn && saidOn && saidOn.getTime() < keptOn.getTime() ? saidOn : keptOn;
      const docs = lines.filter((l) => l.anchoredDocumentId && aLineIsAbout(l.text, d)).map((l) => input.documents.find((x) => x.id === l.anchoredDocumentId)?.createdAt).filter((x): x is Date => !!x);
      const proofOn = [d.paidOn ?? null, ...docs].filter((x): x is Date => !!x).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
      return wonOn && inTheWeek(wonOn) && (!proofOn || aDayKey(proofOn, input.zone) > aDayKey(wonOn, input.zone)) ? { d, wonOn, proofOn: proofOn as Date | null } : null;
    }).filter((x): x is { d: ADealOnRecord; wonOn: Date; proofOn: Date | null } => !!x);
    if (early.length) {
      /*
       * WHAT CAME, AND WHEN, NEVER "BEFORE THERE WAS A PAYMENT" (messages test, 19 October, finding 5). Kevin counted Kilele Hotel as sold on
       * 12 October with the M-Pesa message on his phone, and gave its code on 13 October: the letter said "There is a payment record." under
       * what moved and "before there was a payment" under what to do. The reason now says the day the record came, or that none has.
       */
      const whatCame = (x: { d: ADealOnRecord; proofOn: Date | null }) => {
        if (!x.proofOn) return x.d.signed ? 'before a payment or a signed order was on record' : 'and nothing written shows a payment or a signed order for it yet';
        const itsPayment = !!x.d.paidOn && x.d.paidOn.getTime() === x.proofOn.getTime();
        return `and ${itsPayment ? 'its payment record' : 'the first document about it'} came on ${day(x.proofOn)}`;
      };
      forTheLead.push({
        do: 'Tell the team a sale counts only with a payment or a signed order',
        why: early.map((x) => `${labelOf(x.d.ownerParticipantId) ?? 'Somebody'} counted ${x.d.name} as sold on ${day(x.wonOn)}, ${whatCame(x)}.`).join(' '),
        from: 'the plan',
      });
    }
  }
  /* e. A customer who has not answered, where no stall rule is set: hers to decide (standing decision 4 as changed). */
  if (input.stallDays === null) {
    for (const d of open) {
      const calls = theCallsNotAnswered({ name: d.name, fields: d.fields, ownerParticipantId: d.ownerParticipantId, notAnsweringSince: aDayKey(input.start, input.zone) }, lines as any[]);
      const contact = theContactOf(d.fields);
      if (!calls || calls.calls < 2 || !contact) continue;
      const L = labelOf(d.ownerParticipantId) ?? 'Somebody';
      forTheLead.push({
        do: `Decide whether ${L} drops ${d.name}`,
        why: `${contact} has not answered ${small(calls.calls)} calls from ${L}, on ${theDaysInWords(calls.days)}. No stall rule is set yet.`,
        from: 'the plan',
      });
    }
  }

  /* W-8: the deals that wait on one person each: on her, or on a colleague. */
  const waitsOnOne = new Map<string, string[]>();
  const add = (owner: string | null, name: string) => { if (owner) waitsOnOne.set(owner, [...new Set([...(waitsOnOne.get(owner) ?? []), name])]); };
  for (const d of open) {
    const onSomebody = waits.some((w) => isOpen(w) && w.fromParticipantId === d.ownerParticipantId && w.onParticipantId && w.onParticipantId !== d.ownerParticipantId
      && (String(w.what ?? '').toLowerCase().includes(d.name.toLowerCase())
        || (!!field(d, 'Price each') && String(w.what ?? '').replace(/,/g, '').includes(field(d, 'Price each').replace(/[^\d]/g, '')))));
    const onHerDecision = forTheLead.some((t) => t.do.includes(d.name) && /^Decide whether .+ can have/.test(t.do));
    if (onSomebody || onHerDecision) add(d.ownerParticipantId, d.name);
  }
  const parts = [...waitsOnOne.entries()].map(([owner, names]) => {
    const L = labelOf(owner) ?? 'Somebody';
    const all = open.filter((d) => d.ownerParticipantId === owner).length === names.length && names.length > 1;
    return all ? `${L}’s ${small(names.length)} deals` : `${L}’s ${listed(names)}`;
  });
  const count = [...waitsOnOne.values()].reduce((n, x) => n + x.length, 0);
  const oneEach = count >= 2 ? `${listed(parts)} all wait on one person each.` : null;

  return { shows, threeInARow, pricesOnlySaid, adapted, forTheLead, oneEach };
}

/**
 * "Four prices this week are only someone’s word: Savannah Cafe’s KES 15,000 deposit, the KES 30,000 and KES 20,000 quotes from
 * Kevin, and Mama Mboga Mart’s KES 10,000. Ask for a copy of each quote." `sayAs` names a person as this reader may read them.
 */
export function thePricesOnlySaid(items: readonly APriceOnlySaid[], sayAs: (pid: string | null) => string, yours: boolean): string | null {
  if (!items.length) return null;
  const parts: string[] = items.filter((x) => x.kind === 'deposit').map((x) => `${x.deal}’s ${x.amount} deposit`);
  const quotes = items.filter((x) => x.kind === 'quote');
  const owners = [...new Set(quotes.map((x) => x.ownerParticipantId))];
  for (const o of owners) {
    const theirs = quotes.filter((x) => x.ownerParticipantId === o);
    if (theirs.length >= 2 && !yours) parts.push(`the ${listed(theirs.map((x) => x.amount))} quotes from ${sayAs(o)}`);
    else for (const x of theirs) parts.push(`${x.deal}’s ${x.amount}${theirs.length >= 2 ? ' quote' : ''}`);
  }
  const n = items.length;
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}` : parts[0];
  return `${Cap(small(n))} ${n === 1 ? 'price this week is' : 'prices this week are'} only ${yours ? 'your' : 'someone’s'} word: ${list}. ${quotes.length ? `Ask for a copy of ${quotes.length === 1 ? 'the quote' : 'each quote'}.` : 'Ask for something written for each.'}`;
}
