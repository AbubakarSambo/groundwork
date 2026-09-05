/**
 * What of our own work we send to Groundwork, and in what shape.
 *
 * Kept apart from the client on purpose. The client knows how to speak to an
 * API; this knows what is worth saying — and the two change for entirely
 * different reasons.
 *
 * WHAT IS NOT HERE MATTERS AS MUCH. No spend, no expenses, no balance, no
 * funding amounts, no strategic relationships, no commitments, no approvals.
 * Not because Groundwork would misuse them, but because a customer integrating
 * their ERP would send their objectives and their client activity and nothing
 * else, and if we send more than that we are not testing the thing we sell.
 */

export interface SubjectPayload {
  externalId: string;
  sourceSystem: string;
  type: string;
  title: string;
  measure?: string;
  target?: string;
  /* Collected on our own key results and, until this, dropped at the seam —
     so the objective that reached Groundwork had a number and no reason, in
     the one system whose whole argument is that a number opens onto why. */
  justification?: string;
  approach?: string;
  dueDate?: string;
  status?: string;
}

export interface EvidencePayload {
  objectiveExternalId: string;
  observedAt: string;
  state: Record<string, string | number>;
}

export interface InteractionPayload {
  externalId: string;
  personExternalId: string;
  subjectExternalId?: string;
  kind: string;
  occurredAt: string;
  note?: string;
}

/** The one name our records travel under, so nothing else can claim to be us. */
export const OUR_SOURCE_SYSTEM = 'groundwork-ops';

export interface PersonPayload {
  externalId: string
  displayName: string
  email: string
}

export interface PersonShape {
  key: string
  displayName: string
  email: string | null
  active: boolean
}

/**
 * Our team, as an identity provider would send them.
 *
 * Anybody without an email is dropped rather than sent with a blank one: the
 * API accepts a person with no email and then refuses, several calls later, to
 * open a check-in as them — so sending them is worse than not, because it
 * produces a directory entry that looks fine and cannot be used.
 */
export function peopleFrom(people: PersonShape[]): PersonPayload[] {
  return people
    .filter((p) => p.active && p.email)
    .map((p) => ({ externalId: p.key, displayName: p.displayName, email: p.email as string }))
}

export interface ObjectiveShape {
  id: string;
  title: string;
  keyResults: Array<{
    id: string;
    title: string;
    target: number;
    unit: string;
    current: number;
    dueDate: Date;
    typedByHand: boolean;
    justification?: string | null;
    approach?: string | null;
  }>;
}

export function subjectsFrom(objectives: ObjectiveShape[]): SubjectPayload[] {
  return objectives.flatMap((objective) =>
    objective.keyResults.map((kr) => ({
      externalId: kr.id,
      sourceSystem: OUR_SOURCE_SYSTEM,
      type: 'objective',
      title: `${objective.title} — ${kr.title}`,
      measure: kr.unit,
      target: String(kr.target),
      justification: kr.justification ?? undefined,
      approach: kr.approach ?? undefined,
      dueDate: kr.dueDate.toISOString().slice(0, 10),
    })),
  );
}

/**
 * Evidence is counts and short labels, which is the API's own rule and a good one.
 *
 * A number typed by hand is sent with that fact attached, because a check-in
 * built on it should be able to ask a different question than one built on a
 * number the system computed.
 */
/** The same key results, in the shape the check-in's objectives endpoint takes. */
export function objectivesFrom(objectives: ObjectiveShape[]) {
  return objectives.flatMap((objective) =>
    objective.keyResults.map((kr) => ({
      externalId: kr.id,
      text: `${objective.title} — ${kr.title}`,
      measure: kr.unit,
      target: String(kr.target),
    })),
  )
}

export function evidenceFrom(objectives: ObjectiveShape[], observedAt = new Date()): EvidencePayload[] {
  return objectives.flatMap((objective) =>
    objective.keyResults.map((kr) => ({
      objectiveExternalId: kr.id,
      observedAt: observedAt.toISOString(),
      state: {
        current: kr.current,
        target: kr.target,
        unit: kr.unit,
        source: kr.typedByHand ? 'by hand' : 'computed',
      },
    })),
  );
}

export interface ActivityShape {
  id: string;
  kind: string;
  happenedAt: Date;
  actorPersonId: string | null;
  companyId: string | null;
  note: string | null;
}

/**
 * Client activity, with the ones nobody did dropped.
 *
 * An activity with no actor is a system event — a stage stamped by a job, not
 * something a person did. Sending those would make somebody's record of what
 * they did include things they did not do, which is the fastest way to make a
 * check-in about the data rather than about the work.
 */
export function interactionsFrom(activities: ActivityShape[]): InteractionPayload[] {
  return activities
    .filter((a) => a.actorPersonId !== null)
    .map((a) => ({
      externalId: a.id,
      personExternalId: a.actorPersonId as string,
      subjectExternalId: a.companyId ?? undefined,
      kind: a.kind,
      occurredAt: a.happenedAt.toISOString(),
      note: a.note ?? undefined,
    }));
}
