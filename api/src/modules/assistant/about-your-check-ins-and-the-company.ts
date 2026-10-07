import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { A_GROUND_IS_OVER } from '../grounds/a-ground-that-has-ended';
import { theCheckInsHeldForASeat } from '../participants/held-for-a-seat';
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
    where: { organizationId, status: { notIn: A_GROUND_IS_OVER }, OR: [{ initiatorId: userId }, { participants: { some: { userId } } }] },
    select: { id: true, label: true, initiatorId: true, brief: true, toldToParticipants: true, initiator: { select: { firstName: true } } },
    orderBy: { createdAt: 'asc' },
  }).catch(() => []);
  const held = await theCheckInsHeldForASeat(prisma, grounds.map((g) => g.id), userId).catch(() => new Set<string>());
  return grounds.filter((g) => !held.has(g.id));
}

export async function whenIsMyNextCheckIn(prisma: any, organizationId: string, userId: string | null, now = new Date()): Promise<string> {
  const none = 'You have no check-in waiting for you right now. When one is coming up for you, I will tell you when it opens.';
  if (!userId) return none;
  const mine = await theirCheckIns(prisma, organizationId, userId);
  if (!mine.length) return none;
  const rows: any[] = await prisma.checkIn.findMany({
    where: {
      groundId: { in: mine.map((g) => g.id) }, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] }, isSetup: false,
      participant: { userId, managingOnly: false },
    },
    select: { groundId: true, status: true, availableFrom: true, sessionNumber: true },
    orderBy: [{ availableFrom: 'asc' }, { sessionNumber: 'asc' }],
  }).catch(() => []);
  if (!rows.length) return none;
  const label = (id: string) => mine.find((g) => g.id === id)?.label ?? 'your check-in';
  const lines = rows.slice(0, 3).map((r) => {
    if (r.status === 'IN_PROGRESS') return `You have started your check-in in "${label(r.groundId)}", and you can carry on with it now.`;
    const opens = r.availableFrom ? new Date(r.availableFrom) : null;
    if (!opens || opens.getTime() <= now.getTime()) return `Your check-in in "${label(r.groundId)}" is waiting for you now.`;
    return `Your next check-in in "${label(r.groundId)}" opens on ${whenItWas(opens, 'full')}.`;
  });
  if (rows.length > 3) lines.push(`There ${rows.length - 3 === 1 ? 'is 1 more' : `are ${rows.length - 3} more`} after those.`);
  return lines.join('\n');
}

export async function whatMyCheckInIsFor(prisma: any, organizationId: string, userId: string | null): Promise<string> {
  const none = 'You are not in a check-in that is still running, so there is nothing to say about what one is for.';
  if (!userId) return none;
  const mine = await theirCheckIns(prisma, organizationId, userId);
  if (!mine.length) return none;
  const lines = mine.slice(0, 3).map((g) => {
    const runsIt = g.initiatorId === userId;
    const leads = (g.initiator?.firstName ?? '').trim();
    /* What the lead wrote is the lead's; a person taking part is told what the product wrote for them. */
    const forWhat = ((runsIt ? g.brief : g.toldToParticipants) ?? '').trim();
    const what = forWhat ? `This is what "${g.label}" is for. ${forWhat.replace(/[.!?]*$/, '.')}` : `"${g.label}" has no description of what it is for yet.`;
    const reads = runsIt
      ? 'You run it, so you read its report.'
      : `${leads || 'The person who runs it'} runs it and reads its report. Your own report is yours alone.`;
    return `${what} ${reads}`;
  });
  if (mine.length > 3) lines.push(`You are in ${mine.length - 3} more, and I can tell you about any of them if you name it.`);
  return lines.join('\n');
}

export async function theCompanysPriorities(prisma: any, grounds: any, reader: { userId: string | null; email?: string; organizationId: string; role: string }): Promise<string> {
  if (!reader.userId) return 'I need your sign-in to say what the company is working on.';
  let page: any;
  try { page = await readTheCompanyPage(prisma, grounds, { userId: reader.userId, email: reader.email ?? '', organizationId: reader.organizationId, role: reader.role }); }
  catch (err: any) { return err?.status === 403 ? NOT_YOUR_COMPANY : 'I could not read the company page just now. Please ask me again in a moment.'; }
  const priorities: any[] = page.priorities ?? [];
  if (!priorities.length) return 'The company has not set any priorities here yet. When it does, they will be on the Company page and I will tell you them.';
  const lines = priorities.map((p) => `${p.number}. ${p.title}${p.owner ? `, owned by ${p.owner}` : ''}`);
  return [page.strategy?.says ? `${page.strategy.says}` : null, `The company's priorities right now are:`, ...lines].filter(Boolean).join('\n');
}

export async function isTheStrategyMoving(prisma: any, grounds: any, reader: { userId: string | null; email?: string; organizationId: string; role: string }): Promise<string> {
  if (!reader.userId) return 'I need your sign-in to say how the strategy is moving.';
  let page: any;
  try { page = await readTheCompanyPage(prisma, grounds, { userId: reader.userId, email: reader.email ?? '', organizationId: reader.organizationId, role: reader.role }); }
  catch (err: any) { return err?.status === 403 ? NOT_YOUR_COMPANY : 'I could not read the company page just now. Please ask me again in a moment.'; }
  const priorities: any[] = page.priorities ?? [];
  if (!priorities.length) return 'The company has not set any priorities here yet, so there is no strategy to say anything about.';
  const read = priorities.filter((p) => p.reading?.says);
  if (!read.length) {
    return `Nothing has been written yet about how ${inWords(priorities.map((p) => `"${p.title}"`))} ${priorities.length === 1 ? 'is' : 'are'} moving, or what is there rests on check-ins you cannot open. The Company page shows each priority as soon as there is something you may read about it.`;
  }
  const lines = read.map((p) => `Priority ${p.number}, "${p.title}". ${String(p.reading.says).trim()}`);
  const notReaching = (page.notReaching ?? []).length;
  if (notReaching) lines.push(`The Company page also shows ${notReaching === 1 ? 'one place' : `${notReaching} places`} where the strategy is not reaching the work.`);
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
