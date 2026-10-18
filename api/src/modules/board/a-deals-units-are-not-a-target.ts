import { aLineNamesTheCustomer } from './one-deal-per-customer';
import { isASalesKind } from './the-kind-of-work';

/**
 * A DEAL'S UNITS ARE THE DEAL'S, NOT THE REP'S TARGET (Drop Access run 1, items 27 and 28).
 *
 * Joseph said "My main goal is to close the Mama Pima deal for 10 units." on day 1, and it was kept as his own target of 10 beside
 * the 40 Grace set for him. From then on he was asked "Grace expects 40 units sold … you said your goal is 10 units from Mama
 * Pima. Which one is it now?" in five check-ins, five times in a row on day 9, though he said "My goal was never 10 units for Mama
 * Pima." The same happened to Mercy ("For Greenfield Supermarket, I expect to sell 25 units", "The 30 units for Tuskys Westgate
 * stands as what we're aiming for.") and to Kevin. And Mercy's "signed orders and proof of payment for the 40 units", about her
 * whole 40, was put beside Tuskys Westgate's 30 as one thing counted twice ("the original target for Tuskys Westgate was 40
 * units. That's a 25% drop."), though she never said 40 about Tuskys.
 *
 * THE RULE. In a sales check-in, a number said about one customer's deal belongs to that deal: it is filed on the deal, as the
 * deal's units and value, and it is never the person's own target. A sentence is about a deal where it names a customer on
 * record, or speaks of "the deal", or of selling for, from, with or at a named business. The person's target is the number for
 * all their sales together ("40 units sold by 30 October"), which is what the lead set.
 *
 * And two numbers are only the same thing counted twice where they are about the same customer, or both about no customer.
 */

const A_DEAL_WORD = /\b(?:deal|deals|order from|order for|quote for|quoted)\b/i;
const NOT_A_BUSINESS = /^(?:January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|The|This|That|Nairobi|Kenya|Q[1-4])$/;

/** Every customer on record a line names ("Savannah Cafe's deposit" names Savannah Cafe), in the order given. */
export function theCustomersALineNames(line: string, customers: readonly string[]): string[] {
  const plain = String(line ?? '').replace(/['’]s\b/g, '');
  return customers.filter((c) => c?.trim() && aLineNamesTheCustomer(plain, c)).map((c) => c.trim());
}

/** The customer, or customers, a line is about, as one key ("Ngong Road Minimart and Savannah Cafe"), or null. */
export function theCustomerALineIsAbout(line: string, customers: readonly string[]): string | null {
  const named = [...new Set(theCustomersALineNames(line, customers))].sort();
  return named.length ? named.join(' and ') : null;
}

/**
 * Whether a number in this sentence is a deal's figure rather than the speaker's own target: it names a customer on record, says
 * "the deal", or sells for, from, with or at a named business that is not one of the people in the check-in.
 */
export function aDealsFigure(sentence: string, customers: readonly string[], people: readonly string[] = []): boolean {
  const t = String(sentence ?? '');
  if (!t.trim()) return false;
  if (theCustomerALineIsAbout(t, customers)) return true;
  if (A_DEAL_WORD.test(t)) return true;
  const isAPerson = (w: string) => people.some((p) => String(p ?? '').trim().split(/\s+/)[0]?.toLowerCase() === w.toLowerCase());
  for (const m of t.matchAll(/\b(?:[Ff]or|[Ff]rom|[Ww]ith|[Aa]t)\s+(?:the\s+)?([A-Z][\w'’&-]+)(?:\s+[A-Z][\w'’&-]+)*/g)) {
    const first = m[1];
    if (NOT_A_BUSINESS.test(first) || isAPerson(first)) continue;
    return true;
  }
  return false;
}

/**
 * A COUNT OF PLACES VISITED IS NOT AN AIM (Drop Access short run, item 7). Kevin answered "Which part of the plan is yours to do?"
 * with "tomorrow I'm also visiting two shops on Ngong Road", and it was kept as his own target of 2, so his next check-in asked
 * "You said your aim is 2 shops; Grace set 40 units by October 30th. Which stands now?" and "Your own aim is 2 shops." A visit,
 * a call or a meeting with a number of places or people, with nothing to sell, sign or win in it, is something they will do,
 * not a number to reach.
 */
const A_VISIT = /\b(?:visit(?:s|ing|ed)?|going\s+to|go\s+to|meet(?:s|ing)?|call(?:s|ing)?|see(?:s|ing)?|stop(?:ping)?\s+by|drop(?:ping)?\s+(?:by|in|off)|pass(?:ing)?\s+by)\b/i;
const SOMETHING_TO_REACH = /\b(?:sell|sells|selling|sold|sale|sales|sign|signs|signing|signed|close|closes|closing|closed|win|won|onboard\w*|recruit\w*|target|aim|goal|units?|revenue|kes|ksh|leads?|orders?|deals?|customers?\s+(?:signed|won))\b/i;
export function aCountOfPlacesVisited(sentence: string): boolean {
  const t = String(sentence ?? '');
  return A_VISIT.test(t) && !SOMETHING_TO_REACH.test(t);
}

/**
 * The targets with every one a person set for themselves that is a deal's figure left out, for every reader: the deal holds those
 * units, and "You have sold 49 of the 10" against "the deals with Savannah Cafe and Ngong Road Minimart, that'll be 10 units" is
 * not a target anybody set. Nothing is deleted; the sentence stays in the record as what they said.
 */
export function withoutADealsFigure<T extends { name?: string | null; ownerParticipantId?: string | null; setByParticipantId?: string | null }>(
  objectives: readonly T[], customers: readonly string[] | null, people: readonly string[] = [],
): T[] {
  if (!customers) return [...objectives];
  return objectives.filter((o) => {
    const owner = o.ownerParticipantId ?? null;
    if (!owner) return true;
    if (o.setByParticipantId && o.setByParticipantId !== owner) return true;
    return !aDealsFigure(String(o.name ?? ''), customers, people) && !aCountOfPlacesVisited(String(o.name ?? ''));
  });
}

/** The customers on record on a sales check-in (its deals and leads, by name), or null where the check-in is not a sales one. */
export async function theCustomersOnRecordIfSales(prisma: any, groundId: string): Promise<string[] | null> {
  try {
    const g = await prisma?.ground?.findUnique?.({ where: { id: groundId }, select: { kindOfWork: true } });
    if (!g || !isASalesKind(g.kindOfWork)) return null;
    const rows = ((await prisma?.workItem?.findMany?.({ where: { groundId, kind: { in: ['deal', 'lead'] } }, select: { name: true } })) ?? []) as { name: string }[];
    return [...new Set(rows.map((r) => String(r.name ?? '').trim()).filter(Boolean))];
  } catch {
    return null;
  }
}
