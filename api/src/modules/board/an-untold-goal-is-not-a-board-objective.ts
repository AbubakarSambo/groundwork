import { notToldYet, aWeekHasPassedSinceNotTold, whatThePersonReadsAfterAWeek, theNumberAndWorkOfAGoal } from '../grounds/a-goal-not-told-stays-with-the-lead';

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
  id?: string | null;
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
  id?: string | null;
  name: string;
  target?: number | string | null;
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

/**
 * IS THIS OBJECTIVE THE GOAL THE LEAD HAS NOT TOLD THEM ABOUT? By its id where the two share one; otherwise by the
 * goal's own words appearing in it, or by the same number beside words about the same work, or (a goal with no
 * number) by at least one word of the work they share. People's names are not the work. A goal with no word of
 * work in it at all cannot be told apart from the person's other objectives, so every one the lead set for them
 * is read as it (the more private way, as before). Never by a guess at the topic beyond that.
 */
export function isThisTheUntoldGoal(
  o: { id?: string | null; name?: string | null; target?: number | string | null },
  goal: AnUntoldGoalRow,
  namesToIgnore: ReadonlySet<string> = new Set(),
): boolean {
  if (o.id && goal.id && o.id === goal.id) return true;
  const said = String(goal.text ?? '');
  const name = String(o.name ?? '');
  if (!said.trim()) return false;
  const p = plainWords(name);
  const g = plainWords(said);
  if (g.length >= 12 && p.length >= 12 && (p.includes(g) || g.includes(p))) return true;
  const want = theNumberAndWorkOfAGoal(said);
  const have = theNumberAndWorkOfAGoal(`${name} ${o.target ?? ''}`);
  const work = [...want.work].filter((w) => !namesToIgnore.has(w));
  if (!work.length) return !want.numbers.size;
  const sharesWork = work.some((w) => have.work.has(w));
  if (want.numbers.size) return sharesWork && [...want.numbers].some((n) => have.numbers.has(n));
  return sharesWork;
}

const plainWords = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();

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
  const ignore = new Map<string, Set<string>>();
  for (const id of untoldFor) ignore.set(id, new Set(people.flatMap((p) => namesOf(p)).flatMap((n) => [...theNumberAndWorkOfAGoal(n).work])));
  const kept = objectives.filter((o) => {
    for (const id of untoldFor) {
      /* What the person set themselves is theirs. */
      if (o.setByParticipantId && o.setByParticipantId === id) continue;
      const theirs = o.ownerParticipantId === id || (aboutThem.get(id) ?? []).some((re) => re.test(o.name ?? ''));
      if (!theirs) continue;
      /* Only the untold goal itself goes (request 125): their other objectives, which they were told, stay. */
      if (untold.some((g) => g.participantId === id && notToldYet(g) && isThisTheUntoldGoal(o, g, ignore.get(id)))) return false;
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

/**
 * THE WORDS A READER MUST NOT BE GIVEN IN ANY SENTENCE (decisions 48 and 56): the lead's stored goal, and the
 * objectives the engine wrote from it in its own words (the ones `withoutWhatTheLeadHasNotToldThemAbout` takes
 * out of the list). Every place that serves text to a person runs these through `withoutGoalsNotToldIn`, so a
 * sentence cannot give back what the list leaves out. Empty for the lead.
 */
export function theWordsOfWhatTheLeadHasNotToldThemAbout<T extends AnObjectiveRow>(
  objectives: readonly T[],
  untold: readonly AnUntoldGoalRow[],
  people: readonly ABoardPerson[],
  isTheLead: boolean,
): string[] {
  if (isTheLead) return [];
  const { kept } = withoutWhatTheLeadHasNotToldThemAbout(objectives, untold, people, false);
  const left = new Set<T>(objectives.filter((o) => !kept.includes(o)));
  return [
    ...untold.filter(notToldYet).map((g) => String(g.text ?? '')),
    ...[...left].map((o) => String(o.name ?? '')),
  ].filter((t) => t.trim());
}
