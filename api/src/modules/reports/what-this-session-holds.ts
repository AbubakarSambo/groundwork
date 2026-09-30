import { cleanText } from './what-the-record-actually-holds';
import { PrismaService } from '../prisma/prisma.service';
import { quotesBuiltAtTheRead, theRecordAQuoteMayComeFrom } from './a-quote-built-at-the-read';

/*
 * A TILE SHOWS A WHOLE SENTENCE, OR NONE.
 *
 * Seniorhire, all-24 run 12, the Blockers tile, for Amina and for Tobi: "I haven't explicitly said
 * 'get me out of these meetings.' I did say he..., and 3 more; nobody is waiting on anybody". The
 * line was cut at 72 characters in the middle of Amina's second sentence, and the count was hung on
 * the fragment with a semicolon. A person's words cut mid-sentence say something they did not say.
 *
 * So a line on a tile is the first sentence of what was said, whole, with its own closing mark,
 * and nothing is ever cut inside a sentence. A first sentence too long for a tile is not shown at
 * all, and the tile says what it counts instead.
 */
const A_TILE_HOLDS = 160;
export function theFirstSentenceThatFits(s: string | null | undefined, max = A_TILE_HOLDS): string | null {
  const t = (s ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return null;
  /* The end of a sentence, with a closing quotation mark or bracket that belongs to it. */
  const m = t.match(/^(.+?[.!?]+["'”’)\]]*)(?:\s|$)/);
  const first = (m ? m[1] : t).trim();
  return first.length <= max ? first : null;
}

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
  /**
   * HOW MANY TARGETS EXIST AT ALL, which is a different fact from whether any moved.
   *
   * Read live, 22 September 2026, on a check-in whose lead had just pasted the quarter's six numbers
   * and five people's: "Movement - No target set. Nobody has set something to measure this against."
   * Thirteen targets on the Context page, and the tile beside them said nobody had set one. Movement
   * is null before there are two snapshots to subtract, and null was being read as "none exist".
   */
  targetsSet: number;
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
  /*
   * THE FIRST WORRY WHOSE LINE STANDS WHOLE: a first sentence that fits a tile, and whose quotes,
   * if it has any, are the record's words, so the quote rule at the read leaves it as it is (see
   * a-quote-built-at-the-read). Amina's first worry quoted words she typed in other marks; the rule
   * took that sentence out and left a fragment. A worry that would lose a piece is passed over for
   * one that would not, and with none the tile says how many there are.
   */
  const quotable = worried.length ? await theRecordAQuoteMayComeFrom(prisma as any, groundId) : [];
  const theFirstWorry = worried
    .map((w) => theFirstSentenceThatFits(w?.text ? cleanText(w.text) : null))
    .find((line): line is string => !!line && quotesBuiltAtTheRead(line, quotable) === line) ?? null;
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
  return { movedOnTargets, blocked, waiting, theFirstBlocker, worries, theFirstWorry, targetsSet: objectives.length };
}

/** The four tiles, from the counts. The one builder both the report and the board call. */
export function atAGlanceTiles(a: {
  agreed: number; stillOpen: number; movedOnTargets: number | null; blocked: number; waiting: number;
  /** How many targets this check-in holds. Nought is "none set"; anything else is "none moved yet". */
  targetsSet?: number;
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
  /*
   * NOT CUT AT ALL. Read live: "we have a meeting with the CEO to discuss m..." - the tile stopped
   * inside "monetisation". Cutting at the last whole word instead still cut inside a sentence, and
   * "I did say he..." (seniorhire, run 12) is what that leaves. See theFirstSentenceThatFits. A
   * clause the count is joined to loses its own full stop, so ", and 2 more" follows it.
   */
  const shortly = (s: string | null | undefined): string | null => {
    const first = theFirstSentenceThatFits(s);
    return first ? first.replace(/[.?!]+$/, '') || null : null;
  };
  const theDifference = shortly(a.theDifference);
  const theBlocker = shortly(a.theBlocker);
  /* A worry is shown as the sentence it is, with its own closing mark, and the count follows it as a
     sentence of its own. */
  const theWorry = (() => {
    const first = theFirstSentenceThatFits(a.theWorry);
    if (!first) return null;
    return /[.!?]["'”’)\]]*$/.test(first) ? first : `${first}.`;
  })();
  const theRestOfTheWorries = (n: number): string => (n <= 0
    ? 'It is the only worry on record, and nobody is waiting on anybody.'
    : `There ${n === 1 ? 'is 1 more worry' : `are ${n} more worries`} on record, and nobody is waiting on anybody.`);
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
            /* And where nobody passed a count, say what is true of the report rather than guess at the
               roster: "not everybody has answered yet" went out on boards where everybody had. */
            : a.stillToAnswer == null ? 'the written report names no agreement and no gap yet'
              : `${a.stillToAnswer} ${a.stillToAnswer === 1 ? 'person has' : 'people have'} still to answer`,
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
        ? (a.targetsSet ?? 0) > 0 ? 'Nothing yet'
          : a.numberWasSaid ? 'Not tracked' : 'No target set'
        : a.movedOnTargets > 0 ? `+${a.movedOnTargets}` : 'None',
      sub: a.movedOnTargets == null
        ? (a.targetsSet ?? 0) > 0
          /* Set, and nothing to subtract from yet: a round has to close before movement exists. */
          ? `${a.targetsSet} target${a.targetsSet === 1 ? '' : 's'} set, and no round has closed to measure from`
          : a.numberWasSaid
            ? 'somebody named a number and nothing is tracking it'
            : 'nobody has set something to measure this against'
        : a.movedOnTargets > 0 ? 'targets moved this session' : 'no target moved this session',
      tone: a.movedOnTargets == null
        ? a.numberWasSaid && !(a.targetsSet ?? 0) ? 'warn' : 'flat'
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
            ? (theWorry
              ? `${theWorry} ${theRestOfTheWorries(worries - 1)}`
              : `${worries} ${worries === 1 ? 'worry is' : 'worries are'} on record, and nobody is waiting on anybody.`)
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
      /* One whole sentence, never a fragment that only reads once joined to the figure by eye
         (request 67). The value stays the short figure the screens compose from. */
      sub: a.backedPct == null
        ? 'There are no answers to read yet.'
        : a.backedPct > 0
          ? `${a.backedPct} of every 100 things people said ${a.backedPct === 1 ? 'has' : 'have'} a document behind ${a.backedPct === 1 ? 'it' : 'them'}.`
          : 'Nothing said this session has a document behind it.',
      tone: a.backedPct == null ? 'flat' : a.backedPct > 0 ? 'good' : 'warn',
    },
  ];
}

/**
 * THE TOP LINE AND THE QUICK READ NAME THE SAME BLOCKER (screens request 88).
 *
 * On the government programme the top line said "the approval for Machakos's second tranche" while
 * the quick read, on the same board, said "the fuel allowance for October". The top line takes the
 * longest-standing blocker anybody named (`atAGlance`, in how-a-check-in-is-going); the tile took the
 * first one raised in the open round. Two picks for one thing. The board now gives the tile the
 * top line's blocker, from that one place, and keeps the tile's own count beside it.
 *
 * Only a Blockers tile that already names something is changed: one that says nobody named anything,
 * or that counts worries, is left as it is.
 */
export function theBlockersTileNamesThis(tiles: AGlanceRead[], blocker: string | null | undefined): AGlanceRead[] {
  const named = theFirstSentenceThatFits(blocker ?? null);
  const name = named ? named.replace(/[.?!]+$/, '') : '';
  if (!name) return tiles;
  return tiles.map((t) => {
    if (t.label !== 'Blockers') return t;
    const hard = /^(\d+)$/.exec(String(t.value));
    if (hard) return { ...t, sub: `${name}${Number(hard[1]) > 1 ? `, and ${Number(hard[1]) - 1} more` : ''}` };
    if (/^\d+ waiting$/.test(String(t.value))) return { ...t, sub: `${name}, nothing hard-blocked` };
    return t;
  });
}
