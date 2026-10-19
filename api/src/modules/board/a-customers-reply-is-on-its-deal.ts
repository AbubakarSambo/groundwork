import { aLineNamesTheCustomer } from './one-deal-per-customer';

/**
 * A CUSTOMER'S REPLY IS ON ITS DEAL, NOT UNDER BLOCKERS (Drop Access, 16 October 2026; Hafsah's answer of 17 October:
 * "A customer's reply updates its deal, going under Blockers only if it stops the deal.").
 *
 * Grace's Blockers listed "Kevin Omondi is waiting on Jane for a deposit", "... on Ali for a decision on the quote for 4
 * units", "... on Paul for a response to their calls", "... on the owner of Kasarani Gym for a decision on 3 units", "Mercy
 * Wairimu is waiting on Rose for the purchase of the two units" and three about Wanjiru at Mama Pima. Each is a customer
 * the rep is selling to, and waiting on a customer's answer is the deal itself, not something in the team's way. The
 * prototype's Blockers are the team's own (stock, pricing, customer financing, a rule); a customer who has not answered
 * is on the deal ("Follow-up, no reply").
 *
 * DECIDED FROM THE RECORD, NEVER FROM NEW WORDING. A wait is on a customer of a deal when nobody in the check-in holds it
 * and what holds it names a deal's business ("the owner of Kasarani Gym") or is the person the deal names as its contact
 * ("Jane", kept as the Savannah Cafe deal's Contact). The waiting person's own deals are looked at first.
 *
 * IT STAYS UNDER BLOCKERS ONLY WHERE WHAT WAS SAID SAYS IT STOPS THE DEAL: a wait stored as blocking (the person said the
 * work cannot go on), never one stored as waiting. A wait on a colleague, on the lead, or on a decision ("the discount
 * decision") is the team's own and stays where it was.
 */
export interface ADealACustomerWaitCanBeOn {
  id: string;
  name: string;
  ownerParticipantId: string | null;
  fields: Record<string, string>;
}

export interface AWaitToPlace {
  fromParticipantId?: string | null;
  onParticipantId?: string | null;
  onLabel?: string | null;
  status?: string | null;
  what?: string | null;
  sourceCheckInId?: string | null;
}

/**
 * WHERE THE DEAL KEEPS NO CONTACT YET (Drop Access short run, 18 October). Kevin said "That was Ngong Road Minimart. Ali said
 * he'll decide next week.", and the wait was kept as "waiting on Ali for a decision on the four units", but the deal kept no
 * contact, so the wait stayed under Blockers ("A decision on the four units. Waiting on: Ali"). The waiting person's own
 * answers in the check-in the wait was said in are read: an answer that names the holder and exactly one deal of theirs
 * places the wait on that deal. Only their own words, only to place their own wait; nothing of them is served.
 */
const aWordIn = (line: string, name: string): boolean => {
  const n = String(name ?? '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return !!n && new RegExp(`(?:^|[^A-Za-z])${n}(?:[^A-Za-z]|$)`).test(String(line ?? ''));
};

const squash = (s: string) => (s ?? '').toLowerCase().replace(/[‘’“”'"]/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
const ARTICLE = /^(?:the|a|an|mr|mrs|ms|dr|madam|mama|baba)\s+/;

/** Whether what holds the wait is the person the deal names as its contact: "Jane" for "Jane" or "Jane Mwende". */
function isTheContact(holder: string, contact: string | null | undefined): boolean {
  const h = squash(holder);
  const c = squash(contact ?? '');
  if (!h || !c) return false;
  if (h === c) return true;
  /* A first name for the whole name, or the whole name for a first name, but never a word like "the owner". */
  const hName = h.replace(ARTICLE, '');
  const cName = c.replace(ARTICLE, '');
  if (hName !== h || cName !== c) return false;
  const [hFirst] = hName.split(' ');
  const [cFirst] = cName.split(' ');
  return hFirst.length >= 3 && hFirst === cFirst && (hName.split(' ').length === 1 || cName.split(' ').length === 1);
}

const contactOf = (fields: Record<string, string>) =>
  Object.entries(fields ?? {}).find(([k]) => /^(?:contact|contact person|customer contact)$/i.test(k.trim()))?.[1] ?? null;

/** The deal a wait is on, where it is waiting on that deal's customer; null where it is not. */
export function theDealTheWaitIsOn<D extends ADealACustomerWaitCanBeOn>(wait: AWaitToPlace, deals: D[], theirOwnWords: readonly string[] = []): D | null {
  if (wait.onParticipantId) return null;
  const holder = String(wait.onLabel ?? '').trim();
  if (!holder) return null;
  const theirsFirst = [
    ...deals.filter((d) => !!wait.fromParticipantId && d.ownerParticipantId === wait.fromParticipantId),
    ...deals.filter((d) => !wait.fromParticipantId || d.ownerParticipantId !== wait.fromParticipantId),
  ];
  const named = theirsFirst.find((d) => isTheContact(holder, contactOf(d.fields)))
    ?? theirsFirst.find((d) => aLineNamesTheCustomer(holder, d.name));
  if (named) return named;
  /* No contact on record: their own answer naming the holder and one deal of theirs (see aWordIn). A colleague's name is never a holder here (onParticipantId is set for them). */
  const theirs = deals.filter((d) => !!wait.fromParticipantId && d.ownerParticipantId === wait.fromParticipantId);
  /* Only a person's name ("Ali", "Rose Wanjiku"): "M-Pesa" or "the bank" is not somebody at a customer. */
  if (!/^(?:Mr\.?\s+|Mrs\.?\s+|Ms\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/.test(holder)) return null;
  for (const line of theirOwnWords) {
    if (!aWordIn(line, holder)) continue;
    const inIt = theirs.filter((d) => aLineNamesTheCustomer(line, d.name));
    if (inIt.length === 1) return inIt[0];
  }
  return null;
}

/**
 * THE CUSTOMER'S OWN ANSWER IS THE DEAL (Drop Access short run, 18 October). "Still no reply from Paul, even after two more calls
 * today." was stored as blocking, and the wait stayed under Blockers as "A reply. Waiting on: Paul". A wait that is only for the
 * customer to answer (a reply, an answer to a call, a call back) is a deal gone quiet, never a stop in the team's way, however
 * it was worded. Anything else the customer holds and was said to stop the deal (a signed order, their financing) stays a
 * blocker, as decided on 17 October.
 */
const THE_CUSTOMERS_OWN_ANSWER = /^\s*(?:a|an|any|the|their|his|her)?\s*(?:repl(?:y|ies)|answers?|response|call\s+back|word)(?:\s+(?:to|on)\s+(?:my|our|the|his|her|their)\s+(?:calls?|messages?|emails?|texts?))?\s*\.?\s*$/i;

/** What was said makes it stop the deal: the wait was stored as blocking, and it is not only the customer's own answer. */
export function itStopsTheDeal(wait: AWaitToPlace): boolean {
  if (String(wait.status ?? '').toUpperCase() !== 'BLOCKING') return false;
  return !THE_CUSTOMERS_OWN_ANSWER.test(String(wait.what ?? ''));
}

/** A wait that goes on its deal and not under Blockers: on a customer of a deal, and not said to stop it. */
export function aWaitOnACustomerOfADeal<D extends ADealACustomerWaitCanBeOn>(wait: AWaitToPlace, deals: D[], theirOwnWords: readonly string[] = []): D | null {
  if (itStopsTheDeal(wait)) return null;
  return theDealTheWaitIsOn(wait, deals, theirOwnWords);
}

/**
 * The waiting person's own answers in the check-in each wait was said in, for the waits on somebody outside the check-in only
 * (see aWordIn). Keyed by the check-in. Read only; a reader that has no turns gives nothing, and every wait is placed as before.
 */
export async function theirOwnAnswersWhereTheWaitsWereSaid(prisma: any, waits: AWaitToPlace[]): Promise<Map<string, string[]>> {
  const ids = [...new Set(waits.filter((w) => !w.onParticipantId && String(w.onLabel ?? '').trim() && w.sourceCheckInId).map((w) => String(w.sourceCheckInId)))];
  const out = new Map<string, string[]>();
  if (!ids.length) return out;
  const rows: any[] = ((await Promise.resolve(prisma?.conversationTurn?.findMany?.({
    where: { checkInId: { in: ids }, role: 'PERSON' },
    orderBy: { createdAt: 'asc' },
    select: { checkInId: true, content: true, checkIn: { select: { participantId: true } } },
  })).catch(() => [])) ?? []) as any[];
  for (const r of rows) out.set(r.checkInId, [...(out.get(r.checkInId) ?? []), String(r.content ?? '')]);
  /* Only the waiting person's own check-in: a turn of somebody else's check-in never places a wait. */
  const byCheckIn = new Map(rows.map((r) => [r.checkInId, r.checkIn?.participantId ?? null]));
  for (const w of waits) {
    const id = w.sourceCheckInId ? String(w.sourceCheckInId) : '';
    if (id && byCheckIn.has(id) && byCheckIn.get(id) && byCheckIn.get(id) !== w.fromParticipantId) out.delete(id);
  }
  return out;
}

/**
 * The waits that stay with the team, and the ones that go on a deal, from one list. Only an open wait goes on a deal; a
 * cleared one is history and stays where history is read.
 */
export function theWaitsOnCustomersApart<W extends AWaitToPlace & { status?: string | null; clearedAt?: unknown }, D extends ADealACustomerWaitCanBeOn>(
  waits: W[],
  deals: D[],
  theirOwnAnswers: Map<string, string[]> = new Map(),
): { team: W[]; onDeals: (W & { dealId: string })[] } {
  const team: W[] = [];
  const onDeals: (W & { dealId: string })[] = [];
  for (const w of waits) {
    const open = String(w.status ?? '').toUpperCase() !== 'CLEARED' && !w.clearedAt;
    const deal = open ? aWaitOnACustomerOfADeal(w, deals, theirOwnAnswers.get(String(w.sourceCheckInId ?? '')) ?? []) : null;
    if (deal) onDeals.push({ ...w, dealId: deal.id });
    else team.push(w);
  }
  return { team, onDeals };
}

/**
 * EVERY LIST OF WAITS ACROSS CHECK-INS READS THE SAME RULE (Drop Access, 17 October 2026). The board took a customer's reply off
 * its Blockers, but the lead's morning summary and "what the whole place is waiting on" still read "Kevin Omondi waits on Ali for
 * a decision on the quote for 4 units" as a wait on the team. Here, from a list of waits across any check-ins, the open waits on a
 * customer of a deal in their own check-in are left out, unless they were said to stop the deal (stored as blocking). Read only:
 * each check-in's deals, by its id. A check-in with no deals keeps every wait it had.
 */
export async function withoutTheWaitsOnCustomers<W extends AWaitToPlace & { groundId?: string | null; clearedAt?: unknown }>(prisma: any, waits: W[]): Promise<W[]> {
  const ids = [...new Set(waits.map((w) => w.groundId).filter((g): g is string => !!g))];
  if (!ids.length) return waits;
  const rows: any[] = ((await Promise.resolve(prisma?.workItem?.findMany?.({
    /* Only where the organisation has Release 1's sales board switched on (release-one-sales-board): off, a customer's reply stays a wait, as before. */
    where: { groundId: { in: ids }, kind: 'deal', ground: { organization: { release1SalesBoardOn: true } } },
    select: { id: true, groundId: true, name: true, ownerParticipantId: true, fields: true },
  })).catch(() => [])) ?? []) as any[];
  if (!rows.length) return waits;
  const byGround = new Map<string, ADealACustomerWaitCanBeOn[]>();
  for (const r of rows) {
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries((r.fields && typeof r.fields === 'object' && !Array.isArray(r.fields) ? r.fields : {}) as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) fields[k] = v;
    }
    const list = byGround.get(r.groundId) ?? [];
    list.push({ id: r.id, name: String(r.name ?? ''), ownerParticipantId: r.ownerParticipantId ?? null, fields });
    byGround.set(r.groundId, list);
  }
  const answers = await theirOwnAnswersWhereTheWaitsWereSaid(prisma, waits).catch(() => new Map<string, string[]>());
  return waits.filter((w) => {
    const open = String(w.status ?? '').toUpperCase() !== 'CLEARED' && !w.clearedAt;
    return !(open && w.groundId && aWaitOnACustomerOfADeal(w, byGround.get(w.groundId) ?? [], answers.get(String(w.sourceCheckInId ?? '')) ?? []));
  });
}
