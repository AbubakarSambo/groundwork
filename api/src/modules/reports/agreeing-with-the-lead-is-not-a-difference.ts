import { aDealsFigure } from '../board/a-deals-units-are-not-a-target';
import { theNumbersIn } from './a-number-written-as-a-word-is-a-number';

/**
 * SAYING THE SAME TARGET AS SOMEBODY ELSE IS NOT A DIFFERENCE WITH THEM (engine test, second run, Drop Access, Tuesday to Thursday).
 *
 * Mercy said on Monday "My target is 30 units" and "We're all aiming for that 120 total as a team.", which is what Grace said ("hitting
 * our target of 120 units sold by October 30th", "30 units for each of you"). On Tuesday Grace said of her own deal "The 20 units for
 * Mr. Kiprop are a separate potential deal I am working on." and "My proposed units for Mr. Kiprop would add to the overall target".
 * Mercy never spoke of Grace's deal. The shared picture still wrote a difference between them, "It is not clear if your sales are part
 * of the team's 120-unit goal or are in addition to it", with Mercy's side "Describes the goal as '120 total as a team'", and from
 * Tuesday to Thursday Grace's board said "You and Mercy Wairimu have different understandings of the team's goal."
 *
 * The record proves it is not a difference between them: every figure on one side was said by the other person too, and the other
 * side's own figure is one the first person never said, and its own person said it as a deal's figure (naming a customer, a deal, or
 * the business it sells to).
 * One of them spoke about something the other did not; they did not say different things about the same thing. Only on a sales
 * check-in, where the customers on record tell a deal's figure from a target.
 */

export interface ASide { label: string; view: string }

const FIGURES_IN_A_VIEW = (t: string): number[] => [...String(t ?? '').matchAll(/(?<![\d.,])\d[\d,]*(?:\.\d+)?(?![\d])/g)]
  .map((m) => Number(m[0].replace(/,/g, '')))
  .filter((n) => Number.isFinite(n) && !(n >= 1900 && n <= 2100));

/** Whether the two sides of a difference are not a difference between these two people, from their own lines. */
export function isNotADifferenceBetweenThem(
  sides: readonly ASide[],
  linesOf: (label: string) => string[] | null,
  customers: readonly string[] | null,
  people: readonly string[] = [],
): boolean {
  if (!customers || sides.length !== 2) return false;
  const [a, b] = sides;
  if (!a.label || !b.label || a.label === b.label) return false;
  const one = (p: ASide, q: ASide): boolean => {
    const pLines = linesOf(p.label);
    const qLines = linesOf(q.label);
    if (!pLines?.length || !qLines?.length) return false;
    const pSaid = new Set(pLines.flatMap((l) => theNumbersIn(l)));
    const qSaid = new Set(qLines.flatMap((l) => theNumbersIn(l)));
    const pFigures = FIGURES_IN_A_VIEW(p.view);
    const qFigures = FIGURES_IN_A_VIEW(q.view);
    if (!pFigures.length || !qFigures.length) return false;
    /* Every figure on p's side, q said too. */
    if (!pFigures.every((n) => qSaid.has(n))) return false;
    /* And q's own figure is one p never said, and q said it as a deal's figure. */
    const qsOwn = qFigures.filter((n) => !pSaid.has(n));
    if (!qsOwn.length) return false;
    return qsOwn.every((n) => {
      const saying = qLines.filter((l) => theNumbersIn(l).includes(n));
      return saying.some((l) => aDealsFigure(l, customers, people));
    });
  };
  return one(a, b) || one(b, a);
}

/** The differences with every one that is not a difference between its two people left out, and the topics left out, for the log. */
export function withoutDifferencesNobodyHad<D extends { topic?: unknown; positions?: unknown }>(
  divergences: readonly D[],
  linesOf: (label: string) => string[] | null,
  customers: readonly string[] | null,
  people: readonly string[] = [],
): { divergences: D[]; leftOut: string[] } {
  const leftOut: string[] = [];
  const kept = (divergences ?? []).filter((d) => {
    const sides = (Array.isArray(d?.positions) ? d.positions : []).map((x: any) => ({ label: String(x?.participantLabel ?? ''), view: String(x?.view ?? '') }));
    const gone = isNotADifferenceBetweenThem(sides, linesOf, customers, people);
    if (gone) leftOut.push(String(d?.topic ?? ''));
    return !gone;
  });
  return { divergences: kept, leftOut };
}
