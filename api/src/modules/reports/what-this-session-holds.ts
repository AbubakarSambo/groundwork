import { cleanText } from './what-the-record-actually-holds';
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
  /**
   * THE FIRST ONE, IN ITS OWN WORDS.
   *
   * "Blockers 1 - named as holding work up" is a count and a category. The thing itself is one
   * short line somebody typed, it is already in the row being counted, and it is the difference
   * between a scoreboard and a read.
   */
  theFirstBlocker: string | null;
  /**
   * WORRIES ARE NOT BLOCKERS, AND "NONE" WAS STILL WRONG. Rerun, 20 Sep 2026, loan cohort: Halima
   * had lost 220 birds and missed a payment, Aisha's diesel was N90,000 a month over, Musa was
   * turning farmers away, and the tile read "Blockers: None - nobody named anything holding work
   * up". Nobody had raised a dependency on anybody, which is what the count counts. What they had
   * said was a worry, and the tile now says how many and names the first.
   */
  worries: number;
  theFirstWorry: string | null;
}

export async function whatThisSessionHolds(prisma: PrismaService, groundId: string, sessionNumber: number): Promise<WhatThisSessionHolds> {
  /* A dependency knows which check-in raised it (sourceCheckInId); the check-in knows its session. */
  const raisedIn = await prisma.checkIn.findMany({ where: { groundId, sessionNumber }, select: { id: true } });
  const [deps, objectives, now, before, worried] = await Promise.all([
    raisedIn.length
      ? prisma.groundDependency.findMany({
          where: { groundId, clearedAt: null, status: { in: ['WAITING', 'BLOCKING'] as any }, sourceCheckInId: { in: raisedIn.map((c) => c.id) } },
          select: { status: true, fromParticipantId: true, onParticipantId: true, what: true, onLabel: true },
        })
      : Promise.resolve([] as { status: string; fromParticipantId: string; onParticipantId: string | null; what: string; onLabel: string | null }[]),
    prisma.groundObjective.findMany({ where: { groundId, target: { not: null } }, select: { id: true, count: true } }),
    prisma.groundObjectiveSnapshot.findMany({ where: { groundId, sessionNumber }, select: { objectiveId: true, count: true } }),
    sessionNumber > 1
      ? prisma.groundObjectiveSnapshot.findMany({ where: { groundId, sessionNumber: sessionNumber - 1 }, select: { objectiveId: true, count: true } })
      : Promise.resolve([] as { objectiveId: string; count: number }[]),
    raisedIn.length
      ? prisma.recordEntry.findMany({
          where: { disputedAt: null, checkInId: { in: raisedIn.map((c) => c.id) }, type: { in: ['WORRY', 'TENSION'] as any } },
          select: { text: true },
          orderBy: { createdAt: 'asc' },
        })
      : Promise.resolve([] as { text: string }[]),
  ]);
  const worries = worried.length;
  const theFirstWorry = worried[0]?.text ? cleanText(worried[0].text) : null;
  const real = deps.filter((d) => !(d.onParticipantId && d.onParticipantId === d.fromParticipantId));
  const blocked = real.filter((d) => d.status === 'BLOCKING').length;
  const waiting = real.filter((d) => d.status === 'WAITING').length;
  /* The hard one first, because that is the one a lead acts on. */
  const first = real.find((d) => d.status === 'BLOCKING') ?? real[0] ?? null;
  /* The person it sits with, unless the line already says it: "legal to look at the contract, on
     legal" is the tile telling somebody the same word twice. */
  const what = first?.what?.trim() ?? '';
  const on = first?.onLabel?.trim() ?? '';
  const alreadySaid = !!on && what.toLowerCase().includes(on.toLowerCase());
  const theFirstBlocker = what ? `${what}${on && !alreadySaid ? `, on ${on}` : ''}` : null;

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
  return { movedOnTargets, blocked, waiting, theFirstBlocker, worries, theFirstWorry };
}

/** The four tiles, from the counts. The one builder both the report and the board call. */
export function atAGlanceTiles(a: {
  agreed: number; stillOpen: number; movedOnTargets: number | null; blocked: number; waiting: number;
  backedPct: number | null; numberWasSaid: boolean;
  /**
   * WHETHER ANYBODY IS STILL TO ANSWER, because the Differences tile was guessing.
   *
   * With nothing agreed and nothing open it said "one side has answered so far", on a card whose
   * own next line read "2 of 2 answered". Read live, 11 September: two people had both answered and
   * the page told the reader one of them had not.
   *
   * There are two reasons the tile can have nothing to compare and they are not the same fact.
   * Somebody has not answered yet, so there is nothing to compare them with. Or everybody answered
   * and the written report named no agreement and no gap, which is a statement about the round and
   * not about who turned up. The tile could not tell them apart because it was never told.
   */
  stillToAnswer?: number;
  /**
   * AND THE THING ITSELF, WHERE THERE IS ONE. Hafsah, 19 September 2026: "the quick read is too
   * generic." Four tiles read "Differences 1 - still open, as the written report reads it" and
   * "Blockers 1 - named as holding work up", on a page whose own sections named the difference and
   * the blocker two screens further down. The count says how much; these say what.
   */
  theDifference?: string | null;
  theBlocker?: string | null;
  /** Worries said this round, for when nothing is blocked: the tile says so instead of "None". */
  worries?: number;
  theWorry?: string | null;
}): AGlanceRead[] {
  const shortly = (s: string | null | undefined, max = 72): string | null => {
    const t = (s ?? '').trim().replace(/\s+/g, ' ').replace(/[.?!]+$/, '');
    if (!t) return null;
    return t.length > max ? `${t.slice(0, max - 3).trimEnd()}...` : t;
  };
  const theDifference = shortly(a.theDifference);
  const theBlocker = shortly(a.theBlocker);
  const theWorry = shortly(a.theWorry);
  const worries = a.worries ?? 0;
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
        ? (theDifference
          ? `${theDifference}${a.stillOpen > 1 ? `, and ${a.stillOpen - 1} more` : ''}`
          : 'still open, as the written report reads it')
        : a.agreed ? 'no disagreement, as the written report reads it'
          : a.stillToAnswer === 0 ? 'everybody answered, and the written report names no agreement and no gap yet'
            : 'not everybody has answered yet',
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
      value: a.blocked ? `${a.blocked}` : (a.waiting ?? 0) > 0 ? `${a.waiting} waiting` : worries ? `${worries} worr${worries === 1 ? 'y' : 'ies'}` : 'None',
      sub: a.blocked
        ? (theBlocker
          ? `${theBlocker}${a.blocked > 1 ? `, and ${a.blocked - 1} more` : ''}`
          : 'named as holding work up')
        : (a.waiting ?? 0) > 0
          ? (theBlocker ? `${theBlocker}, nothing hard-blocked` : 'on someone else, nothing hard-blocked')
          : worries
            ? (theWorry ? `${theWorry}${worries > 1 ? `, and ${worries - 1} more` : ''}; nobody is waiting on anybody` : 'said, though nobody is waiting on anybody')
            : 'nobody named anything holding work up',
      tone: a.blocked ? 'bad' : (a.waiting ?? 0) > 0 || worries ? 'warn' : 'good',
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
