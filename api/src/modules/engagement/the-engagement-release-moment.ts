import { theMomentIn } from '../grounds/the-release-moment';

/**
 * THE MOMENT THE ENGAGEMENT MESSAGES BEGAN (decision 109), ITS OWN.
 *
 * Every message decision 109 added (the follow-up from a promise, the test and what-is-new emails, the report follow-up, who has gone quiet, the lead's
 * first-check-in message) is only ever about what began at or after this moment. It used to share `release.time_running_out_warnings_from`, a row an
 * earlier build may already have written, which would have put the moment before this code existed. This is a row of its own, written once, by the first
 * start of THIS code, and never changed. Unreadable means nothing is sent, never a guess.
 */
export const ENGAGEMENT_MOMENT_KEY = 'release.engagement_from';

export async function theEngagementMoment(prisma: any, now: Date = new Date()): Promise<Date> {
  const row = await prisma.platformSetting.findUnique({ where: { key: ENGAGEMENT_MOMENT_KEY } });
  const stored = theMomentIn(row);
  if (stored) return stored;
  try {
    await prisma.platformSetting.create({ data: { key: ENGAGEMENT_MOMENT_KEY, value: { at: now.toISOString() }, updatedBy: 'the first start of the engagement messages' } });
    return now;
  } catch {
    const again = theMomentIn(await prisma.platformSetting.findUnique({ where: { key: ENGAGEMENT_MOMENT_KEY } }));
    if (again) return again;
    throw new Error('The moment the engagement messages began could not be read or written.');
  }
}
