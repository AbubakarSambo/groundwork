/**
 * A READ THE MODEL COULD NOT GIVE IS "NOT READ YET", NEVER "NOTHING HERE" (fix plan 16 November, group 1).
 *
 * When the model's reading of a conversation fails, the assessment keeps every message whole and says so (`measure.modelFailed`), and the
 * check-in owes the read (`writesOwed`, a-write-is-owed-until-it-lands.ts) until the scheduled pass lands it. Before this, every page read
 * the empty sections as "nobody said anything": "Nobody sees anything differently", "No team target is on record yet", "No report was kept".
 * This is the one place that says whether a conversation's read is still to come. Pages ask here and say so in their own plain words;
 * none of them reads an empty section as an answer while it is true.
 */
import { theAssessmentIn } from './the-assessment';
import { theWritesOwedIn } from './a-write-is-owed-until-it-lands';

/** True while this check-in's conversation has not been read: the read failed, or the check-in still owes it. */
export function theReadIsStillToCome(row: { writesOwed?: unknown; sessionReport?: unknown } | null | undefined): boolean {
  if (!row) return false;
  if (theWritesOwedIn(row.writesOwed).some((w) => w.step === 'the assessment')) return true;
  return theAssessmentIn(row.sessionReport)?.measure?.modelFailed === true;
}

/** How many conversations on this check-in have not been read yet. Never throws: a count that cannot be made is no claim either way. */
export async function howManyReadsAreStillToCome(prisma: any, groundId: string, participantId?: string | null): Promise<number> {
  const rows: any[] = (await Promise.resolve(prisma?.checkIn?.findMany?.({
    where: { groundId, completedAt: { not: null }, ...(participantId ? { participantId } : {}) },
    select: { writesOwed: true, sessionReport: true },
  })).catch(() => [])) ?? [];
  return rows.filter(theReadIsStillToCome).length;
}

/** What a person who has no number of their own on the board is told while their own read is still to come. */
export const YOUR_READ_IS_STILL_TO_COME = 'Groundwork is still working out your number from what you said, so it is not shown yet.';

/** The one sentence every page says while a read is still to come. */
export const THE_READ_IS_STILL_TO_COME = 'Groundwork is still working out what people said. This page will fill in when it has.';
