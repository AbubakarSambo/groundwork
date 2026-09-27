import { A_FORTNIGHT, waysThrough, type Effort } from '../conversation/a-blocker-is-not-a-blocker-until-you-have-tried';
import { carriesANumber } from '../reports/a-number-written-as-a-word-is-a-number';

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
  /**
   * WHETHER ANYTHING ON THE RECORD FROM THIS ROUND CARRIES A NUMBER, A DATE OR A DOCUMENT.
   *
   * This was `saidAnythingCheckable`, and it was worked out from the check-in's `specificityLevel`
   * and `specificityDimensions`: the engine's rating of how checkable a person's answers were. The
   * lead read that rating as "nothing checkable" beside the person's name (request 8 from the
   * screens workspace, 27 Sep 2026), and CLAUDE.md says a lead never sees how anybody's answers were
   * rated. So the board no longer asks the rating anything. It asks the record of the round, which
   * the lead may already read: is there a number or a date in what was written down, or a document
   * behind it. See `hasANumberADateOrADocument` below.
   */
  thisRoundHasANumberADateOrADocument: boolean;
}

/**
 * Why this row is where it is. One reason, the strongest. These are keys for the order and for the
 * screen to choose a colour by; they are never the words a lead reads about a person. What a lead
 * reads is `says`, a full sentence about what happened. Read on the board, 27 Sep 2026: the key sat
 * beside the name as a coloured pill, so "stuck and not chasing" read as a label on the person.
 */
export type Reason =
  | 'has not answered'
  | 'stuck and not chasing'
  | 'behind the pace'
  | 'nothing to count yet'
  | 'nothing to do';

/** Ordered worst first. The order IS the product; a manager reads down until it stops mattering. */
const ORDER: Reason[] = ['has not answered', 'stuck and not chasing', 'behind the pace', 'nothing to count yet', 'nothing to do'];

/**
 * A NUMBER, A DATE OR A DOCUMENT, READ OFF ONE LINE OF THE RECORD.
 *
 * A fact about what was written down, and nothing about the person who said it. Numbers written as
 * words count ("forty tonnes a week" is a number: a rice miller's one fact per answer was lost the
 * last time this was read as a digit only). "May" counts only beside a day, because on its own it is
 * nearly always the verb. What counts as a number is the report's rule too, from one place: see
 * a-number-written-as-a-word-is-a-number.
 */
const A_DATE = [
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
  /\b\d{1,2}(?:st|nd|rd|th)?\s+may\b|\bmay\s+\d{1,2}\b/i,
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|yesterday)\b/i,
  /\b(?:every|each|per|by|within|since|last|next|this)\s+(?:day|week|fortnight|month|quarter|year)\b/i,
];
export function hasANumberADateOrADocument(line: { text?: string | null; anchoredDocumentId?: string | null; documentSays?: string | null }): boolean {
  if (line.anchoredDocumentId || (line.documentSays ?? '').trim()) return true;
  const text = line.text ?? '';
  return carriesANumber(text) || A_DATE.some((r) => r.test(text));
}

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

/** Something in the way a fortnight or more that has only been asked about, oldest first. */
function sittingUnchased(row: PersonRow) {
  return row.inTheWay
    .filter((b) => b.days >= A_FORTNIGHT && (b.tried === 'nothing' || b.tried === 'asked-once' || b.tried === 'asked-again'))
    .sort((a, b) => b.days - a.days);
}

export function whyThisRow(row: PersonRow, roundsPlanned: number | null): Reason {
  if (!row.answeredThisRound) return 'has not answered';
  if (sittingUnchased(row).length) return 'stuck and not chasing';
  if (behindThePace(row, roundsPlanned)) return 'behind the pace';
  if (!row.thisRoundHasANumberADateOrADocument) return 'nothing to count yet';
  return 'nothing to do';
}

/**
 * WHAT THE LEAD READS ABOUT EACH PERSON: WHAT HAPPENED, AND WHAT WOULD CHANGE IT.
 *
 * One or two full sentences, with the person's name as the row already resolves it for this reader.
 * Never a word for what somebody is. "Behind" and "not chasing" were read beside names as labels;
 * a count against the calendar, and how long a thing has sat against what was tried, are facts the
 * lead can do something with.
 *
 * Where nobody has given a name, `who` is their role, and "Head of Sales has not checked in" reads
 * as if the role were a person. So the sentence says "the person listed as" the role. A reader the
 * product cannot name to this reader at all is "a teammate".
 */
function subjectFor(row: Pick<PersonRow, 'who' | 'nameIsTheirRole'>, atTheStart: boolean): string {
  const who = (row.who ?? '').trim();
  if (!who || /^a teammate$/i.test(who)) return atTheStart ? 'A teammate' : 'a teammate';
  if (row.nameIsTheirRole) return `${atTheStart ? 'The' : 'the'} person listed as ${who}`;
  return who;
}

export function whatHappened(row: PersonRow, reason: Reason, roundsPlanned: number | null): string {
  const start = subjectFor(row, true);
  const mid = subjectFor(row, false);
  switch (reason) {
    case 'has not answered':
      return `${start} has not checked in for this round yet.`;
    case 'stuck and not chasing': {
      const oldest = sittingUnchased(row)[0];
      const days = `${oldest.days} ${oldest.days === 1 ? 'day' : 'days'}`;
      if (oldest.tried === 'nothing') {
        return `${start} has had something in the way for ${days}, and nobody has said yet what was tried to clear it. Finding out who could clear it, and asking them, would move it.`;
      }
      return `${start} has had something in the way for ${days}, and so far it has only been asked about. Chasing it, or asking someone else, would move it.`;
    }
    case 'behind the pace': {
      const gone = Math.min(row.roundsSoFar, roundsPlanned ?? row.roundsSoFar);
      const rounds = `${gone} of the ${roundsPlanned} rounds ${gone === 1 ? 'has' : 'have'} gone`;
      return `${start} is at ${row.count} of ${row.target}, and ${rounds}. At this pace, ${row.target} would not be reached by the end.`;
    }
    case 'nothing to count yet':
      return `What ${mid} said this round has no number, no date and no document with it yet, so there is nothing new to count. A number or a date for what moved would change that.`;
    case 'nothing to do':
    default:
      return `${start} has checked in, and nothing here needs you this week.`;
  }
}

export interface Ranked {
  participantId: string;
  who: string;
  /** True where `who` is a role standing in for a name nobody has given. */
  nameIsTheirRole: boolean;
  target: number | null;
  count: number;
  reason: Reason;
  /** What happened and what would change it, in full sentences. The only words about the row a lead reads. */
  says: string;
  /** What the manager can ask them to do. Null where there is nothing to ask for. */
  ask: string | null;
}

/**
 * WHAT THEY HAVE SAID THEY TRIED, as the end of a sentence about them.
 *
 * `HOW_HARD_THEY_TRIED` next door says the same thing in the clipped form the conversation's own
 * notes use ("asked once"), and this row is read by a person, so it is said in full here. The tiers
 * are the same five; only escalated and went-around never reach this, because nothing is asked then.
 */
const WHAT_THEY_TRIED_SAID_IN_FULL: Record<Effort, string> = {
  'nothing': 'nobody has said yet what was tried',
  'asked-once': 'so far they have asked about it once',
  'asked-again': 'so far they have asked about it more than once, the same way each time',
  'escalated': 'it has been taken above the person it was with',
  'went-around': 'they found another way through',
};

/**
 * THE THING TO ASK FOR, drawn from the oldest unchased blocker, or nothing.
 *
 * It read "21 days on "the lease", asked once. Ask them to speak to Amina rather than write to
 * them." on the board: pieces joined by commas, and "them" where the row has a name. Now it is full
 * sentences with the name the row already resolves.
 *
 * AND THE BLOCKER IS NOT IN QUOTATION MARKS, because it is not their words. It is the phrase the
 * dependency reader wrote for it ("a clear definition of the role's objectives and expected
 * output"), and on the run of 26 September 16 of the 22 put in quotes here were in nobody's record.
 * A quote is only ever a person's own words from the record (see a-quote-is-what-they-said).
 *
 * AND NOT TWICE. Where the row's `says` already tells the lead how long it has sat and what was
 * tried (the row is there because of it), the ask carries only the ask. Pass `alreadySaid` then.
 */
export function whatToAskFor(row: PersonRow, alreadySaid = false): string | null {
  const start = subjectFor(row, true);
  const them = subjectFor(row, false).replace(/^a teammate$/, 'this teammate');
  if (!row.answeredThisRound) return `Ask ${them} to check in.`;
  const worst = [...row.inTheWay]
    .filter((b) => b.tried !== 'escalated' && b.tried !== 'went-around')
    .sort((a, b) => b.days - a.days)[0];
  if (!worst) return null;
  if (worst.days < A_FORTNIGHT && worst.tried !== 'nothing') return null;
  const first = waysThrough({ what: worst.what, owner: worst.owner, days: worst.days, tried: worst.tried, chaseBy: null })[0];
  const theAsk = `Ask ${them} to ${first.charAt(0).toLowerCase()}${first.slice(1)}`;
  if (alreadySaid) return theAsk;
  const days = `${worst.days} ${worst.days === 1 ? 'day' : 'days'}`;
  return `${start} has been waiting ${days} on ${worst.what}, and ${WHAT_THEY_TRIED_SAID_IN_FULL[worst.tried]}. ${theAsk}`;
}

export function whereEachPersonIs(rows: PersonRow[], roundsPlanned: number | null): Ranked[] {
  return rows
    .map((r) => {
      const reason = whyThisRow(r, roundsPlanned);
      return {
        participantId: r.participantId,
        who: r.who,
        nameIsTheirRole: r.nameIsTheirRole === true,
        target: r.target,
        count: r.count,
        reason,
        says: whatHappened(r, reason, roundsPlanned),
        /* The stuck row's `says` already names the days and what was tried; the ask does not repeat it. */
        ask: whatToAskFor(r, reason === 'stuck and not chasing'),
      };
    })
    .sort((a, b) => {
      const byReason = ORDER.indexOf(a.reason) - ORDER.indexOf(b.reason);
      if (byReason !== 0) return byReason;
      /*
       * AND SOMEBODY WE CANNOT NAME GOES LAST WITHIN THEIR REASON.
       *
       * Read on a live board, 23 September 2026: "A teammate - no name given - has not answered -
       * Ask them to check in." at the very top, above the one person who had answered and whose
       * account is the only content on the page.
       *
       * "Has not answered" is rightly the first reason - it is the one thing a lead can act on. But
       * the action is "ask them", and you cannot ask somebody whose name the product does not hold.
       * An unnamed row is the least actionable row in its own category, so it sorts to the bottom of
       * it rather than to the top of the page on an alphabetical accident.
       */
      if (a.nameIsTheirRole !== b.nameIsTheirRole) return a.nameIsTheirRole ? 1 : -1;
      /* Within that, by name, so the order does not shuffle between reads and read as movement. */
      return a.who.localeCompare(b.who);
    });
}
