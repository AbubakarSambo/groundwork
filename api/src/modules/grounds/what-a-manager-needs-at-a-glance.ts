import { DependencyStatus } from '@prisma/client';
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
  progress: { roundsDone: number; roundsPlanned: number | null; answeredThisRound: number; ofPeople: number };
  /** What is in the way, counted as the board counts it, with the longest-standing one named. */
  inTheWay: { count: number; oldest: string | null; daysWaiting: number | null };
}

export interface GlanceInput {
  roundsDone: number;
  roundsPlanned: number | null;
  /** Every party who is expected to answer - managing-only leads are not. */
  people: { id: string; managingOnly?: boolean | null }[];
  /** This round's check-ins, whatever their state. */
  thisRound: { participantId: string; status: string }[];
  dependencies: (ReadDependency & { createdAt?: Date | null; what: string })[];
}

const A_DAY = 24 * 60 * 60 * 1000;

export function atAGlance(i: GlanceInput, now: Date = new Date()): AtAGlance {
  const answering = i.people.filter((p) => !p.managingOnly);
  const done = new Set(
    i.thisRound.filter((c) => c.status === 'COMPLETED').map((c) => c.participantId),
  );

  const real = oneBlockerPerThingWaitedOn(dedupeDependencies(i.dependencies))
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
    progress: {
      roundsDone: i.roundsDone,
      roundsPlanned: i.roundsPlanned,
      answeredThisRound: answering.filter((p) => done.has(p.id)).length,
      ofPeople: answering.length,
    },
    inTheWay: {
      count: real.length,
      oldest: oldest?.what ?? null,
      daysWaiting: oldest?.createdAt
        ? Math.max(0, Math.floor((now.getTime() - oldest.createdAt.getTime()) / A_DAY))
        : null,
    },
  };
}
