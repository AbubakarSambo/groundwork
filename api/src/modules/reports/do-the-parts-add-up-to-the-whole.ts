import { someOfThemHave } from './some-of-them-has-or-have';
/**
 * "ALL OF US ARE LISTING GOALS TOO LOW TO MEET THE OBJECTIVE."
 *
 * Read off a real shared report on 15 September 2026. The objective on the check-in was ten
 * thousand units of tea. The three people in it described their own work as two thousand units,
 * a hundred and fifty bags, and fifty bags each. Nobody had to be clever to see that those do not
 * reach ten thousand, and the report did not say it - it said the role was never clearly defined,
 * which is true of almost every check-in and told her nothing.
 *
 * Her words: "the shared report has no reasoning at all. And doesnt tell us to go work out
 * individual targets and also the fact that all of us are listing goals too low to meet the
 * objective."
 *
 * WHY THIS IS CODE. The service that builds the report already says it: "deterministic features
 * are computed here (never by the model); the model narrates them." Arithmetic is the clearest
 * case there is. A model asked whether some numbers add up will usually say something plausible,
 * and plausible is not the same as adding up.
 *
 * AND WHY IT REFUSES MORE OFTEN THAN IT ANSWERS. Two thousand units, a hundred and fifty bags and
 * fifty bags each cannot be added together - they are not the same thing, and a total of 2,200
 * would be a number the product invented. Where the units do not match, that IS the finding and it
 * is said as one: nobody can tell whether these reach the objective, including the people who said
 * them.
 */

export interface ATarget {
  name: string;
  target: number | null;
  ownerParticipantId?: string | null;
}

/** The last noun in a target's name: "10,000 units of tea" -> "tea", "Carry 150 contracts" -> "contracts". */
/* Words that end an objective's name without counting anything: "$12k coming in" is not counted in
   "coming" (read on a participant's report, 20 Sep 2026: "different terms (coming, revenue, engagement)"). */
const NOT_A_UNIT = new Set([
  'carry', 'sell', 'the', 'of', 'a', 'an', 'to', 'in', 'my', 'our', 'each', 'total', 'coming', 'going', 'doing', 'first', 'next', 'this',
  'year', 'month', 'quarter', 'week', 'day', 'time', 'now', 'soon', 'end', 'start', 'by', 'for', 'per', 'on', 'at', 'with', 'from', 'and',
  'more', 'least', 'about', 'around', 'up', 'down', 'over', 'under', 'target', 'goal', 'objective', 'period', 'q1', 'q2', 'q3', 'q4',
]);

function whatIsBeingCounted(name: string): string | null {
  const words = (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !/^\d+[km]?$/.test(w) && !/^n\d/.test(w) && !NOT_A_UNIT.has(w) && !/ing$/.test(w));
  return words.length ? words[words.length - 1].replace(/s$/, '') : null;
}

export interface HowTheNumbersSit {
  /** The line for the report, or null where there is nothing true to say. */
  says: string | null;
  /** Everything below is for tests and for anything that wants the parts rather than the sentence. */
  whole: number | null;
  partsTotal: number | null;
  peopleWithATarget: number;
  peopleInTheCheckIn: number;
  comparable: boolean;
}

/**
 * @param targets every objective on the check-in, owned and unowned
 * @param peopleInTheCheckIn how many people are being asked (not counting anybody managing only)
 */
/**
 * THE OBJECTIVE, SAID WITHOUT ITS NUMBER TWICE (requests 127, 129, 135, 136). The line below is what the report writer
 * is given, and it echoed it: "The objective is 100 All 100 tasks for the release are deployed to production." The
 * number was put in front of a name that already held it. Where the name holds the number, the name is quoted as it is.
 */
export function theObjectiveSaid(target: number, name: string): string {
  const n = target.toLocaleString('en-US');
  const said = String(name ?? '').trim().replace(/\s+/g, ' ');
  const holdsIt = new RegExp(`(?<![\\d.,])${String(target)}(?![\\d])|(?<![\\d.,])${n.replace(/[,.]/g, '\\$&')}(?![\\d])`).test(said);
  return holdsIt ? `the objective, in the lead's own words, is "${said.replace(/[.!?]+$/, '')}"` : `the objective is ${n} ${said.replace(/^\d[\d,]*\s*/, '')}`;
}

export function howTheNumbersSit(targets: ATarget[], peopleInTheCheckIn: number): HowTheNumbersSit {
  const withNumbers = (targets ?? []).filter((t) => typeof t.target === 'number' && t.target! > 0);
  const whole = withNumbers.filter((t) => !t.ownerParticipantId);
  const parts = withNumbers.filter((t) => !!t.ownerParticipantId);
  const peopleWithATarget = new Set(parts.map((p) => p.ownerParticipantId)).size;

  const nothing: HowTheNumbersSit = {
    says: null, whole: null, partsTotal: null, peopleWithATarget, peopleInTheCheckIn, comparable: false,
  };

  /*
   * NOBODY HAS A NUMBER OF THEIR OWN, which is the state she was in and the one the report never
   * mentioned. It is worth saying even with no whole to compare against: a check-in where the
   * objective belongs to everybody and to nobody cannot tell anybody whether they are behind.
   */
  if (parts.length === 0) {
    if (whole.length === 0) return nothing;
    const theWhole = whole[0];
    return {
      ...nothing,
      whole: theWhole.target!,
      says: `THE NUMBERS: ${theObjectiveSaid(theWhole.target!, theWhole.name)}, and nobody in this check-in has a number of their own against it. Nothing here can tell any one person whether they are on track, because no part of the objective has been given to anybody. Say so, and say that agreeing who carries how much is the thing to do next.`,
    };
  }

  if (whole.length === 0) return nothing;
  const theWhole = whole[0];

  /*
   * THE UNITS HAVE TO MATCH BEFORE ANYTHING IS ADDED UP. Two thousand units, a hundred and fifty
   * bags and fifty bags each are three different things, and their total is a number nobody said.
   */
  const wholeUnit = whatIsBeingCounted(theWhole.name);
  const partUnits = new Set(parts.map((p) => whatIsBeingCounted(p.name)));
  const comparable = !!wholeUnit && partUnits.size === 1 && partUnits.has(wholeUnit);

  if (!comparable) {
    const named = [...new Set([wholeUnit, ...partUnits].filter(Boolean))].join(', ');
    return {
      ...nothing,
      whole: theWhole.target!,
      comparable: false,
      says: `THE NUMBERS: the objective is ${theWhole.target!.toLocaleString('en-US')} and the people in this check-in have named their own numbers in different terms (${named}). They cannot be added up, so nobody here - including the people who said them - can tell whether their own numbers reach the objective. That is worth saying plainly, and agreeing one way of counting is the thing to do next.`,
    };
  }

  const partsTotal = parts.reduce((a, p) => a + p.target!, 0);
  const short = theWhole.target! - partsTotal;
  const everybodyHasOne = peopleWithATarget >= peopleInTheCheckIn;

  /*
   * THE ARITHMETIC, AND ONLY THE ARITHMETIC. What it MEANS is the report's job: this says what the
   * numbers are and never who is at fault for them.
   */
  const head = `THE NUMBERS: the objective is ${theWhole.target!.toLocaleString('en-US')} ${wholeUnit}${theWhole.target! === 1 ? '' : 's'}, and the individual numbers on record add up to ${partsTotal.toLocaleString('en-US')}`;

  if (short > 0) {
    return {
      says: `${head} - ${short.toLocaleString('en-US')} short. ${
        everybodyHasOne
          ? 'Everybody has a number and together they do not reach it.'
          : someOfThemHave(peopleWithATarget, peopleInTheCheckIn, 'a number of their own, so part of the gap may simply be nobody carrying it yet.')
      } Lead with this: it is arithmetic, it is not a judgement about anybody, and the thing to do next is to agree who carries the ${short.toLocaleString('en-US')} that nobody is carrying.`,
      whole: theWhole.target!, partsTotal, peopleWithATarget, peopleInTheCheckIn, comparable: true,
    };
  }

  if (short < 0) {
    return {
      says: `${head} - ${Math.abs(short).toLocaleString('en-US')} more than the objective. That is not a problem in itself and it is worth naming: either the objective is being beaten deliberately, or somebody's number is counting the same work twice.`,
      whole: theWhole.target!, partsTotal, peopleWithATarget, peopleInTheCheckIn, comparable: true,
    };
  }

  return {
    says: `${head}, which is exactly the objective. Say so - it is the one case where the numbers need no conversation.`,
    whole: theWhole.target!, partsTotal, peopleWithATarget, peopleInTheCheckIn, comparable: true,
  };
}
