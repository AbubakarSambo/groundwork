/**
 * A REFERENCE WE CANNOT RESOLVE IS NOT A REFERENCE WE DROP.
 *
 * During a customer's first sync this is the normal case, not the edge case. Objectives and people
 * arrive from different systems on different schedules, so an objective naming `u-8842` routinely
 * lands before `u-8842` does - and some references never resolve at all, because the owner sits
 * outside whatever scope their IdP was configured to send.
 *
 * There are three things we could do and two of them are bugs:
 *
 *   REFUSE THE SUBJECT. Their whole import fails because their two systems are out of step by a few
 *   seconds, which is not an error on their part and not one they can fix.
 *
 *   DROP THE REFERENCE. The subject imports, the owner silently becomes nobody, and the customer
 *   finds out weeks later that half their objectives have no owner. Silent, plausible-looking, and
 *   blamed on their integration when it surfaces - the same shape as an idempotency replay handing
 *   back somebody else's answer.
 *
 *   KEEP IT AND SAY SO. The id we were given is stored exactly as sent, resolution is attempted at
 *   every read, and what did not resolve is reported as a named fact rather than as an absence. It
 *   costs a field in the response and it is the only one of the three that cannot lose data.
 *
 * The third. A reference resolves later, on its own, the moment the person arrives - no
 * reconciliation job, because there is nothing to reconcile: the pointer was never changed.
 */

export interface ResolvedRef {
  externalId: string;
  /** Null when we hold no person with that id. The id itself is always present. */
  person: { userName: string; displayName: string | null; email: string | null; active: boolean } | null;
}

export interface ReferenceResolution {
  owner: ResolvedRef | null;
  contributors: ResolvedRef[];
  /**
   * Every id on this subject that we could not resolve. Present and empty rather than absent when
   * everything resolved, so a client reads one shape either way and a consumer checking
   * `unresolved.length` does not have to know whether the field exists.
   */
  unresolved: string[];
}

export function resolveReferences(
  subject: { ownerExternalId?: string | null; contributorExternalIds?: unknown },
  found: Map<string, { userName: string; displayName: string | null; email: string | null; active: boolean }>,
): ReferenceResolution {
  const ref = (externalId: string): ResolvedRef => ({
    externalId,
    person: found.get(externalId) ?? null,
  });

  const contributorIds = Array.isArray(subject.contributorExternalIds)
    ? (subject.contributorExternalIds as unknown[]).filter((v): v is string => typeof v === 'string' && !!v)
    : [];

  const owner = subject.ownerExternalId ? ref(subject.ownerExternalId) : null;
  const contributors = contributorIds.map(ref);

  /*
   * Ordered owner-first and de-duplicated, because a subject whose owner is also listed as a
   * contributor would otherwise report the same missing id twice and read as two problems.
   */
  const unresolved = [...new Set(
    [owner, ...contributors].filter((r): r is ResolvedRef => !!r && !r.person).map((r) => r.externalId),
  )];

  return { owner, contributors, unresolved };
}

/**
 * A DEACTIVATED PERSON RESOLVES. They are not missing - we know exactly who they are and that they
 * have left, which is a different fact from an id we have never seen and leads somewhere different:
 * one is a handover, the other is a broken reference. Collapsing them would hide every departure
 * inside a list of import problems.
 */
export function departedOwners(r: ReferenceResolution): string[] {
  return [r.owner, ...r.contributors]
    .filter((x): x is ResolvedRef => !!x && !!x.person && !x.person.active)
    .map((x) => x.externalId);
}
