import { theDayInWords } from '../board/the-day-in-words';
import { startsWithAPronoun, whoseIsIt } from './a-blocker-that-says-her-or-his';
import { whereTheTeamIs, howManyAreDone } from './which-check-in-it-is';
import { DependencyStatus } from '@prisma/client';
import { isHeldAtTheDoor } from './who-an-admin-did-not-let-in';
import { whoHasAnswered, type SomebodyWhoMightAnswer } from '../reports/how-many-have-answered';
import { ReadDependency, dedupeDependencies, blockerHasSubstance } from '../board/reads';
import { oneBlockerPerThingWaitedOn, theyNamedWhatTheyAreWaitingOn } from '../board/a-blocker-with-nothing-in-it-is-the-same-blocker';

/**
 * WHAT A MANAGER WANTS OFF A CARD WITHOUT OPENING IT.
 *
 * "When I come in as a manager, I want progress/status and blockers/risks. I need something that
 * carries that."
 *
 * The card carried neither. It had the brief - the sentence the check-in was set up with - then the
 * finding, which is one line and is whichever of several reads ranked highest that round: a
 * difference if there was one, a blocker if there was not, and otherwise a coverage read saying
 * nothing is wrong. Useful, and not an answer to either question, and never both.
 *
 * So two facts, in the same place on every card, in the same words every time:
 *
 *   progress   how far through the run, and how much of THIS round is in
 *   in the way what is actually blocking, counted the way the board counts it
 *
 * THE SAME DEFINITION OF A BLOCKER THE BOARD USES, which is the point of importing rather than
 * counting rows here. A GroundDependency row is not a blocker: extraction writes one whenever
 * somebody sounds stuck, so the same wait appears two and three times and some rows name nothing at
 * all. `dedupeDependencies` joins the repeats, `oneBlockerPerThingWaitedOn` folds the placeholders
 * into the row that names something, and `blockerHasSubstance` drops what is left. A list that
 * counted raw rows would say five where the board says two, and the person reading both would
 * believe neither.
 */
export interface AtAGlance {
  /** Rounds finished, and how many the run plans. Null where nobody has set a length. */
  progress: {
    roundsDone: number; roundsPlanned: number | null; answeredThisRound: number; ofPeople: number;
    /** Who, of the people counted in `ofPeople`, has not answered yet: participant ids. So Today's
        sentence and the list's "2 of 3 answered" count the same people (U.5 review). */
    waitingOn: string[];
    /** People on it who are not counted because an admin has not let them in yet, and who have not answered this round (decision 77). Said, never silently dropped. */
    notLetIn?: number;
    /** That as a sentence, or null: "Three more people are not counted yet, because an admin has not let them in." */
    notCountedSays?: string | null;
    /** Invited and not joined yet, as a count and a sentence of its own, so the board never says "everybody" over them (reviewer, 14 October). */
    notJoinedYet?: number;
    notJoinedSays?: string | null;
    /** The team's round, from the board's own clock (whichRoundIsOpen). Every screen says which check-in it is from this. */
    openRound?: number;
    /** That round as a sentence for the list to show as it is: "It is on the second check-in of 12." Null before any. */
    whereItIs?: string | null;
    /** "Two of the 12 check-ins are done." for the line under it, or null where `whereItIs` already says it. */
    howManyAreDone?: string | null;
  };
  /** What is in the way, counted as the board counts it, with the longest-standing one named. */
  inTheWay: {
    count: number; oldest: string | null;
    /**
     * Whole days the oldest one has waited, measured to the clock the caller gives. The board gives the record's
     * own clock, so it never changes when the board is opened (request 117, part 9). Please draw `sinceSays`.
     */
    daysWaiting: number | null;
    /** When the oldest one began, as a time, and as words: "since 28 September" (request 117, part 9). */
    since?: string | null;
    sinceSays?: string | null;
    /** Who the oldest one is waited on from, so the list can name them for a reader who may. Never the screen's to read. */
    oldestOnParticipantId?: string | null;
  };
}

export interface GlanceInput {
  roundsDone: number;
  roundsPlanned: number | null;
  /**
   * Everybody on the check-in, with what the population rule needs to decide who this round waits
   * on: whether they joined, whether their invitation is still live, and this round's rows. The rule
   * is in how-many-have-answered.ts and this asks it - see the note there about the day four screens
   * quoted four different numbers for one session.
   */
  people: SomebodyWhoMightAnswer[];
  /** Which round is being counted. */
  sessionNumber?: number;
  /** The situation, because a managing-only lead answers the first session and is not waited on after it. */
  scenario?: string | null;
  /** This round's check-ins, whatever their state. Kept for callers that do not carry rows per person. */
  thisRound: { participantId: string; status: string }[];
  /** Only the check-ins list asks for this: the round in words, and who the oldest blocker is waited on from. The board does not serve either. */
  forTheList?: boolean;
  dependencies: (ReadDependency & { createdAt?: Date | null; what: string })[];
}

const A_DAY = 24 * 60 * 60 * 1000;

export function atAGlance(i: GlanceInput, now: Date = new Date()): AtAGlance {
  /*
   * ONE DEFINITION OF WHO IS COUNTED AND WHAT COUNTS AS ANSWERING. This counted every row on the
   * roster and only the COMPLETED ones, so a declined answer read as silence and somebody whose
   * invitation had lapsed held the denominator open. See how-many-have-answered.ts.
   */
  const session = i.sessionNumber ?? 1;
  const rows = new Map<string, { status: string; closedReason?: string | null; turns?: unknown[] | null }[]>();
  /* The close reason and the person's turns ride along, so a session the clock closed with nothing said is not counted as answered (test bed copy a, 9 October). */
  for (const c of i.thisRound) rows.set(c.participantId, [...(rows.get(c.participantId) ?? []), { status: c.status, closedReason: (c as any).closedReason, turns: (c as any).turns }]);
  const withRows = i.people.map((p) => ({ ...p, checkIns: p.checkIns ?? rows.get(p.id) ?? [] }));
  /* THE ONE COUNT (how-many-have-answered.ts): who is counted, who answered, who has not yet and who has not joined. */
  const counted = whoHasAnswered(withRows, session, i.scenario);
  const notLetIn = counted.notLetIn.filter((id) => withRows.some((p) => p.id === id && isHeldAtTheDoor(p))).length;
  const notJoined = counted.notJoined.length;
  const notCountedSays = whoIsNotCountedYet(notLetIn) || null;

  return {
    progress: {
      roundsDone: i.roundsDone,
      roundsPlanned: i.roundsPlanned,
      /* The two numbers people read count who is in the round by the header's rule. See whoIsInTheRound. */
      answeredThisRound: counted.answered.length,
      ofPeople: counted.onTheCheckIn.length,
      waitingOn: counted.notYet,
      ...(notLetIn || notJoined ? { notLetIn, notJoinedYet: notJoined, notCountedSays, notJoinedSays: whoHasNotJoinedYetCount(notJoined) } : {}),
      ...(i.forTheList ? {
        openRound: session,
        whereItIs: whereTheTeamIs(i.sessionNumber ? session : 0, i.roundsPlanned, i.roundsDone),
        howManyAreDone: howManyAreDone(i.roundsDone, i.roundsPlanned),
      } : {}),
    },
    inTheWay: whatIsInTheWay(i.dependencies, now, !!i.forTheList),
  };
}

/**
 * WHAT IS IN THE WAY, COUNTED AS THE BOARD COUNTS IT, with the longest-standing named one. Given every
 * wait on the check-in for whoever runs it; given only the reader's own waits for a reader walled from
 * their colleagues (see theGlanceAsThisReaderMayReadIt).
 */
export function whatIsInTheWay(dependencies: GlanceInput['dependencies'], now: Date = new Date(), forTheList = false): AtAGlance['inTheWay'] {
  const real = oneBlockerPerThingWaitedOn(dedupeDependencies(dependencies))
    .filter((d) => d.status === DependencyStatus.BLOCKING || d.status === DependencyStatus.WAITING)
    .filter(blockerHasSubstance);

  /* The longest-standing one, because that is where waiting has cost the most - the same choice the
     board's `ask` column makes, for the same reason. */
  const byAge = [...real].sort(
    (a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
  );
  /*
   * AND THE HEADLINE QUOTES A THING SOMEBODY NAMED, OR IT QUOTES NOTHING.
   *
   * This line is four words on a card and at the top of the board - "In the way 2 · waiting on
   * someone else (0d)" - and that is the whole read a manager gets at a glance. Where the oldest
   * row is one nobody named, quoting it spends the one phrase on a non-answer. The COUNT still
   * includes it, because the person is blocked either way and hiding that would be worse; the
   * oldest NAMED one gets the words, and where none is named there are none to give.
   *
   * THE WORDS AND THE DAYS ARE ONE ROW. Split across two, the card reads "the finance number (12d)"
   * where the twelve days belong to something else entirely - a number about a different blocker,
   * printed next to this one's name. I wrote that bug into this function and caught it here.
   */
  const oldest = byAge.find(theyNamedWhatTheyAreWaitingOn) ?? null;

  return {
    count: real.length,
    oldest: oldest?.what ? (startsWithAPronoun(oldest.what) ? whoseIsIt(oldest.what, null, { onParticipantId: (oldest as any).onParticipantId ?? null, onLabel: (oldest as any).onLabel ?? null }) : oldest.what) : null,
    ...(forTheList && oldest && startsWithAPronoun(oldest.what) ? { oldestOnParticipantId: (oldest as any).onParticipantId ?? null } : {}),
    daysWaiting: oldest?.createdAt
      ? Math.max(0, Math.floor((now.getTime() - new Date(oldest.createdAt).getTime()) / A_DAY))
      : null,
    /* The day it began, which reads the same at any hour (request 117, part 9). */
    since: oldest?.createdAt ? new Date(oldest.createdAt).toISOString() : null,
    sinceSays: oldest?.createdAt ? `since ${theDayInWords(new Date(oldest.createdAt), now)}` : null,
  };
}

/**
 * THE GLANCE FOR A READER WHO MAY NOT READ THEIR COLLEAGUES (request 105, the more private choice): a
 * participant where people see only themselves, anybody on an evaluation check-in who does not run it
 * (the person reviewed, a colleague giving a view), and an admin without access to it. The rounds and how
 * many have answered stay, because they name nobody. Who has not answered is cut to the reader alone, and
 * what is in the way is counted and named from the reader's own waits only, never a colleague's.
 */
export function theGlanceAsThisReaderMayReadIt(
  glance: AtAGlance,
  reader: { participantId: string | null },
  dependencies: GlanceInput['dependencies'],
  now: Date = new Date(),
): AtAGlance {
  const me = reader.participantId;
  const theirOwn = me ? (dependencies ?? []).filter((d: any) => d.fromParticipantId === me || d.onParticipantId === me) : [];
  return {
    ...glance,
    progress: { ...glance.progress, waitingOn: (glance.progress.waitingOn ?? []).filter((id) => !!me && id === me) },
    inTheWay: whatIsInTheWay(theirOwn, now, false),
  };
}

const SMALL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** The same sentence the lead's page says (client a-number-up-to-ten-in-words.ts, andWhoIsNotCountedYet). */
/** Everybody on the check-in is counted now (Hafsah, 1 November 2026), somebody invited who has not joined yet included: "One of them was invited and has not joined yet." */
export function whoHasNotJoinedYetCount(n: number): string | null {
  if (!n || n < 1) return null;
  if (n === 1) return 'One of them was invited and has not joined yet.';
  const w = n < SMALL.length ? SMALL[n] : String(n);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)} of them were invited and have not joined yet.`;
}

export function whoIsNotCountedYet(n: number): string | null {
  if (!n || n < 1) return null;
  if (n === 1) return 'One more person is not counted yet, because an admin has not let them in.';
  const w = n < SMALL.length ? SMALL[n] : String(n);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)} more people are not counted yet, because an admin has not let them in.`;
}
