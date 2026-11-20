import { theUnitOfARound } from '../grounds/the-check-ins-own-schedule';

/**
 * A WEEKLY AIM AGAINST A MONTH'S FIGURE IS NOT TWO PEOPLE DISAGREEING (run 10, day 0 and week 1).
 *
 * The first report of a weekly check-in read "People in this check-in said different things. The team's target is set per week, but sales
 * are being reported per month." One person had said how many they sold "that month", the team's aim is written per week, and the writer
 * was given the figures and the aim but not what a round covers, so it set one against the other and called it a disagreement. The
 * conversation already knows what a round covers (thePeriodOfARound, the same unit from the one owner, theUnitOfARound); the report writer
 * is now told it as context, so a figure for another period is said as what it is, a figure for another period, and not as a card.
 * It is context, appended in code after the stored prompt, so it runs whichever version of the prompt is stored. Nothing matches words.
 */
export function aFigureForAnotherPeriodIsNotADisagreement(cadence: unknown, days: number[] | null | undefined): string | null {
  const unit = theUnitOfARound({ cadence: cadence as any, days });
  if (!unit) return null;
  return `WHAT EACH ROUND COVERS: each round of this check-in covers its own ${unit}, and a number a person gives is their count for that ${unit} unless they say otherwise. Where somebody gives a figure for a different period from the one an aim is set for (a month's sales against an aim set for each ${unit}, or the other way round), that is a difference of period, not two people disagreeing and not an aim and a report contradicting each other. Do not write it as a divergence, a difference or a card. Say in that person's own paragraph what they gave and for what period, and leave the rest to the lead.`;
}
