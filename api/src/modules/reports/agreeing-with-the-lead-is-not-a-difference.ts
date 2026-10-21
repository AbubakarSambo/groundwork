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

/**
 * NOT KNOWING A NUMBER IS NOT A DIFFERENT NUMBER (final real-model check, item 13). Grace said "I don't know the team's current total units
 * sold with proof yet. That's what I want to see in their check-ins today." and "I haven't made any specific sales today." Kevin had sold 40
 * units at Kilele Hotel with proof. The report wrote a difference, "you said that no new sales confirmed, while Kevin Omondi said that 40
 * units sold with proof", with her side "Your account indicates that you do not have a current count of the team's sales." She did not say
 * a different count; she said she did not have one, and of her own sales. A side that only says its person does not know, has no count yet,
 * or made no sale of their own is not a side of a difference.
 */
const ONLY_NOT_KNOWING = /\b(?:do(?:es)? not (?:have|know)|don['’]t (?:have|know)|did not (?:have|know)|didn['’]t (?:have|know)|has not got|have not got|not (?:yet )?know(?:n)?|unsure|not sure|no (?:current )?(?:count|total|figure|number)|(?:is|are) (?:still )?waiting (?:for|on) (?:the )?(?:team(?:['’]s)? )?(?:check[\s-]?ins?|updates?|numbers?)|(?:has|have) not made any|haven['’]t made any|hasn['’]t made any|no new sales of (?:her|his|their) own)\b/i;
export function aSideThatOnlyDoesNotKnow(view: string): boolean {
  const v = String(view ?? '').trim();
  if (!v || !ONLY_NOT_KNOWING.test(v)) return false;
  /* A figure of their own beside it is a position ("does not know the exact total, but thinks it is about 30"). */
  return !/\b(?:but|though|thinks|believes|says it is|estimates?)\b/i.test(v) || !FIGURES_IN_A_VIEW(v).length;
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
    const gone = sides.some((x: ASide) => aSideThatOnlyDoesNotKnow(x.view)) || isNotADifferenceBetweenThem(sides, linesOf, customers, people);
    if (gone) leftOut.push(String(d?.topic ?? ''));
    return !gone;
  });
  return { divergences: kept, leftOut };
}
