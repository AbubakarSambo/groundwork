import { runsOrSetItUp, readsAsAnAdmin, type CheckInInView } from '../grounds/who-may-read-this-check-in';
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

/**
 * WHO READS A GOAL THE LEAD HAS NOT TOLD THEM ABOUT (decisions 3, 5, 48, 56 and 86): the lead who runs the check-in, the admin who set
 * it up, and every admin of the organisation, who read every board and report (decision 5) and the aims and limits (decision 86.3).
 * The goal is hidden from "that person" (decisions 48 and 56), not from the people who run the work. The one exception is the
 * exception to everything an admin reads: on a performance plan, a promotion, a renewal or a probation an admin was not given access
 * to, they read none of that check-in (decision 5), so they read no goal in it either.
 *
 * Every caller asks this and passes the answer as `isTheLead`, so nobody answers it from `initiatorId` alone. The reader is
 * `{ userId, role, organizationId }`; the check-in carries its own organisation and scenario (and status and approver, so the admin
 * asked to approve an evaluation check-in reads it as they read the rest of it). A reader given only a user id is read as a person
 * with no role, so only the lead and the admin who set it up pass. An admin who takes part as a person is read as that person. A lead of the same department, a colleague and the person it is
 * about do not (colleagues: row 24 of `docs/privacy-restrictions-for-hafsah.md`).
 */
export function theyRunThisCheckIn(
  reader: string | null | undefined | { userId?: string | null; role?: string | null; organizationId?: string | null },
  checkIn: Omit<Partial<CheckInInView>, 'participants'> & { initiatorId?: string | null; createdByUserId?: string | null; participants?: { userId: string | null; managingOnly?: boolean | null }[] },
): boolean {
  const viewer = reader && typeof reader === 'object' ? reader : { userId: reader ?? null };
  if (runsOrSetItUp(viewer.userId, checkIn)) return true;
  if (!checkIn.organizationId) return false;
  /* An admin who takes part in it as a person is, for this, a person in it: the goal is hidden from that person (decisions 48 and 56). */
  if ((checkIn.participants ?? []).some((p) => !!viewer.userId && p.userId === viewer.userId && !p.managingOnly)) return false;
  return readsAsAnAdmin(viewer, { ...checkIn, organizationId: checkIn.organizationId, scenario: checkIn.scenario, initiatorId: checkIn.initiatorId ?? null });
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function namesOf(p: ABoardPerson | undefined): string[] {
  if (!p) return [];
  const first = (p.user?.firstName ?? '').trim();
  const last = (p.user?.lastName ?? '').trim();
  return [`${first} ${last}`.trim(), first, (p.nameGiven ?? '').trim()].filter((n) => n.length > 1);
}

/**
 * DO THE OBJECTIVE'S WORDS SAY THE GOAL'S WORK? By the number, where the goal has one: the objective must carry the same number,
 * and, where the goal names any work (a word of five letters or more that is not somebody's name), a word of the same work. A goal
 * with a number and no such word ("Sell 200 bags a week.") is matched on the number alone. By the work, where the goal has no number:
 * the objective must share more than one meaningful word (or all of them, where the goal has only one), because one shared word such
 * as "client" is the same department, not the same goal. A goal with neither a number nor a word of work ("Do more.") matches nothing
 * by its words: it is told apart from the person's other objectives by nothing, so it hides nothing beyond its own words (decision 86).
 */
function theObjectiveSaysTheWorkOf(name: string, target: unknown, said: string, namesToIgnore: ReadonlySet<string>): boolean {
  const want = theNumberAndWorkOfAGoal(said);
  const have = theNumberAndWorkOfAGoal(`${name} ${target ?? ''}`);
  const work = [...want.work].filter((w) => !namesToIgnore.has(w));
  if (want.numbers.size) {
    if (![...want.numbers].some((n) => have.numbers.has(n))) return false;
    return !work.length || work.some((w) => have.work.has(w));
  }
  if (!work.length) return false;
  return work.filter((w) => have.work.has(w)).length >= Math.min(2, work.length);
}

function theObjectiveIsThisGoal(o: { id?: string | null; name?: string | null; target?: number | string | null }, goal: AnUntoldGoalRow, namesToIgnore: ReadonlySet<string>): boolean {
  if (o.id && goal.id && o.id === goal.id) return true;
  const said = String(goal.text ?? '');
  if (!said.trim()) return false;
  const name = String(o.name ?? '');
  const p = plainWords(name);
  const g = plainWords(said);
  if (g.length >= 12 && p.length >= 12 && (p.includes(g) || g.includes(p))) return true;
  return theObjectiveSaysTheWorkOf(name, o.target, said, namesToIgnore);
}

/**
 * IS THIS OBJECTIVE THE GOAL THE LEAD HAS NOT TOLD THEM ABOUT? By its id where the two share one; otherwise by the
 * goal's own words appearing in it, or by what `theObjectiveSaysTheWorkOf` finds. People's names are not the work. Never an
 * objective that is one of the goals the person WAS told (`told`): it matches those the same way, and is kept (decision 86).
 */
export function isThisTheUntoldGoal(
  o: { id?: string | null; name?: string | null; target?: number | string | null },
  goal: AnUntoldGoalRow,
  namesToIgnore: ReadonlySet<string> = new Set(),
  told: readonly AnUntoldGoalRow[] = [],
): boolean {
  if (o.id && goal.id && o.id === goal.id) return true;
  if (!String(goal.text ?? '').trim()) return false;
  const name = String(o.name ?? '');
  const p = plainWords(name);
  const g = plainWords(String(goal.text ?? ''));
  if (g.length >= 12 && p.length >= 12 && (p.includes(g) || g.includes(p))) return true;
  if (told.some((t) => theObjectiveIsThisGoal(o, t, namesToIgnore))) return false;
  return theObjectiveSaysTheWorkOf(name, o.target, String(goal.text ?? ''), namesToIgnore);
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
      const told = untold.filter((g) => g.participantId === id && !notToldYet(g));
      /* Only the untold goal itself goes (request 125): their other objectives, which they were told, stay. */
      if (untold.some((g) => g.participantId === id && notToldYet(g) && isThisTheUntoldGoal(o, g, ignore.get(id), told))) return false;
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
