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
  /** Whose it is, in the keys we push people under. Absent rather than guessed. */
  ownerExternalId?: string;
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

/**
 * A SHORT, STABLE FINGERPRINT OF WHAT IS BEING SENT.
 *
 * For the idempotency key, which promises "this exact write, once". Keyed on the
 * record's id alone, the first push wins forever and every later change is
 * refused with a 409 — which is the API being right and the caller being wrong.
 *
 * Sorted keys, because two objects with the same fields in a different order are
 * the same write, and JSON.stringify does not think so.
 */
export function fingerprint(payload: object): string {
  const stable = JSON.stringify(payload, Object.keys(payload as Record<string, unknown>).sort());
  let hash = 0;
  for (let i = 0; i < stable.length; i += 1) {
    hash = (hash * 31 + stable.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

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
  /** Whose objective it is, as OUR id for that person. Mapped to their key below. */
  ownerId?: string | null;
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

/**
 * WE PUSHED OBJECTIVES THAT BELONGED TO NOBODY.
 *
 * `ownerExternalId` was never sent, so every objective in Groundwork had no
 * owner — and the one question a person is most likely to ask the assistant,
 * "what am I on", answered "nothing your organisation has sent us lists you as
 * an owner or contributor on" to everybody, correctly, for months.
 *
 * It reads as a person having no work. It was every objective having no person.
 * Found by assembling what is true for somebody and seeing a zero that should
 * not have been one.
 *
 * `whoOwnsIt` maps our id for a person to the key we push them under, and an
 * objective whose owner we cannot resolve is sent WITHOUT an owner rather than
 * with a guessed one: an objective attributed to the wrong person is worse than
 * one attributed to nobody, because it is believed.
 */
export function subjectsFrom(
  objectives: ObjectiveShape[],
  whoOwnsIt: (ownerId: string | null | undefined) => string | null = () => null,
): SubjectPayload[] {
  return objectives.flatMap((objective) =>
    objective.keyResults.map((kr) => ({
      externalId: kr.id,
      ownerExternalId: whoOwnsIt(objective.ownerId) ?? undefined,
      sourceSystem: OUR_SOURCE_SYSTEM,
      type: 'objective',
      title: `${objective.title} - ${kr.title}`,
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
      text: `${objective.title} - ${kr.title}`,
      measure: kr.unit,
      target: String(kr.target),
      /* The reason travels to the session, not only to the graph. A check-in
         facing a shortfall can then ask whether the reason still holds. */
      whyThisNumber: kr.justification ?? undefined,
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
