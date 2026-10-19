import { theRelease2CollectionsIsOn } from '../grounds/release-2-collections';
import { aDayWithItsWeekday } from '../reports/a-sales-report-read-from-the-deals';
import { BILL, F, FOLLOWS_UP_ID, NOT_YET_RAISED } from './the-collections-record';
import { DUE_ON_AN_EVENT, theEventWaitedFor, asHappened, type ALineKept } from './a-fee-note-due-on-an-event';

/**
 * A FEE NOTE THAT FELL DUE ON AN EVENT, SAID TO THE PERSON WHO RUNS THE FEE NOTES (messages test, 19 October, finding 4).
 *
 * Muchemi & Co. (test). The reply in Kasarani Foods v. Tumaini Traders was filed on 13 October, so FN-005 fell due; the hearing date was
 * given on 14 October, so the third Kasarani Foods fee note could be raised. Wanjiru's four morning summaries and her weekly letter said
 * neither. The collections board shows it under What needs you; her summary and her letter now say it too, in one sentence each:
 *
 *   FN-005 for Kasarani Foods fell due on Tuesday 13 October, when Brian Otieno said in “Litigation team daily” that the reply was filed.
 *   Brian Otieno follows it up.
 *   The third Kasarani Foods fee note can be raised now, because David Mwangi said in “Litigation team daily” on Wednesday 14 October
 *   that the hearing date was set.
 *
 * Read from the bill as the record keeps it (the line kept on it when it fell due), never worked out again, and only where the
 * organisation's Release 2 switch is on. Who said it is named only to a reader who is in the check-in it was said in; otherwise
 * "somebody". No amount. A bill that is paid, or has moved past Due, is not said.
 */
export interface AFeeNoteThatFellDue { groundId: string; billId: string; at: Date; text: string }

const field = (fields: any, k: string) => String((fields ?? {})[k] ?? '').trim();
const fullName = (u: any) => [u?.firstName, u?.lastName].filter((x: any) => typeof x === 'string' && x.trim()).join(' ').trim();

export async function theFeeNotesThatFellDueOnAnEvent(
  prisma: any,
  reader: { userId: string; organizationId: string },
  groundIds: string[],
  since: Date,
): Promise<AFeeNoteThatFellDue[]> {
  if (!groundIds.length || !(await theRelease2CollectionsIsOn(prisma, reader.organizationId))) return [];
  const bills: any[] = ((await Promise.resolve(prisma?.workItem?.findMany?.({
    where: { groundId: { in: groundIds }, kind: BILL },
    select: { id: true, groundId: true, name: true, stage: true, fields: true },
  })).catch(() => [])) ?? []) as any[];
  const out: AFeeNoteThatFellDue[] = [];
  for (const b of bills) {
    const kept = (b.fields ?? {})[DUE_ON_AN_EVENT] as ALineKept | undefined;
    if (!kept?.at || !kept.day || new Date(kept.at).getTime() < since.getTime()) continue;
    const raised = b.stage !== NOT_YET_RAISED;
    if (raised && b.stage !== 'Due') continue;
    /* Who said it, to a reader who is in the check-in it was said in. */
    const said = kept.saidBy ? await Promise.resolve(prisma?.groundParticipant?.findUnique?.({ where: { id: kept.saidBy }, select: { userId: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } })).catch(() => null) : null;
    const theReaderIsIn = !!(await Promise.resolve(prisma?.groundParticipant?.findFirst?.({ where: { groundId: kept.groundId, userId: reader.userId }, select: { id: true } })).catch(() => null))
      || (await Promise.resolve(prisma?.ground?.findUnique?.({ where: { id: kept.groundId }, select: { initiatorId: true } })).catch(() => null))?.initiatorId === reader.userId;
    const who = !said || !theReaderIsIn ? 'somebody' : said.userId === reader.userId ? 'you' : (fullName(said.user) || String(said.nameGiven ?? '').trim() || 'somebody');
    const ev = theEventWaitedFor(field(b.fields, F.dueWhen));
    const event = ev ? `the ${ev.subject} was ${ev.participle}` : asHappened(field(b.fields, F.dueWhen));
    const number = field(b.fields, F.number);
    const client = field(b.fields, F.client);
    const bill = number && client ? `${number} for ${client}` : String(b.name ?? '').trim();
    if (!bill || !event) continue;
    const day = aDayWithItsWeekday(kept.day);
    const where = kept.label ? ` in “${kept.label}”` : '';
    if (!raised) {
      out.push({ groundId: b.groundId, billId: b.id, at: new Date(kept.at), text: `${bill.charAt(0).toUpperCase()}${bill.slice(1)} can be raised now, because ${who} said${where} on ${day} that ${event}.` });
      continue;
    }
    const followerId = field(b.fields, FOLLOWS_UP_ID);
    const follower = followerId ? await Promise.resolve(prisma?.groundParticipant?.findUnique?.({ where: { id: followerId }, select: { userId: true } })).catch(() => null) : null;
    const follows = follower?.userId === reader.userId ? ' You follow it up.' : field(b.fields, F.followsUp) ? ` ${field(b.fields, F.followsUp)} follows it up.` : '';
    out.push({ groundId: b.groundId, billId: b.id, at: new Date(kept.at), text: `${bill} fell due on ${day}, when ${who} said${where} that ${event}.${follows}` });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
