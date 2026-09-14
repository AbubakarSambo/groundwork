/**
 * WHEN THIS WOULD HAVE COME UP ON ITS OWN.
 *
 * The most persuasive line on the marketing page, and the product has never said it once:
 *
 *   "Surfaced at check-in 3 of 6. The next time it would have come up on its own is the
 *    end-of-quarter number, when the meeting count will still look healthy."
 *
 * Everything either half of that sentence needs is already on the ground - the measure, when it
 * falls due, the rhythm, and which session this is of how many. What was missing is the sentence.
 * It is the difference between a report saying something true and a report earning the half hour
 * somebody spent on it.
 *
 * IT IS A COUNTERFACTUAL AND MUST NOT BECOME A PREDICTION. It says when the arithmetic would next
 * have been done, which is a fact about the calendar. It never says what the number would have
 * been, whether the objective will be missed, or that anybody would have failed to notice - none of
 * those are knowable, and each one is the kind of confident sentence this product exists not to
 * write.
 *
 * AND IT SAYS NOTHING WHEN THERE IS NO LATER. A one-off read has no next occasion; a final session
 * has none left; a shock has already surfaced, which is why the check-in exists. In all three the
 * honest answer is silence, and silence is cheap - there is no version of this sentence that is
 * worth inventing an occasion for.
 */

export interface WhenItWouldHaveSurfaced {
  /** The occasion, in the words a person would use. */
  occasion: string;
  /** How long away it is, where that is knowable. Null rather than computed from a guess. */
  howFarOff: string | null;
  /** The whole line. */
  say: string;
}

export interface TheOccasionsAhead {
  /** The measure this finding is about, in its own words. */
  measure: string | null;
  /** When that measure falls due, if a date was ever stated. */
  dueOn: Date | null;
  /** How many sessions are planned, and which this is. */
  thisSession: number;
  plannedSessions: number | null;
  /** False for a one-off read, a final session, or anything already in the open. */
  thereIsALater: boolean;
  today?: Date;
}

/** Whole months read better than day counts at this distance, and are honest about their precision. */
function howFarOff(from: Date, to: Date): string | null {
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (days <= 0) return null;
  if (days <= 21) return `${days} days`;
  const weeks = Math.round(days / 7);
  if (days <= 70) return `${weeks} weeks`;
  const months = Math.round(days / 30);
  return `${months} months`;
}

/**
 * The next time the arithmetic would have been done anyway.
 *
 * The due date wins where there is one: that is the moment somebody was always going to look. Where
 * there is not, the end of the run is the honest fallback - the last planned session is when the
 * question gets asked whether anybody scheduled it or not. Where there is neither, there is nothing
 * to say, and this returns null rather than reaching for the next session, which is not an occasion
 * where anything would have surfaced. It is just the next time this same check-in runs.
 */
export function whenThisWouldHaveSurfaced(a: TheOccasionsAhead): WhenItWouldHaveSurfaced | null {
  if (!a.thereIsALater) return null;
  const today = a.today ?? new Date();

  if (a.dueOn && a.dueOn > today) {
    const measure = a.measure?.trim();
    const occasion = measure ? `the ${measure} falling due` : 'the date this was due';
    const far = howFarOff(today, a.dueOn);
    return {
      occasion,
      howFarOff: far,
      say: far
        ? `The next time this would have come up on its own is ${occasion}, ${far} from now.`
        : `The next time this would have come up on its own is ${occasion}.`,
    };
  }

  if (a.plannedSessions && a.plannedSessions > a.thisSession) {
    const left = a.plannedSessions - a.thisSession;
    return {
      occasion: 'the end of this run',
      howFarOff: `${left} check-in${left === 1 ? '' : 's'} away`,
      say: `The next time this would have come up on its own is the end of this run, ${left} check-in${left === 1 ? '' : 's'} away.`,
    };
  }

  return null;
}

/**
 * WHERE THIS SITS ON THE PAGE, SAID ONCE.
 *
 * Under the finding and nowhere else. On its own it is a remark about a calendar; under the thing
 * it is about, it is the reason the thing matters now rather than later.
 */
export const IT_GOES_UNDER_THE_FINDING = 'Renders beneath the finding, never as a block of its own.';
