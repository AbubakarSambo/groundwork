/**
 * THE TEAM PERFORMANCE VIEW, OFFERED ONLY AFTER VALUE, AND ONLY IF SHE SAYS YES (Ebele, increment 6b; plan section 16).
 *
 * WHEN IT MAY BE OFFERED (decided in code from the record, because it is about what she sees of her people):
 *   - at least FIVE outcomes documented, which means register rows that are done and shown (settled by proof or confirmed by the other side), not said;
 *   - across at least TWO different people, so it is not one person's record;
 *   - a completed check-in cycle: at least one report written from the check-ins she runs;
 *   - at least FOURTEEN days since she was added, so it is never the first thing she hears;
 *   - not offered in the last 30 days, and not for 90 days after she said no.
 * It is offered once in the briefing she asked for, in the words of the plan, to her and nobody else. The person who acts for her is never offered it and cannot accept it.
 *
 * WHAT IT SAYS, AND WHAT IT NEVER SAYS. It is a view of the work, read from the register (never from coaching, never from a private to-do list): what is
 * moving, what is stuck, what support is needed, which outcomes are verified, and what is still unclear. A person is named only against an outcome that is
 * done and shown. There are no scores or labels on anybody, nothing is worked out from how many messages somebody sent, and an item said to be done with
 * nothing shown is "unclear", on the item, not on the person who said it.
 *
 * It reads the register, which is the record's own reading of the work. It does not run a second judge over people, and it does not read the patterns
 * the detectors find about behaviour (that is a decision for Hafsah, listed with this work).
 */
import { buildTheRegister, type TheRegisterRow } from '../outstanding/the-outstanding-register';
import { writeItOnce } from '../year-end/the-year-end-log';
import { dayWords } from '../year-end/the-year-end-content';

export const THE_PRECONDITION = { outcomes: 5, people: 2, daysSinceAdded: 14, daysBetweenOffers: 30, daysAfterANo: 90 } as const;
const DAY = 86_400_000;

/** The offer, in the plan's own words (section 16), with her first name. */
export const THE_OFFER = (first: string) => `${first}, from the information we’ve been collecting and the updates from your team, I’m starting to get a fuller picture of how the work is progressing. If you’d like, I can put together a team performance summary showing what’s moving, where work is getting stuck, what support people need and which outcomes have been achieved. I’ll distinguish what we’ve verified from what is still unclear.`;
export const THE_PERFORMANCE_VIEW_IS_HERS = (first: string) => `Only ${first} can say yes to that summary. I have not made one.`;
export const NOT_NOW = 'Thank you. I will not make a team summary, and I will not bring it up again for a while.';
export const NO_SUMMARY_WAITING = 'I am not waiting for an answer about a team summary, so I have not made one.';

export interface ThePreconditionRead { outcomes: number; people: number; reports: number; daysSinceAdded: number | null }

export const isDocumentedOutcome = (r: TheRegisterRow): boolean => r.status === 'completed' && (r.settledBy === 'PROVEN' || r.settledBy === 'CONFIRMED');
const aPerson = (o: string) => o !== 'unconfirmed' && o !== 'you' && o.trim() !== '';

/** Whether the record has earned the offer. Pure: the same numbers always give the same answer. */
export function hasTheRecordEarnedIt(r: ThePreconditionRead): boolean {
  return r.outcomes >= THE_PRECONDITION.outcomes && r.people >= THE_PRECONDITION.people && r.reports >= 1 && r.daysSinceAdded !== null && r.daysSinceAdded >= THE_PRECONDITION.daysSinceAdded;
}

async function readTheRecord(prisma: any, a: { organizationId: string; principalUserId: string; now: Date }): Promise<{ rows: TheRegisterRow[]; read: ThePreconditionRead }> {
  const rows = (await buildTheRegister(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, now: a.now, forADelegate: true })).rows;
  const outcomes = rows.filter(isDocumentedOutcome);
  const grounds: any[] = (await prisma.ground.findMany({ where: { organizationId: a.organizationId, initiatorId: a.principalUserId }, select: { id: true } })) ?? [];
  const reports: any[] = grounds.length ? (await prisma.report?.findMany?.({ where: { groundId: { in: grounds.map((g) => g.id) } }, select: { id: true } }).catch(() => [])) ?? [] : [];
  const setup: any = await prisma.principalSetup?.findFirst?.({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId } }).catch(() => null);
  return { rows, read: { outcomes: outcomes.length, people: new Set(outcomes.map((r) => r.owner).filter(aPerson)).size, reports: reports.length, daysSinceAdded: setup?.createdAt ? Math.floor((a.now.getTime() - new Date(setup.createdAt).getTime()) / DAY) : null } };
}

/** The offer, if the record has earned it and it is not too soon to say it again. Writes that it was made, so it is made once. Null otherwise. */
export async function theOfferIfEarned(prisma: any, a: { organizationId: string; principalUserId: string; first: string; now: Date }): Promise<string | null> {
  const past: any[] = (await prisma.yearEndLog.findMany({ where: { principalUserId: a.principalUserId, kind: 'asked', subject: { startsWith: 'performance:' } }, orderBy: { at: 'desc' } })) ?? [];
  const last = past[0];
  if (last) {
    const answer = await prisma.yearEndLog.findFirst({ where: { principalUserId: a.principalUserId, kind: 'told', subject: `answer:${last.subject}` } });
    if (!answer) return null;
    const wait = answer.detail === 'no' ? THE_PRECONDITION.daysAfterANo : THE_PRECONDITION.daysBetweenOffers;
    if (a.now.getTime() - new Date(answer.at).getTime() < wait * DAY) return null;
  }
  if (!hasTheRecordEarnedIt((await readTheRecord(prisma, a)).read)) return null;
  const wrote = await writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'asked', subject: `performance:${a.now.toISOString()}`, at: a.now });
  return wrote ? THE_OFFER(a.first) : null;
}

export async function theOfferWaiting(prisma: any, principalUserId: string): Promise<{ subject: string; at: Date } | null> {
  const past: any[] = (await prisma.yearEndLog.findMany({ where: { principalUserId, kind: 'asked', subject: { startsWith: 'performance:' } }, orderBy: { at: 'desc' } })) ?? [];
  if (!past[0]) return null;
  return (await prisma.yearEndLog.findFirst({ where: { principalUserId, kind: 'told', subject: `answer:${past[0].subject}` } })) ? null : { subject: past[0].subject, at: new Date(past[0].at) };
}

const plain = (s: string) => s.trim().replace(/[.!?]+$/, '');
const SAYS: Record<string, string> = { blocked: 'It is blocked', 'awaiting external party': 'It is waiting for somebody outside the office', 'awaiting decision': 'It is waiting for a decision' };
const lowerFirst = (s: string) => `${s[0]?.toLowerCase() ?? ''}${s.slice(1)}`;

/** The summary. Built only from the register, so what is in it is what is on the record, and the same record always gives the same words. */
export function theSummary(first: string, rows: TheRegisterRow[], now: Date): { text: string; verified: number; unclear: number } {
  const verified = rows.filter(isDocumentedOutcome);
  const moving = rows.filter((r) => r.status === 'in progress' || r.status === 'open');
  const stuck = rows.filter((r) => r.status === 'blocked' || r.status === 'awaiting external party' || r.status === 'awaiting decision');
  const unclear = rows.filter((r) => r.status === 'unverified');
  const section = (title: string, lines: string[]) => (lines.length ? [title, ...lines.map((l) => `- ${l}`)].join('\n') : null);
  const parts = [
    `Here is the team summary, ${first}, from the record as it stands on ${dayWords(now)}.`,
    section('Outcomes I have verified', verified.map((r) => `${plain(r.item)}${aPerson(r.owner) ? ` (${r.owner})` : ''}. It is done, and the record shows it.`)),
    section('What is moving', moving.map((r) => `${plain(r.item)}.`)),
    section('Where work is stuck', stuck.map((r) => `${plain(r.item)}. ${r.dependency ? `It is ${lowerFirst(plain(r.dependency))}` : SAYS[r.status]}.`)),
    section('What support is needed', stuck.filter((r) => r.status !== 'awaiting decision').map((r) => `${plain(r.item)}. It needs ${r.status === 'blocked' ? 'whatever is blocking it cleared' : 'a reply from outside the office'}.`)),
    section('What is still unclear', unclear.map((r) => `${plain(r.item)}. It has been said to be done, and nothing has been shown yet.`)),
    `That is every item on the record. I have not scored anybody, and nothing here comes from how often anybody wrote to me.`,
  ].filter(Boolean) as string[];
  return { text: parts.join('\n\n'), verified: verified.length, unclear: unclear.length };
}

/** Her answer to the offer. Only hers. A yes makes the summary from the record as it is now; a no is remembered for a while. */
export async function answerTheOffer(prisma: any, a: { organizationId: string; principalUserId: string; first: string; speakerIsPrincipal: boolean; answer: 'yes' | 'no'; now: Date }): Promise<string | null> {
  const waiting = await theOfferWaiting(prisma, a.principalUserId);
  if (!waiting) return null;
  if (!a.speakerIsPrincipal) return THE_PERFORMANCE_VIEW_IS_HERS(a.first);
  await writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'told', subject: `answer:${waiting.subject}`, detail: a.answer, at: a.now });
  if (a.answer === 'no') return NOT_NOW;
  return theSummary(a.first, (await readTheRecord(prisma, a)).rows, a.now).text;
}
