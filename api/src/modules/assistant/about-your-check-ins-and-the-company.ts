import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { A_GROUND_IS_OVER } from '../grounds/a-ground-that-has-ended';
import { theCheckInsHeldForASeat } from '../participants/held-for-a-seat';
import { theBriefAsTheLeadReadsIt, theirOwnFirstNameAsYour } from '../grounds/what-a-participant-is-told-about-this';
import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';
import { whoCanReadWhatYouSay } from '../grounds/who-may-read-this-check-in';
import { whatSomeoneWhoDoesNotRunItReads } from '../grounds/what-someone-who-does-not-run-it-reads';
import { readTheCompanyPage, NOT_YOUR_COMPANY } from '../grounds/company.service';

/**
 * THE QUESTIONS ASK ITSELF SUGGESTS (requests 179 and 180 item 1, 7 October 2026).
 *
 * "When is my next check-in?", "What is my check-in for, and who reads it?", "What are the company's priorities right now?",
 * "Is the strategy moving?" and "Ask for leave, or to spend money." were all offered by Ask and all answered "I cannot answer that one yet."
 * Each answer below reads only what the person may already read: their own check-ins that have not ended and that they are not held a seat
 * for, and the company page exactly as it serves them (a guest is refused it, and a reading that rests on a check-in they may not open is
 * left out by the page itself). Nothing is written.
 */

/** The names of the check-ins as a list in a sentence: "A", "A and B", "A, B and C". */
const inWords = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

async function theirCheckIns(prisma: any, organizationId: string, userId: string) {
  const grounds: any[] = await prisma.ground.findMany({
    where: { organizationId, status: { notIn: [...A_GROUND_IS_OVER, 'AWAITING_APPROVAL'] as any }, OR: [{ initiatorId: userId }, { participants: { some: { userId } } }] },
    select: { id: true, label: true, initiatorId: true, brief: true, toldToParticipants: true, scenario: true, peersVisibleToEachOther: true, organization: { select: { name: true } }, initiator: { select: { firstName: true } } },
    orderBy: { createdAt: 'asc' },
  }).catch(() => []);
  const held = await theCheckInsHeldForASeat(prisma, grounds.map((g) => g.id), userId).catch(() => new Set<string>());
  /* Held for a seat keeps their place and their own words (decision 110, B3), so they are named, as being in it with no seat yet. Held for the organisation's approval is left out whole, as before. */
  const noSeat: Set<string> = new Set(
    held.size
      ? ((await prisma.groundParticipant?.findMany?.({ where: { userId, awaitingSeat: true, groundId: { in: [...held] } }, select: { groundId: true } })?.catch?.(() => [])) ?? []).map((r: any) => r.groundId)
      : [],
  );
  return grounds.filter((g) => !held.has(g.id) || noSeat.has(g.id)).map((g) => ({ ...g, noSeatYet: noSeat.has(g.id) }));
}

/** Said of a check-in the person is in but holds no seat for yet. No part of the check-in itself is told. */
export const noSeatYetSays = (label: string) =>
  `You are in "${label}", but there is no seat for you on the plan yet, so you cannot answer a new check-in. What you have already said is still yours, and you will get your invitation as soon as there is a seat.`;

/**
 * WHEN A CHECK-IN OPENS, SAID THE WAY THE CHECK-IN ITSELF SAYS IT (channel test, 20 November 2026, W27): "today at 8am", "tomorrow at 8am",
 * "on Friday 27 November at 8am", in the organisation's own day. Ask said "opens on 26 November 2026" while the check-in said "opens on
 * Friday 27 November at 12am" for the same session: Ask counted the day in another zone and gave no hour. The screen's sentence is the owner
 * (client/src/lib/what-the-end-of-a-check-in-can-say.ts, theNextOne); this says the same.
 */
export function whenItOpensSaid(opens: Date, now: Date, zone: string): string {
  const time = whenItWas(opens, 'hourOfDay', zone).replace(/\s/g, '').replace(':00', '').toLowerCase();
  const day = (d: Date) => whenItWas(d, 'day', zone);
  if (day(opens) === day(now)) return `today at ${time}`;
  if (day(opens) === day(new Date(now.getTime() + 86_400_000))) return `tomorrow at ${time}`;
  return `on ${whenItWas(opens, 'weekdayAndDay', zone)} at ${time}`;
}

export async function whenIsMyNextCheckIn(prisma: any, organizationId: string, userId: string | null, now = new Date()): Promise<string> {
  const none = 'You have no check-in waiting for you right now. When one is coming up for you, I will tell you when it opens.';
  if (!userId) return none;
  const everyOne = await theirCheckIns(prisma, organizationId, userId);
  const noSeat = everyOne.filter((g: any) => g.noSeatYet);
  const mine = everyOne.filter((g: any) => !g.noSeatYet);
  if (!mine.length) return noSeat.length ? noSeat.slice(0, 3).map((g: any) => noSeatYetSays(g.label)).join('\n') : none;
  const rows: any[] = await prisma.checkIn.findMany({
    where: {
      groundId: { in: mine.map((g) => g.id) }, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] }, isSetup: false,
      participant: { userId, managingOnly: false },
    },
    select: { groundId: true, status: true, availableFrom: true, sessionNumber: true },
    orderBy: [{ availableFrom: 'asc' }, { sessionNumber: 'asc' }],
  }).catch(() => []);
  if (!rows.length) return noSeat.length ? noSeat.slice(0, 3).map((g: any) => noSeatYetSays(g.label)).join('\n') : none;
  const label = (id: string) => mine.find((g) => g.id === id)?.label ?? 'your check-in';
  /* The organisation's own day, whichever door asked (WhatsApp has no signed-in request to set it). */
  const zone = (await theOrganisationsZone(prisma, organizationId).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE;
  const lines = rows.slice(0, 3).map((r) => {
    if (r.status === 'IN_PROGRESS') return `You have started your check-in in "${label(r.groundId)}", and you can carry on with it now.`;
    const opens = r.availableFrom ? new Date(r.availableFrom) : null;
    if (!opens || opens.getTime() <= now.getTime()) return `Your check-in in "${label(r.groundId)}" is waiting for you now.`;
    return `Your next check-in in "${label(r.groundId)}" opens ${whenItOpensSaid(opens, now, zone)}.`;
  });
  if (rows.length > 3) lines.push(`There ${rows.length - 3 === 1 ? 'is 1 more' : `are ${rows.length - 3} more`} after those.`);
  for (const g of noSeat.slice(0, 3)) lines.push(noSeatYetSays((g as any).label));
  return lines.join('\n');
}

export async function whatMyCheckInIsFor(prisma: any, organizationId: string, userId: string | null): Promise<string> {
  const none = 'You are not in a check-in that is still running, so there is nothing to say about what one is for.';
  if (!userId) return none;
  const mine = await theirCheckIns(prisma, organizationId, userId);
  if (!mine.length) return none;
  /* "Zawadi's first weeks" is "your first weeks" to Zawadi here too, as on her check-in page (6ae83da4): only the possessive of her own first name. */
  const myFirstName: string | null = (await prisma.user?.findUnique?.({ where: { id: userId }, select: { firstName: true } })?.catch?.(() => null))?.firstName ?? null;
  const lines = mine.slice(0, 3).map((g: any) => {
    if (g.noSeatYet) return noSeatYetSays(g.label);
    const runsIt = g.initiatorId === userId;
    const leads = (g.initiator?.firstName ?? '').trim();
    /* What the lead wrote is the lead's; a person taking part is told what the product wrote for them. */
    /* What somebody who does not run it reads is the one rule every route serves (what-someone-who-does-not-run-it-reads.ts), so Ask says what their check-in page says. */
    const forWhat = ((runsIt ? theBriefAsTheLeadReadsIt(g.brief) : theirOwnFirstNameAsYour(whatSomeoneWhoDoesNotRunItReads(g), myFirstName)) ?? '').trim();
    const what = forWhat ? `This is what "${g.label}" is for. ${forWhat.replace(/[.!?]*$/, '.')}` : `"${g.label}" has no description of what it is for yet.`;
    const reads = runsIt
      ? 'You run it, so you read its report.'
      : whoReadsWhatAMemberSays(g, leads);
    return `${what} ${reads}`;
  });
  if (mine.length > 3) lines.push(`You are in ${mine.length - 3} more, and I can tell you about any of them if you name it.`);
  return lines.join('\n');
}

export async function theCompanysPriorities(prisma: any, grounds: any, reader: { userId: string | null; email?: string; organizationId: string; role: string }): Promise<string> {
  if (!reader.userId) return 'I need your sign-in to say what the company is working on.';
  let page: any;
  try { page = await readTheCompanyPage(prisma, grounds, { userId: reader.userId, email: reader.email ?? '', organizationId: reader.organizationId, role: reader.role }); }
  catch (err: any) { return err?.status === 403 ? NOT_YOUR_COMPANY : 'I could not read the Desk just now. Please ask me again in a moment.'; }
  const priorities: any[] = page.priorities ?? [];
  if (!priorities.length) return 'The company has not set any priorities here yet. When it does, they will be on the Desk and I will tell you them.';
  const lines = priorities.map((p) => `${p.number}. ${p.title}${p.owner ? `, owned by ${p.owner}` : ''}`);
  return [page.strategy?.says ? `${page.strategy.says}` : null, `The company's priorities right now are:`, ...lines].filter(Boolean).join('\n');
}

export async function isTheStrategyMoving(prisma: any, grounds: any, reader: { userId: string | null; email?: string; organizationId: string; role: string }): Promise<string> {
  if (!reader.userId) return 'I need your sign-in to say how the strategy is moving.';
  let page: any;
  try { page = await readTheCompanyPage(prisma, grounds, { userId: reader.userId, email: reader.email ?? '', organizationId: reader.organizationId, role: reader.role }); }
  catch (err: any) { return err?.status === 403 ? NOT_YOUR_COMPANY : 'I could not read the Desk just now. Please ask me again in a moment.'; }
  const priorities: any[] = page.priorities ?? [];
  if (!priorities.length) return 'The company has not set any priorities here yet, so there is no strategy to say anything about.';
  const read = priorities.filter((p) => p.reading?.says);
  if (!read.length) {
    return `Nothing you can read says yet how ${inWords(priorities.map((p) => `"${p.title}"`))} ${priorities.length === 1 ? 'is' : 'are'} moving. The Desk shows each priority as soon as there is something you may read about it.`;
  }
  const lines = read.map((p) => `Priority ${p.number}, "${p.title}". ${String(p.reading.says).trim()}`);
  const notReaching = (page.notReaching ?? []).length;
  if (notReaching) lines.push(`The Desk also shows ${notReaching === 1 ? 'one place' : `${notReaching} places`} where the strategy is not reaching the work.`);
  return lines.join('\n');
}

/** "Ask for leave" and "Ask to spend money" with nothing said yet: what to say, for what is switched on. */
export const THE_REQUEST_STARTERS = /^\s*ask\s+(?:for\s+leave|to\s+spend(?:\s+money)?)(?:\s*,?\s+or\s+(?:for\s+leave|to\s+spend(?:\s+money)?))?\s*[.?!]?\s*$/i;

export function howToAskForLeaveOrSpending(on: { leave: boolean; spend: boolean }): string {
  if (!on.leave && !on.spend) return 'Leave and spending requests are not switched on for your organisation yet. An admin can switch them on.';
  const leave = 'For leave, tell me which days you want off, for example "I would like leave on 20 and 21 October".';
  const spend = 'To spend money, tell me how much, what it is for and when you need it.';
  const end = 'I will say it back to you first, and it goes to the person who approves it only once you say yes.';
  return [on.leave ? leave : null, on.spend ? spend : null, end].filter(Boolean).join(' ');
}


/**
 * WHO CAN SEE WHAT A MEMBER SAYS IN A CHECK-IN, in the words the guest lane and the invitation already use (privacy sweep, 7 October).
 * "Wairimu runs it and reads its report. Your own report is yours alone." left out that the people in it read what you say, and that admins
 * read the board and the reports. Where people do not see each other, it says so; on an evaluation check-in it does not say admins read it.
 */
export function whoReadsWhatAMemberSays(g: { label: string; scenario?: any; peersVisibleToEachOther?: boolean | null; organization?: { name?: string | null } | null }, leadsFirstName: string): string {
  const lead = (leadsFirstName ?? '').trim();
  const admins = !g.scenario || isEvaluationCheckIn(g.scenario) ? '' : ' Admins can read its board and reports.';
  /* Who reads what you say is one sentence with one owner (grounds/who-may-read-this-check-in.ts). */
  return `${whoCanReadWhatYouSay(g, lead)}${admins}`;
}


/**
 * "WHAT IS MSINGI FOODS WORKING ON THIS QUARTER?" and "what is the company working on?" are the Company page's question (B-134). They were
 * answered "I cannot answer that one yet." because the router cannot know the organisation's name. Only the company, "we" or the
 * organisation's own name counts: "What is Amani working on this quarter?" is about a person and stays where it was.
 */
export function asksWhatTheCompanyIsWorkingOn(message: string, organisationName: string | null | undefined): boolean {
  const m = /\bwhat\s+(?:is|are)\s+(.+?)\s+working\s+on(?:\s+(?:this|next)\s+(?:quarter|year|month|week)|\s+right\s+now|\s+at\s+the\s+moment|\s+these\s+days)?\s*[?.!]*\s*$/i.exec(message ?? '');
  if (!m) return false;
  const who = m[1].toLowerCase().replace(/[’]/g, "'").replace(/^(?:the|our)\s+/, '').trim();
  if (['company', 'organisation', 'organization', 'business', 'we', 'us'].includes(who)) return true;
  const name = (organisationName ?? '').toLowerCase().replace(/[’]/g, "'").trim();
  return !!name && who === name;
}
