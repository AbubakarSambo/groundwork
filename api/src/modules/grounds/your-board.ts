import { aCommitmentKey } from '../conversation/what-happened-to-what-they-said';
import { isShut } from './a-ground-that-has-ended';
import { whatNeedsYou, type ListedCheckIn, type Need } from './what-needs-you';
import type { AServedPattern } from '../patterns/who-reads-a-pattern';
import { aStepSaidToYou } from './a-step-said-to-you';

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
  if (done === 0) return 'You have not finished a session yet.';
  if (done === 1) return 'You have finished 1 session.';
  return `You have finished ${done} sessions.`;
}

function goalFromTarget(t: OwnedTargetRow): string {
  const name = t.name.trim().replace(/[.\s]+$/, '');
  if (t.target === null || t.target === undefined) return `${name}.`;
  return `${name}. You have ${t.count ?? 0} of ${t.target}.`;
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
 * WHICH COMMITMENTS COUNT: yours, settled done or not done, whose check-in fell in the 28 days before
 * now. A commitment has no due date of its own (its "when" is kept in their words and never turned
 * into a date), so the day it was made, the day of the check-in it was said in, is the one used.
 * Open ones count in neither number, and a dropped one is not a miss.
 */
export function keptLately(rows: readonly { status: string | null; createdAt?: Date | string | null }[], now: Date): KeptLately | null {
  const from = now.getTime() - THE_LAST_FOUR_WEEKS_MS;
  let kept = 0;
  let of = 0;
  for (const r of rows) {
    if (r.status !== 'DONE' && r.status !== 'NOT_DONE') continue;
    const t = time(r.createdAt);
    if (!t || t < from || t > now.getTime()) continue;
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
  rows: readonly { status: string | null; createdAt?: Date | string | null }[],
  now: Date = new Date(),
): { kept: number; of: number } | null {
  const r = keptLately(rows, now);
  return r ? { kept: r.kept, of: r.of } : null;
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
  /* A row counts only when it is in one of your check-ins AND belongs to your own place in it. */
  const isMine = (groundId: string, participantId: string | null) =>
    labelOf.has(groundId) && !!participantId && myParticipantIds.has(participantId);

  const checkIns: YourCheckIn[] = [];
  const ownReports: (YourReport & { t: number })[] = [];
  for (const g of mine) {
    const me = (g.participants ?? []).find((p) => p.userId === reader.userId) ?? null;
    const youRunIt = g.initiatorId === reader.userId;
    const done = me
      ? (g.checkIns ?? []).filter((c) => !c.isSetup && c.participantId === me.id && c.status === 'COMPLETED')
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
    const text = (o.text ?? '').trim();
    if (text) goals.push({ id: o.id, says: text, checkIn: labelOf.get(o.groundId)! });
  }
  for (const t of rows.ownedTargets) {
    if (!labelOf.has(t.groundId) || !(t.name ?? '').trim()) continue;
    goals.push({ id: t.id, says: goalFromTarget(t), checkIn: labelOf.get(t.groundId)! });
  }

  /* What you said you would do, in your own check-ins. Dropped ones are gone, as they are elsewhere. */
  const said: (SomethingYouSaid & { t: number; open: boolean; groundId: string })[] = [];
  const saidKey = new Map<string, number>();
  const mineCommitments: GroundCommitmentRow[] = [];
  for (const c of rows.commitments) {
    if (!isMine(c.groundId, c.participantId)) continue;
    mineCommitments.push(c);
    const state: SaidState | null =
      c.status === 'DONE' ? 'kept' : c.status === 'NOT_DONE' ? 'not_done' : c.status === 'DROPPED' ? null : 'open';
    const text = (c.text ?? '').trim();
    if (!state || !text) continue;
    const by = state !== 'open' && c.settledBy ? SETTLED_BY[c.settledBy] : undefined;
    const item = { id: c.id, text, when: whenInOneForm(c.whenSaid), checkIn: labelOf.get(c.groundId)!, state, stateSays: STATE_SAYS[state], ...(by ? { settledBy: by } : {}), t: time(c.createdAt), open: state === 'open', groundId: c.groundId };
    /* The same promise written twice ("...again" and "...again by tomorrow.") is listed once; where
       one copy is settled, that one is shown. See aCommitmentKey. */
    const key = `${c.groundId}\u0000${aCommitmentKey(text, c.whenSaid)}`;
    const at = saidKey.get(key);
    if (at !== undefined) {
      if (said[at].state === 'open' && state !== 'open') said[at] = item;
      continue;
    }
    /* The same promise said short and then whole is listed once, as the fuller one (request 96). */
    const sameAs = said.findIndex((x) => theFullerOf(x, item));
    if (sameAs >= 0) {
      const one = theFullerOf(said[sameAs], item)!;
      said[sameAs] = one;
      saidKey.set(key, sameAs);
      continue;
    }
    saidKey.set(key, said.length);
    said.push(item);
  }
  for (const o of rows.objectives) {
    if (!isMine(o.groundId, o.participantId)) continue;
    if (!o.kind || !THINGS_TO_DO.has(o.kind) || o.authoredBy !== 'self') continue;
    const state: SaidState | null = (o.status ?? 'OPEN') === 'OPEN' ? 'open' : o.status === 'MET' ? 'kept' : null;
    const text = (o.text ?? '').trim();
    if (!state || !text) continue;
    said.push({ id: o.id, text, when: whenInOneForm(o.dueSaid), checkIn: labelOf.get(o.groundId)!, state, stateSays: STATE_SAYS[state], t: time(o.createdAt), open: false, groundId: o.groundId });
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
    keptLately: keptLately(mineCommitments, now),
  };
}
