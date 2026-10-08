import { GroundStatus } from '@prisma/client';
import { STARTED_FROM_THE_ANCHOR } from '../conversation/the-anchor-weekly-check-in';
import { THE_MONTH_IS_28_DAYS } from './the-anchor-end-of-month';

/**
 * THE ANCHOR'S MONTH END IS A SCHEDULED EVENT (decision 121, item 2; decision 7).
 *
 * The board and the ending only change when something new comes in, and the end of the month is one of those things
 * even when nobody checks in that day. So once, when an anchor check-in's month is over (twenty-eight days from its
 * start, or the moment it goes stalled), the event is written on the ground's own record. The board reads it as the
 * newest thing it is built from, and the lead's end-of-month read and the ending are served from then on. Opening the
 * board never writes it: only this sweep does, and only once for a check-in.
 */
export const THE_MONTH_ENDED_KEY = 'anchorMonthEnded';

export type TheMonthEnded = { at: string; because: 'time' | 'stalled' };

/** When the month's end was written on the record, or null if it has not been. Read only. */
export function theMonthEndedOn(groundAuditLog: unknown): Date | null {
  if (!groundAuditLog || typeof groundAuditLog !== 'object' || Array.isArray(groundAuditLog)) return null;
  const at = (groundAuditLog as Record<string, any>)[THE_MONTH_ENDED_KEY]?.at;
  const d = typeof at === 'string' ? new Date(at) : null;
  return d && Number.isFinite(d.getTime()) ? d : null;
}

export async function endTheMonthsThatHaveEnded(prisma: any, now: Date = new Date()): Promise<{ ended: string[] }> {
  const rows: any[] = await prisma.ground.findMany({
    where: { startedFrom: STARTED_FROM_THE_ANCHOR, status: { notIn: [GroundStatus.RESOLVED, GroundStatus.CLOSED] } },
    select: { id: true, status: true, startsAt: true, createdAt: true, groundAuditLog: true },
  });
  const ended: string[] = [];
  for (const g of rows) {
    if (theMonthEndedOn(g.groundAuditLog)) continue;
    const began = g.startsAt ?? g.createdAt;
    const timeIsUp = !!began && now.getTime() - new Date(began).getTime() >= THE_MONTH_IS_28_DAYS;
    const stalled = g.status === GroundStatus.STALLED;
    if (!timeIsUp && !stalled) continue;
    const log = g.groundAuditLog && typeof g.groundAuditLog === 'object' && !Array.isArray(g.groundAuditLog) ? g.groundAuditLog : {};
    const event: TheMonthEnded = { at: now.toISOString(), because: stalled && !timeIsUp ? 'stalled' : 'time' };
    await prisma.ground.update({ where: { id: g.id }, data: { groundAuditLog: { ...log, [THE_MONTH_ENDED_KEY]: event } } });
    ended.push(g.id);
  }
  return { ended };
}
