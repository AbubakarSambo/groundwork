import { isASalesKind } from '../board/the-kind-of-work';
import { theReleaseOneSalesBoardIsOn } from '../board/release-one-sales-board';
import { theDealsOnRecord, type ADealOnRecord } from '../board/a-sales-aim-is-counted-from-the-deals';
import { theContactOf } from '../board/a-deal-that-has-stalled';
import { theOtherQuotesPrice } from '../board/what-needs-you-and-what-to-do';
import { theDecisionsTheLeadPromised } from '../board/a-decision-the-lead-promised';
import { thePromisesCarriedOver } from '../board/a-promise-carried-over';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { aLineIsAbout } from '../board/a-deals-value-and-buying-date';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * GRACE'S MORNING SUMMARY ON A SALES CHECK-IN, READ FROM THE DEALS (Hafsah's quality pass of 18 October, section 7, M-1 to M-3; behind
 * Release 1's switch). The template lead_daily_summary is not touched: only what fills its {{2}}.
 *
 * On Thursday 15 October Grace read "These need you. Joseph is waiting on you for an answer on the KES 4,500 price since Wednesday 14
 * October." It did not say which deal or what the price was against, left out the Mama Pima discount she had said she would decide, and
 * said nothing of what was due that day and the next. From the record:
 *  - an answer someone waits on her for, with the deal it decides: "Joseph has been waiting since Wednesday for your answer on Juja
 *    Hardware, which wants 5 units at KES 4,500 each instead of KES 5,000.";
 *  - a decision she said she would make that a customer still waits on (a-decision-the-lead-promised);
 *  - what is due today and tomorrow: a colleague's promise due today ("Joseph promised Mercy the samples for Tuskys Westgate today,
 *    today, as promised three check-ins running."), and what customers said they would pay ("Tomorrow, Savannah Cafe pays a KES 15,000 deposit, and
 *    Greenfield Supermarket takes delivery and pays.").
 */

export interface TheSalesMorning {
  /** The sentence for a wait on her, by the wait's id, in place of the plain one. */
  forAWaitOnHer: Map<string, string>;
  /** Decisions she said she would make, as full sentences. */
  decisionsSheOwes: { text: string; dealId: string }[];
  /** What is due today and tomorrow, as full sentences. */
  due: string[];
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const keyOf = (d: Date, zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const aDateKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const plusDays = (key: string, n: number) => new Date(Date.parse(`${key}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const field = (d: { fields?: Record<string, string> | null }, k: string) => String(d.fields?.[k] ?? '').trim();
const money = (n: number) => `KES ${n.toLocaleString('en-GB')}`;
const UNIT_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const unitsOf = (d: { fields?: Record<string, string> | null }) => {
  const u = field(d, 'Units').toLowerCase();
  const n = u.replace(/,/g, '').match(/\d+/);
  return n ? Number(n[0]) : UNIT_WORDS[u.split(/\s+/)[0]] ?? null;
};
const listed = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')}, and ${xs[xs.length - 1]}` : xs[0] ?? '');

/** "since Wednesday" within the week, "since 14 October" before it. */
function since(at: Date, now: Date, zone: string): string {
  const days = Math.round((Date.parse(`${keyOf(now, zone)}T12:00:00Z`) - Date.parse(`${keyOf(at, zone)}T12:00:00Z`)) / 86_400_000);
  const key = keyOf(at, zone);
  const [, m, d] = key.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return days >= 1 && days <= 6 ? `since ${WEEKDAYS[new Date(`${key}T12:00:00Z`).getUTCDay()]}` : `since ${d} ${months[m - 1]}`;
}

/*
 * WHAT IS PROMISED, WITH THE CUSTOMER IT IS FOR (Hafsah, 19 October: every line in the summary names the customer, the person and the
 * day). Grace read "Joseph promised Mercy samples today." The record kept the wait as "samples", and Mercy's own lines said which
 * customer they are for: "The samples from Joseph are holding up Tuskys Westgate." She now reads "Joseph promised Mercy the samples for
 * Tuskys today. Mercy has been waiting since Monday 12 October." Only where the waiting person's own lines name the thing beside exactly
 * one of their deals; a thing that already names its deal is said as it is.
 */
export function theThingWithItsDeal(thing: string, fromParticipantId: string | null, deals: { name: string; ownerParticipantId?: string | null; fields?: Record<string, string> | null }[], lines: { text: string; participantId: string | null }[]): string {
  const words = thing.toLowerCase().replace(/^(?:the|a|an|some)\s+/, '').split(/\s+/).filter((w) => w.length >= 3);
  if (!words.length || deals.some((d) => aLineIsAbout(thing, d))) return thing;
  const theirs = deals.filter((d) => d.ownerParticipantId === fromParticipantId && !(d as any).dropped);
  const named = new Set<string>();
  for (const l of lines.filter((x) => x.participantId === fromParticipantId)) {
    const said = l.text.toLowerCase();
    if (!words.every((w) => said.includes(w.replace(/s$/, '')))) continue;
    for (const d of theirs) if (aLineIsAbout(l.text, d)) named.add(d.name);
  }
  if (named.size !== 1) return thing;
  const bare = thing.replace(/^(?:the|a|an|some)\s+/i, '');
  return `the ${bare} for ${[...named][0]}`;
}

/** The words of a thing waited for, each in its one form ("samples" and "sample" alike), with the small words left out. */
const thingWords = (t: string) => String(t ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  .filter((x) => x.length >= 4 && !['the', 'that', 'this', 'from', 'with', 'they', 'promised', 'have', 'them'].includes(x)).map((x) => x.replace(/s$/, ''));
/**
 * The day a wait was first said: the earliest of the waits from the same person on the same person for the same thing (a word of the
 * thing in common), cleared or not, since a wait said again in a later check-in is the same wait.
 */
export function theFirstTimeThisWaitWasSaid(w: { fromParticipantId: string | null; onParticipantId: string | null; what: string | null; createdAt: Date | string }, all: { fromParticipantId: string | null; onParticipantId: string | null; what: string | null; createdAt: Date | string; clearedAt?: Date | string | null }[]): Date {
  const mine = new Set(thingWords(String(w.what ?? '')));
  let at = new Date(w.createdAt);
  for (const x of all) {
    if (x.fromParticipantId !== w.fromParticipantId || x.onParticipantId !== w.onParticipantId || !x.onParticipantId) continue;
    if (!thingWords(String(x.what ?? '')).some((k) => mine.has(k))) continue;
    /* A wait for the same thing that ended before this one began is an earlier wait, not this one. */
    if (x.clearedAt && new Date(x.clearedAt).getTime() <= new Date(w.createdAt).getTime()) continue;
    const t = new Date(x.createdAt);
    if (t.getTime() < at.getTime()) at = t;
  }
  return at;
}

export async function theSalesMorning(
  prisma: any,
  groundId: string,
  leadUserId: string,
  now: Date,
  zone = 'Africa/Lagos',
): Promise<TheSalesMorning | null> {
  const ground = await Promise.resolve(prisma.ground?.findUnique?.({
    where: { id: groundId },
    select: { id: true, organizationId: true, kindOfWork: true, initiatorId: true, participants: { select: { id: true, userId: true, partyType: true, nameGiven: true, user: { select: { firstName: true } } } } },
  })).catch(() => null);
  if (!ground || !isASalesKind(ground.kindOfWork)) return null;
  if (!(await theReleaseOneSalesBoardIsOn(prisma, ground.organizationId).catch(() => false))) return null;
  const people: any[] = ground.participants ?? [];
  const first = (pid: string | null) => {
    const p = people.find((x) => x.id === pid);
    return String(p?.user?.firstName ?? p?.nameGiven ?? '').trim().split(/\s+/)[0] || null;
  };
  const hers = new Set(people.filter((p) => p.userId === leadUserId).map((p) => p.id));
  const deals: ADealOnRecord[] = await theDealsOnRecord(prisma, groundId, { paymentRecord: true }).catch(() => [] as ADealOnRecord[]);
  const waits: any[] = ((await Promise.resolve(prisma.groundDependency?.findMany?.({ where: { groundId } })).catch(() => [])) ?? []) as any[];
  const open = waits.filter((w) => String(w.status).toUpperCase() !== 'CLEARED' && !w.clearedAt);
  const lines: any[] = (((await Promise.resolve(prisma.recordEntry?.findMany?.({
    where: { participant: { groundId }, disputedAt: null }, select: { text: true, type: true, participantId: true, checkInId: true, createdAt: true },
  })).catch(() => [])) ?? []) as any[]).map((l) => ({ ...l, text: cleanText(String(l.text ?? '')) }));
  const today = keyOf(now, zone);

  /* An answer someone waits on her for, with the deal it decides. */
  const forAWaitOnHer = new Map<string, string>();
  for (const w of open.filter((x) => hers.has(x.onParticipantId) && !hers.has(x.fromParticipantId))) {
    const amount = (String(w.what ?? '').match(/\d[\d,]*/) ?? [])[0]?.replace(/,/g, '') ?? null;
    const priced = amount ? deals.find((d) => d.ownerParticipantId === w.fromParticipantId && field(d, 'Price each').replace(/,/g, '').includes(amount)) : undefined;
    const n = priced ? unitsOf(priced) : null;
    if (!priced || n === null) continue;
    const list = theOtherQuotesPrice(deals.filter((d) => d.id !== priced.id));
    const each = field(priced, 'Price each');
    forAWaitOnHer.set(w.id, `${first(w.fromParticipantId) ?? 'Somebody'} has been waiting ${since(new Date(w.createdAt), now, zone)} for your answer on ${priced.name}, which wants ${n} units at ${each} each${list ? ` instead of ${money(list)}` : ''}.`);
  }

  /* A decision she said she would make, that a customer still waits on. */
  const lead = people.filter((p) => hers.has(p.id)).map((p) => p.id);
  const decisionsSheOwes = theDecisionsTheLeadPromised(
    deals.filter((d) => !d.dropped && String(d.stage ?? '').toLowerCase() !== 'won').map((d) => ({ ...d, id: d.id })) as any[],
    lines.filter((l) => lead.includes(l.participantId)),
    lines.filter((l) => !lead.includes(l.participantId)),
    first, () => false,
  ).map((p) => {
    /* Short, so it fits beside the rest: "You said on 12 October that you would decide on KES 12,000 off 10 units for Mama Pima Stores, and Wanjiru is still waiting." */
    const said = /You said on (\d+ \w+) that you would decide/.exec(p.why);
    const who = /^(.+?) asked /.exec(p.why)?.[1] ?? null;
    const m = /^Decide whether (.+?) can have (\d+) units for KES [\d,]+, which is (KES [\d,]+) off$/.exec(p.question) ?? /^Decide whether (.+?) can have (KES [\d,]+) off(?: (\d+) units)?$/.exec(p.question);
    const what = m ? (m[3] && /^KES/.test(m[3]) ? `${m[3]} off ${m[2]} units for ${m[1]}` : `${m[2]} off${m[3] ? ` ${m[3]} units` : ''} for ${m[1]}`) : p.question.replace(/^Decide whether /, 'whether ');
    return { dealId: p.dealId, text: `${said ? `You said on ${said[1]} that you would decide` : 'You said you would decide'} ${m ? 'on ' : ''}${what}${who ? `, and ${who} is still waiting` : ''}.` };
  });

  /* What is due today and tomorrow. */
  const due: string[] = [];
  const checkIns: any[] = ((await Promise.resolve(prisma.checkIn?.findMany?.({ where: { groundId, status: 'COMPLETED', isSetup: false }, select: { id: true, participantId: true, status: true, isSetup: true, completedAt: true } })).catch(() => [])) ?? []) as any[];
  const turns: any[] = ((await Promise.resolve(prisma.conversationTurn?.findMany?.({ where: { checkIn: { groundId } }, select: { checkInId: true, role: true, content: true }, orderBy: { createdAt: 'asc' } })).catch(() => [])) ?? []) as any[];
  const carried = thePromisesCarriedOver(open, checkIns, lines, turns, deals.map((d) => d.name));
  const told = new Set<string>();
  for (const w of open.filter((x) => x.onParticipantId && !hers.has(x.onParticipantId) && x.onParticipantId !== x.fromParticipantId && x.dueOn && aDateKey(x.dueOn) === today)) {
    const key = `${w.onParticipantId}|${w.fromParticipantId}`;
    if (told.has(key)) continue;
    told.add(key);
    const twice = carried.some((c) => c.participantId === w.onParticipantId);
    const thing = theThingWithItsDeal(String(w.what ?? '').trim().replace(/[.\s]+$/, ''), w.fromParticipantId, deals, lines);
    /* Since the first time they said they were waiting on them for it: Mercy waited on Joseph for "the sample units he promised" from
       Monday and for "the Tuskys Westgate samples" from Wednesday, one wait said twice, and Grace read "since Wednesday 14 October"
       (messages test, fourth run). */
    const startedAt = theFirstTimeThisWaitWasSaid(w, waits);
    const since = keyOf(startedAt, zone) < today ? ` ${first(w.fromParticipantId)} has been waiting since ${whenItWas(startedAt, 'weekdayAndDay', zone)}.` : '';
    due.push(twice
      ? `${first(w.onParticipantId)} has promised ${first(w.fromParticipantId)} ${thing} three check-ins running, for today.`
      : `${first(w.onParticipantId)} promised ${first(w.fromParticipantId)} ${thing} today.${since}`);
  }
  for (const [when, key] of [['Today', today], ['Tomorrow', plusDays(today, 1)]] as const) {
    const pays: string[] = [];
    for (const d of deals.filter((x) => !x.dropped)) {
      const contact = (theContactOf(d.fields) ?? '').toLowerCase();
      const deposit = open.find((w) => !w.onParticipantId && w.fromParticipantId === d.ownerParticipantId && w.dueOn && aDateKey(w.dueOn) === key
        && String(w.onLabel ?? '').trim().toLowerCase() === contact && /\b(?:deposit|payment)\b/i.test(String(w.what ?? '')));
      if (deposit) { pays.push(`${d.name} pays ${String(deposit.what).trim().replace(/[.\s]+$/, '')}`); continue; }
      const onDelivery = /^pays on delivery on \w+day (\d{1,2}) (\w+)$/i.exec(String((d as any).paysWhen ?? '').trim());
      if (onDelivery) {
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const m = months.indexOf(onDelivery[2].toLowerCase());
        const k = m >= 0 ? `${key.slice(0, 4)}-${String(m + 1).padStart(2, '0')}-${String(Number(onDelivery[1])).padStart(2, '0')}` : '';
        if (k === key) pays.push(`${d.name} takes delivery and pays`);
      }
    }
    if (pays.length) due.push(`${when}, ${listed(pays)}.`);
  }
  return { forAWaitOnHer, decisionsSheOwes, due };
}
