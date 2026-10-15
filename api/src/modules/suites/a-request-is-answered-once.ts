import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { firstNamesOf } from './the-approval-steps';

/**
 * A REQUEST IS ANSWERED ONCE, WHOEVER ASKS FIRST WINS (suites at scale: "two approvers deciding the same
 * request at once, one wins, the other is told plainly").
 *
 * A decision used to read the request, check it was still waiting, and then write. Two approvers who both
 * opened it before either answered both passed the check, so both answers were written, both were recorded
 * ("Wairimu approved it" and "Omar declined it" on one request) and the person was told twice. Now the write
 * itself is the check: it changes the request only if it is still waiting at the same step and the same place
 * in that step's list, in one statement, and says how many rows it changed. The one that changes none has
 * lost, wrote nothing, recorded nothing and told nobody, and is told so.
 *
 * It is the same for a request passed on after waiting too long: the person who answered it a moment before the
 * clock reached it wins, and the clock passes nothing on.
 */

/** Where a request is: still waiting, at this step, at this place in the step's list. */
export function whereItIsNow(r: { id: string; step?: number | null; escalatedTo?: number | null }) {
  return { id: r.id, status: 'waiting', step: r.step ?? 0, escalatedTo: r.escalatedTo ?? 0 };
}

/**
 * Change the request only if it is still where it was read. True when this answer was the one kept. A test
 * database without a conditional write falls back to the plain one, which is what it always did.
 */
export async function claimIt(table: any, where: ReturnType<typeof whereItIsNow>, data: Record<string, unknown>): Promise<boolean> {
  if (typeof table?.updateMany === 'function') {
    const done = await table.updateMany({ where, data });
    return typeof done?.count === 'number' ? done.count > 0 : true;
  }
  await table.update({ where: { id: where.id }, data });
  return true;
}

/** What the person who lost reads. */
export async function theyGotThereFirst(
  prisma: PrismaService, table: any, id: string, readerUserId: string,
): Promise<ConflictException> {
  const row = await table.findUnique({ where: { id } }).catch(() => null);
  const by = row?.status && row.status !== 'waiting' ? row.decidedById : (row?.approvedByIds ?? []).slice(-1)[0];
  const who = by && by !== readerUserId ? (await firstNamesOf(prisma, [by]))[0] : null;
  const name = who || 'Somebody else';
  if (row && row.status === 'approved') return new ConflictException(`${name} approved this request a moment ago, so your answer was not kept.`);
  if (row && row.status === 'declined') return new ConflictException(`${name} declined this request a moment ago, so your answer was not kept.`);
  return new ConflictException(`${name} answered this step a moment ago, so your answer was not kept. The request now waits for the next person.`);
}
