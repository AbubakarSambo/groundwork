/**
 * A MEASURE THAT GOES DOWN IS STILL GOING WELL.
 *
 * Found by reading a real Q4 plan into a board. Four measures came out of it and two of them were
 * ceilings: first response UNDER four hours, stock-outs NO MORE THAN two. The board's bar is
 * `count / target`, so a team getting faster would have watched their bar shrink, and a team
 * holding stock-outs at zero would have read as nought per cent of the way to anything.
 *
 * A DIRECTION COLUMN WAS THE OBVIOUS FIX AND IT IS THE WRONG ONE. It puts a question in front of a
 * person for something the numbers already answer, it can be set wrong, and it then has to be
 * asked on every path that ever creates a target - the panel, the API, the context chat, an import.
 * Where it started, where it is, and what was said are three numbers the product already keeps, and
 * three numbers that disagree with a direction flag are three numbers that are right.
 *
 * SO IT IS DERIVED, AND FROM THE FIRST SNAPSHOT RATHER THAN FROM TODAY. A target added at session
 * six has its start at session six, which is honest: nobody gets credit for distance covered before
 * anybody was counting.
 *
 * AND IT IS NOT A PERCENTAGE. `where-you-are-against-what-you-named` forbids a percentage complete
 * in as many words, and a bar filling to a hundred is that with a different shape. What a person
 * needs is the journey: where this started, where it is, and what was said. Three numbers, in a
 * line, that anybody can check.
 */

import { aNumberPeopleCanRead } from './an-aim-is-a-sentence-about-somebody';

export type Direction = 'up' | 'down' | 'unknown';

export interface Journey {
  direction: Direction;
  /** Where it began, as of the first session anybody counted it. Null when nothing was recorded. */
  start: number | null;
  now: number;
  target: number | null;
  /** The line a person reads. Never a score, never a verdict. */
  say: string;
  /** Only where there is a start, a target and real distance between them. Null otherwise. */
  covered: number | null;
}

/**
 * WHICH WAY IS GOOD, WORKED OUT RATHER THAN ASKED.
 *
 * Start above target means the target is a ceiling and the work is to come down. Start below means
 * the ordinary case. Start EQUAL to target is not a direction and must not be guessed: a measure
 * that opened exactly at its target is either already done or badly set, and both of those are
 * things to say rather than to resolve silently.
 */
export function whichWayIsGood(start: number | null, target: number | null): Direction {
  if (start == null || target == null || start === target) return 'unknown';
  return start > target ? 'down' : 'up';
}

/** Distance covered, 0-100, clamped. Overshooting is not more than finished. */
function howFar(start: number, now: number, target: number): number {
  const whole = Math.abs(target - start);
  if (whole === 0) return 0;
  const done = Math.abs(now - start);
  const wrongWay = (target > start && now < start) || (target < start && now > start);
  return wrongWay ? 0 : Math.max(0, Math.min(100, Math.round((done / whole) * 100)));
}

/*
 * THE LINE IS A FULL SENTENCE, WITH NUMBERS A PERSON CAN READ (review of 1 October 2026). Read on the
 * run: "0 at the start, 0 now, said 120000000." and "0 at the start, 254000 now. That is where you
 * said." - pieces joined with commas, a number nobody can read at a glance, and a "you" that was the
 * lead's to a participant too. Now: "It was 0 at the start and is 0 now, and the aim is 120 million."
 * One sentence, so a reader who may not see the aim loses the whole line and never half of it (the
 * hidden-target net takes out a sentence with the number in it, and an admin outside reads no number).
 */
const read = (n: number) => aNumberPeopleCanRead(n);

export function theJourneySoFar(a: { start: number | null; now: number; target: number | null }): Journey {
  const { start, now, target } = a;
  const direction = whichWayIsGood(start, target);

  if (target == null) {
    /* Tracked rather than counted. GroundObjective.target is nullable for exactly this, and its own
       comment says a qualitative objective is tracked and not counted. */
    return {
      direction, start, now, target,
      say: start != null && start !== now ? `It was ${read(start)} at the start and is ${read(now)} now.` : now === 0 ? 'Nothing has been counted for it yet.' : `It is ${read(now)} so far.`,
      covered: null,
    };
  }

  if (start == null) {
    /* No first snapshot: the target predates anybody counting, or the round never completed. Saying
       where it is and what was said is still true; claiming distance covered would not be. */
    return { direction, start, now, target, say: `It is ${read(now)} now, and the aim is ${read(target)}.`, covered: null };
  }

  const covered = howFar(start, now, target);
  const reached = direction === 'down' ? now <= target : now >= target;
  return {
    direction,
    start,
    now,
    target,
    say: reached
      ? `It was ${read(start)} at the start and is ${read(now)} now, so the aim of ${read(target)} has been reached.`
      : `It was ${read(start)} at the start and is ${read(now)} now, and the aim is ${read(target)}.`,
    covered,
  };
}
