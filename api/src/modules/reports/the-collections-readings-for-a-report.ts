import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { theCollectionsStallRuleIn } from '../grounds/collect-whats-owed';
import { theCollectionsTypeFor } from '../board/the-collections-record';
import { theBillsOnRecord, theBillsThisReaderMayRead } from '../board/the-collections-board.service';
import { whatTheSwitchboardServes } from '../board/the-switchboard';
import { theyRunThisCheckIn } from '../board/an-untold-goal-is-not-a-board-objective';
import { theCollectionsTeamReport, theCollectionsOwnReport, theCollectionsWeek, type TheCollectionsWeek, type TheCollectionsReportInput } from './the-collections-reports';

/**
 * THE COLLECTIONS READINGS, ADDED TO A REPORT AS IT IS SERVED, AND KEPT WITH A WEEK AS IT IS BUILT (Release 2, pull request 2 of 3;
 * the-collections-reports). Only where the switchboard picks the collections board or the loans board for the check-in (Release 2
 * on, a "Collect what's owed" check-in, its type on record). Anywhere else a report is served exactly as before.
 *
 * WHO READS WHAT, ENFORCED HERE (the same wall as the board, the-collections-board.service):
 *  - the team's report on the bills (`collectionsReport`): whoever runs the check-in, as the rest of the team's report before it
 *    is shared;
 *  - each person's own report (`collectionsOwnReport`): the person, about the bills they follow up or their own loan only;
 *  - nobody else reads either.
 */

/** Whether the switchboard picks the collections board here. */
export async function theCollectionsBoardIsPicked(prisma: any, groundId: string): Promise<boolean> {
  const g = await Promise.resolve(prisma?.ground?.findUnique?.({
    where: { id: groundId },
    select: { organizationId: true, scenario: true, kindOfWork: true, kindOfWorkSetBy: true, checkInType: true, checkInTypeConfirmedAt: true },
  })).catch(() => null);
  const served = g ? await whatTheSwitchboardServes(prisma, g as any).catch(() => null) : null;
  return !!served && (served.board === 'the collections board' || served.board === 'the loans board');
}

async function theInput(prisma: any, groundId: string, reader: { runsIt: boolean; participantId: string | null }, now: Date) {
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
    id: p.id, firstName: String(p.user?.firstName ?? p.nameGiven ?? '').trim().split(/\s+/)[0] || '',
    isTheLead: p.partyType === 'INITIATOR' || (!!ground.initiatorId && p.userId === ground.initiatorId),
  }));
  const whose = [...new Set(rows.map((r) => r.ownerParticipantId).filter(Boolean) as string[])];
  const done = whose.length ? (((await Promise.resolve(prisma?.checkIn?.findMany?.({
    where: { groundId, status: 'COMPLETED', isSetup: false, participantId: { in: whose } }, select: { participantId: true, completedAt: true },
  })).catch(() => [])) ?? []) as any[]) : [];
  const lastCheckIn: Record<string, Date | null> = {};
  for (const c of done) { const at = c.completedAt ? new Date(c.completedAt) : null; if (at && (!lastCheckIn[c.participantId] || at > (lastCheckIn[c.participantId] as Date))) lastCheckIn[c.participantId] = at; }
  const ways = ((await Promise.resolve(prisma?.groundContextItem?.findMany?.({ where: { groundId, kind: 'WAY_OF_WORKING' }, select: { text: true, kind: true, closedAt: true } })).catch(() => [])) ?? []) as any[];
  return { ground, base: { type: it.type, billWord: it.billWord, rows, people, lastCheckIn, now, zone, reader, stallRuleSet: theCollectionsStallRuleIn(ways).set } };
}

/** The team's report on the bills, or the reader's own, added to a session report as it is served. */
export async function withTheCollectionsReadings<T>(prisma: any, groundId: string, sessionNumber: number, requestingUserId: string, served: T, now: Date = new Date()): Promise<T> {
  if (!served || typeof served !== 'object' || (served as any).withheldUntilYouAnswer) return served;
  if (!(await theCollectionsBoardIsPicked(prisma, groundId))) return served;
  const g = await Promise.resolve(prisma?.ground?.findUnique?.({
    where: { id: groundId },
    select: { organizationId: true, initiatorId: true, createdByUserId: true, participants: { select: { id: true, userId: true, managingOnly: true } } },
  })).catch(() => null) as any;
  if (!g) return served;
  const me = ((g.participants ?? []) as any[]).find((p) => p.userId === requestingUserId) ?? null;
  const runsIt = g.initiatorId === requestingUserId || (!me && theyRunThisCheckIn(requestingUserId, g));
  if (!runsIt && !me) return served;
  const reader = { runsIt, participantId: me?.id ?? null };
  const it = await theInput(prisma, groundId, reader, now);
  if (!it) return served;
  const theSession = ((await Promise.resolve(prisma?.checkIn?.findMany?.({
    where: { groundId, sessionNumber, isSetup: false }, select: { id: true, participantId: true, status: true, completedAt: true },
  })).catch(() => [])) ?? []) as any[];
  const done = theSession.filter((c) => c.status === 'COMPLETED' && c.completedAt);
  const ids = new Set(done.map((c) => c.id));
  const lines = ((await Promise.resolve(prisma?.recordEntry?.findMany?.({
    where: { participant: { groundId }, disputedAt: null }, select: { participantId: true, checkInId: true, text: true, createdAt: true, anchoredDocumentId: true },
  })).catch(() => [])) ?? []) as any[];
  const session: TheCollectionsReportInput['session'] = {
    number: sessionNumber,
    checkIns: done.map((c) => ({ participantId: c.participantId, completedAt: c.completedAt })),
    /* A person reads only their own lines; whoever runs it reads everybody's in this check-in. */
    lines: lines.filter((l) => l.checkInId && ids.has(l.checkInId) && (runsIt || l.participantId === me?.id))
      .map((l) => ({ participantId: l.participantId, checkInId: l.checkInId, text: String(l.text ?? '').replace(/\[[^\]]*\]/g, '').trim(), createdAt: l.createdAt, documented: !!l.anchoredDocumentId })),
    due: new Set(theSession.map((c) => c.participantId)).size,
  };
  const input = { ...it.base, session };
  return runsIt
    ? { ...(served as any), collectionsReport: theCollectionsTeamReport(input) }
    : { ...(served as any), collectionsOwnReport: theCollectionsOwnReport(input) };
}

/** The week's bills, kept with the weekly report when it is built. Null where the collections board is not picked. */
export async function theCollectionsWeekFor(prisma: any, groundId: string, start: Date, at: Date): Promise<TheCollectionsWeek | null> {
  if (!(await theCollectionsBoardIsPicked(prisma, groundId))) return null;
  const it = await theInput(prisma, groundId, { runsIt: true, participantId: null }, at);
  if (!it) return null;
  return theCollectionsWeek(it.base, start, at);
}
