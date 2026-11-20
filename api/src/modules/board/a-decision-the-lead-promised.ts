import { theDayZone } from '../../common/the-organisations-own-day';
import { aLineIsAbout } from './a-deals-value-and-buying-date';
import { anUnansweredAsk, type ADealToSay, type ADealsLine } from './what-a-deal-still-needs';
import { theOtherQuotesPrice } from './what-needs-you-and-what-to-do';

/**
 * A DECISION THE LEAD PROMISED HERSELF (standing decision 3 of Hafsah's quality pass, 18 October, B-8). Grace said on 12 October
 * "I'll decide on Joseph's pricing question today." and "figure out if selling at KES 4,500 for his Mama Pima Stores deal is
 * something we can do", and Wanjiru's KES 12,000 discount for 10 units was never answered. Nothing waited on Grace in the record,
 * so What needs you did not show it. It shows now, as a yes or a no:
 *   "Decide whether Mama Pima Stores can have 10 units for KES 38,000, which is KES 12,000 off"
 *   "Wanjiru asked Joseph on 12 October and has had no answer. You said on 12 October that you would decide that day."
 * Only from the lead's own promise to decide that names the deal, and a discount its customer asked for that nobody has answered.
 * The price before the discount is the price on every other quote, said only where they all say the same. To the lead alone.
 */
export interface ADecisionTheLeadPromised {
  dealId: string;
  question: string;
  why: string;
}

const A_PROMISE_TO_DECIDE = /\b(?:decide|figure out|make a call|think about whether)\b/i;
const aLagosDay = (at: Date | string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: theDayZone() }).format(new Date(at));
const dayKey = (at: Date | string) => new Intl.DateTimeFormat('en-CA', { timeZone: theDayZone(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(at));
const money = (n: number) => `KES ${n.toLocaleString('en-GB')}`;

export function theDecisionsTheLeadPromised(
  deals: (ADealToSay & { id: string })[],
  leadsLines: readonly ADealsLine[],
  ownersLines: readonly ADealsLine[],
  firstName: (pid: string | null) => string | null,
  answered: (question: string) => boolean,
): ADecisionTheLeadPromised[] {
  const out: ADecisionTheLeadPromised[] = [];
  const promises = leadsLines.filter((l) => String(l.type ?? '').toUpperCase() === 'COMMITMENT' && A_PROMISE_TO_DECIDE.test(l.text));
  for (const d of deals) {
    const promise = promises.find((l) => aLineIsAbout(l.text, { name: d.name, fields: null }));
    if (!promise) continue;
    const ask = anUnansweredAsk(d, ownersLines);
    if (!ask || !ask.amount) continue;
    const units = ask.units;
    const list = units ? theOtherQuotesPrice(deals.filter((x) => x.id !== d.id)) : null;
    const question = units && list && list * units > ask.amount
      ? `Decide whether ${d.name} can have ${units} units for ${money(list * units - ask.amount)}, which is ${money(ask.amount)} off`
      : `Decide whether ${d.name} can have ${money(ask.amount)} off${units ? ` ${units} units` : ''}`;
    if (answered(question)) continue;
    const contact = String(d.fields?.Contact ?? '').trim() || 'The customer';
    const owner = firstName(d.ownerParticipantId) ?? 'the rep';
    /* "That day" where she said she would decide today, in a line of the same day. */
    const today = promises.some((l) => /\btoday\b/i.test(l.text) && dayKey(l.createdAt) === dayKey(promise.createdAt));
    const when = today ? `You said on ${aLagosDay(promise.createdAt)} that you would decide that day.` : `You said on ${aLagosDay(promise.createdAt)} that you would decide.`;
    out.push({ dealId: d.id, question, why: `${contact} asked ${owner} on ${aLagosDay(ask.on)} and has had no answer. ${when}` });
  }
  return out;
}
