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
 * OVERRULED FOR THE LIMIT, 1 October 2026 (decision 69). Guessing a limit from the words of a name
 * read "Pumps sold under the new scheme" as a ceiling. Hafsah: each target carries a direction, an aim
 * to reach or a limit not to go over, suggested from the words and confirmed by the lead when the
 * target is made (GroundObjective.direction, see an-aim-or-a-limit.ts). Where it is set it is used;
 * where it is null the reading below is unchanged.
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

/*
 * A LIMIT IS NOT AN AIM (1 October 2026). The workplan run stored "The requested spending of 254k needs
 * to be reconciled with the quarterly budget of 180k." with 254,000 counted against 180,000, and the
 * line said "so the aim of 180,000 has been reached": a budget passed by 74,000, told as a success.
 * Where the name says the number is a budget, a cap, a limit or a ceiling, or "no more than", "at
 * most", "within" or "under" it, the line says how far over or within it is. Where nothing says
 * whether the number is a limit or an aim, and the count started at 0 and is now above it, the line
 * says only where it is against the number, because "reached" could be the opposite of true.
 */
/*
 * "UNDER" ONLY BEFORE A NUMBER (decision 69, 1 October 2026). "First response under four hours" is a
 * limit; "Pumps sold under the new scheme" is an aim, and the bare word read it as a ceiling, so a
 * count of 45 against 40 would have been told as 5 over a limit. The word counts only where a number
 * follows it, written as figures or as a word.
 */
const UNDER_A_NUMBER = String.raw`(?:under|below|less\s+than)\s+(?:about\s+|around\s+)?(?:[^\s\d]{0,4}\d|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|a\s+hundred|a\s+thousand|a\s+million|half)\b)`;
const SAYS_IT_IS_A_LIMIT = new RegExp(String.raw`\b(?:(?:budgets?|limits?|ceilings?|caps?|capped|no more than|at most|maximum|within)\b|${UNDER_A_NUMBER})`, 'i');
const SAYS_IT_IS_AN_AIM = /\b(?:aims?|aiming|targets?|goals?)\b/i;

/** What the words of a target's name suggest, the guess the board falls back on when nobody has said. */
export function theWordsSayItIsALimit(name: string | null | undefined): boolean {
  return SAYS_IT_IS_A_LIMIT.test(name ?? '');
}

/**
 * AN AIM TO REACH, OR A LIMIT NOT TO GO OVER, AS THE LEAD SAID IT (decision 69, 1 October 2026).
 *
 * Hafsah: "instead of guessing, give each target a direction field, set when the target is made". So
 * where `direction` is set it is the answer, whatever the name says. Where it is null nobody has said,
 * and the words of the name are read exactly as they were before the field existed.
 */
export type TargetDirection = 'AIM' | 'LIMIT' | 'RATE' | 'DEADLINE' | 'ZERO';

/** A deadline is done once its count reaches its number, or 1 where it has none. */
export const aDeadlineIsDone = (count: number, target: number | null | undefined): boolean => count >= (typeof target === 'number' && target > 0 ? target : 1);

/**
 * THE THREE KINDS THAT ARE NOT UP OR DOWN (decision 75, item 17), each in its own plain sentence.
 *   A share:  "It is 86% now, below the aim of 90% or more."  /  "It is 91% now, which meets the aim of 90% or more."
 *   A date:   "It is due by 30 October, and it is not done yet."  /  "It was due by 30 October, and it is not done yet."  /  "It is done. It was due by 30 October."
 *   Zero:     "There have been none so far, which is where it should stay."  /  "There have been 2 so far. This should stay at zero, so any at all is a breach."
 */
export function theOtherKindsSay(
  direction: 'RATE' | 'DEADLINE' | 'ZERO',
  a: { start: number | null; now: number; target: number | null; dueDay?: string | null; isPast?: boolean },
): string {
  const { start, now, target } = a;
  if (direction === 'RATE') {
    const pc = (n: number) => `${read(n)}%`;
    const was = start != null && start !== now ? `It was ${pc(start)} at the start and is ${pc(now)} now` : `It is ${pc(now)} now`;
    if (target == null) return `${was}.`;
    return now >= target ? `${was}, which meets the aim of ${pc(target)} or more.` : `${was}, below the aim of ${pc(target)} or more.`;
  }
  if (direction === 'DEADLINE') {
    if (aDeadlineIsDone(now, target)) return a.dueDay ? `It is done. It was due by ${a.dueDay}.` : 'It is done.';
    if (!a.dueDay) return 'It is a date to meet, and nobody has set the date yet. It is not done yet.';
    return a.isPast ? `It was due by ${a.dueDay}, and it is not done yet.` : `It is due by ${a.dueDay}, and it is not done yet.`;
  }
  if (now === 0) return 'There have been none so far, which is where it should stay.';
  return `There ${now === 1 ? 'has been 1' : `have been ${read(now)}`} so far. This should stay at zero, so any at all is a breach.`;
}

export function theJourneySoFar(a: {
  start: number | null; now: number; target: number | null; name?: string | null; direction?: TargetDirection | null;
  /** For a date to meet: the day it is due, in words, and whether that day has passed. */
  dueDay?: string | null; isPast?: boolean;
}): Journey {
  const { start, now, target } = a;
  const name = a.name ?? '';
  if (a.direction === 'RATE' || a.direction === 'DEADLINE' || a.direction === 'ZERO') {
    return {
      direction: a.direction === 'ZERO' ? 'down' : a.direction === 'RATE' ? 'up' : 'unknown',
      start, now, target, covered: null,
      say: theOtherKindsSay(a.direction, a),
    };
  }
  const said = a.direction === 'AIM' || a.direction === 'LIMIT' ? a.direction : null;
  /* An aim the lead set is reached by going up to it, wherever it started. */
  const direction = said === 'AIM' ? (start == null || start === target ? whichWayIsGood(start, target) : 'up') : whichWayIsGood(start, target);
  const where = start != null ? `It was ${read(start)} at the start and is ${read(now)} now` : `It is ${read(now)} now`;

  if (target == null) {
    /* Tracked rather than counted. GroundObjective.target is nullable for exactly this, and its own
       comment says a qualitative objective is tracked and not counted. */
    return {
      direction, start, now, target,
      say: start != null && start !== now ? `It was ${read(start)} at the start and is ${read(now)} now.` : now === 0 ? 'Nothing has been counted for it yet.' : `It is ${read(now)} so far.`,
      covered: null,
    };
  }

  /* A limit: over it, or within it. Lower is the good way, and there is no distance to fill. */
  if (said === 'LIMIT' || (said == null && SAYS_IT_IS_A_LIMIT.test(name))) {
    return {
      direction: 'down', start, now, target, covered: null,
      say: now > target
        ? `${where}, which is ${read(now - target)} over the limit of ${read(target)}.`
        : `${where}, within the limit of ${read(target)}.`,
    };
  }

  /* Nothing says which way is good, it started at 0, and it is past the number: say only where it is. */
  if (said == null && !SAYS_IT_IS_AN_AIM.test(name) && (start == null || start === 0) && now > target) {
    return { direction: 'unknown', start, now, target, covered: null, say: `${where}, against ${read(target)}.` };
  }

  if (start == null) {
    /* No first snapshot: the target predates anybody counting, or the round never completed. Saying
       where it is and what was said is still true; claiming distance covered would not be. */
    return { direction, start, now, target, say: `It is ${read(now)} now, and the aim is ${read(target)}.`, covered: null };
  }

  /* An aim the lead set that started above its number has already been reached: nothing to fill. */
  const covered = said === 'AIM' && start > target ? 100 : howFar(start, now, target);
  const reached = said === 'AIM' ? now >= target : direction === 'down' ? now <= target : now >= target;
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
