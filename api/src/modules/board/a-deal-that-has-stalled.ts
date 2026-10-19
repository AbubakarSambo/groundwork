import { aLineNamesTheCustomer, theCustomerIn } from './one-deal-per-customer';

/**
 * A DEAL HAS STALLED WHEN THE CUSTOMER HAS NOT ANSWERED FOR THREE WORKING DAYS, FROM THE RECORD (pilots after fixes, A4).
 *
 * Joseph said on 18 October "Mama Pima has not answered my calls since Wednesday." and the board never said the deal had
 * stalled: nothing counted a customer not answering. Now a check-in line that names the customer and says they are not
 * answering starts the count, from the day it names ("since Wednesday") or else the day it was said. A later line saying
 * they answered, paid, signed or ordered ends it. Three working days (Monday to Friday) without an answer is stalled.
 */
export const STALLED_AFTER_WORKING_DAYS = 3;

const NOT_ANSWERING = /\b(?:not|hasn'?t|has not|haven'?t|have not|isn'?t|is not|no longer|never)\s+(?:been\s+)?(?:answer(?:ed|ing)?|respond(?:ed|ing)?|repl(?:ied|ying)|pick(?:ed|ing)\s+up|got(?:ten)?\s+back|returned)\b|\bno\s+(?:reply|response|answer|word)\b|\bgone\s+(?:quiet|silent)\b|\bignor(?:ed|ing)\b|\bunanswered\b/i;
const THEY_MOVED = /\b(?:answered|replied|responded|called\s+back|got\s+back|paid|signed|ordered|agreed|confirmed|placed\s+(?:an?\s+)?order|said\s+yes)\b/i;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY = 86_400_000;
const dayStart = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** The day the silence began, as the line says it: "since Wednesday" is the Wednesday before it was said; else the day it was said. */
export function theDaySilenceBegan(text: string, saidOn: Date): Date {
  const t = (text ?? '').toLowerCase();
  const said = dayStart(saidOn);
  if (/\bsince\s+yesterday\b/.test(t)) return new Date(said - DAY);
  if (/\bsince\s+last\s+week\b/.test(t)) return new Date(said - 7 * DAY);
  const m = /\bsince\s+(?:last\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.exec(t);
  if (m) {
    const want = WEEKDAYS.indexOf(m[1]);
    let back = (new Date(said).getUTCDay() - want + 7) % 7;
    if (back === 0) back = 7;
    return new Date(said - back * DAY);
  }
  return new Date(said);
}

/** Monday-to-Friday days after `from`, up to and including `now`'s day. */
export function workingDaysSince(from: Date, now: Date): number {
  let n = 0;
  for (let d = dayStart(from) + DAY; d <= dayStart(now); d += DAY) {
    const w = new Date(d).getUTCDay();
    if (w !== 0 && w !== 6) n += 1;
  }
  return n;
}

/**
 * WHO IS ON OUR SIDE OF THE DEAL, FROM THE RECORD (Drop Access, 17 October 2026). Joseph said "Grace hasn't answered me about
 * the KES 4,500 price for Juja Hardware yet." Grace is his lead, not the customer, and Juja Hardware was counted as gone quiet
 * from 15 October. A silence counts only when it is the customer's: the deal's business, its Contact, or an unnamed "they" or
 * "the customer". A silence said of somebody in the check-in or on the organisation's roster, or of the speaker ("I", "we"),
 * is not the customer going quiet. Decided from the names on record, never from the model.
 */
export interface WhoIsOnOurSide {
  /** The names of everybody in the check-in and on the organisation's roster, as they are written. */
  people?: (string | null | undefined)[];
  /** The person the deal's record names in its Contact field. */
  contact?: string | null;
  /** Other people the record ties to the customer (thePeopleAtEachCustomer): "Wanjiru" for Mama Pima. */
  peopleThere?: (string | null | undefined)[];
}

const wordsOf = (s: string | null | undefined) => String(s ?? '').toLowerCase().replace(/[‘’'"]/g, '').replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
const OUR_OWN = new Set(['i', 'we', 'me', 'us', 'myself']);
const THE_CUSTOMER = new Set(['customer', 'customers', 'client', 'clients', 'buyer', 'buyers', 'owner', 'shop', 'store']);

/** Whose silence a line says, at each "has not answered": true when one of them is the customer's. */
export function theSilenceIsTheCustomers(text: string, dealName: string, side: WhoIsOnOurSide = {}): boolean {
  const theirs = new Set([...theCustomerIn(dealName), ...wordsOf(side.contact), ...(side.peopleThere ?? []).flatMap((n) => wordsOf(n))].filter((w) => w.length >= 3));
  const ours = new Set((side.people ?? []).flatMap((n) => wordsOf(n)).filter((w) => w.length >= 3 && !theirs.has(w)));
  const whose = (w: string): 'theirs' | 'ours' | null => {
    if (theirs.has(w) || THE_CUSTOMER.has(w)) return 'theirs';
    if (ours.has(w) || OUR_OWN.has(w)) return 'ours';
    return null;
  };
  const every = new RegExp(NOT_ANSWERING.source, 'gi');
  let found = false;
  for (let m = every.exec(text); m; m = every.exec(text)) {
    found = true;
    /* "No reply from Grace": the person is after "from". */
    const after = /^\s*from\s+(?:the\s+)?([A-Za-z][\w-]*)/.exec(text.slice(m.index + m[0].length));
    if (/^no\s/i.test(m[0]) && after) {
      if (whose(after[1].toLowerCase()) !== 'ours') return true;
      continue;
    }
    /* Otherwise the nearest name before it, in the same sentence, is whose silence it is ("she" and "they" are passed over, to the name they point back to). */
    const before = wordsOf(text.slice(0, m.index).split(/[.!?;]\s/).pop());
    let who: 'theirs' | 'ours' | null = null;
    for (let i = before.length - 1; i >= 0 && !who; i--) who = whose(before[i]);
    if (who !== 'ours') return true;
  }
  return !found;
}

/*
 * THE CUSTOMER ANSWERED, IN WHATEVER WORDS (Drop Access run 1, A3). Mama Pima read "has not answered since 12 October", though
 * Joseph said on 14 October "Mama Pima told me to call her next week, so that's on hold." and on 19 October "Wanjiru says she
 * won't buy this month." A customer who told the rep something, said something, asked something, or said they will not buy,
 * answered. A no is an answer too.
 */
const THEY_SAID_SOMETHING = /\b(?:told|tells)\s+(?:me|us|him|her|them)\b|\b(?:says?|said)\b|\basked\b|\b(?:won['’]?t|will not|wouldn['’]?t|would not|is not|isn['’]?t|are not|aren['’]?t|not)\s+(?:be\s+)?(?:buy|buying|interested)\b/i;

/** Whether a line says the customer answered: a reply verb, said of the customer's side (never of somebody on ours). */
export function theCustomerAnswered(text: string, dealName: string, side: WhoIsOnOurSide = {}): boolean {
  const t = String(text ?? '');
  if (THEY_MOVED.test(t) && !/\b(?:not|no|never|hasn'?t|haven'?t)\b/i.test(t)) return true;
  const m = THEY_SAID_SOMETHING.exec(t);
  if (!m) return false;
  const theirs = new Set([...theCustomerIn(dealName), ...wordsOf(side.contact), ...(side.peopleThere ?? []).flatMap((n) => wordsOf(n))].filter((w) => w.length >= 3));
  const ours = new Set((side.people ?? []).flatMap((n) => wordsOf(n)).filter((w) => w.length >= 3 && !theirs.has(w)));
  /* Whose words they are: the nearest name before the verb, in the same sentence. "I said" and "Grace said" are not the customer. */
  const before = wordsOf(t.slice(0, m.index).split(/[.!?;]\s/).pop());
  for (let i = before.length - 1; i >= 0; i--) {
    const w = before[i];
    if (theirs.has(w) || THE_CUSTOMER.has(w) || ['she', 'he', 'they'].includes(w)) return true;
    if (ours.has(w) || OUR_OWN.has(w)) return false;
  }
  return true;
}


/** Whether a line is about the customer: it names them, or a person the record ties to them. */
function aboutTheCustomer(text: string, dealName: string, side: WhoIsOnOurSide): boolean {
  if (aLineNamesTheCustomer(text, dealName)) return true;
  const names = [side.contact, ...(side.peopleThere ?? [])].map((n) => String(n ?? '').split(',')[0].trim()).filter((n) => /^[A-Z][\p{L}'’.-]+(?:\s+[A-Z][\p{L}'’.-]+){0,2}$/u.test(n) && n.length >= 3);
  return names.some((n) => new RegExp(`(?:^|[^\\p{L}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}])`, 'u').test(text));
}

/** When the customer stopped answering, as the record has it now, or null when nothing says so (or they answered since). */
export function notAnsweringSince(dealName: string, lines: { text: string; createdAt: Date | string }[], side: WhoIsOnOurSide = {}): Date | null {
  const theirs = lines
    .filter((l) => aboutTheCustomer(l.text, dealName, side))
    .map((l) => ({ text: l.text, on: new Date(l.createdAt) }))
    .filter((l) => !Number.isNaN(l.on.getTime()))
    .sort((a, b) => a.on.getTime() - b.on.getTime());
  let since: Date | null = null;
  /* The last day the customer answered: a silence said later cannot have begun before it ("since Monday", when they answered on Wednesday). */
  let answeredOn: Date | null = null;
  for (const l of theirs) {
    if (NOT_ANSWERING.test(l.text)) {
      /* Somebody on our side not answering is not the customer going quiet, and says nothing either way about the customer. */
      if (!theSilenceIsTheCustomers(l.text, dealName, side)) continue;
      let began = theDaySilenceBegan(l.text, l.on);
      if (answeredOn && began.getTime() < dayStart(answeredOn)) began = new Date(dayStart(answeredOn));
      if (!since || began < since) since = began;
    } else if (theCustomerAnswered(l.text, dealName, side)) {
      since = null;
      answeredOn = l.on;
    }
  }
  return since;
}

/**
 * Whether the customer has been quiet for the stall rule's working days. `days`: the lead's own rule (the-stall-rule); null where
 * none is set, and then no deal has stalled (standing decision 4, 18 October). Left out, the rule the board always read.
 */
export function hasStalled(since: Date | null, now: Date, days: number | null = STALLED_AFTER_WORKING_DAYS): boolean {
  if (days == null) return false;
  return !!since && workingDaysSince(since, now) >= days;
}

/** The person a deal's record names in its Contact field, or null. */
export function theContactOf(fields: Record<string, string> | null | undefined): string | null {
  for (const [k, v] of Object.entries(fields ?? {})) if (/^\s*contact\s*$/i.test(k) && String(v ?? '').trim()) return String(v).trim();
  return null;
}

/**
 * Every name on our side of a deal, from the record: each person in the check-in (their sign-in name, or the name they gave)
 * and each person on the organisation's roster. Used only to tell whose silence a line says; never served.
 */
export async function theNamesOnOurSide(
  prisma: any,
  organizationId: string | null | undefined,
  participants: { nameGiven?: string | null; user?: { firstName?: string | null; lastName?: string | null } | null }[],
): Promise<string[]> {
  const inTheCheckIn = (participants ?? []).flatMap((p) => [p.user?.firstName, p.user?.lastName, p.nameGiven]);
  const roster: any[] = organizationId && typeof prisma?.person?.findMany === 'function'
    ? ((await Promise.resolve(prisma.person.findMany({
      where: { organizationId },
      select: { displayName: true, givenName: true, familyName: true },
    })).catch(() => [])) ?? [])
    : [];
  return [...inTheCheckIn, ...roster.flatMap((p) => [p.displayName, p.givenName, p.familyName])]
    .map((n) => String(n ?? '').trim())
    .filter(Boolean);
}

/*
 * THE PEOPLE AT A CUSTOMER, FROM THE RECORD (Drop Access run 1, A3). Joseph's deal is "Mama Pima", and the person he deals with
 * there is Wanjiru: "Wanjiru says she won't buy this month." names no customer, so it was not read as Mama Pima answering. The
 * record ties Wanjiru to Mama Pima where Joseph is waiting on Wanjiru for something that names Mama Pima ("the discount for Mama
 * Pima"). A wait on somebody named, about one of the speaker's own deals, names a person at that customer. Never a team or a
 * department ("Accounts", "head office"), and never anybody on our side.
 */
const A_PERSONS_NAME = /^(?:(?:Mr|Mrs|Ms|Dr)\.?\s+)?[A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+)?$/;
const NOT_A_PERSON = /^(?:accounts?|finance|logistics|marketing|sales|operations|procurement|management|head office|the office|the team|legal|admin|stores?|security|reception|m-?pesa)$/i;

export function thePeopleAtTheCustomer(
  deal: { name: string; ownerParticipantId?: string | null },
  waits: readonly { fromParticipantId?: string | null; onParticipantId?: string | null; onLabel?: string | null; what?: string | null }[],
  ourSide: readonly (string | null | undefined)[] = [],
): string[] {
  const ours = new Set(ourSide.flatMap((n) => wordsOf(n)).filter((w) => w.length >= 3));
  const out = new Set<string>();
  for (const w of waits) {
    const label = String(w.onLabel ?? '').trim();
    if (w.onParticipantId || !label || !A_PERSONS_NAME.test(label) || NOT_A_PERSON.test(label)) continue;
    if (deal.ownerParticipantId && w.fromParticipantId && w.fromParticipantId !== deal.ownerParticipantId) continue;
    if (aLineNamesTheCustomer(label, deal.name) || !aLineNamesTheCustomer(String(w.what ?? ''), deal.name)) continue;
    if (wordsOf(label.replace(/^(?:mr|mrs|ms|dr)\.?\s+/i, '')).some((x) => ours.has(x))) continue;
    out.add(label);
  }
  return [...out];
}

/** The people at each customer, for every deal of one check-in, by the deal's id. Read only. */
export async function thePeopleAtEachCustomer(
  prisma: any,
  groundId: string,
  deals: readonly { id: string; name: string; ownerParticipantId?: string | null }[],
  ourSide: readonly (string | null | undefined)[] = [],
): Promise<Map<string, string[]>> {
  const waits = ((await Promise.resolve(prisma?.groundDependency?.findMany?.({
    where: { groundId },
    select: { fromParticipantId: true, onParticipantId: true, onLabel: true, what: true },
  })).catch(() => [])) ?? []) as any[];
  return new Map(deals.map((d) => [d.id, thePeopleAtTheCustomer(d, waits, ourSide)]));
}
