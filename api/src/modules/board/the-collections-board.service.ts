import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { theCollectionsStallRuleIn } from '../grounds/collect-whats-owed';
import { buildTheCollectionsBoard, type ABillOnTheBoard, type TheCollectionsBoard } from './the-collections-board';
import { BILL, LOAN_OWED, FOLLOWS_UP_ID, aBillIsNamed, theCollectionsTypeFor } from './the-collections-record';

/**
 * THE COLLECTIONS BOARD, SERVED TO ONE READER (Release 2, pull request 2 of 3). Read only: opening a board writes nothing.
 *
 * WHO READS WHICH BILL, ENFORCED HERE, BEFORE ANYTHING IS BUILT (release plan, Release 2: "Each person sees only their own fee
 * notes; the lead sees all of them"; the B8 picture: "Each person sees their own; the partner sees all"; for loans, a borrower
 * sees only their own loan):
 *  - whoever runs the check-in (the lead, the admin who set it up, an admin of the organisation) reads every bill;
 *  - a person in it reads only the bills they follow up: the ones they said, or the ones a line put them down to follow up;
 *  - anybody else reads none.
 * The payment documents read are only those filed on a bill this reader may read, and the counts are counted from those bills.
 */

export interface ACollectionsReader { runsIt: boolean; participantId: string | null }

/** Every bill or loan on record for a check-in, with the payment documents filed on it and the check-ins whose lines named it. */
export async function theBillsOnRecord(prisma: any, groundId: string): Promise<ABillOnTheBoard[]> {
  const items = ((await Promise.resolve(prisma?.workItem?.findMany?.({
    where: { groundId, kind: { in: [BILL, LOAN_OWED] } },
    select: { id: true, kind: true, name: true, stage: true, ownerParticipantId: true, dueAt: true, fields: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })).catch(() => [])) ?? []) as any[];
  if (!items.length) return [];
  const evidence = ((await Promise.resolve(prisma?.itemEvidence?.findMany?.({
    where: { groundId, workItemId: { in: items.map((i) => i.id) }, countsAsProof: true },
    select: { workItemId: true, readAs: true, shows: true, createdAt: true, participantId: true },
  })).catch(() => [])) ?? []) as any[];
  const lines = ((await Promise.resolve(prisma?.recordEntry?.findMany?.({
    where: { participant: { groundId }, disputedAt: null },
    select: { id: true, text: true, checkInId: true, participantId: true },
  })).catch(() => [])) ?? []) as any[];
  return items.map((i) => ({
    id: i.id, kind: i.kind, name: i.name, stage: i.stage ?? null, ownerParticipantId: i.ownerParticipantId ?? null, dueAt: i.dueAt ?? null,
    fields: (i.fields && typeof i.fields === 'object' ? i.fields : {}) as Record<string, unknown>,
    createdAt: i.createdAt,
    /* Paid means proof: a payment document filed on this bill (proof-filed-on-its-item), never the words "I have the slip". */
    proof: evidence.filter((e) => e.workItemId === i.id && e.readAs === 'A payment').map((e) => ({ readAs: e.readAs, shows: e.shows ?? null, on: e.createdAt, addedBy: e.participantId ?? null })),
    saidIn: [...new Set(lines.filter((l) => l.checkInId && (i.kind === LOAN_OWED ? l.participantId === i.ownerParticipantId : aBillIsNamed(String(l.text ?? ''), i))).map((l) => String(l.checkInId)))],
  }));
}

/** The bills this reader may read: every one to whoever runs it; to a person, the ones they follow up or owe. */
export function theBillsThisReaderMayRead<T extends { ownerParticipantId: string | null; fields: Record<string, unknown> | null }>(rows: T[], reader: ACollectionsReader): T[] {
  if (reader.runsIt) return rows;
  if (!reader.participantId) return [];
  return rows.filter((r) => r.ownerParticipantId === reader.participantId || String((r.fields ?? {})[FOLLOWS_UP_ID] ?? '') === reader.participantId);
}

/** The collections board for this reader, or null where this is not a collections check-in with Release 2 on. */
export async function theCollectionsBoardFor(prisma: any, groundId: string, reader: ACollectionsReader, now: Date = new Date()): Promise<TheCollectionsBoard | null> {
  const it = await theCollectionsTypeFor(prisma, groundId);
  if (!it) return null;
  const ground = await Promise.resolve(prisma?.ground?.findUnique?.({
    where: { id: groundId },
    select: { organizationId: true, initiatorId: true, participants: { select: { id: true, userId: true, nameGiven: true, partyType: true, user: { select: { firstName: true } } } } },
  })).catch(() => null) as any;
  if (!ground) return null;
  const zone = (await theOrganisationsZone(prisma, ground.organizationId).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE;
  const rows = theBillsThisReaderMayRead(await theBillsOnRecord(prisma, groundId), reader);
  const people = ((ground.participants ?? []) as any[]).map((p) => ({
    id: p.id,
    firstName: String(p.user?.firstName ?? p.nameGiven ?? '').trim().split(/\s+/)[0] || '',
    isTheLead: p.partyType === 'INITIATOR' || (!!ground.initiatorId && p.userId === ground.initiatorId),
  }));
  /* The latest check-in each person made: only the people whose bills this reader reads. */
  const whose = new Set(rows.map((r) => r.ownerParticipantId).filter(Boolean) as string[]);
  const done = whose.size ? (((await Promise.resolve(prisma?.checkIn?.findMany?.({
    where: { groundId, status: 'COMPLETED', isSetup: false, participantId: { in: [...whose] } },
    select: { participantId: true, completedAt: true },
  })).catch(() => [])) ?? []) as any[]) : [];
  const lastCheckIn: Record<string, Date | null> = {};
  for (const c of done) {
    const at = c.completedAt ? new Date(c.completedAt) : null;
    if (at && (!lastCheckIn[c.participantId] || at > (lastCheckIn[c.participantId] as Date))) lastCheckIn[c.participantId] = at;
  }
  const ways = ((await Promise.resolve(prisma?.groundContextItem?.findMany?.({ where: { groundId, kind: 'WAY_OF_WORKING' }, select: { text: true, kind: true, closedAt: true } })).catch(() => [])) ?? []) as any[];
  return buildTheCollectionsBoard({
    type: it.type, billWord: it.billWord, rows, people, lastCheckIn, now, zone, reader,
    stallRuleSet: theCollectionsStallRuleIn(ways).set,
  });
}
