/**
 * THE MOMENT THIS VERSION FIRST STARTED ON A DATABASE (decision 74, item 7).
 *
 * The warning that a check-in is about to run out of time is new in this release. On the first night
 * it would otherwise go to every lead whose check-in was already near its end, or past it, before the
 * release: one email each, about a deadline the product had never told them about. Decision 74 says
 * that only check-ins reaching that point after the release get one.
 *
 * So the first start of this version writes the moment into one `platform_settings` row,
 * `release.time_running_out_warnings_from`, and never changes it after. The warning job reads it and
 * leaves out any check-in that was already inside its warning window, or past its end, at that
 * moment. A check-in whose end is moved later, so that it enters the window again after the release,
 * is warned then.
 *
 * Nothing else changes for the ones left out: they are not stalled, because the stall sweep only
 * stalls a check-in somebody was warned about, so they stay open until their lead ends or extends
 * them.
 */
export const RELEASE_MOMENT_KEY = 'release.time_running_out_warnings_from';

const DAY = 86_400_000;

/** The moment stored in the row, or null when the row is missing or does not hold a date. */
export function theMomentIn(row: { value: unknown } | null | undefined): Date | null {
  const v = row?.value as any;
  const raw = typeof v === 'string' ? v : (v && typeof v === 'object' ? v.at : null);
  if (typeof raw !== 'string') return null;
  const at = new Date(raw);
  return Number.isFinite(at.getTime()) ? at : null;
}

/**
 * Reads the moment, writing it first when there is none. Two copies starting together write the
 * same row once: the second finds it there. Throws when the database cannot be read, so that the
 * caller sends nothing rather than guessing.
 */
export async function theReleaseMoment(prisma: any, now: Date = new Date()): Promise<Date> {
  const row = await prisma.platformSetting.findUnique({ where: { key: RELEASE_MOMENT_KEY } });
  const stored = theMomentIn(row);
  if (stored) return stored;
  try {
    await prisma.platformSetting.create({ data: { key: RELEASE_MOMENT_KEY, value: { at: now.toISOString() }, updatedBy: 'the first start of this version' } });
    return now;
  } catch {
    const again = theMomentIn(await prisma.platformSetting.findUnique({ where: { key: RELEASE_MOMENT_KEY } }));
    if (again) return again;
    throw new Error('The moment of the release could not be read or written.');
  }
}

/**
 * Whether a check-in was already inside its warning window (or past its end) at the release moment,
 * judged by its end as it stands now.
 */
export function reachedTheWarningPointBefore(deadline: Date, daysOfNotice: number, releaseMoment: Date): boolean {
  return deadline.getTime() - daysOfNotice * DAY <= releaseMoment.getTime();
}
