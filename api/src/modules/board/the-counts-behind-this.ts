import { CheckInStatus } from '@prisma/client';
import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';

/**
 * THE COUNTS BEHIND THIS (decision 141 (2), Hafsah, 12 October 2026).
 *
 * "'The counts behind this' under the judgement on the lead's report: bring it back, filled from the
 * record by code."
 *
 * The old table was the engine's own counting sheet (slot names, dotted counts, and a standing on how
 * each person's answers were rated), and it was taken away from every reader in `aba063cd`. What comes
 * back is not that sheet. It is a handful of plain sentences, every number counted here, by code, from
 * the record: sessions answered and missed, commitments made, kept, not kept and still open, waits still
 * open and cleared, and how many lines on the record a document backs. The model writes none of it and
 * nothing here rates a person.
 *
 * It travels inside `theJudgement`, so it reaches exactly the readers the judgement reaches and is taken
 * away wherever the judgement is (a participant, an admin who only reads).
 */

export interface TheRecordToCount {
  sessions: { status: string; isSetup?: boolean | null; closedReason?: string | null; personTurns: number }[];
  commitments: { status: string }[];
  waits: { status: string }[];
  lines: { anchoredDocumentId?: string | null; recallBased?: boolean | null; disputedAt?: Date | null }[];
}

export interface TheCountsBehindThis {
  answered: number;
  missed: number;
  commitmentsMade: number;
  commitmentsKept: number;
  commitmentsNotKept: number;
  commitmentsOpen: number;
  waitsOpen: number;
  waitsCleared: number;
  lines: number;
  backedLines: number;
  /** The same numbers, as sentences a person reads. */
  says: string[];
}

const OPEN_COMMITMENT = new Set(['OPEN', 'UNKNOWN']);
const OPEN_WAIT = new Set(['WAITING', 'BLOCKING']);

const a = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const was = (n: number) => (n === 1 ? 'was' : 'were');
const is = (n: number) => (n === 1 ? 'is' : 'are');

/** Counts the record. Pure, so the numbers can be checked against a fixture. */
export function countTheRecord(r: TheRecordToCount): TheCountsBehindThis {
  const sessions = (r.sessions ?? []).filter((s) => !s.isSetup && s.status === CheckInStatus.COMPLETED);
  const missed = sessions.filter((s) => s.closedReason === CLOSED_BY_THE_CLOCK && s.personTurns === 0).length;
  const answered = sessions.length - missed;
  const commitments = (r.commitments ?? []).filter((c) => c.status !== 'DROPPED');
  const commitmentsKept = commitments.filter((c) => c.status === 'DONE').length;
  const commitmentsNotKept = commitments.filter((c) => c.status === 'NOT_DONE' || c.status === 'MISSED').length;
  const commitmentsOpen = commitments.filter((c) => OPEN_COMMITMENT.has(c.status)).length;
  const waitsOpen = (r.waits ?? []).filter((w) => OPEN_WAIT.has(w.status)).length;
  const waitsCleared = (r.waits ?? []).filter((w) => w.status === 'CLEARED').length;
  const lines = (r.lines ?? []).filter((l) => !l.disputedAt);
  const backedLines = lines.filter((l) => !!l.anchoredDocumentId).length;

  const says: string[] = [];
  says.push(`${a(answered, 'session was', 'sessions were')} answered and ${missed} ${was(missed)} missed.`);
  if (commitments.length === 0) {
    says.push('Nobody has made a commitment on the record yet.');
  } else {
    const parts = [`${commitmentsKept} ${was(commitmentsKept)} kept`];
    if (commitmentsNotKept) parts.push(`${commitmentsNotKept} ${was(commitmentsNotKept)} not kept`);
    parts.push(`${commitmentsOpen} ${is(commitmentsOpen)} still open`);
    const joined = parts.length === 2 ? parts.join(' and ') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
    says.push(`${a(commitments.length, 'commitment was', 'commitments were')} made. Of ${commitments.length === 1 ? 'it' : 'these'}, ${joined}.`);
  }
  if (waitsOpen + waitsCleared === 0) {
    says.push('Nobody has said they are waiting on anyone.');
  } else {
    says.push(`${a(waitsOpen, 'wait is', 'waits are')} still open and ${waitsCleared} ${waitsCleared === 1 ? 'has' : 'have'} been cleared.`);
  }
  if (lines.length) says.push(`${backedLines} of the ${a(lines.length, 'line', 'lines')} on the record ${is(backedLines)} backed by a document.`);
  else says.push('Nothing is on the record yet.');

  return { answered, missed, commitmentsMade: commitments.length, commitmentsKept, commitmentsNotKept, commitmentsOpen, waitsOpen, waitsCleared, lines: lines.length, backedLines, says };
}

/** Reads the record of one check-in and counts it. */
export async function theCountsBehindThis(prisma: any, groundId: string): Promise<TheCountsBehindThis | null> {
  try {
    const [sessions, commitments, waits, lines] = await Promise.all([
      prisma.checkIn.findMany({
        where: { groundId, isSetup: false, status: CheckInStatus.COMPLETED },
        select: { status: true, isSetup: true, closedReason: true, turns: { where: { role: 'PERSON' }, take: 1, select: { id: true } } },
      }),
      prisma.groundCommitment.findMany({ where: { groundId }, select: { status: true } }),
      prisma.groundDependency.findMany({ where: { groundId }, select: { status: true } }),
      prisma.recordEntry.findMany({ where: { participant: { groundId } }, select: { anchoredDocumentId: true, recallBased: true, disputedAt: true } }),
    ]);
    return countTheRecord({
      sessions: (sessions ?? []).map((s: any) => ({ ...s, personTurns: Array.isArray(s?.turns) ? s.turns.length : 0, turns: undefined })),
      commitments: commitments ?? [],
      waits: waits ?? [],
      lines: lines ?? [],
    });
  } catch {
    return null;
  }
}

/**
 * The judgement as the board serves it, with the counts under it. Added only when the reader already has
 * the judgement, so the counts reach nobody the judgement does not reach (decision 141 (2)).
 */
export async function withTheCountsBehindIt<T extends { theJudgement: unknown }>(prisma: any, groundId: string, served: T): Promise<T> {
  const j = served?.theJudgement;
  if (!j || typeof j !== 'object') return served;
  const counts = await theCountsBehindThis(prisma, groundId);
  if (!counts) return served;
  return { ...served, theJudgement: { ...(j as Record<string, unknown>), theCountsBehindThis: counts } };
}
