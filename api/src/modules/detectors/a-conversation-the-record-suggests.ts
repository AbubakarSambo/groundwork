/**
 * WHICH CONVERSATION IS NEEDED, WORKED OUT RATHER THAN CHOSEN FROM A MENU.
 *
 * The spec's own sentence decides the shape of everything here: "detection is a proposal, never a
 * launch". And it says where that matters most - a system that silently opens a performance
 * improvement conversation because a detector crossed a line is a system nobody will let near their
 * staff. So nothing in this file creates a ground. It produces a suggestion addressed to a named
 * person, with the evidence that produced it and how sure it is.
 *
 * CONTRACT_RENEWAL IS NOT HERE, and its absence is deliberate rather than an omission. It triggers
 * on a renewal date on a client record, and client records were cut from this build. A detector
 * that cannot fire is worse than one that does not exist, because somebody eventually wonders why
 * they have never seen one.
 */
import { GroundScenario } from '@prisma/client';

export type Candidate = {
  scenario: GroundScenario;
  subjectExternalId: string | null;
  personExternalId: string | null;
  /** The authority who confirms. Subject owner, lead, or the person themselves. */
  proposeTo: string;
  evidence: Record<string, unknown>;
  confidence: number;
  says: string;
};

/** How long a proposal stands before it stops asking. Silence is not consent, nor refusal. */
export const CANDIDATE_LIFE_DAYS = 14;

/** How long a decline suppresses the same suggestion. Otherwise the assistant nags. */
export const COOLING_DAYS = 90;

export type PersonRow = {
  externalId: string;
  managerExternalId: string | null;
  active: boolean;
};

export type AssignmentRow = {
  personExternalId: string;
  roleName: string;
  startedAt: Date;
  endedAt: Date | null;
  predecessorAssignmentId: string | null;
  successorPersonExternalId: string | null;
};

export type SubjectRow = {
  externalId: string;
  title: string;
  ownerExternalId: string | null;
  contributorExternalIds: string[];
  dueDate: Date | null;
  createdAt: Date;
};

export type FindingRow = {
  key: string;
  severity: string;
  personExternalId: string | null;
  subjectExternalId: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

/**
 * NEW_HIRE - somebody starting, with nobody to take over from.
 *
 * Proposed to their MANAGER, not to them. Somebody in their first week being asked to confirm they
 * would like to be onboarded is being asked to do their manager's job on day one.
 */
export function newHire(assignments: AssignmentRow[], people: PersonRow[], now: Date): Candidate[] {
  const managerOf = new Map(people.map((p) => [p.externalId, p.managerExternalId]));
  return assignments
    .filter((a) => !a.endedAt && !a.predecessorAssignmentId)
    .filter((a) => (now.getTime() - a.startedAt.getTime()) / 86_400_000 <= 30)
    .map((a) => {
      const manager = managerOf.get(a.personExternalId) ?? null;
      /* Without a manager there is no authority to ask, and asking the new starter themselves is
         the one thing this must not do. Their absence is a `no_lead` finding, not this. */
      if (!manager) return null;
      return {
        scenario: GroundScenario.NEW_HIRE,
        subjectExternalId: null,
        personExternalId: a.personExternalId,
        proposeTo: manager,
        evidence: { roleName: a.roleName, startedAt: a.startedAt.toISOString() },
        confidence: 0.9,
        says: `They started as ${a.roleName} and nobody held it before them.`,
      };
    })
    .filter(Boolean) as Candidate[];
}

/** ROLE_HANDOVER - an assignment ending with a successor named. Proposed to the successor. */
export function roleHandover(assignments: AssignmentRow[], now: Date): Candidate[] {
  return assignments
    .filter((a) => a.endedAt && a.successorPersonExternalId)
    .filter((a) => (now.getTime() - a.endedAt!.getTime()) / 86_400_000 <= 30)
    .map((a) => ({
      scenario: GroundScenario.ROLE_HANDOVER,
      subjectExternalId: null,
      personExternalId: a.successorPersonExternalId,
      /*
       * To the successor rather than the leaver, and the timing is the reason: the leaver is on
       * their way out and has the least incentive of anybody to open one more conversation.
       */
      proposeTo: a.successorPersonExternalId!,
      evidence: { roleName: a.roleName, endedAt: a.endedAt!.toISOString(), predecessor: a.personExternalId },
      confidence: 0.95,
      says: `They have taken over ${a.roleName} from somebody who has left it.`,
    }));
}

/** NEW_PROJECT - a new subject with two or more contributors and no history behind it. */
export function newProject(subjects: SubjectRow[], now: Date, withHistory: Set<string>): Candidate[] {
  return subjects
    .filter((s) => (now.getTime() - s.createdAt.getTime()) / 86_400_000 <= 30)
    .filter((s) => s.contributorExternalIds.length >= 2)
    .filter((s) => !withHistory.has(s.externalId))
    .filter((s) => !!s.ownerExternalId)
    .map((s) => ({
      scenario: GroundScenario.NEW_PROJECT,
      subjectExternalId: s.externalId,
      personExternalId: null,
      proposeTo: s.ownerExternalId!,
      evidence: { title: s.title, contributors: s.contributorExternalIds.length },
      confidence: 0.7,
      /*
       * THE OWNER IS ON IT TOO, AND THE SENTENCE WAS LEAVING THEM OUT.
       *
       * It counted contributors and said "people", so it read "2 people are on it" about a piece of
       * work three people are on — every time, because this detector only ever looks at subjects
       * that HAVE an owner. Somebody deciding whether to open a conversation was being told a number
       * smaller than the truth.
       *
       * The THRESHOLD above is untouched: which subjects produce a suggestion is a product rule that
       * predates this, and quietly widening it here would change what every customer is offered.
       */
      says: `${s.contributorExternalIds.length + 1} people are on it and nobody has checked in about it yet.`,
    }));
}

/** How many people must diverge on one subject before it is the team rather than a pair. */
export const REALIGN_MINIMUM_PEOPLE = 3;

/**
 * DRIFT and REALIGN_TEAM, which are the same evidence at two sizes.
 *
 * Kept in one function because they are decided together: the same subject cannot be both, and
 * computing them apart is how two suggestions about one thing end up in front of one person.
 */
export function drifting(findings: FindingRow[], subjects: SubjectRow[]): Candidate[] {
  const owner = new Map(subjects.map((s) => [s.externalId, s.ownerExternalId]));
  const title = new Map(subjects.map((s) => [s.externalId, s.title]));

  const bySubject = new Map<string, Set<string>>();
  const unmentioned = new Set<string>();
  for (const f of findings) {
    if (!f.subjectExternalId) continue;
    if (f.key === 'goal_divergence' && f.personExternalId) {
      const set = bySubject.get(f.subjectExternalId) ?? new Set<string>();
      set.add(f.personExternalId);
      bySubject.set(f.subjectExternalId, set);
    }
    if (f.key === 'objective_unmentioned') unmentioned.add(f.subjectExternalId);
  }

  const out: Candidate[] = [];
  const claimed = new Set<string>();

  for (const [subjectExternalId, people] of bySubject) {
    const to = owner.get(subjectExternalId);
    if (!to) continue;
    const big = people.size >= REALIGN_MINIMUM_PEOPLE;
    claimed.add(subjectExternalId);
    out.push({
      scenario: big ? GroundScenario.REALIGN_TEAM : GroundScenario.DRIFT,
      subjectExternalId,
      personExternalId: null,
      proposeTo: to,
      evidence: { diverging: people.size, title: title.get(subjectExternalId) },
      /* More people describing it differently is more evidence, capped so it never reads as certain
         - it is still a suggestion about how a team is talking. */
      confidence: Math.min(0.9, 0.5 + people.size * 0.1),
      says: big
        ? `${people.size} people describe this objective as different work.`
        : `Two people describe this objective as different work.`,
    });
  }

  for (const subjectExternalId of unmentioned) {
    /* Divergence beats silence about the same subject: being talked about differently is a live
       problem, and not being talked about is the milder one. */
    if (claimed.has(subjectExternalId)) continue;
    const to = owner.get(subjectExternalId);
    if (!to) continue;
    out.push({
      scenario: GroundScenario.DRIFT,
      subjectExternalId,
      personExternalId: null,
      proposeTo: to,
      evidence: { reason: 'objective_unmentioned', title: title.get(subjectExternalId) },
      confidence: 0.5,
      says: 'Nobody has mentioned this objective in a long time.',
    });
  }
  return out;
}

/** Windows a high-severity finding must persist across before PIP is even suggested. */
export const PIP_WINDOWS = 2;
export const PIP_WINDOW_DAYS = 30;

/**
 * PIP - and this is the one the spec singles out, so it is the one with the most refusals in it.
 *
 * Proposed to their MANAGER and never to them, requires HIGH severity sustained across consecutive
 * windows rather than a single crossing, and carries the lowest confidence of anything here so that
 * whoever reads it reads it as a question.
 */
export function sustainedConcern(findings: FindingRow[], people: PersonRow[], now: Date): Candidate[] {
  const managerOf = new Map(people.map((p) => [p.externalId, p.managerExternalId]));
  const byPerson = new Map<string, FindingRow[]>();
  for (const f of findings) {
    if (f.severity !== 'high' || !f.personExternalId) continue;
    (byPerson.get(f.personExternalId) ?? byPerson.set(f.personExternalId, []).get(f.personExternalId)!).push(f);
  }

  const out: Candidate[] = [];
  for (const [personExternalId, rows] of byPerson) {
    /*
     * SUSTAINED, not "seen twice". A finding first seen last week and last seen yesterday is one
     * situation; the bar is that it has been true across the whole span, which is what distinguishes
     * a bad fortnight from a pattern.
     */
    const spanning = rows.filter((f) => {
      const spanDays = (f.lastSeenAt.getTime() - f.firstSeenAt.getTime()) / 86_400_000;
      const freshDays = (now.getTime() - f.lastSeenAt.getTime()) / 86_400_000;
      return spanDays >= PIP_WINDOWS * PIP_WINDOW_DAYS && freshDays <= PIP_WINDOW_DAYS;
    });
    if (!spanning.length) continue;

    const manager = managerOf.get(personExternalId);
    /*
     * NO MANAGER, NO SUGGESTION. Every other scenario here could fall back to the person themselves;
     * this one cannot. Telling somebody a performance conversation has been suggested about them,
     * with nobody to have it with, is the worst thing this product could do.
     */
    if (!manager) continue;

    out.push({
      scenario: GroundScenario.PIP,
      subjectExternalId: null,
      personExternalId,
      proposeTo: manager,
      evidence: { findings: spanning.map((f) => f.key), sustainedDays: PIP_WINDOWS * PIP_WINDOW_DAYS },
      /* The lowest confidence of anything here, on purpose. */
      confidence: 0.4,
      says: 'The same serious findings have been true for months rather than weeks. Worth a conversation, not a conclusion.',
    });
  }
  return out;
}

/** OKR_ALIGNMENT - an objective cycle boundary coming up. */
export const CYCLE_BOUNDARY_DAYS = 21;

export function cycleBoundary(subjects: SubjectRow[], now: Date): Candidate[] {
  const soon = new Map<string, SubjectRow[]>();
  for (const s of subjects) {
    if (!s.dueDate || !s.ownerExternalId) continue;
    const days = (s.dueDate.getTime() - now.getTime()) / 86_400_000;
    if (days < 0 || days > CYCLE_BOUNDARY_DAYS) continue;
    (soon.get(s.ownerExternalId) ?? soon.set(s.ownerExternalId, []).get(s.ownerExternalId)!).push(s);
  }
  /*
   * ONE PER OWNER, not one per objective. Somebody with six objectives ending in the same fortnight
   * is at a cycle boundary once, and six suggestions would be the assistant nagging with a straight
   * face.
   */
  return [...soon.entries()].map(([ownerExternalId, list]) => ({
    scenario: GroundScenario.OKR_ALIGNMENT,
    subjectExternalId: list.length === 1 ? list[0].externalId : null,
    personExternalId: null,
    proposeTo: ownerExternalId,
    evidence: { ending: list.length, titles: list.slice(0, 5).map((s) => s.title) },
    confidence: 0.6,
    says: list.length === 1
      ? 'This objective is due within the next few weeks.'
      : `${list.length} objectives you own are due within the next few weeks.`,
  }));
}
