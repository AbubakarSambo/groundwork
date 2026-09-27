import { ALIGNMENT_FEED_ONLY_CODES, BAD_FAITH_CODES, CARRYING_CODES, POSITIVE_CODES } from './pattern-library';
import { PATTERNS_ARE_SERVED } from './patterns-are-served';
import { plainNameOf, type PlainKind } from './plain-pattern-names';
import { plainVoice } from './plain-voice';

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
 */

export const PERIODS_BEFORE_A_PATTERN_IS_SHOWN = 3;

/** The stored row, as much of it as the rules read. */
export interface APatternRow {
  id: string;
  participantId: string;
  code: string;
  observationText: string | null;
  seenInSessions?: number[] | null;
  periodsObserved?: number | null;
}

export interface APatternReader {
  /** The reader's own participant row in this check-in, when they take part in it. */
  participantId: string | null;
  /** Leads it, set it up, or is an admin of the organisation it belongs to. */
  runsIt: boolean;
}

export interface AServedPattern {
  id: string;
  /** Whose work it is about, for the page to place under that person. Never joined to a name here. */
  aboutParticipantId: string;
  /** True when the reader is the person it is about. */
  yours: boolean;
  kind: PlainKind;
  /** The plain name: what the record shows happening. */
  heading: string;
  /** The engine's own sentence about the work, when it holds no internal name or code. */
  whatHappened: string | null;
  /** How often, as a sentence. */
  howOften: string;
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

/**
 * The patterns this reader may read, in the form they may read them. Nothing at all while
 * PATTERNS_ARE_SERVED is off; `on` exists for tests of the rules, and nothing else passes it.
 */
export function servedPatterns(
  rows: readonly APatternRow[] | null | undefined,
  reader: APatternReader,
  opts: { on?: boolean } = {},
): AServedPattern[] {
  if (!(opts.on ?? PATTERNS_ARE_SERVED)) return [];
  const out: AServedPattern[] = [];
  for (const row of rows ?? []) {
    if (!row?.participantId || ALIGNMENT_FEED_ONLY_CODES.has(row.code)) continue;
    const plain = plainNameOf(row.code);
    if (!plain) continue;
    if (!hasBeenSeenInThreePeriods(row)) continue;
    const yours = !!reader.participantId && row.participantId === reader.participantId;
    /* A participant reads their own and nobody else's. */
    if (!yours && !reader.runsIt) continue;
    out.push({
      id: row.id,
      aboutParticipantId: row.participantId,
      yours,
      kind: plain.kind,
      heading: plain.name,
      whatHappened: whatHappenedIn(row.observationText),
      howOften: howOftenItCameUp(row, yours),
    });
  }
  return out.sort((a, b) => Number(b.yours) - Number(a.yours));
}
