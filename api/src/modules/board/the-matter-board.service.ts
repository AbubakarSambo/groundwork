import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { theMarkOf, whoAddedEachBackingDocument, WHAT_A_MARK_READS } from '../reports/how-a-line-is-known';
import { theWordForTheBill } from '../grounds/collect-whats-owed';
import { BILL, F, theCollectionsTypeFor } from './the-collections-record';
import { theBillsOnRecord, theBillsThisReaderMayRead } from './the-collections-board.service';
import { aMatterCheckIn, plainWords } from './a-fee-note-due-on-an-event';
import { buildTheMatterBoard, theWordsNameTheMatter, type AMatterOnRecord, type TheMatterBoard } from './the-matter-board';

/**
 * THE MATTER BOARD, SERVED TO ONE READER (Release 2, pull request 3 of 3). Read only: opening the board writes nothing.
 *
 * WHO READS WHAT, ENFORCED HERE, BEFORE ANYTHING IS BUILT:
 *  - The litigation check-in's own lines, deadlines and waits: whoever runs it reads every one; a person in it reads their own,
 *    as the board already serves a person only their own rows (a-participants-board-is-their-own). Anybody else reads none.
 *  - The fees: part 2's rule, applied in each fee notes check-in by the reader's own place in it. Whoever runs that check-in (its
 *    lead) reads every bill; a person reads only the bills they follow up there; somebody who is not in it, such as a paralegal in
 *    the litigation check-in only, reads none, and no amount. A person is a different participant in each check-in, so the reader
 *    is matched by who they are (their user), never by a participant id from another check-in.
 *  - What waits for a decision: whoever runs it, from what the board already serves them.
 */

export interface AMatterReader { runsIt: boolean; participantId: string | null; userId: string | null }

const field = (fields: any, k: string) => String((fields ?? {})[k] ?? '').trim();

/** The matter board for this reader, or null where the switchboard does not pick it for this check-in. */
export async function theMatterBoardFor(
  prisma: any,
  groundId: string,
  reader: AMatterReader,
  now: Date = new Date(),
  extras: { decisions?: { question: string; why: string | null }[] | null } = {},
): Promise<TheMatterBoard | null> {
  const picked = await aMatterCheckIn(prisma, groundId);
  if (!picked) return null;
  const ground = await Promise.resolve(prisma?.ground?.findUnique?.({
    where: { id: groundId },
    select: { organizationId: true, initiatorId: true, label: true, participants: { select: { id: true, userId: true, nameGiven: true, user: { select: { firstName: true } } } } },
  })).catch(() => null) as any;
  if (!ground) return null;
  const zone = (await theOrganisationsZone(prisma, ground.organizationId).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE;
  const people = ((ground.participants ?? []) as any[]).map((p) => ({ id: p.id, firstName: String(p.user?.firstName ?? p.nameGiven ?? '').trim().split(/\s+/)[0] || '' }));
  const mayRead = (pid: string | null) => reader.runsIt || (!!reader.participantId && pid === reader.participantId);

  /* The check-in's own record, only what this reader may read, at the read. */
  const said = ((await Promise.resolve(prisma?.recordEntry?.findMany?.({
    where: { participant: { groundId }, disputedAt: null, ...(reader.runsIt ? {} : { participantId: reader.participantId ?? '__nobody__' }) },
    select: { id: true, text: true, participantId: true, createdAt: true, type: true, ...WHAT_A_MARK_READS },
    orderBy: { createdAt: 'asc' },
  })).catch(() => [])) ?? []) as any[];
  const mine = said.filter((l) => mayRead(l.participantId ?? null) && String(l.text ?? '').trim());
  const whoAdded = await whoAddedEachBackingDocument(prisma, mine).catch(() => new Map<string, string | null>());
  const lines = mine.map((l) => ({
    id: l.id, participantId: l.participantId ?? null, text: String(l.text).replace(/\[[^\]]*\]/g, '').trim(), at: l.createdAt,
    mark: (theMarkOf({ ...l, type: String(l.type ?? '') }, whoAdded) === 'proven' ? 'proven' : 'said') as 'proven' | 'said',
  }));
  const deadlines = (((await Promise.resolve(prisma?.workItem?.findMany?.({
    where: { groundId, kind: 'deadline' },
    select: { id: true, name: true, dueAt: true, ownerParticipantId: true },
  })).catch(() => [])) ?? []) as any[]).filter((d) => mayRead(d.ownerParticipantId ?? null));
  const waits = (((await Promise.resolve(prisma?.groundDependency?.findMany?.({
    where: { groundId, status: { not: 'CLEARED' } },
    select: { id: true, fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, status: true },
  })).catch(() => [])) ?? []) as any[])
    .filter((w) => w.status !== 'CLEARED' && mayRead(w.fromParticipantId ?? null))
    .map((w) => ({ id: w.id, fromParticipantId: w.fromParticipantId ?? null, on: w.onLabel ?? (people.find((p) => p.id === w.onParticipantId)?.firstName ?? null), what: String(w.what ?? '') }));

  /* Every line and deadline of the check-in names a matter or not, for whoever reads it: read once, unwalled, only to know which matters are this check-in's. */
  const everyWord = [
    ...(((await Promise.resolve(prisma?.recordEntry?.findMany?.({ where: { participant: { groundId }, disputedAt: null }, select: { text: true } })).catch(() => [])) ?? []) as any[]).map((l) => String(l.text ?? '')),
    ...(((await Promise.resolve(prisma?.workItem?.findMany?.({ where: { groundId, kind: 'deadline' }, select: { name: true } })).catch(() => [])) ?? []) as any[]).map((d) => String(d.name ?? '')),
  ];

  /* The fee notes check-ins of the organisation, each walled for this reader by their own place in it. */
  const feeNotes = ((await Promise.resolve(prisma?.ground?.findMany?.({
    where: { organizationId: ground.organizationId, scenario: 'COLLECTIONS' },
    select: { id: true, initiatorId: true, participants: { select: { id: true, userId: true, nameGiven: true, user: { select: { firstName: true } } } } },
  })).catch(() => [])) ?? []) as any[];
  const matters = new Map<string, AMatterOnRecord>();
  let billWord: string | null = null;
  for (const g of feeNotes) {
    const it = await theCollectionsTypeFor(prisma, g.id).catch(() => null);
    if (!it || it.type !== 'invoices or fee notes') continue;
    billWord = billWord ?? it.billWord;
    const runsThat = !!reader.userId && g.initiatorId === reader.userId;
    const myPlace = ((g.participants ?? []) as any[]).find((p) => !!reader.userId && p.userId === reader.userId)?.id ?? null;
    const all = (await theBillsOnRecord(prisma, g.id)).filter((b) => b.kind === BILL);
    const readable = new Set(theBillsThisReaderMayRead(all, { runsIt: runsThat, participantId: myPlace }).map((b) => b.id));
    for (const b of all) {
      const client = field(b.fields, F.client) || b.name;
      const matter = field(b.fields, F.matter) || null;
      const key = plainWords(matter || client);
      if (!key) continue;
      const m = matters.get(key) ?? { key, client, matter, bills: [], readsEveryBill: runsThat };
      m.readsEveryBill = m.readsEveryBill && runsThat;
      if (readable.has(b.id)) m.bills.push(b);
      matters.set(key, m);
    }
  }
  /* A matter is this check-in's only where the check-in itself names it. */
  const ofThisCheckIn = [...matters.values()].filter((m) => everyWord.some((w) => theWordsNameTheMatter(w, m)));
  return buildTheMatterBoard({
    checkInName: String(ground.label ?? '').trim(),
    billWord: billWord ?? theWordForTheBill(null),
    zone, now,
    reader: { runsIt: reader.runsIt, participantId: reader.participantId },
    people,
    lines, deadlines, waits,
    matters: ofThisCheckIn,
    decisions: reader.runsIt ? (extras.decisions ?? []) : null,
  });
}
