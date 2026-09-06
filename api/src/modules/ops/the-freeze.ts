import { OpsServes } from '@prisma/client';

/**
 * A STABLE PRODUCT, AND NOTHING ADDED TO IT.
 *
 * Phase one's objective, in her words: "no more additions or modifications.
 * Purely make what exists work for the use cases."
 *
 * IT REFUSES NOTHING. IT ROUTES.
 *
 * A hard block is worked around inside a week — the new function is simply filed
 * as a bug fix, and then the freeze has cost the honesty as well as the feature.
 * So work the freeze does not permit goes to the approval queue with the freeze
 * quoted, and whoever proposed it says why this one is worth breaking September
 * for. The exception becomes visible and attributable rather than hidden inside
 * a category nobody audits.
 *
 * THE TEST NEEDS NO NEW JUDGEMENT. Every piece of work already says what it
 * serves. Nobody has to decide "is this a bug" — the field answers it.
 *
 * THE MOAT IS FROZEN TOO. Decided 2026-09-05. The phase-one priority says
 * "stability and moat" and the September instruction says "no more additions",
 * and those pull opposite ways because moat work is usually new function. The
 * September sentence wins: the moat is phase four, "scaling and moat as we
 * scale". Reading it the other way turns on the word "solidify", which is
 * exactly the kind of thing that produces an argument in November.
 */

/** What the freeze lets through without anybody being asked. */
export const PERMITTED_WHILE_FROZEN: OpsServes[] = [
  /* Making an existing, unsupported use case work. Literally the instruction. */
  'SALES',
  /* Security, a broken build, a migration. Not an addition by any reading. */
  'KEEPING_IT_UP',
];

export interface WhatIsBeingProposed {
  serves: OpsServes;
  /**
   * Whether the use case it points at is currently unsupported.
   *
   * Sales work is only "making what exists work" when there is something that
   * does not work. Pointing at a use case we already support is an improvement
   * to something already fine, which is the exact shape of an addition wearing a
   * permitted label.
   */
  theUseCaseIsUnsupported?: boolean;
}

export interface Frozen {
  isOn: boolean;
  because: string;
  until?: Date | null;
}

/**
 * Why this needs somebody to agree, or null when the freeze lets it through.
 *
 * Returns the sentence rather than a boolean, because the sentence is the point:
 * the person hitting this is usually the person who proposed the work, and
 * "forbidden" tells them nothing about what to do next.
 */
export function whyThisNeedsAnException(
  freeze: Frozen | null,
  proposed: WhatIsBeingProposed,
): string | null {
  if (!freeze?.isOn) return null;

  const quoted = `The freeze is on: ${freeze.because}`;

  if (proposed.serves === 'SALES' && proposed.theUseCaseIsUnsupported === false) {
    return `${quoted} That use case is already supported, so this is an improvement to something that works rather than making what exists work. Somebody has to agree it is worth doing in September.`;
  }

  if (PERMITTED_WHILE_FROZEN.includes(proposed.serves)) return null;

  if (proposed.serves === 'MOAT') {
    return `${quoted} The moat is frozen with everything else — it is phase four, scaling and moat as we scale. Somebody has to agree this one cannot wait.`;
  }

  return `${quoted} This is an addition, and September is for making what exists work. Somebody has to agree it is worth breaking that for.`;
}

/**
 * Whether it has outlived its own date.
 *
 * Advisory, and deliberately not automatic. A freeze that lifts itself ends
 * without anybody deciding it should, and the point of the date is to force the
 * conversation rather than to replace it.
 */
export function hasOutlivedItsDate(freeze: Frozen | null, today: Date = new Date()): boolean {
  if (!freeze?.isOn || !freeze.until) return false;
  return freeze.until < today;
}
