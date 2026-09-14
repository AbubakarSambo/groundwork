import { A_FORTNIGHT, HOW_HARD_THEY_TRIED, waysThrough, type Effort } from '../conversation/a-blocker-is-not-a-blocker-until-you-have-tried';

/**
 * THE ONE PAGE A MANAGER ACTUALLY OPENS.
 *
 * Asked by a chief of staff running ten salespeople against 270 leases: "I need to know where each
 * person is and what to do with them." The board could not answer it. It showed the team - what is
 * agreed, where people differ, what is in the way - which is the right shape for a team of four
 * working on one thing, and the wrong shape entirely for ten people each carrying their own number.
 *
 * So this is ten rows, one per person, ordered by what needs attention rather than by name.
 *
 * IT RANKS SITUATIONS, NOT PEOPLE. Nothing here scores anybody, and the order is not a league
 * table: a person at the top is a person whose week has something in it worth a conversation, and
 * somebody quietly hitting their number belongs at the bottom precisely because there is nothing to
 * do. The moment this sorts on attainment it becomes a performance ranking published to a manager,
 * which is a different product and not this one.
 *
 * AND IT NEVER SAYS WHAT SOMEBODY IS. "Musa is blocked" is a status anybody could read off the
 * board, and "Musa is coasting" is a judgement nobody has earned the right to make. What a manager
 * can act on is the gap between how long a thing has sat and what has been tried, and one thing to
 * ask for. See `whatToAskThemToDo` next door.
 */

export interface PersonRow {
  participantId: string;
  who: string;
  /**
   * WHETHER `who` IS A NAME OR A ROLE STANDING IN FOR ONE.
   *
   * Somebody with no name of their own falls back to their role, which is right and reads on a list
   * of people as a person called "Head of Sales, West Africa". Watched on a live board with two.
   *
   * MY FIRST VERSION ASKED THE WRONG QUESTION. It tested whether they had an account, and both of
   * them did - they had joined and simply never gave a first name, so the flag said "joined" while
   * the row still showed a role. The condition is not about joining at all: it is whether the
   * label is a name. Asked of the label, which is the only thing that can answer it.
   */
  nameIsTheirRole?: boolean;
  /** Their own target from the board, where one belongs to them. */
  target: number | null;
  count: number;
  /** Have they answered the round that is currently open. */
  answeredThisRound: boolean;
  /** How many rounds have opened for them in all. */
  roundsSoFar: number;
  /** What they have said is in their way, oldest first. */
  inTheWay: { what: string; owner: string | null; days: number; tried: Effort }[];
  /** Whether anything they said this round could be checked against a date, a number or a document. */
  saidAnythingCheckable: boolean;
}

/** Why this row is where it is. One reason, the strongest, in plain words. */
export type Reason =
  | 'has not answered'
  | 'stuck and not chasing'
  | 'behind the pace'
  | 'nothing checkable'
  | 'nothing to do';

export const WHAT_THE_REASON_MEANS: Record<Reason, string> = {
  'has not answered': 'They have not checked in for the round that is open.',
  'stuck and not chasing': 'Something has been in their way a fortnight or more and has only been asked about.',
  'behind the pace': 'Their count is further behind their number than the rounds gone would suggest.',
  'nothing checkable': 'Nothing they said this round can be checked against a date, a number or a document.',
  'nothing to do': 'Nothing here needs you this week.',
};

/** Ordered worst first. The order IS the product; a manager reads down until it stops mattering. */
const ORDER: Reason[] = ['has not answered', 'stuck and not chasing', 'behind the pace', 'nothing checkable', 'nothing to do'];

/**
 * BEHIND THE PACE IS A COMPARISON WITH THE CALENDAR, NOT WITH ANOTHER PERSON.
 *
 * Somebody on 4 of 35 is not behind if one round of twelve has happened. The only honest read is
 * against how much of the run has gone, and it needs a planned length to mean anything at all -
 * without one it says nothing rather than guessing.
 */
export function behindThePace(row: PersonRow, roundsPlanned: number | null): boolean {
  if (row.target == null || !roundsPlanned || roundsPlanned <= 0 || row.roundsSoFar <= 0) return false;
  const soFar = Math.min(1, row.roundsSoFar / roundsPlanned);
  /* A fifth of the way behind where the calendar is. Wide on purpose: sales does not arrive evenly,
     and a read that fires on every ordinary lumpy quarter is one a manager learns to ignore. */
  return row.count < row.target * soFar * 0.8;
}

export function whyThisRow(row: PersonRow, roundsPlanned: number | null): Reason {
  if (!row.answeredThisRound) return 'has not answered';
  const stuck = row.inTheWay.some((b) => b.days >= A_FORTNIGHT && (b.tried === 'nothing' || b.tried === 'asked-once' || b.tried === 'asked-again'));
  if (stuck) return 'stuck and not chasing';
  if (behindThePace(row, roundsPlanned)) return 'behind the pace';
  if (!row.saidAnythingCheckable) return 'nothing checkable';
  return 'nothing to do';
}

export interface Ranked {
  participantId: string;
  who: string;
  /** True where `who` is a role standing in for a name nobody has given. */
  nameIsTheirRole: boolean;
  target: number | null;
  count: number;
  reason: Reason;
  /** What the manager can ask them to do. Null where there is nothing to ask for. */
  ask: string | null;
}

/** The thing to ask for, drawn from the oldest unchased blocker, or nothing. */
export function whatToAskFor(row: PersonRow): string | null {
  if (!row.answeredThisRound) return 'Ask them to check in.';
  const worst = [...row.inTheWay]
    .filter((b) => b.tried !== 'escalated' && b.tried !== 'went-around')
    .sort((a, b) => b.days - a.days)[0];
  if (!worst) return null;
  if (worst.days < A_FORTNIGHT && worst.tried !== 'nothing') return null;
  const first = waysThrough({ what: worst.what, owner: worst.owner, days: worst.days, tried: worst.tried, chaseBy: null })[0];
  return `${worst.days} days on "${worst.what}", ${HOW_HARD_THEY_TRIED[worst.tried]}. Ask them to ${first.charAt(0).toLowerCase()}${first.slice(1)}`;
}

export function whereEachPersonIs(rows: PersonRow[], roundsPlanned: number | null): Ranked[] {
  return rows
    .map((r) => ({
      participantId: r.participantId,
      who: r.who,
      nameIsTheirRole: r.nameIsTheirRole === true,
      target: r.target,
      count: r.count,
      reason: whyThisRow(r, roundsPlanned),
      ask: whatToAskFor(r),
    }))
    .sort((a, b) => {
      const byReason = ORDER.indexOf(a.reason) - ORDER.indexOf(b.reason);
      if (byReason !== 0) return byReason;
      /* Within a reason, by name, so the order does not shuffle between reads and read as movement. */
      return a.who.localeCompare(b.who);
    });
}
