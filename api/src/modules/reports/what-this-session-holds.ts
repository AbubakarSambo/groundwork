import { targetsFor } from '../board/whose-number-is-whose-business';
import { aWaitOnOneself } from '../board/a-thing-is-not-somebody';
import { labelsForParties, namesVisibleTo } from './party-labels';
import { peopleSaidDifferentThingsAbout } from './what-people-said-differently-about';
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
/* A phrase put inside a sentence: a topic that opens with "Whether" or "The" reads from a lower-case letter. */
const inASentence = (phrase: string): string => {
  const t = (phrase ?? '').trim().replace(/[.!?]+$/, '');
  return /^(The|A|An|Whether|What|How|Who|When|Where|Which|Why|If|This|That|Our|Their|His|Her|Its)\b/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
};

/* A line that opens a sentence of its own starts with a capital. */
const up = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * A blocker as a sentence. It arrives as a short phrase ("the credit terms", "Legal to review the
 * contract, on Tunde") or as a sentence somebody said ("I have heard about it but ..."). A phrase is
 * put inside a sentence of ours. A sentence somebody said stays theirs and only gets its capital.
 */
const SAYS_SOMETHING = /^(?:I|We|They|He|She|It|There|Nobody|Nothing|Everyone)\b|\b(?:is|are|was|were|has|have|had|will|can|cannot|did|does|do|said|says|need|needs|waiting|stopped|heard)\b/;
const blockerAsASentence = (b: string): string => (SAYS_SOMETHING.test(b) ? `${up(b)}.` : `Work is held up by ${inASentence(b)}.`);

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
  /** Of those, how many carry a number, which is what movement is measured on (request 109 c). */
  targetsWithANumber?: number;
  /**
   * HOW MANY TARGETS MOVED, because a sum across them is not a number anybody can read. Run re-d,
   * sales, session 3: 11 approved facilities and 31 million naira moved, and the tile read "+31000000".
   * Two targets counted in two different things are said as how many moved, never added together.
   */
  targetsMoved?: number;
}

/** Who is reading, so the Movement tile counts only the targets they may read. */
export interface WhoReadsTheMovement {
  participantId: string | null;
  /** Whoever set the targets reads every one of them. */
  isLead: boolean;
  /**
   * The person an evaluation check-in is about, or an admin without access to it: a colleague's own
   * words are walled from them (colleagues-exact-words-stay-with-the-manager), so the tile gives them
   * only how many worries there are, never a colleague's words.
   */
  colleaguesWordsWalled?: boolean;
  /**
   * WHETHER THE BLOCKERS TILE COUNTS AND NAMES ONLY THIS READER'S OWN WAITS (run-25, loans). Sunday, a borrower where
   * people do not see each other, read "Work is held up by the grinding machine, which waits on the supplier.": Musa's
   * wait, not his. The header above the tiles already said only his own (theGlanceAsThisReaderMayReadIt); the tile
   * read every wait on the check-in. Set where the header is narrowed: a participant where people do not see each
   * other, and anybody on an evaluation check-in who does not run it.
   */
  ownWaitsOnly?: boolean;
}

/**
 * WHAT MOVED IN ONE ROUND, FOR EVERY SURFACE THAT SAYS SO (review of 1 October 2026, re-d, sales).
 *
 * Session 2's Movement tile said "No target moved this session." while the same page's "since the last
 * round" said 31 million naira moved. The tile read two snapshots; the sentence read `count` against
 * `prevCount`. They are now one read: the count as the round before closed, and the count as this
 * round closed (the live count while it is still open). An objective with no count from the round
 * before has nothing to move from and is left out, never counted from nought.
 */
export async function whatMovedInTheRound(
  prisma: any,
  groundId: string,
  sessionNumber: number,
  objectives: readonly { id: string; count: number }[],
): Promise<Map<string, { from: number; to: number }>> {
  const out = new Map<string, { from: number; to: number }>();
  if (!objectives.length || sessionNumber < 2) return out;
  const [now, before] = await Promise.all([
    prisma.groundObjectiveSnapshot?.findMany?.({ where: { groundId, sessionNumber }, select: { objectiveId: true, count: true } })?.catch?.(() => []) ?? [],
    prisma.groundObjectiveSnapshot?.findMany?.({ where: { groundId, sessionNumber: sessionNumber - 1 }, select: { objectiveId: true, count: true } })?.catch?.(() => []) ?? [],
  ]) as [{ objectiveId: string; count: number }[], { objectiveId: string; count: number }[]];
  const prev = new Map((before ?? []).map((b) => [b.objectiveId, b.count]));
  const current = new Map((now ?? []).map((n) => [n.objectiveId, n.count]));
  for (const o of objectives) {
    const from = prev.get(o.id);
    if (from == null) continue;
    out.set(o.id, { from, to: current.get(o.id) ?? o.count });
  }
  return out;
}

export async function whatThisSessionHolds(prisma: PrismaService, groundId: string, sessionNumber: number, reader: WhoReadsTheMovement): Promise<WhatThisSessionHolds> {
  /* A dependency knows which check-in raised it (sourceCheckInId); the check-in knows its session. */
  const raisedIn = await prisma.checkIn.findMany({ where: { groundId, sessionNumber }, select: { id: true } });
  const [deps, everyObjective, theGround, worried] = await Promise.all([
    raisedIn.length
      ? prisma.groundDependency.findMany({
          where: { groundId, clearedAt: null, status: { in: ['WAITING', 'BLOCKING'] as any }, sourceCheckInId: { in: raisedIn.map((c) => c.id) } },
          select: { status: true, fromParticipantId: true, onParticipantId: true, what: true, onLabel: true },
        })
      : Promise.resolve([] as { status: string; fromParticipantId: string; onParticipantId: string | null; what: string; onLabel: string | null }[]),
    /* Every count, as Since the last round reads them; `targetsSet` counts the ones with a number. */
    prisma.groundObjective.findMany({ where: { groundId }, select: { id: true, count: true, target: true, ownerParticipantId: true, isADecisionAboutAPerson: true } }),
    (prisma as any).ground?.findUnique?.({
      where: { id: groundId },
      select: {
        whoSeesTargets: true, peersVisibleToEachOther: true,
        participants: { select: { id: true, userId: true, partyType: true, email: true, createdAt: true, roleAsDescribed: true, nameGiven: true, organisationGiven: true, user: { select: { firstName: true, lastName: true } } } },
      },
    })?.catch?.(() => null) ?? null,
    raisedIn.length
      ? prisma.recordEntry.findMany({
          where: { disputedAt: null, checkInId: { in: raisedIn.map((c) => c.id) }, type: { in: ['WORRY', 'TENSION'] as any } },
          select: { text: true, participantId: true, saidWordForWord: true },
          orderBy: { createdAt: 'asc' },
        })
      : Promise.resolve([] as { text: string; participantId: string | null; saidWordForWord: boolean | null }[]),
  ]);
  const worries = worried.length;
  /*
   * ONLY THE TARGETS THIS READER MAY READ (review of 1 October 2026). The tile added up every target on
   * the check-in whoever was reading, so a participant where people see only their own numbers could
   * read "+5" when the only target that moved was a colleague's. The same rule the board's own targets
   * use for this reader (whose-number-is-whose-business).
   */
  const objectives = targetsFor(
    (everyObjective ?? []) as any[],
    reader.participantId,
    (theGround as any)?.whoSeesTargets === 'EVERYBODY' ? 'everybody' : 'their own',
    { isLead: reader.isLead },
  ).shown as unknown as { id: string; count: number; target?: number | null }[];
  /*
   * THE FIRST WORRY WHOSE LINE STANDS WHOLE: a first sentence that fits a tile, and whose quotes,
   * if it has any, are the record's words, so the quote rule at the read leaves it as it is (see
   * a-quote-built-at-the-read). Amina's first worry quoted words she typed in other marks; the rule
   * took that sentence out and left a fragment. A worry that would lose a piece is passed over for
   * one that would not, and with none the tile says how many there are.
   */
  /*
   * AND IT IS SAID AS THEIRS (review of 1 October 2026). The tile served a worry in the person's own
   * first-person words with nobody's name: "I still set up the meetings. There are 4 more worries on
   * record, ...". It is now their words in quotation marks after their name ("Amina Yusuf said, "I
   * still set up the meetings.""), "You said, ..." to them, and "A colleague said, ..." where this
   * reader may not be told who. Where a colleague's words are walled from this reader (the person an
   * evaluation is about), only their own worry can be named, and otherwise the tile gives the count.
   * A line with quotation marks of its own is passed over, so no quote is put inside another, and so is
   * a line the record did not keep word for word: only what somebody said in those words is put in
   * quotation marks (a-quote-built-at-the-read), and the tile then gives the count instead.
   */
  const quotable = worried.length ? await theRecordAQuoteMayComeFrom(prisma as any, groundId) : [];
  const parties = (((theGround as any)?.participants ?? []) as any[]);
  const labels = labelsForParties(parties as any);
  const visible = namesVisibleTo(reader.participantId, parties as any, (theGround as any)?.peersVisibleToEachOther ?? undefined);
  const whoSaid = (pid: string | null | undefined): string => {
    if (pid && pid === reader.participantId) return 'You';
    const name = pid ? visible.get(labels.get(pid) ?? '') : null;
    return name?.trim() || 'A colleague';
  };
  const theFirstWorry = worried
    .filter((w: any) => w.saidWordForWord === true)
    .filter((w: any) => !reader.colleaguesWordsWalled || (!!w.participantId && w.participantId === reader.participantId))
    .map((w: any) => ({ who: w.participantId as string | null, line: theFirstSentenceThatFits(w?.text ? cleanText(w.text) : null) }))
    .filter((w): w is { who: string | null; line: string } => !!w.line && !/["“”]/.test(w.line) && quotesBuiltAtTheRead(w.line, quotable) === w.line)
    .map((w) => `${whoSaid(w.who)} said, "${/[.!?]$/.test(w.line) ? w.line : `${w.line}.`}"`)[0] ?? null;
  /* A wait on oneself, by id or as "themselves", is not a wait (request 111 e). */
  const real = deps.filter((d) => !aWaitOnOneself(d))
    /* What they wait on, or what waits on them, and nobody else's (ownWaitsOnly). */
    .filter((d) => !reader.ownWaitsOnly || (!!reader.participantId && (d.fromParticipantId === reader.participantId || d.onParticipantId === reader.participantId)));
  const blocked = real.filter((d) => d.status === 'BLOCKING').length;
  const waiting = real.filter((d) => d.status === 'WAITING').length;
  /* The hard one first, because that is the one a lead acts on. */
  const first = real.find((d) => d.status === 'BLOCKING') ?? real[0] ?? null;
  /* The person it sits with, unless the line already says it: "legal to look at the contract, on
     legal" is the tile telling somebody the same word twice. */
  const what = first?.what?.trim() ?? '';
  const on = first?.onLabel?.trim() ?? '';
  const alreadySaid = !!on && what.toLowerCase().includes(on.toLowerCase());
  const theFirstBlocker = what ? `${what}${on && !alreadySaid ? `, which waits on ${on}` : ''}` : null;

  /* Movement is the difference between two snapshots, and nothing at all when there is only one. A
     session still in play has no snapshot of its own yet, so its live count stands in for it. The one
     read every surface uses: see whatMovedInTheRound. */
  let movedOnTargets: number | null = null;
  let targetsMoved = 0;
  const moves = await whatMovedInTheRound(prisma, groundId, sessionNumber, objectives);
  if (moves.size) {
    movedOnTargets = 0;
    for (const { from, to } of moves.values()) {
      movedOnTargets += to - from;
      /* Every target whose count changed, up or down: the tile says how many moved (request 107 d). */
      if (to !== from) targetsMoved += 1;
    }
  }
  /*
   * EVERY TARGET THIS READER IS LISTED, and how many of them have a number (request 109 c). The tile read "1
   * target is set" above a list of three, because it counted only the ones with a number. Both are said.
   */
  return { movedOnTargets, blocked, waiting, theFirstBlocker, worries, theFirstWorry, targetsSet: objectives.length, targetsWithANumber: objectives.filter((o) => o.target != null).length, targetsMoved };
}

/** The four tiles, from the counts. The one builder both the report and the board call. */
export function atAGlanceTiles(a: {
  agreed: number; stillOpen: number; movedOnTargets: number | null; blocked: number; waiting: number;
  /** How many targets this check-in holds. Nought is "none set"; anything else is "none moved yet". */
  targetsSet?: number;
  /** Of those, how many have a number. Where a caller does not pass it, every target is taken to have one. */
  targetsWithANumber?: number;
  /**
   * How many targets moved this session, up or down. The tile says how many, never a sum and never one
   * target's own change: "+96" from one target was a number with nothing to say what it counted
   * (request 107 d). Where a caller does not pass it, a total that moved is read as one target.
   */
  targetsMoved?: number;
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
  const moved = a.movedOnTargets == null ? 0 : (a.targetsMoved ?? (a.movedOnTargets !== 0 ? 1 : 0));
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
          ? `${peopleSaidDifferentThingsAbout(theDifference)}${a.stillOpen > 1 ? ` ${a.stillOpen - 1} more ${a.stillOpen === 2 ? 'difference is' : 'differences are'} still open.` : ''}`
          : 'The written report reads this as still open.')
        : a.agreed ? 'The written report finds no disagreement.'
          : a.stillToAnswer === 0 ? 'Everybody has answered, and the written report names no agreement and no gap yet.'
            /* And where nobody passed a count, say what is true of the report rather than guess at the
               roster: "not everybody has answered yet" went out on boards where everybody had. */
            : a.stillToAnswer == null ? 'The written report names no agreement and no gap yet.'
              : `${a.stillToAnswer} ${a.stillToAnswer === 1 ? 'person has' : 'people have'} still to answer.`,
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
        : moved > 0 ? `${moved} ${moved === 1 ? 'target' : 'targets'}` : 'None',
      sub: a.movedOnTargets == null
        ? (a.targetsSet ?? 0) > 0
          /* Set, and nothing to subtract from yet: a round has to close before movement exists. */
          ? theTargetsThatAreSet(a.targetsSet ?? 0, a.targetsWithANumber ?? a.targetsSet ?? 0)
          : a.numberWasSaid
            ? 'Somebody named a number, and nothing is tracking it.'
            : 'Nobody has set anything to measure this against.'
        /* "changed", not "moved" (decision 75, item 33): a target that went down changed too. */
        : moved > 0 ? `${moved === 1 ? '1 target' : `${moved} targets`} changed this session.` : 'No target changed this session.',
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
          ? `${blockerAsASentence(theBlocker)}${a.blocked > 1 ? ` ${a.blocked - 1} more ${a.blocked === 2 ? 'is' : 'are'} holding work up.` : ''}`
          : a.blocked === 1 ? 'Something is named as holding work up.' : `${a.blocked} things are named as holding work up.`)
        : (a.waiting ?? 0) > 0
          ? (theBlocker ? `${blockerAsASentence(theBlocker)} Nothing is hard-blocked.` : 'Work is waiting on someone else, and nothing is hard-blocked.')
          : worries
            ? (theWorry
              ? `${theWorry} ${theRestOfTheWorries(worries - 1)}`
              : `${worries} ${worries === 1 ? 'worry is' : 'worries are'} on record, and nobody is waiting on anybody.`)
            : 'Nobody named anything holding work up.',
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
    if (hard) return { ...t, sub: `${blockerAsASentence(name)}${Number(hard[1]) > 1 ? ` ${Number(hard[1]) - 1} more ${Number(hard[1]) === 2 ? 'is' : 'are'} holding work up.` : ''}` };
    if (/^\d+ waiting$/.test(String(t.value))) return { ...t, sub: `${blockerAsASentence(name)} Nothing is hard-blocked.` };
    return t;
  });
}

/**
 * HOW MANY TARGETS ARE SET, AND HOW MANY CAN BE MEASURED (request 109 c). Every target the reader is listed
 * is counted, so the tile never says one where the list shows three; and where some have no number, it says
 * so, because movement is measured on the number.
 */
/*
 * "NO ROUND HAS CLOSED TO MEASURE FROM" WAS WORK JARGON (run-25). It said that a change is measured from one finished
 * round to the next, in words nobody uses. It now says when a change will show, plainly.
 */
export function theTargetsThatAreSet(set: number, withANumber: number): string {
  const are = set === 1 ? '1 target is set' : `${set} targets are set`;
  const whenItShows = (n: number) => `Any change in ${n === 1 ? 'it' : 'them'} will show here after the next check-in.`;
  if (withANumber >= set) return `${are}. ${whenItShows(set)}`;
  if (withANumber === 0) return set === 1 ? `${are}, and it has no number to measure from.` : `${are}, and none of them has a number to measure from.`;
  return `${are}, and ${withANumber} of them ${withANumber === 1 ? 'has' : 'have'} a number. ${whenItShows(withANumber)}`;
}
