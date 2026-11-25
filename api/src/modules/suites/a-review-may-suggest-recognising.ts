import type { PrismaService } from '../prisma/prisma.service';
import { commitmentsKeptInTheLastFourWeeks, theCountSaidToThePerson } from '../grounds/your-board';
import { aShareInWords, keptOfSaidAbout } from '../suggestions/a-suggestion-reached-from-the-record';
import { theLeadMayReadIt } from '../suggestions/a-suggestion-told-like-a-signal';
import { theirApprovedLeave } from './who-is-away';

/**
 * "GROUNDWORK SUGGESTS RECOGNISING AISHA'S WORK" (item 16; the prototype's #/suite/reviews, and
 * decision 6: "Good suggestions work the same way").
 *
 * BEHIND A SETTING THAT IS OFF. Nothing here is served until the platform setting `reviews.recognise`
 * exists with `on: true`. The threshold below is a proposal, for Hafsah to confirm
 * (docs/answers-from-engine.md, "Item 16: performance reviews").
 *
 * THE PROPOSED THRESHOLD. In the four weeks before the review was started, in the check-ins the person
 * who writes the review runs with the person, at least 8 commitments were settled (kept or not done),
 * and at least nine in ten of them were kept. A promise missed while the person was on approved leave
 * is not a miss (week 23), the same rule as their own count. Nothing else is read: no rating, no
 * pattern, no hours (decision 10), nothing anybody said.
 *
 * WHY THOSE CHECK-INS ONLY. Each person's load across check-ins is private. The writer reads only what
 * happened in check-ins they run themselves, and reads it with its count (decision 86, which reverses
 * decision 53's "no count behind it").
 *
 * READ THE SAME EVERY TIME IT IS OPENED. The four weeks end the day the review was started, so opening
 * the review never changes what it says (reports and boards update only when something new comes in).
 *
 * WHO READS WHAT (decision 6, decision 53's timing, and decision 86):
 *   - the person reads their own count, the line, and that the writer decides;
 *   - the writer reads the suggestion with the count behind it, only once the person has written their
 *     view or three days have passed since the review started;
 *   - a lead of the team who does not write it, and an admin, read it as well (decision 93, row 16: this said
 *     they read nothing of it), the same suggestion and count, said about the writer by name.
 */

export const RECOGNISE_SETTING_KEY = 'reviews.recognise';

export interface RecogniseSetting { on: boolean; keptAtLeast: number; atLeastSettled: number }

/** The proposal: on (22 November 2026: nothing is switched off), nine in ten kept, at least eight settled. */
export const PROPOSED_RECOGNISE_SETTING: RecogniseSetting = { on: true, keptAtLeast: 0.9, atLeastSettled: 8 };

const FOUR_WEEKS = 28 * 86_400_000;

/** The stored setting, read defensively: anything missing or odd is the proposal, and "off" only when it says so. */
export function readRecogniseSetting(stored: unknown): RecogniseSetting {
  const v = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  const share = typeof v.keptAtLeast === 'number' && v.keptAtLeast > 0 && v.keptAtLeast <= 1 ? v.keptAtLeast : PROPOSED_RECOGNISE_SETTING.keptAtLeast;
  const settled = typeof v.atLeastSettled === 'number' && Number.isInteger(v.atLeastSettled) && v.atLeastSettled > 0 ? v.atLeastSettled : PROPOSED_RECOGNISE_SETTING.atLeastSettled;
  return { on: v.on !== false, keptAtLeast: share, atLeastSettled: settled };
}

/** What the writer reads: the suggestion, with the count behind it (decision 86). */
export interface RecogniseForTheWriter { headline: string; why: string; whatWouldChangeIt: string; yourDecision: string }
/** What the person reads: their own count, the line, and who decides. */
export interface RecogniseForThePerson { facts: string; whoDecides: string }

export interface TheRecordForRecognising { kept: number; of: number; setting: RecogniseSetting }

/** Whether the record reaches the line. Null when the setting is off, or the record does not reach it. */
export async function theRecordForRecognising(
  prisma: PrismaService,
  input: { organizationId: string; personUserId: string | null | undefined; writerUserId: string | null | undefined; startedAt: Date | string | null | undefined },
): Promise<TheRecordForRecognising | null> {
  if (!input.personUserId || !input.writerUserId || !input.startedAt || input.personUserId === input.writerUserId) return null;
  const row = await (prisma as any).platformSetting?.findUnique({ where: { key: RECOGNISE_SETTING_KEY } }).catch(() => null);
  const setting = readRecogniseSetting(row?.value);
  if (!setting.on) return null;
  const until = new Date(input.startedAt);
  const theirs: { id: string }[] = await (prisma as any).groundParticipant.findMany({
    where: { userId: input.personUserId, managingOnly: false, ground: { organizationId: input.organizationId, initiatorId: input.writerUserId } },
    select: { id: true },
  }).catch(() => []);
  if (!theirs.length) return null;
  const rows: { status: string; createdAt: Date; settledAt: Date | null }[] = await (prisma as any).groundCommitment.findMany({
    where: { participantId: { in: theirs.map((t) => t.id) }, status: { in: ['DONE', 'NOT_DONE'] } },
    select: { status: true, createdAt: true, settledAt: true },
  }).catch(() => []);
  /* Only what was settled before the review started, so the review reads the same whenever it is opened. */
  const before = rows.filter((r) => new Date(r.settledAt ?? r.createdAt).getTime() <= until.getTime() && new Date(r.settledAt ?? r.createdAt).getTime() > until.getTime() - FOUR_WEEKS);
  const leave = await theirApprovedLeave(prisma, input.personUserId, input.organizationId).catch(() => []);
  const kl = commitmentsKeptInTheLastFourWeeks(before, until, leave);
  if (!kl || kl.of < setting.atLeastSettled || kl.kept / kl.of < setting.keptAtLeast) return null;
  return { kept: kl.kept, of: kl.of, setting };
}

export function recogniseForTheWriter(firstName: string, record: TheRecordForRecognising): RecogniseForTheWriter {
  const name = firstName.trim() || 'this person';
  const theLine = aShareInWords(record.setting.keptAtLeast);
  return {
    headline: `Groundwork suggests recognising ${name}’s work`,
    why: `${keptOfSaidAbout(name, record.kept, record.of, 'made in your check-ins together')} in the four weeks before this review started. When at least ${theLine} are kept, Groundwork suggests recognising the work.`,
    whatWouldChangeIt: `If ${name} keeps fewer than ${theLine} of them from now on.`,
    yourDecision: `This is only a suggestion. You decide, and ${name} sees your reasons.`,
  };
}

/**
 * WHAT AN ADMIN, OR A LEAD OF THE TEAM WHO DOES NOT WRITE THE REVIEW, READS (decision 93, row 16): the same suggestion with
 * the same count, said about the writer's check-ins by name, since it is not "you" who runs them, and with the decision
 * left to the writer. Behind the same setting and the same timing as the writer's.
 */
export function recogniseForAnotherReader(firstName: string, record: TheRecordForRecognising, writerFirstName: string | null): RecogniseForTheWriter {
  const name = firstName.trim() || 'this person';
  const writer = writerFirstName?.trim() || 'the person who writes this review';
  const theLine = aShareInWords(record.setting.keptAtLeast);
  return {
    headline: `Groundwork suggests recognising ${name}’s work`,
    why: `${keptOfSaidAbout(name, record.kept, record.of, `made in ${writer}’s check-ins with them`)} in the four weeks before this review started. When at least ${theLine} are kept, Groundwork suggests recognising the work.`,
    whatWouldChangeIt: `If ${name} keeps fewer than ${theLine} of them from now on.`,
    yourDecision: `This is only a suggestion. ${writer.charAt(0).toUpperCase()}${writer.slice(1)} decides, and ${name} sees the reasons.`,
  };
}

export function recogniseForThePerson(record: TheRecordForRecognising, writerFirstName: string | null): RecogniseForThePerson {
  const writer = writerFirstName?.trim() || 'the person who writes your review with you';
  const count = theCountSaidToThePerson(record.kept, record.of)
    .replace(/^In the last (four|4) weeks,/, 'In the four weeks before your review started,')
    .replace(/\.$/, ` in your check-ins with ${writer}.`);
  return {
    facts: `${count} When at least ${aShareInWords(record.setting.keptAtLeast)} are kept, Groundwork suggests to ${writer} that your work is recognised.`,
    whoDecides: `${writer.charAt(0).toUpperCase()}${writer.slice(1)} decides, and you read the reasons.`,
  };
}

/** Decision 53: the writer reads it once the person has written their view, or three days after the review started. */
export function theWriterMayReadIt(review: { theirView: string | null; startedAt: Date | string | null | undefined }, now: Date = new Date()): boolean {
  if (!review.startedAt) return false;
  return theLeadMayReadIt({ theirSide: review.theirView, appeal: null, createdAt: review.startedAt }, now);
}
