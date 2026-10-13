import { whatTheyTried } from '../conversation/a-blocker-is-not-a-blocker-until-you-have-tried';
import { plainWordsByPerson, atTheStart } from '../reports/party-labels';
import { dedupeDependencies } from './reads';
import { oneBlockerPerThingWaitedOn } from './a-blocker-with-nothing-in-it-is-the-same-blocker';
import { whatHasStayedTheSame, theCheckInItWasFirstSaidIn, type ToLookAt } from './the-same-thing-for-three-check-ins';

/**
 * WHAT HAS STAYED THE SAME FOR THREE CHECK-INS, READ FROM THE STORED ROWS (week 12, screens
 * requests 3c and 11).
 *
 * One read, so the board and the report say the same sentences about the same person. The board
 * hands in what it has already loaded; the report, which has not loaded these rows, asks
 * `theSameThingForTheLead` to load them. Either way it reads stored rows only: no model is asked
 * and nothing is written, so opening a board or a report never rebuilds anything (decision 7).
 *
 * Only for the person who runs the check-in. The callers decide that before calling.
 */

export interface TheRowsItReads {
  groundId: string;
  participants: any[];
  checkIns: { id: string; participantId: string; sessionNumber: number; status: string; completedAt: Date | null }[];
  /** Every handoff row as written, for when each thing was first and last said. */
  rawDependencies: any[];
  /** The same rows with one row per thing waited on. */
  dependencies: any[];
  myParticipantId: string | null;
  nameOf: (pid: string) => string | null;
  aColleague: (pid: string | null | undefined) => string;
}

export async function theSameThingFromTheRows(prisma: any, r: TheRowsItReads): Promise<ToLookAt[]> {
  const { groundId, checkIns, rawDependencies, myParticipantId, nameOf, aColleague } = r;
  const finishedOf = (pid: string) => checkIns.filter((c) => c.participantId === pid && c.status === 'COMPLETED');
  const people = (r.participants ?? [])
    .filter((p) => !p.managingOnly && p.id !== myParticipantId)
    .map((p) => ({
      participantId: p.id as string,
      who: nameOf(p.id) ?? aColleague(p.id),
      nameIsTheirRole: !([p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || (p.nameGiven ?? '').trim()),
      finished: finishedOf(p.id).map((c) => c.sessionNumber),
    }))
    .filter((p) => p.finished.length >= 3);
  if (!people.length) return [];
  const promises = ((await prisma.groundCommitment?.findMany?.({
    where: { groundId, status: 'UNKNOWN', participantId: { in: people.map((p) => p.participantId) } },
    select: { participantId: true, text: true, status: true, statedInSession: true, saidAgainIn: true, explicit: true, source: true, saidWordForWord: true },
  })?.catch(() => [])) ?? []) as any[];
  const sessionOf = new Map(checkIns.map((c) => [c.id, c.sessionNumber]));
  const norm = (t: string) => (t ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|a|an|my|our|his|her|their|this|that|some|more|any|for|to)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const sameThing = (a: string, b: string) => { const x = norm(a); const y = norm(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
  const inTheWay = (r.dependencies ?? [])
    .filter((d: any) => people.some((p) => p.participantId === d.fromParticipantId))
    .map((d: any) => {
      /* Every row that is this same thing, for rows written before extraction deduped on write. */
      const rows = rawDependencies.filter((x) => x.fromParticipantId === d.fromParticipantId && sameThing(x.what, d.what));
      const theirs = finishedOf(d.fromParticipantId);
      const firsts = rows.map((x) => theCheckInItWasFirstSaidIn(x.createdAt, theirs)).filter((n): n is number => n != null);
      const lasts = rows.map((x) => (x.sourceCheckInId ? sessionOf.get(x.sourceCheckInId) : undefined)).filter((n): n is number => n != null);
      return {
        fromParticipantId: d.fromParticipantId,
        what: d.what,
        status: d.status,
        firstSaidIn: firsts.length ? Math.min(...firsts) : null,
        lastSaidIn: lasts.length ? Math.max(...lasts) : null,
        tried: whatTheyTried(d.triedSaid ?? '') as any,
        onTheReader: !!myParticipantId && d.onParticipantId === myParticipantId,
      };
    });
  return whatHasStayedTheSame(
    people,
    promises.map((c) => ({
      participantId: c.participantId,
      text: c.text,
      status: c.status,
      statedInSession: c.statedInSession,
      saidAgainIn: c.saidAgainIn ?? [],
      theirWords: c.saidWordForWord === true && c.explicit !== false && c.source === 'CHECK_IN',
    })),
    inTheWay,
  );
}

/**
 * THE SAME READ FOR A CALLER THAT HAS NOT LOADED THE ROWS: the team report, as the lead reads it.
 * Names as the board gives them to the lead: the whole name, with who they answered for where the
 * check-in asks for it, or "A colleague". Never an email address.
 */
export async function theSameThingForTheLead(prisma: any, groundId: string, leadUserId: string, opts: { adminReadsIt?: boolean } = {}): Promise<ToLookAt[]> {
  const ground = await prisma.ground?.findUnique?.({
    where: { id: groundId },
    select: {
      initiatorId: true,
      participants: {
        select: {
          id: true, email: true, userId: true, partyType: true, createdAt: true, roleAsDescribed: true,
          nameGiven: true, organisationGiven: true, managingOnly: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      dependencies: { orderBy: { createdAt: 'asc' } },
    },
  })?.catch?.(() => null);
  if (!ground || (ground.initiatorId !== leadUserId && !opts.adminReadsIt)) return [];
  const participants = (ground.participants ?? []) as any[];
  const checkIns = ((await prisma.checkIn?.findMany?.({
    where: { groundId },
    select: { id: true, participantId: true, sessionNumber: true, status: true, completedAt: true },
    orderBy: { sessionNumber: 'asc' },
  })?.catch?.(() => [])) ?? []) as any[];
  const rawDependencies = [...((ground.dependencies ?? []) as any[])];
  const noName = plainWordsByPerson(participants as any);
  const aColleague = (pid: string | null | undefined) => atTheStart((pid ? noName.get(pid) : null) ?? 'a colleague');
  const nameOf = (pid: string) => {
    const p = participants.find((x) => x.id === pid);
    if (!p) return null;
    const n = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || (p.nameGiven ?? '').trim();
    const forWhom = (p.organisationGiven ?? '').trim();
    return n ? (forWhom ? `${n} (${forWhom})` : n) : null;
  };
  const me = participants.find((p) => p.userId === leadUserId) ?? null;
  return theSameThingFromTheRows(prisma, {
    groundId,
    participants,
    checkIns,
    rawDependencies,
    dependencies: oneBlockerPerThingWaitedOn(dedupeDependencies(rawDependencies as any)),
    myParticipantId: me?.id ?? null,
    nameOf,
    aColleague,
  });
}
