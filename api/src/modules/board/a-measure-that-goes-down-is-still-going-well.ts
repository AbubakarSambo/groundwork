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

export function theJourneySoFar(a: { start: number | null; now: number; target: number | null }): Journey {
  const { start, now, target } = a;
  const direction = whichWayIsGood(start, target);

  if (target == null) {
    /* Tracked rather than counted. GroundObjective.target is nullable for exactly this, and its own
       comment says a qualitative objective is tracked and not counted. */
    return {
      direction, start, now, target,
      say: start != null && start !== now ? `${start} at the start, ${now} now.` : `${now} so far.`,
      covered: null,
    };
  }

  if (start == null) {
    /* No first snapshot: the target predates anybody counting, or the round never completed. Saying
       where it is and what was said is still true; claiming distance covered would not be. */
    return { direction, start, now, target, say: `${now} now, said ${target}.`, covered: null };
  }

  const covered = howFar(start, now, target);
  const reached = direction === 'down' ? now <= target : now >= target;
  return {
    direction,
    start,
    now,
    target,
    say: reached
      ? `${start} at the start, ${now} now. That is where you said.`
      : `${start} at the start, ${now} now, said ${target}.`,
    covered,
  };
}
