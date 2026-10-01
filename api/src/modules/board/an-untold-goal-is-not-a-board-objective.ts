import { notToldYet, aWeekHasPassedSinceNotTold, whatThePersonReadsAfterAWeek } from '../grounds/a-goal-not-told-stays-with-the-lead';

/**
 * A GOAL THE LEAD HAS NOT TOLD THE PERSON ABOUT IS NOT ON THE BOARD'S OBJECTIVES (decision 56).
 *
 * The goal itself is kept off the board's sentences by `withoutGoalsNotToldIn`, which matches the words of the
 * lead's stored goal. But the lead says a goal inside the check-in too ("We need eight renewals per quarter"),
 * and the engine writes that as a board objective in its own words, "Nathan needs to meet his renewal targets
 * of eight per quarter.", beside a row owned by Nathan with the number 8. Neither shares a sentence with the
 * stored goal, so both reached Nathan before Caroline had told him.
 *
 * So the board's objectives are read against the untold goals as well. For anybody who is not the lead, an
 * objective the lead set (not one the person set themselves) is left out when it is OWNED by a person the lead
 * has an untold goal for, or when it NAMES that person. Never by a guess at its topic: a team's own objective
 * that does not name the person stays.
 *
 * Once a week has passed still not told, the person (and only that person) reads, in place of the numbers,
 * "Caroline has set a goal about this work, and will talk it through with you." with no number.
 */

export interface AnUntoldGoalRow {
  participantId: string | null;
  text: string | null;
  awareness?: string | null;
  authoredBy?: string | null;
  createdAt?: Date | string | null;
}

export interface ABoardPerson {
  id: string;
  nameGiven?: string | null;
  user?: { firstName?: string | null; lastName?: string | null } | null;
}

export interface AnObjectiveRow {
  name: string;
  ownerParticipantId?: string | null;
  setByParticipantId?: string | null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function namesOf(p: ABoardPerson | undefined): string[] {
  if (!p) return [];
  const first = (p.user?.firstName ?? '').trim();
  const last = (p.user?.lastName ?? '').trim();
  return [`${first} ${last}`.trim(), first, (p.nameGiven ?? '').trim()].filter((n) => n.length > 1);
}

export function withoutWhatTheLeadHasNotToldThemAbout<T extends AnObjectiveRow>(
  objectives: readonly T[],
  untold: readonly AnUntoldGoalRow[],
  people: readonly ABoardPerson[],
  isTheLead: boolean,
): { kept: T[]; untoldFor: Set<string> } {
  const untoldFor = new Set<string>();
  if (isTheLead) return { kept: [...objectives], untoldFor };
  for (const g of untold) if (g.participantId && notToldYet(g)) untoldFor.add(g.participantId);
  if (!untoldFor.size) return { kept: [...objectives], untoldFor };
  const aboutThem = new Map<string, RegExp[]>();
  for (const id of untoldFor) {
    aboutThem.set(id, namesOf(people.find((p) => p.id === id)).map((n) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(n)}(?![\\p{L}\\p{N}])`, 'iu')));
  }
  const kept = objectives.filter((o) => {
    for (const id of untoldFor) {
      /* What the person set themselves is theirs. */
      if (o.setByParticipantId && o.setByParticipantId === id) continue;
      if (o.ownerParticipantId === id) return false;
      if ((aboutThem.get(id) ?? []).some((re) => re.test(o.name ?? ''))) return false;
    }
    return true;
  });
  return { kept, untoldFor };
}

/** The sentences a person reads for each goal past its week, in place of the numbers. Only for that person. */
export function whatThePersonReadsOfTheirOwnUntoldGoals(
  untold: readonly (AnUntoldGoalRow & { area: string })[],
  meId: string | null,
  leadName: string,
  now: Date = new Date(),
): string[] {
  if (!meId) return [];
  const out: string[] = [];
  for (const g of untold) {
    if (g.participantId !== meId || !aWeekHasPassedSinceNotTold(g, now)) continue;
    const s = whatThePersonReadsAfterAWeek(leadName, g.area);
    if (!out.includes(s)) out.push(s);
  }
  return out;
}
