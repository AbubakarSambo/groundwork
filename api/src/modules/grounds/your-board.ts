import { howManyCheckIns } from './which-check-in-it-is';
import { wasAQuietClose } from './an-answer-includes-a-refusal';
import { isShut } from './a-ground-that-has-ended';
import { whatNeedsYou, type ListedCheckIn, type Need } from './what-needs-you';
import type { AServedPattern } from '../patterns/who-reads-a-pattern';
import { aStepSaidToYou } from './a-step-said-to-you';
import { asAnAction, asASentence } from './a-promise-as-an-action';
import { aNumberPeopleCanRead, theNumbersPeopleCanRead } from '../board/an-aim-is-a-sentence-about-somebody';
import { theMoneyItCountsIn } from '../reports/a-count-that-moved-is-one-sentence';
import { asTheReader } from './what-a-participant-is-told-about-this';
import { aCommitmentKey } from '../conversation/what-happened-to-what-they-said';
import { whenItWasFor } from './a-day-said-is-read-on-the-day-it-was-said';

/**
 * THE YOU BOARD (C2, U.12): WHAT IS YOURS, ACROSS YOUR CHECK-INS, FOR YOUR EYES ONLY.
 *
 * WHO READS IT. Only the person it is about. There is no way to ask for anybody else's: the read
 * takes the signed-in person and nobody else, and asking for someone else's is refused (see
 * you.controller.ts). A lead, an admin and a colleague are each refused, with a test for each.
 *
 * WHAT IT IS MADE OF. Only what the person may already read, each piece from where they already
 * read it:
 *   - their check-ins, their turns and their own reports come from the check-ins list as
 *     `GroundsService.list()` gives it to them (the one rule for who reads which check-in), cut down
 *     to the check-ins in this organisation that they run or take part in;
 *   - what is expected of them (their own `PersonObjective` rows and the board targets that are
 *     theirs), which the Context page already shows them as "What is expected of you";
 *   - what they are down as doing (`GroundCommitment` rows that are theirs), which the check-in's
 *     own page already shows them and only they may move;
 *   - the one coaching step their last check-in gave them, which Ask Groundwork already tells them;
 *   - their own to-do list, which is theirs alone.
 *
 * WHAT IT NEVER HOLDS. How anybody's answers were rated (no specificity, no confidence, no
 * severity), a label on anybody, anybody else's anything, a lead's private notes, and questions to
 * Ask Groundwork. The engine's own text for this page (where you stand, what Groundwork noticed,
 * coaching followed over time, what you contributed) is the engine's to write (docs/
 * requests-to-engine.md, request 14); until it is served, the page shows none of it.
 *
 * "SOMETHING THAT KEEPS COMING UP" IS DIFFERENT: it goes through the one rule for a pattern
 * (api/src/modules/patterns/who-reads-a-pattern.ts, `servedPatterns`), which the board and the
 * check-in's own record already use, so it is built here rather than waited for. Only this
 * person's own patterns, across every check-in they are in - never a colleague's, and never before
 * three check-ins. See `YourBoardService.forReader`, which selects each check-in's own
 * `patternDetection` rows and serves them through that rule.
 *
 * The sentences are written here, once. Dates are not: the screen says them in the reader's time.
 */

export interface ObjectiveRow {
  id: string;
  groundId: string;
  participantId: string;
  text: string;
  kind: string | null;
  status: string | null;
  authoredBy: string | null;
  dueSaid: string | null;
  createdAt?: Date | string | null;
}

export interface OwnedTargetRow {
  id: string;
  groundId: string;
  name: string;
  target: number | null;
  count: number | null;
}

export interface GroundCommitmentRow {
  id: string;
  groundId: string;
  participantId: string | null;
  text: string;
  whenSaid: string | null;
  status: string | null;
  /** How it was settled: SAID, PROVEN or CONFIRMED (conversation/settled-by-proof.ts). */
  settledBy?: string | null;
  /** When it was settled, done or not done (week 9). What "in the last 4 weeks" reads. */
  settledAt?: Date | string | null;
  createdAt?: Date | string | null;
}

export interface CoachingRow {
  participantId: string;
  currentStep: string | null;
  updatedAt: Date | string | null;
}

export interface TodoRow {
  id: string;
  text: string;
  dueSaid: string | null;
}

export interface YourCheckIn {
  id: string;
  label: string;
  youRunIt: boolean;
  /** One plain sentence about your part in it. */
  line: string;
  to: string;
}

export interface YourGoal {
  id: string;
  says: string;
  checkIn: string;
}

export type SaidState = 'open' | 'kept' | 'not_done';

export interface SomethingYouSaid {
  id: string;
  text: string;
  /** Their own words for when, as said. Never turned into a date. */
  when: string | null;
  checkIn: string;
  state: SaidState;
  /** The word the screen shows beside it. */
  stateSays: string;
  /** How a settled one is known, for the mark: their word, their own document, or the colleague who received it. */
  settledBy?: 'said' | 'proven' | 'confirmed';
  /** When they said it, so their own weekly email can say the day (messages test, 19 October, finding 14). */
  saidAt?: string | null;
}

/**
 * HOW MANY OF THE THINGS YOU SAID YOU WOULD DO YOU KEPT, IN THE LAST FOUR WEEKS (week 9).
 *
 * Private to you: each person's load across check-ins is private (CLAUDE.md), so this is on the You
 * board and nowhere a lead, a colleague or an admin reads. Never a score and never a label; the
 * sentence says what happened, and the screen may show the two numbers.
 */
export interface KeptLately {
  kept: number;
  of: number;
  says: string;
}

export interface YourReport {
  checkIn: string;
  /** When it was written, as a moment. The screen says it in the reader's time. */
  at: string | null;
  to: string;
}

/** A served pattern (`AServedPattern`), with which of the reader's check-ins it came from. */
export interface YourPattern extends AServedPattern {
  checkIn: string;
}

export interface YourBoard {
  checkIns: YourCheckIn[];
  turns: Pick<Need, 'key' | 'title' | 'detail' | 'action'>[];
  goals: YourGoal[];
  saidYoudDo: SomethingYouSaid[];
  todos: { id: string; text: string; when: string | null }[];
  coaching: { says: string; checkIn: string } | null;
  ownReports: YourReport[];
  /** Left null when nothing of yours was settled in the last four weeks. */
  keptLately: KeptLately | null;
  /** "Something that keeps coming up": your own patterns, and nobody else's. Left off when there are none. */
  patterns?: YourPattern[];
  /** Said only to somebody still waiting to be let into the organisation, who is shown no check-in at all. */
  waitingToBeLetIn?: string;
}

export interface BoardReader {
  userId: string;
  organizationId: string;
}

const time = (d: Date | string | null | undefined) => (d ? new Date(d).getTime() : 0);

/** Kinds that are about the whole check-in, not about one person. */
const NOT_ABOUT_ONE_PERSON = new Set(['SUCCESS_DEFINITION']);
/** Kinds that are something to do, rather than something to reach. */
const THINGS_TO_DO = new Set(['COMMITMENT', 'TODO']);

function sessionsLine(done: number): string {
  /* In the board's own word, "check-in", and counted in words as the rest of the page counts (request 97a). */
  if (done === 0) return 'You have not finished a check-in yet.';
  if (done === 1) return 'You have finished one check-in.';
  return `You have finished ${howManyCheckIns(done)} check-ins.`;
}

/**
 * AN AIM STORED AS A SENTENCE ABOUT THE READER IS SAID TO THE READER (B-167). Amina read "Amina is aiming for early success for Wanjiru." on her own You page, her own
 * name in the third person. A sentence that opens with the reader's own first name and "is aiming for" or "is working on" now opens with "You are".
 */
export function aboutTheReaderAsYou(text: string, firstNames: readonly string[]): string {
  const names = firstNames.map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!names.length) return text;
  return text.replace(new RegExp(`^(?:${names.join('|')})\\s+is\\s+(aiming for|working on|working to|trying to)\\b`, 'iu'), (_m, what) => `You are ${what}`);
}

/** A bare field name ("shops"), not a phrase anybody wrote as a sentence: one lowercase word. */
const A_BARE_WORD = /^[a-z][a-z-]*$/;

/**
 * THE GOAL FOR AN OWNED TARGET, AS A SENTENCE (fault A). `t.name` is sometimes a short label an
 * admin typed for the target ("shops") rather than a phrase ("Sales closed"). Read as "shops. You
 * have 0 of 4." that label has no sentence of its own, so a bare word is never put in front of a
 * full stop: the sentence is built from the number and its unit instead ("You have 0 of 4 shops.").
 * A real phrase is kept, only capitalised and given a stop (asASentence), as it already was.
 */
/*
 * AND WITH NUMBERS A PERSON CAN READ (review of 1 October 2026). "N30m disbursed. You have 4000000 of
 * 30000000." is now "30 million naira disbursed. You have 4 million naira of 30 million naira.", and a
 * goal written in the first person ("I'm aiming for ...") is about the reader, whose goal it is.
 */
export function goalFromTarget(t: OwnedTargetRow, firstNames: readonly string[] = []): string {
  const readable = aboutTheReaderAsYou(theNumbersPeopleCanRead(t.name.trim().replace(/[.\s]+$/, '')), firstNames);
  const asYours = asTheReader(readable);
  const name = asYours.toLowerCase() === readable.toLowerCase() ? readable : asYours;
  const hasTarget = t.target !== null && t.target !== undefined;
  const money = theMoneyItCountsIn(name);
  const n = (x: number) => `${aNumberPeopleCanRead(x)}${money && x !== 0 ? ` ${money}` : ''}`;
  /* A target passed is never "You have 49 of 30" (night run 2, Kevin): what there is, and by how much it is past the target. */
  const past = hasTarget && (t.target as number) > 0 && (t.count ?? 0) > (t.target as number);
  if (A_BARE_WORD.test(name) && past) return `You have ${n(t.count ?? 0)} ${name}, ${n((t.count ?? 0) - (t.target as number))} more than the ${n(t.target as number)}.`;
  if (A_BARE_WORD.test(name) && hasTarget) return `You have ${n(t.count ?? 0)} of ${n(t.target as number)} ${name}.`;
  if (!hasTarget) return asASentence(name);
  /* A target of one on a sentence is done or not done; "You have 0 of 1." counted a piece that is not a thing (B-167). */
  if (t.target === 1 && !A_BARE_WORD.test(name)) return `${asASentence(name)} ${(t.count ?? 0) >= 1 ? 'You have reached it.' : 'You have not reached it yet.'}`;
  if (past) return `${asASentence(name)} You have ${n(t.count ?? 0)} so far, ${n((t.count ?? 0) - (t.target as number))} more than the ${n(t.target as number)}.`;
  return `${asASentence(name)} You have ${n(t.count ?? 0)} of ${n(t.target as number)}.`;
}

/** Four weeks, as the prototype counts them ("in the last 4 weeks", C2 you-board-daniel.txt). */
export const THE_LAST_FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;

const INWORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/**
 * THE SENTENCE, IN THE PROTOTYPE'S WORDS: "In the last 4 weeks, you kept 11 of your 20 commitments."
 * (C2 you-board-daniel.txt, "Where you stand"). All in words or all in figures in one sentence, the
 * rule of reports/the-picture-in-plain-sentences.ts: up to ten, words ("In the last four weeks, you
 * kept nine of your ten commitments."); past ten, figures.
 */
export function keptLatelySays(kept: number, of: number): string {
  const inWords = of <= 10;
  const n = (x: number) => (inWords ? INWORDS[x] : String(x));
  const weeks = inWords ? 'four' : '4';
  if (of === 1) return kept === 1 ? `In the last ${weeks} weeks, you kept your one commitment.` : `In the last ${weeks} weeks, you did not keep your one commitment.`;
  /* Two is "both" and "either", never "all two" or "none of your two" (the reviewer's read). */
  if (of === 2 && kept === 2) return `In the last ${weeks} weeks, you kept both of your commitments.`;
  if (of === 2 && kept === 0) return `In the last ${weeks} weeks, you did not keep either of your two commitments.`;
  if (kept === 0) return `In the last ${weeks} weeks, you kept none of your ${n(of)} commitments.`;
  if (kept === of) return `In the last ${weeks} weeks, you kept all ${n(of)} of your commitments.`;
  return `In the last ${weeks} weeks, you kept ${n(kept)} of your ${n(of)} commitments.`;
}

/**
 * WHICH COMMITMENTS COUNT: yours, settled done or not done in the 28 days before now. "In the last 4
 * weeks" reads the day it was settled (`settledAt`), the column week 9 added for exactly this count
 * and that both ways of settling stamp (the check-in's own words, and the person by hand). A row
 * settled before that column existed has no date of settling, so the day it was made stands in.
 * Open ones count in neither number, and a dropped one is not a miss.
 *
 * LEAVE (week 23, "nothing counts against them"). A promise not kept is not a miss when any approved
 * leave fell while it was open: from the day it was made to the day it was settled. Reading only the
 * day it was made counted a promise made on Friday, due while the person was away all the next week
 * and settled "not done" when they came back, as a miss.
 */
export function keptLately(
  rows: readonly { status: string | null; createdAt?: Date | string | null; settledAt?: Date | string | null }[],
  now: Date,
  /** Approved leave, as whole days (week 23): a promise not kept while the person was on leave is not a miss. */
  leave: readonly { from: Date; to: Date }[] = [],
): KeptLately | null {
  const from = now.getTime() - THE_LAST_FOUR_WEEKS_MS;
  let kept = 0;
  let of = 0;
  for (const r of rows) {
    if (r.status !== 'DONE' && r.status !== 'NOT_DONE') continue;
    const made = time(r.createdAt);
    const t = time(r.settledAt) || made;
    if (!t || t < from || t > now.getTime()) continue;
    const openFrom = made || t;
    if (r.status === 'NOT_DONE' && leave.some((l) => openFrom <= l.to.getTime() && t >= l.from.getTime())) continue;
    of++;
    if (r.status === 'DONE') kept++;
  }
  return of ? { kept, of, says: keptLatelySays(kept, of) } : null;
}

/**
 * THE SAME COUNT, FOR THE ENGINE'S OWN USE (week 10). suggestions/a-suggestion-reached-from-the-
 * record.ts is handed this pair to decide whether a "support" suggestion is worth reaching from
 * the record - it never computes the count itself, and the count it is handed never reaches
 * anybody but the person it belongs to (a-suggestion-reached-from-the-record.ts never writes it
 * into a lead-facing field; decision 24, "the count stays the person's alone").
 *
 * A differently named wrapper, so kept-in-the-last-four-weeks-is-yours-alone.spec.ts's whole-repo
 * scan for the identifiers `keptLately` and `keptLatelySays` still finds them nowhere but this
 * file - the rule it proves ("nothing outside the You board works out... the count") is about who
 * computes it, and this still computes it here and nowhere else, once, reused rather than
 * duplicated.
 */
export function commitmentsKeptInTheLastFourWeeks(
  rows: readonly { status: string | null; createdAt?: Date | string | null; settledAt?: Date | string | null }[],
  now: Date = new Date(),
  leave: readonly { from: Date; to: Date }[] = [],
): { kept: number; of: number } | null {
  const r = keptLately(rows, now, leave);
  return r ? { kept: r.kept, of: r.of } : null;
}

/**
 * THE SAME SENTENCE, FOR THE PERSON'S OWN SUGGESTION (week 10). "Where you stand" in the prototype
 * opens with exactly the You board's sentence, so the suggestion the person reads says their count
 * the same way, from here, rather than a second wording of it. Only ever handed to the person.
 */
export function theCountSaidToThePerson(kept: number, of: number): string {
  return keptLatelySays(kept, of);
}

const SETTLED_BY: Record<string, 'said' | 'proven' | 'confirmed'> = { SAID: 'said', PROVEN: 'proven', CONFIRMED: 'confirmed' };

/**
 * WHEN, IN ONE FORM (screens request 96). The record holds the same kind of answer as "on 9 October"
 * on one row and "9 October" on the next, because it is a reading of what was said. The prototype
 * draws it bare ("Friday", "This Friday", C2 you-board screens), so a leading "on" is dropped
 * wherever the You board serves a time: promises, expectations and to-dos alike. Nothing else of
 * the person's words is changed.
 */
export function whenInOneForm(said: string | null | undefined): string | null {
  const t = String(said ?? '').trim().replace(/^on\s+/i, '').trim();
  return t || null;
}

const wordsOf = (text: string, when: string | null) => ` ${aCommitmentKey(text, when)} `;

/**
 * THE SAME PROMISE, SAID SHORT AND THEN SAID WHOLE (screens request 96). "I will deliver the Tuskys
 * cookers" and "I will deliver the Tuskys cookers on 9 October and ask for the signed order form that
 * day." are one promise kept as two rows. Two open promises in one check-in are the same when the
 * words of one (three or more of them) sit whole inside the other and they do not name two
 * different times. The fuller one is served, in its own words, with the time of either.
 */
function theFullerOf<T extends { text: string; when: string | null; open: boolean; groundId: string }>(a: T, b: T): T | null {
  if (!a.open || !b.open || a.groundId !== b.groundId) return null;
  const x = aCommitmentKey(a.text, a.when);
  const y = aCommitmentKey(b.text, b.when);
  const [short, long, fuller, shorter] = x.length <= y.length ? [x, y, b, a] : [y, x, a, b];
  if (short.split(' ').length < 3 || !` ${long} `.includes(` ${short} `)) return null;
  if (a.when && b.when && whenInOneForm(a.when)!.toLowerCase() !== whenInOneForm(b.when)!.toLowerCase()) return null;
  return { ...fuller, when: fuller.when ?? shorter.when };
}

const STATE_SAYS: Record<SaidState, string> = { open: 'Open', kept: 'Kept', not_done: 'Not done' };

export function yourBoard(
  list: ListedCheckIn[],
  reader: BoardReader,
  rows: {
    objectives: ObjectiveRow[];
    ownedTargets: OwnedTargetRow[];
    commitments: GroundCommitmentRow[];
    coaching: CoachingRow[];
    todos: TodoRow[];
    /** The reader's own approved leave, whole days (week 23). Nothing from those days counts against them. */
    leave?: { from: Date; to: Date }[];
  },
  now: Date = new Date(),
): YourBoard {
  /* Only this organisation's check-ins that you run or take part in. An admin's list carries every
     check-in in the organisation; the ones they only oversee are not theirs, so they are not here. */
  const mine = list.filter((g) => {
    if (g.organizationId !== reader.organizationId) return false;
    if ((g.status ?? '') === 'AWAITING_APPROVAL' || (g.status ?? '') === 'DECLINED') return false;
    const inIt = (g.participants ?? []).some((p) => p.userId && p.userId === reader.userId);
    return inIt || g.initiatorId === reader.userId;
  });

  const labelOf = new Map(mine.map((g) => [g.id, g.label]));
  const myParticipantIds = new Set<string>();
  for (const g of mine) {
    for (const p of g.participants ?? []) if (p.userId === reader.userId) myParticipantIds.add(p.id);
  }
  const myFirstNames = [...new Set(mine.flatMap((g) => (g.participants ?? []).filter((p) => p.userId === reader.userId).map((p) => (p.user?.firstName ?? '').trim()).filter(Boolean)))];
  /* A row counts only when it is in one of your check-ins AND belongs to your own place in it. */
  const isMine = (groundId: string, participantId: string | null) =>
    labelOf.has(groundId) && !!participantId && myParticipantIds.has(participantId);

  const checkIns: YourCheckIn[] = [];
  const ownReports: (YourReport & { t: number })[] = [];
  for (const g of mine) {
    const me = (g.participants ?? []).find((p) => p.userId === reader.userId) ?? null;
    const youRunIt = g.initiatorId === reader.userId;
    const done = me
      /* Finished only when they answered it (night quality run 2): Jared read "You have finished four check-ins." with two answered,
         because two closed by the clock with nothing said. */
      ? (g.checkIns ?? []).filter((c) => !c.isSetup && c.participantId === me.id && c.status === 'COMPLETED' && !wasAQuietClose(c as any))
      : [];
    const parts = [youRunIt ? 'You run this check-in.' : null, me ? sessionsLine(done.length) : null].filter(Boolean);
    checkIns.push({ id: g.id, label: g.label, youRunIt, line: parts.join(' '), to: `/grounds/${g.id}` });

    const last = [...done].sort((a, b) => time(b.completedAt) - time(a.completedAt))[0];
    if (last) {
      ownReports.push({
        checkIn: g.label,
        at: last.completedAt ? new Date(last.completedAt).toISOString() : null,
        to: `/checkin/${last.id}/report`,
        t: time(last.completedAt),
      });
    }
  }
  /* Open check-ins first, then finished ones; within each, the order the list gave. */
  const over = new Set(mine.filter((g) => isShut(g.status) || !!g.closedAt || !!g.resolvedAt).map((g) => g.id));
  checkIns.sort((a, b) => Number(over.has(a.id)) - Number(over.has(b.id)));

  /* Your turns: the same "your turn" Today shows, so the two pages never disagree. */
  const turns = whatNeedsYou(mine, { userId: reader.userId, organizationId: reader.organizationId }, [], now)
    .needs.filter((n) => n.key.startsWith('turn-'))
    .map(({ key, title, detail, action }) => ({ key, title, detail, action }));

  /* What is expected of you: open, about you alone, and not a thing you said you would do. */
  const goals: YourGoal[] = [];
  for (const o of rows.objectives) {
    if (!isMine(o.groundId, o.participantId)) continue;
    if ((o.status ?? 'OPEN') !== 'OPEN') continue;
    if (o.kind && NOT_ABOUT_ONE_PERSON.has(o.kind)) continue;
    if (o.kind && THINGS_TO_DO.has(o.kind) && o.authoredBy === 'self') continue;
    /*
     * WRITTEN TO THE READER, like every other goal on this page (request 154, item 5).
     *
     * A goal taken from a target already went through `asTheReader` inside `goalFromTarget`; one
     * taken from an objective did not, so a goal written ABOUT somebody by their lead arrived in
     * the first person beside a goal that said "you".
     *
     * BUT NOT A GOAL THE PERSON WROTE THEMSELVES, and that is the whole of the care here. Hafsah,
     * 26 September: "People's own words stay exactly as they said them. Never change a quote to
     * improve a score. Only fix what Groundwork itself writes." A goal with `authoredBy: 'self'`
     * is the person's own sentence - "I want it at 162,000 by December." stays exactly that, and
     * a test has pinned it since before this request.
     *
     * So the rewrite is on what somebody else wrote about them, which is the half that was wrong.
     * It leaves part of request 154 item 5 standing on purpose: where a person's own words sit
     * beside a sentence addressed to them, the two still read differently, and that is a wording
     * decision for Hafsah rather than a licence to edit what somebody said.
     */
    const text = (o.text ?? '').trim();
    const theirOwnWords = o.authoredBy === 'self';
    if (text) goals.push({ id: o.id, says: asASentence(theirOwnWords ? text : aboutTheReaderAsYou(asTheReader(text), myFirstNames)), checkIn: labelOf.get(o.groundId)! });
  }
  for (const t of rows.ownedTargets) {
    if (!labelOf.has(t.groundId) || !(t.name ?? '').trim()) continue;
    goals.push({ id: t.id, says: goalFromTarget(t, myFirstNames), checkIn: labelOf.get(t.groundId)! });
  }

  /* What you said you would do, in your own check-ins. Dropped ones are gone, as they are elsewhere.
     The same promise sometimes lives twice, in two different places - a GroundCommitment and a
     self-authored PersonObjective both saying "I will plan shorter routes", one of them fuller and
     dated - so the two sources below are merged through the one `addSaid`, never kept apart.
     Merged (1 October) with the engine's own request 96 work: one form for every date
     (whenInOneForm), the same promise matched by aCommitmentKey or theFullerOf, and settled
     beating open. Matching reads the person's own words; what is shown is
     the action form (asAnAction). */
  const said: (SomethingYouSaid & { t: number; open: boolean; groundId: string })[] = [];
  const rawOf: string[] = [];
  const mineCommitments: GroundCommitmentRow[] = [];
  const keysOf: string[] = [];
  /* The engine's rules for one promise said twice (request 96), applied across both places a
     promise is kept: the same words with the same time are one promise, and the settled copy wins;
     a short open copy inside a fuller open copy, with no different time, is the fuller one, with
     the short one's time if it has none. Two different promises are never merged, and a settled
     promise is never folded into an open one. Matching reads the person's own words. */
  const addSaid = (item: SomethingYouSaid & { t: number; open: boolean; groundId: string }, raw: string, whenSaid?: string | null) => {
    const key = `${item.groundId}\u0000${aCommitmentKey(raw, whenSaid)}`;
    const same = keysOf.indexOf(key);
    if (same !== -1) {
      const settledBeatsOpen = said[same].state === 'open' && item.state !== 'open';
      const sameWayFuller = (said[same].state === 'open') === (item.state === 'open') && raw.length > rawOf[same].length;
      if (settledBeatsOpen || sameWayFuller) { said[same] = { ...item, when: item.when ?? said[same].when }; rawOf[same] = raw; }
      return;
    }
    const fuller = said.findIndex((s, i) => !!theFullerOf({ ...s, text: rawOf[i] }, { ...item, text: raw }));
    if (fuller !== -1) {
      const one = theFullerOf({ ...said[fuller], text: rawOf[fuller] }, { ...item, text: raw })!;
      const fromNew = one.id === item.id;
      const base = fromNew ? item : said[fuller];
      said[fuller] = { ...base, when: one.when };
      rawOf[fuller] = fromNew ? raw : rawOf[fuller];
      keysOf[fuller] = key;
      return;
    }
    said.push(item); rawOf.push(raw); keysOf.push(key);
  };
  for (const c of rows.commitments) {
    if (!isMine(c.groundId, c.participantId)) continue;
    mineCommitments.push(c);
    const state: SaidState | null =
      c.status === 'DONE' ? 'kept' : c.status === 'NOT_DONE' ? 'not_done' : c.status === 'DROPPED' ? null : 'open';
    const rawText = (c.text ?? '').trim();
    if (!state || !rawText) continue;
    const checkIn = labelOf.get(c.groundId)!;
    const by = state !== 'open' && c.settledBy ? SETTLED_BY[c.settledBy] : undefined;
    addSaid({ id: c.id, text: asAnAction(rawText), when: state === 'open' ? whenItWasFor(c.whenSaid, c.createdAt, now) : whenInOneForm(c.whenSaid), checkIn, state, stateSays: STATE_SAYS[state], ...(by ? { settledBy: by } : {}), saidAt: c.createdAt ? new Date(c.createdAt).toISOString() : null, t: time(c.createdAt), open: state === 'open', groundId: c.groundId }, rawText, c.whenSaid);
  }
  for (const o of rows.objectives) {
    if (!isMine(o.groundId, o.participantId)) continue;
    if (!o.kind || !THINGS_TO_DO.has(o.kind) || o.authoredBy !== 'self') continue;
    const state: SaidState | null = (o.status ?? 'OPEN') === 'OPEN' ? 'open' : o.status === 'MET' ? 'kept' : null;
    const rawText = (o.text ?? '').trim();
    if (!state || !rawText) continue;
    addSaid({ id: o.id, text: asAnAction(rawText), when: whenInOneForm(o.dueSaid), checkIn: labelOf.get(o.groundId)!, state, stateSays: STATE_SAYS[state], saidAt: o.createdAt ? new Date(o.createdAt).toISOString() : null, t: time(o.createdAt), open: state === 'open', groundId: o.groundId }, rawText, o.dueSaid);
  }
  const order: Record<SaidState, number> = { open: 0, kept: 1, not_done: 2 };
  said.sort((a, b) => order[a.state] - order[b.state] || a.t - b.t);

  /* The one step your latest check-in gave you. One at a time, never a list. */
  const step = rows.coaching
    .filter((c) => myParticipantIds.has(c.participantId) && (c.currentStep ?? '').trim())
    .sort((a, b) => time(b.updatedAt) - time(a.updatedAt))[0];
  let coaching: YourBoard['coaching'] = null;
  const saidToYou = step ? aStepSaidToYou(step.currentStep) : null;
  if (step && saidToYou) {
    const g = mine.find((x) => (x.participants ?? []).some((p) => p.id === step.participantId));
    coaching = { says: saidToYou, checkIn: g?.label ?? '' };
  }

  return {
    checkIns,
    turns,
    goals,
    saidYoudDo: said.map(({ t: _t, open: _o, groundId: _g, ...s }) => s),
    todos: rows.todos
      .filter((t) => (t.text ?? '').trim())
      .map((t) => ({ id: t.id, text: t.text.trim(), when: whenInOneForm(t.dueSaid) })),
    coaching,
    ownReports: ownReports.sort((a, b) => b.t - a.t).map(({ t: _t, ...r }) => r),
    keptLately: keptLately(mineCommitments, now, rows.leave ?? []),
  };
}


/**
 * THE PART OF YOUR OWN BOARD THAT YOUR WEEKLY EMAIL SAYS (decision 109, spec 25).
 *
 * Cut from the board served to you and nowhere else, so that the count of what you kept stays worked out in this file alone (the guard in
 * kept-in-the-last-four-weeks-is-yours-alone.spec.ts reads that). It only repeats what is already on your own board, for you.
 */
export function theOwnWeekOf(board: (Partial<YourBoard> & { askedOfYou?: { items?: { who: string | null; what: string; checkIn: string }[] } | null }) | null | undefined): {
  kept: { kept: number; of: number } | null;
  open: { text: string; checkIn: string; saidAt?: string | null }[];
  askedOfYou: { who: string | null; what: string; checkIn: string }[];
} {
  return {
    kept: board?.keptLately ? { kept: board.keptLately.kept, of: board.keptLately.of } : null,
    open: (board?.saidYoudDo ?? []).filter((s) => s.state === 'open').map((s) => ({ text: s.text, checkIn: s.checkIn, ...(s.saidAt ? { saidAt: s.saidAt } : {}) })),
    askedOfYou: (board?.askedOfYou?.items ?? []).map((i) => ({ who: i.who ?? null, what: i.what, checkIn: i.checkIn })),
  };
}


/**
 * THE COUNT OF WHAT YOU KEPT, FOR YOUR OWN WEEKLY EMAIL (decision 109, spec 25), over the rows of the check-ins the email is about. Kept here so that the
 * count is worked out in this file alone (the guard in kept-in-the-last-four-weeks-is-yours-alone.spec.ts). It is yours and goes to you.
 */
/**
 * WHICH THINGS YOU KEPT, IN YOUR OWN WORDS, for your own weekly email (messages test, 19 October, finding 14: "You kept the one thing you
 * said you would do" said not which). The same rows and window as the count: yours, settled done in the last four weeks.
 */
export function theOwnKeptWords(
  rows: readonly { status: string | null; text?: string | null; createdAt?: Date | string | null; settledAt?: Date | string | null }[],
  now: Date = new Date(),
): string[] {
  const from = now.getTime() - THE_LAST_FOUR_WEEKS_MS;
  return rows
    .filter((r) => r.status === 'DONE' && !!String(r.text ?? '').trim())
    .filter((r) => { const t = time(r.settledAt) || time(r.createdAt); return !!t && t >= from && t <= now.getTime(); })
    .map((r) => asAnAction(String(r.text).trim()));
}

export function theOwnKept(
  rows: readonly { status: string | null; createdAt?: Date | string | null; settledAt?: Date | string | null }[],
  now: Date = new Date(),
): { kept: number; of: number } | null {
  const r = keptLately(rows, now, []);
  return r ? { kept: r.kept, of: r.of } : null;
}
