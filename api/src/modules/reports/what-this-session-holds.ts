import { PrismaService } from '../prisma/prisma.service';

/**
 * WHAT THIS SESSION HOLDS: THE FOUR TILES, COUNTED ONCE, OVER THE SESSION THEY ARE PRINTED UNDER.
 *
 * Nothing owned a session-scoped count, so each surface computed its own and each picked a different
 * population. The report read every dependency on the ground - no session, no clearedAt - under a
 * heading that said "this session", so a blocker raised in session one was on session twelve's report
 * as current. Movement was `count - prevCount`, and prevCount defaults to 0, so an objective never
 * snapshotted reported its whole lifetime as this session's movement. The board recomputed all four
 * tiles a second way when the engine returned nothing, and three of the four differed from the
 * report's - the engine's own header says the two surfaces must agree.
 *
 * THE LABELS WERE QUESTIONS AND THE VALUES DID NOT ANSWER THEM. (Moved here from the board's
 * recompute, which is deleted.) Read off a live board: "ALIGNED? 1 open". "MOVING? no change".
 * "STUCK? clear". "SOLID? moderate". None of the four is an answer to the question above it, and a
 * question-mark label forces the value to be a verdict, which this board explicitly is not. So the
 * label is a plain noun for the thing being counted, the value is the count, and the sub-line is a
 * whole clause saying what the count is of.
 */

/** One of the four reads the product's own front page shows when it shows a report. */
export interface AGlanceRead {
  label: string;
  value: string;
  /** What it is a read of, in half a sentence. */
  sub: string;
  /**
   * WHETHER THIS IS GOOD NEWS, BAD NEWS OR NEITHER.
   *
   * All four used to render identically, so "no blockers noted" and "1 unresolved" looked like the
   * same kind of fact and the row read as four failures. No blockers is good news. Nothing to
   * compare yet is neither.
   */
  tone: 'good' | 'warn' | 'bad' | 'flat';
}

export interface WhatThisSessionHolds {
  /** count(this session) - count(previous session), from snapshots. Null when there is no previous snapshot: not zero, not the lifetime total. */
  movedOnTargets: number | null;
  /** Dependencies raised in this session, still uncleared, hard-blocking. Self-blocks are not blockers. */
  blocked: number;
  /** Dependencies raised in this session, still uncleared, waiting on somebody. */
  waiting: number;
}

export async function whatThisSessionHolds(prisma: PrismaService, groundId: string, sessionNumber: number): Promise<WhatThisSessionHolds> {
  /* A dependency knows which check-in raised it (sourceCheckInId); the check-in knows its session. */
  const raisedIn = await prisma.checkIn.findMany({ where: { groundId, sessionNumber }, select: { id: true } });
  const [deps, objectives, now, before] = await Promise.all([
    raisedIn.length
      ? prisma.groundDependency.findMany({
          where: { groundId, clearedAt: null, status: { in: ['WAITING', 'BLOCKING'] as any }, sourceCheckInId: { in: raisedIn.map((c) => c.id) } },
          select: { status: true, fromParticipantId: true, onParticipantId: true },
        })
      : Promise.resolve([] as { status: string; fromParticipantId: string; onParticipantId: string | null }[]),
    prisma.groundObjective.findMany({ where: { groundId, target: { not: null } }, select: { id: true, count: true } }),
    prisma.groundObjectiveSnapshot.findMany({ where: { groundId, sessionNumber }, select: { objectiveId: true, count: true } }),
    sessionNumber > 1
      ? prisma.groundObjectiveSnapshot.findMany({ where: { groundId, sessionNumber: sessionNumber - 1 }, select: { objectiveId: true, count: true } })
      : Promise.resolve([] as { objectiveId: string; count: number }[]),
  ]);
  const real = deps.filter((d) => !(d.onParticipantId && d.onParticipantId === d.fromParticipantId));
  const blocked = real.filter((d) => d.status === 'BLOCKING').length;
  const waiting = real.filter((d) => d.status === 'WAITING').length;

  /* Movement is the difference between two snapshots, and nothing at all when there is only one. A
     session still in play has no snapshot of its own yet, so its live count stands in for it. */
  let movedOnTargets: number | null = null;
  if (objectives.length && before.length) {
    const prev = new Map(before.map((b) => [b.objectiveId, b.count]));
    const current = new Map(now.map((n) => [n.objectiveId, n.count]));
    movedOnTargets = objectives.reduce((sum, o) => {
      const from = prev.get(o.id);
      if (from == null) return sum;
      return sum + ((current.get(o.id) ?? o.count) - from);
    }, 0);
  }
  return { movedOnTargets, blocked, waiting };
}

/** The four tiles, from the counts. The one builder both the report and the board call. */
export function atAGlanceTiles(a: {
  agreed: number; stillOpen: number; movedOnTargets: number | null; blocked: number; waiting: number;
  backedPct: number | null; numberWasSaid: boolean;
}): AGlanceRead[] {
  return [
    {
      label: 'Differences',
      value: a.stillOpen ? `${a.stillOpen}` : a.agreed ? 'None' : 'Nothing to compare yet',
      /*
       * WHAT THIS COUNT IS OVER, SAID. Agreed and open come from the written report, which a model
       * produced; no engine measures them. The tile kept the count, because the alternative was a
       * tile with nothing in it, and now says whose reading it is counting.
       */
      sub: a.stillOpen
        ? 'still open, as the written report reads it'
        : a.agreed ? 'no disagreement, as the written report reads it' : 'one side has answered so far',
      tone: a.stillOpen ? 'warn' : a.agreed ? 'good' : 'flat',
    },
    {
      label: 'Movement',
      /*
       * "NO TARGETS SET" WAS TRUE AND USELESS.
       *
       * Read on a real twelve-session cohort whose entire purpose was who reaches eight closed
       * deals: the lead said "each of them at eight closed deals" in EVERY session, and this tile
       * read "no targets set" for the whole quarter. Both halves true about the target table, and
       * the quarter's number was sitting in the transcript the tile is printed beside.
       *
       * It is deliberately not turned into a target automatically. Reading a number out of a
       * sentence and making it the thing somebody is measured against is exactly the inference this
       * product refuses everywhere else - the lead sets the yardstick, on purpose, in one place.
       */
      /* The VALUE of a tile answers its own label. Under "Movement", "A number was said" answers a
         different question, and read live as though it were the movement. What there is to say
         here is that nothing is being tracked. */
      value: a.movedOnTargets == null
        ? a.numberWasSaid ? 'Not tracked' : 'No target set'
        : a.movedOnTargets > 0 ? `+${a.movedOnTargets}` : 'None',
      sub: a.movedOnTargets == null
        ? a.numberWasSaid
          ? 'somebody named a number and nothing is tracking it'
          : 'nobody has set something to measure this against'
        : a.movedOnTargets > 0 ? 'targets moved this session' : 'no target moved this session',
      tone: a.movedOnTargets == null
        ? a.numberWasSaid ? 'warn' : 'flat'
        : a.movedOnTargets > 0 ? 'good' : 'flat',
    },
    {
      label: 'Blockers',
      /* BLOCKING rows are blockers. WAITING rows are not, but a tile saying "None" over a finding that
         says two people are waiting on a third for five things read as the report contradicting
         itself in consecutive lines. Both are counted, in the template's own grammar. */
      value: a.blocked ? `${a.blocked}` : (a.waiting ?? 0) > 0 ? `${a.waiting} waiting` : 'None',
      sub: a.blocked
        ? 'named as holding work up'
        : (a.waiting ?? 0) > 0 ? 'on someone else, nothing hard-blocked' : 'nobody named anything holding work up',
      tone: a.blocked ? 'bad' : (a.waiting ?? 0) > 0 ? 'warn' : 'good',
    },
    {
      /* "Solid - 0% evidence backed" put a positive label over a zero. This counts one thing and
         says which. */
      label: 'How much was said',
      value: a.backedPct == null
        ? 'Nothing on record yet'
        : a.backedPct > 0 ? `${a.backedPct}% documented` : 'All from memory',
      sub: a.backedPct == null
        ? 'no answers to read'
        : a.backedPct > 0
          ? 'of what was said is anchored to a document'
          : 'nothing said this session was anchored to a document',
      tone: a.backedPct == null ? 'flat' : a.backedPct > 0 ? 'good' : 'warn',
    },
  ];
}
