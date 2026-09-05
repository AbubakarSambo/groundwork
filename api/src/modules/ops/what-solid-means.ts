/**
 * WHAT "SOLIDIFY THE PRODUCT" MEANS, SO IT CAN BE FINISHED.
 *
 * Her definition, and the whole of it: "every bug fixed and use case is working
 * well. No bottlenecks."
 *
 * That is three counts, and every one of them is already in this system. So the
 * item does not carry a status somebody moves to "done" — it carries a number,
 * and the number says whether it is done. This is the one place on the roadmap
 * where a claim would most easily outrank a count, because "the product is
 * solid" is exactly the kind of thing everybody agrees with in a meeting and
 * nobody has measured.
 *
 * IT IS DELIBERATELY UNFORGIVING. Not "most bugs" or "the important use cases".
 * All three at zero. A definition with a threshold in it is a definition
 * somebody negotiates on the day, and the point of writing it down in September
 * is to stop that argument happening in October.
 */

export interface WhatIsLeft {
  bugsOpen: number;
  useCasesNotWorking: number;
  bottlenecks: number;
}

export function isSolid(left: WhatIsLeft): boolean {
  return left.bugsOpen === 0 && left.useCasesNotWorking === 0 && left.bottlenecks === 0;
}

/**
 * What is left, in a sentence, naming the part that is not done.
 *
 * Never a percentage. "Eighty per cent solid" is a number that sounds like
 * progress and answers nothing — the question is which use case still does not
 * work, and for whom.
 */
export function whatIsLeftToSay(left: WhatIsLeft): string {
  if (isSolid(left)) {
    return 'Every bug is fixed, every use case works, and nothing is blocked. The product is solid.';
  }

  const outstanding = [
    left.bugsOpen > 0 && `${left.bugsOpen} ${left.bugsOpen === 1 ? 'bug' : 'bugs'} open`,
    left.useCasesNotWorking > 0 &&
      `${left.useCasesNotWorking} use ${left.useCasesNotWorking === 1 ? 'case does' : 'cases do'} not work yet`,
    left.bottlenecks > 0 && `${left.bottlenecks} ${left.bottlenecks === 1 ? 'company is' : 'companies are'} blocked`,
  ].filter(Boolean) as string[];

  return `Not yet: ${outstanding.join(', ')}.`;
}
