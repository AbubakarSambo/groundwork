import { ALIGNMENT_FEED_ONLY_CODES, BAD_FAITH_CODES, CARRYING_CODES, POSITIVE_CODES, whatToAskAbout } from './pattern-library';
import { PATTERNS_ARE_SERVED } from './patterns-are-served';
import { plainNameOf, type PlainKind } from './plain-pattern-names';
import { plainVoice } from './plain-voice';
import { theFirstNameFrom } from '../reports/a-title-is-not-a-first-name';

/**
 * WHO READS A PATTERN, WHEN, AND IN WHAT WORDS. THE ONE PLACE THAT DECIDES IT.
 *
 * Hafsah, 27 September 2026: "Patterns are built, so they are not hidden at release. They stay
 * switched off only until they follow Hafsah's rules." Every road from `pattern_detections` to a page
 * - the board's section, the ground page's feed, a person's own record, the session report, the
 * coaching note, the lead's probe list and the judgement's material - goes through
 * `servedPatterns`, so each rule below is kept once rather than remembered by each builder. The
 * capability check found all of them broken on the live boards (docs/capability-check.md, section 7).
 *
 *   1. PLAIN NAMES ONLY (decision 19). The heading is the plain name from plain-pattern-names.ts. No
 *      internal name, no code, no library signal is ever in what this returns; the engine's own
 *      sentence is kept only when it holds none of those. E4, F5 and codes the library does not know
 *      have no plain name, so they are never served.
 *
 *   2. NEVER A LABEL BESIDE A NAME. What is served is a sentence of what happened in the work, with
 *      the participant it is about carried as an id for the page to place, never a string that joins
 *      a person's name to a pattern. There is no `label`, `code` or `who` field.
 *
 *   3. A PARTICIPANT READS ONLY THEIR OWN. A colleague's pattern is never served to a participant, on
 *      any page, named or not: on a team of four, the observation names them as surely as a name.
 *      Only somebody who runs the check-in (its lead, whoever set it up, an admin of its organisation)
 *      reads anybody else's.
 *
 *   4. THREE PERIODS (decision 8). Counted from `seenInSessions`, every period it was really seen in,
 *      gaps included - never from `status`. SURFACED is the detector's word and is not the same rule:
 *      good news is SURFACED after one period, and the lead's board carried "Credits somebody else by
 *      name" after one session. Nothing, good or bad, is shown before three.
 *
 *   5. THE PERSON SEES IT FIRST, AND CAN ANSWER (decisions 6 and 13: "It tells the person first").
 *      The person it is about reads it as soon as it has three periods, with a way to say what is
 *      behind it. Whoever runs the check-in reads it only after the person has had their turn:
 *        - as soon as the person has answered, with their answer beside it; or
 *        - three days after the person was first shown it, if they have not answered; or
 *        - seven days after it reached three periods, if the person has never opened a page that
 *          shows it, so it cannot wait forever on somebody who does not look.
 *      Three days is long enough to read it and say something, and short enough that the lead
 *      does not learn about it a period late; seven days is one weekly period, after which the next
 *      check-in would find it anyway. Without the timestamps a row is not served to the lead at all.
 */

export const PERIODS_BEFORE_A_PATTERN_IS_SHOWN = 3;
/** How long the person has to answer after they were first shown it, before the lead reads it. */
export const DAYS_THE_PERSON_HAS_TO_ANSWER = 3;
/** How long after it was ready the lead reads it anyway, when the person never opened it. */
export const DAYS_BEFORE_IT_REACHES_THE_LEAD_UNOPENED = 7;
const DAY = 24 * 60 * 60 * 1000;

/** The stored row, as much of it as the rules read. */
export interface APatternRow {
  id: string;
  participantId: string;
  code: string;
  observationText: string | null;
  seenInSessions?: number[] | null;
  periodsObserved?: number | null;
  readyAt?: Date | string | null;
  shownToPersonAt?: Date | string | null;
  personAnswer?: string | null;
  personAnsweredAt?: Date | string | null;
}

/** The columns every road selects, so none of them can forget the ones rule 5 reads. */
export const PATTERN_ROW_SELECT = {
  id: true, participantId: true, code: true, observationText: true, periodsObserved: true, seenInSessions: true,
  readyAt: true, shownToPersonAt: true, personAnswer: true, personAnsweredAt: true,
} as const;

export interface APatternReader {
  /** The reader's own participant row in this check-in, when they take part in it. */
  participantId: string | null;
  /** Leads it, set it up, or is an admin of the organisation it belongs to. */
  runsIt: boolean;
}

export interface AServedPattern {
  id: string;
  /** Whose work it is about, for the page to place under that person. Never joined to a name here. */
  participantId: string;
  /** True when the reader is the person it is about. */
  yours: boolean;
  kind: PlainKind;
  /** The plain name: what the record shows happening. */
  heading: string;
  /** The engine's own sentence about the work, when it holds no internal name or code. */
  whatHappened: string | null;
  /** The sessions it came up in, in order. */
  sessions: number[];
  /** How often, as a sentence. */
  howOften: string;
  /**
   * For whoever runs the check-in, the library's question to put to the person, which is the next
   * move a pattern is worth: asking, never deciding. Null for the person themselves, who is asked
   * what is behind it instead.
   */
  askThem: string | null;
  /** What the person said is behind it, in their own words, for them and for whoever runs it. */
  theirWords: string | null;
  /** Only the person it is about can answer it. */
  canAnswer: boolean;
  /** Who else reads it, and when, as a sentence for this reader. */
  whoSeesIt: string;
}

/** The names a sentence needs: the lead's, for the person, and the person's first name, for the lead. */
export interface WhoIsWho {
  leadName?: string | null;
  /** The lead's own participant id in this check-in, so a pattern about the lead can be told apart from one about somebody else. */
  leadParticipantId?: string | null;
  firstNameOf?: (participantId: string) => string | null;
}

/** The headings the page puts over the list, from the prototype's screens. */
export const WHAT_KEEPS_COMING_UP = {
  forThePerson: 'Something that keeps coming up. About your part in the work.',
  forTheLead: 'What keeps coming up. Each one is named only after it has come up in three check-ins, never after one, and each one describes the work.',
};

const EVERY_CODE = [...POSITIVE_CODES, ...CARRYING_CODES, ...BAD_FAITH_CODES];
const INTERNAL_NAMES = EVERY_CODE.map((c) => c.name.toLowerCase());
const LIBRARY_SIGNALS = EVERY_CODE.map((c) => c.signal.toLowerCase());

/** Every period it was really seen in, gaps included, and never fewer than the consecutive run. */
export function periodsSeen(row: Pick<APatternRow, 'seenInSessions' | 'periodsObserved'>): number {
  const distinct = new Set((row.seenInSessions ?? []).filter((n) => Number.isFinite(n))).size;
  return Math.max(distinct, row.periodsObserved ?? 0);
}

export function hasBeenSeenInThreePeriods(row: Pick<APatternRow, 'seenInSessions' | 'periodsObserved'>): boolean {
  return periodsSeen(row) >= PERIODS_BEFORE_A_PATTERN_IS_SHOWN;
}

/**
 * The engine's sentence, when a person may read it. The archive prefix from startNewPeriod and the
 * courtroom opener come off; a sentence that names a pattern by its internal name or code, or is the
 * library's own signal, is dropped whole rather than edited, because a half-edited sentence about
 * somebody's work is worse than none.
 */
export function whatHappenedIn(observation: string | null | undefined): string | null {
  let s = String(observation ?? '').replace(/^(?:\s*\[period=\d+\]\s*)+/, '').trim();
  if (!s) return null;
  s = plainVoice(s).trim();
  const lower = s.toLowerCase();
  if (INTERNAL_NAMES.some((n) => lower.includes(n))) return null;
  if (LIBRARY_SIGNALS.some((sig) => lower.includes(sig))) return null;
  if (/\b(?:[RMCADBKEF]\d{1,2}|LOW_SPEC_MULTI_DIM|COLLUSION_RISK|CONCENTRATION_RISK|ARC_[A-Z_]+)\b/.test(s)) return null;
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

function andList(xs: string[]): string {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

export function howOftenItCameUp(row: Pick<APatternRow, 'seenInSessions' | 'periodsObserved'>, yours: boolean): string {
  const n = periodsSeen(row);
  const sessions = [...new Set(row.seenInSessions ?? [])].sort((a, b) => a - b).map(String);
  const whose = yours ? `${n} of your check-ins` : `${n} check-ins`;
  return sessions.length >= n
    ? `This came up in ${whose}, in sessions ${andList(sessions)}.`
    : `This came up in ${whose}.`;
}

const at = (d: Date | string | null | undefined): number | null => {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
};

/** Whether somebody other than the person may read it yet: rule 5. */
export function thePersonHasHadTheirTurn(row: APatternRow, now: Date = new Date()): boolean {
  if (at(row.personAnsweredAt) !== null && (row.personAnswer ?? '').trim()) return true;
  const shown = at(row.shownToPersonAt);
  if (shown !== null && now.getTime() - shown >= DAYS_THE_PERSON_HAS_TO_ANSWER * DAY) return true;
  const ready = at(row.readyAt);
  return ready !== null && now.getTime() - ready >= DAYS_BEFORE_IT_REACHES_THE_LEAD_UNOPENED * DAY;
}

/**
 * The stored rows this reader may read, for a builder that needs the code to look up the library's
 * own sentence (the coaching note, the lead's probe list). Everything else serves `servedPatterns`.
 * Nothing at all while PATTERNS_ARE_SERVED is off; `on` exists for tests of the rules, and nothing
 * else passes it.
 */
export function patternRowsThisReaderMayRead<T extends APatternRow>(
  rows: readonly T[] | null | undefined,
  reader: APatternReader,
  opts: { on?: boolean; now?: Date } = {},
): T[] {
  if (!(opts.on ?? PATTERNS_ARE_SERVED)) return [];
  const now = opts.now ?? new Date();
  return (rows ?? []).filter((row) => {
    if (!row?.participantId || ALIGNMENT_FEED_ONLY_CODES.has(row.code)) return false;
    if (!plainNameOf(row.code)) return false;
    if (!hasBeenSeenInThreePeriods(row)) return false;
    const yours = !!reader.participantId && row.participantId === reader.participantId;
    if (yours) return true;
    /* A participant reads their own and nobody else's; whoever runs it, only after the person's turn. */
    return reader.runsIt && thePersonHasHadTheirTurn(row, now);
  });
}

function whoSeesIt(row: APatternRow, yours: boolean, names: WhoIsWho, now: Date): string {
  if (yours) {
    /* Hafsah, 29 September 2026: when the person it is about is the lead themselves, the sentence
       must not name the lead as if they were someone else reading it back to them. */
    const isTheLeadsOwn = !!names.leadParticipantId && row.participantId === names.leadParticipantId;
    if (isTheLeadsOwn) return 'Only you see this. Nothing is decided from it.';
    const lead = names.leadName?.trim() || 'The person who runs this check-in';
    return thePersonHasHadTheirTurn(row, now)
      ? `${lead} can see this too, with anything you say about it. Nothing is decided from it.`
      : `You are seeing this first. ${lead} will see it too, with anything you say about it. Nothing is decided from it.`;
  }
  const first = names.firstNameOf?.(row.participantId)?.trim() || 'The person it is about';
  if ((row.personAnswer ?? '').trim()) return `${first} saw this first and said what is behind it.`;
  /* Hafsah, 28 September 2026: when the lead sees a pattern the person has not answered, it says
     plainly that they have not answered yet. */
  if (at(row.shownToPersonAt) !== null) return `${first} saw this first and has not answered yet.`;
  return `${first} has not seen this yet, and has not answered yet. It is shown to you because a week has passed since it came up for the third time.`;
}

/** The patterns this reader may read, in the form they may read them. */
export function servedPatterns(
  rows: readonly APatternRow[] | null | undefined,
  reader: APatternReader,
  opts: { on?: boolean; now?: Date } & WhoIsWho = {},
): AServedPattern[] {
  const now = opts.now ?? new Date();
  return patternRowsThisReaderMayRead(rows, reader, opts)
    .map((row) => {
      const plain = plainNameOf(row.code)!;
      const yours = !!reader.participantId && row.participantId === reader.participantId;
      return {
        id: row.id,
        participantId: row.participantId,
        yours,
        kind: plain.kind,
        heading: plain.name,
        whatHappened: whatHappenedIn(row.observationText),
        sessions: [...new Set(row.seenInSessions ?? [])].sort((a, b) => a - b),
        howOften: howOftenItCameUp(row, yours),
        askThem: yours ? null : whatToAskAbout(row.code),
        theirWords: (row.personAnswer ?? '').trim() || null,
        canAnswer: yours,
        whoSeesIt: whoSeesIt(row, yours, opts, now),
      };
    })
    .sort((a, b) => Number(b.yours) - Number(a.yours));
}

/** The ones this reader is the person for and has never been shown: rule 5's clock starts when they are. */
export function theOnesTheyAreSeeingFirst(rows: readonly APatternRow[] | null | undefined, served: readonly AServedPattern[] | null | undefined): string[] {
  if (!served?.length) return [];
  const unseen = new Set((rows ?? []).filter((r) => at(r.shownToPersonAt) === null).map((r) => r.id));
  return served.filter((p) => p.yours && unseen.has(p.id)).map((p) => p.id);
}

/**
 * Record that the person has now been shown these. Never throws: a page is not refused because a
 * timestamp could not be written, and the lead then simply waits for the seven-day rule.
 */
export async function markShownToThePerson(
  prisma: { patternDetection?: { updateMany?: (args: any) => Promise<unknown> } },
  ids: string[],
  now: Date = new Date(),
): Promise<void> {
  if (!ids.length || !prisma?.patternDetection?.updateMany) return;
  try {
    await prisma.patternDetection.updateMany({ where: { id: { in: ids }, shownToPersonAt: null }, data: { shownToPersonAt: now } });
  } catch {
    /* See above. */
  }
}

/**
 * The two names rule 5's sentences need, from a check-in's own participant rows: the lead's first
 * name for the person, and each person's first name for the lead. First names only, and only in a
 * sentence about who has seen it, never joined to the pattern's name.
 */
export function whoIsWhoIn(
  participants: readonly { id: string; userId?: string | null; nameGiven?: string | null; user?: { firstName?: string | null; lastName?: string | null } | null }[] | null | undefined,
  initiatorId: string | null | undefined,
): WhoIsWho {
  /* A title is not a first name ("Dr" is not who anybody is called): skip it and use the next
     name, through the one helper that knows every title people here really carry. */
  const first = (p: { nameGiven?: string | null; user?: { firstName?: string | null; lastName?: string | null } | null } | undefined) => {
    const viaUser = theFirstNameFrom(p?.user?.firstName, p?.user?.lastName);
    if (viaUser) return viaUser;
    const given = (p?.nameGiven ?? '').trim();
    if (!given) return null;
    const [firstWord, ...restWords] = given.split(/\s+/);
    return theFirstNameFrom(firstWord, restWords.join(' '));
  };
  const rows = participants ?? [];
  const lead = rows.find((p) => !!initiatorId && p.userId === initiatorId);
  return {
    leadName: first(lead),
    leadParticipantId: lead?.id ?? null,
    firstNameOf: (pid: string) => first(rows.find((p) => p.id === pid)),
  };
}
