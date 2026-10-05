import { CheckInStatus } from '@prisma/client';
import { theFirstNameOfAParticipant } from '../reports/a-title-is-not-a-first-name';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { inOurVoice } from '../reports/what-the-record-shows-over-time';

/**
 * WHAT THE RECORD HOLDS OF ONE ANCHOR CHECK-IN'S MONTH (request 149). Counts, and the names of who is waiting
 * on whom. Read only: it writes nothing, and it is read the same way for the month board and for the
 * end-of-month read, so the two cannot disagree.
 *
 * It never reads what a person said word for word. The only text in it is what people put as the thing they
 * wait for, which is a handoff the lead already reads on the board.
 */
export interface AHandoff { from: string; on: string | null; what: string | null }

export interface TheMonthRecord {
  /** People who can answer: not managing only, and let in. The lead is one. */
  ofHowMany: number;
  /** Of those, how many have given at least one finished account. */
  checkedIn: number;
  /** Of those, how many have not answered the round that is open. */
  notYetThisRound: number;
  /** How many people said at least one thing they will do themselves. */
  saidWhatTheyWillDo: number;
  /** Of those who can answer, how many finished the round that is open, and how many said a thing they will do in it (the weekly insight's "this week"). */
  checkedInThisRound?: number;
  saidWhatTheyWillDoThisRound?: number;
  commitmentsDone: number;
  commitmentsOpen: number;
  /** Open handoffs, said by name. */
  waiting: AHandoff[];
  handoffsCleared: number;
  /** Offers made to the lead of a further check-in, by kind (piece 24). */
  offers: { pair: number; project: number; aim: number };
  /** The day the check-in started, for the week of the month. */
  startedOn: Date | null;
  /**
   * What each person did that they said they would (piece 22, hidden contributors; decision 96 item 9). One thing per
   * person, the latest closed, from their own check-in promises only (never a colleague's mention of them), as an
   * action in our voice. Never counted or ordered per person.
   */
  /** Ideas captured after the person's own yes (piece 19), with the first name of who raised each. */
  ideas?: { id: string; name: string; ownerParticipantId: string | null; raisedBy: string | null }[];
  doneByPerson?: { participantId: string; name: string; clause: string; clauseToThem?: string | null; settledBy?: string | null; doneAt: Date | null }[];
}

const THE_ANCHOR_OFFERS = { anchor_pair_check_in: 'pair', anchor_project_check_in: 'project', anchor_aim_check_in: 'aim' } as const;

export async function readTheMonthRecord(prisma: any, groundId: string, openRound: number): Promise<TheMonthRecord> {
  const [people, finished, commitments, handoffs, offers, ground] = await Promise.all([
    prisma.groundParticipant.findMany({ where: { groundId }, select: { id: true, userId: true, managingOnly: true, nameGiven: true, createdAt: true, user: { select: { firstName: true, lastName: true, awaitingOrgApproval: true } } } }),
    prisma.checkIn.findMany({ where: { groundId, status: CheckInStatus.COMPLETED }, select: { participantId: true, sessionNumber: true, isSetup: true, status: true } }),
    prisma.groundCommitment.findMany({ where: { groundId }, select: { participantId: true, status: true, text: true, source: true, explicit: true, settledAt: true, settledBy: true, updatedAt: true, statedInSession: true } }),
    prisma.groundDependency.findMany({ where: { groundId }, select: { fromParticipantId: true, onParticipantId: true, onLabel: true, what: true, status: true } }),
    prisma.recommendation.findMany({ where: { subjectExternalId: `check-in:${groundId}`, kind: { in: Object.keys(THE_ANCHOR_OFFERS) }, state: { in: ['PROPOSED', 'ACCEPTED'] } }, select: { kind: true } }),
    prisma.ground.findUnique({ where: { id: groundId }, select: { startsAt: true, createdAt: true } }),
  ]);
  /* Ideas, only after the yes: kind `idea`, never `idea-offered` (piece 19, ideas-from-the-team). */
  const ideaRows = ((await prisma.workItem?.findMany?.({ where: { groundId, kind: 'idea' }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, ownerParticipantId: true, kind: true } })?.catch?.(() => [])) ?? []) as any[];
  const counted = (people as any[]).filter((p) => !p.managingOnly && !isNotLetInYet(p));
  const ids = new Set(counted.map((p) => p.id));
  const real = (finished as any[]).filter((c) => c.status === CheckInStatus.COMPLETED && !c.isSetup && ids.has(c.participantId));
  const checkedInIds = new Set(real.map((c) => c.participantId));
  const answeredNow = new Set(real.filter((c) => c.sessionNumber === openRound).map((c) => c.participantId));
  const firstName = (id: string | null) => {
    const p = (people as any[]).find((x) => x.id === id);
    return p ? theFirstNameOfAParticipant(p) ?? null : null;
  };
  const mine = (commitments as any[]).filter((c) => c.participantId && ids.has(c.participantId));
  const open = (handoffs as any[]).filter((d) => d.status !== 'CLEARED');
  const startedOn = (ground?.startsAt ?? ground?.createdAt ?? (people as any[]).map((p) => p.createdAt).filter(Boolean).sort((a: Date, b: Date) => a.getTime() - b.getTime())[0] ?? null) as Date | null;
  const byKind = { pair: 0, project: 0, aim: 0 };
  for (const o of offers as any[]) byKind[THE_ANCHOR_OFFERS[o.kind as keyof typeof THE_ANCHOR_OFFERS]]++;
  return {
    ofHowMany: counted.length,
    checkedIn: checkedInIds.size,
    notYetThisRound: counted.filter((p) => !answeredNow.has(p.id)).length,
    saidWhatTheyWillDo: new Set(mine.map((c) => c.participantId)).size,
    checkedInThisRound: answeredNow.size,
    saidWhatTheyWillDoThisRound: new Set(mine.filter((c) => c.statedInSession === openRound).map((c) => c.participantId)).size,
    commitmentsDone: mine.filter((c) => c.status === 'DONE').length,
    commitmentsOpen: mine.filter((c) => c.status === 'UNKNOWN').length,
    waiting: open.map((d) => ({ from: firstName(d.fromParticipantId) ?? 'Someone', on: d.onParticipantId ? firstName(d.onParticipantId) : (d.onLabel ?? null), what: d.what ?? null })),
    handoffsCleared: (handoffs as any[]).length - open.length,
    offers: byKind,
    startedOn,
    ideas: ideaRows.filter((i) => i.kind === 'idea').map((i) => ({ id: i.id, name: i.name, ownerParticipantId: i.ownerParticipantId ?? null, raisedBy: firstName(i.ownerParticipantId ?? null) })),
    doneByPerson: (() => {
      type Done = { participantId: string; name: string; clause: string; clauseToThem: string | null; settledBy: string | null; doneAt: Date | null };
      const latest = new Map<string, Done>();
      for (const c of mine) {
        if (c.status !== 'DONE' || c.source !== 'CHECK_IN' || c.explicit === false) continue;
        const clause = inOurVoice(String(c.text ?? ''), 'them');
        const name = firstName(c.participantId);
        if (!clause || !name) continue;
        const doneAt = (c.settledAt ?? c.updatedAt ?? null) as Date | null;
        const had = latest.get(c.participantId);
        /* Said to the person themselves, "my manager" is "your manager" (review of piece 22). */
        const clauseToThem = inOurVoice(String(c.text ?? ''), 'you');
        if (!had || (doneAt && (!had.doneAt || new Date(doneAt).getTime() > new Date(had.doneAt).getTime()))) latest.set(c.participantId, { participantId: c.participantId, name, clause, clauseToThem, settledBy: c.settledBy ?? null, doneAt });
      }
      /* In the order the people are in the check-in, never by how much each did. */
      return counted.map((p) => latest.get(p.id)).filter((x): x is Done => !!x);
    })(),
  };
}
