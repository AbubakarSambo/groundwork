/**
 * Who somebody may put a to-do on.
 *
 * `todos:assign` on its own is too big. It says "may add a row to another
 * person's list" with no bound, so the product lead could put a task on the
 * sales lead's list about sales — which is not what leading product and tech is
 * supposed to buy you, and is the kind of thing that only shows up as friction
 * between two people months later.
 *
 * So the grant is scoped by the org chart that already exists: it reaches the
 * people in a workstream you own, and nobody else. The CEO reaches everybody,
 * through `ceo:board` rather than through a bigger version of this one.
 */

export interface WorkstreamShape {
  ownerPersonId: string;
  oversightPersonId: string | null;
  technicalPartnerPersonId: string | null;
}

export function mayPutAToDoOn(
  assigner: { personId: string; capabilities: readonly string[] },
  targetPersonId: string,
  workstreams: WorkstreamShape[],
): { allowed: boolean; because: string } {
  if (assigner.personId === targetPersonId) {
    return { allowed: true, because: 'Your own list' };
  }

  if (assigner.capabilities.includes('ceo:board')) {
    return { allowed: true, because: 'Runs the company' };
  }

  if (!assigner.capabilities.includes('todos:assign')) {
    return { allowed: false, because: 'Giving somebody else a to-do needs todos:assign' };
  }

  const theirs = workstreams.filter((w) => w.ownerPersonId === assigner.personId);
  const reachable = new Set(
    theirs.flatMap((w) => [w.ownerPersonId, w.oversightPersonId, w.technicalPartnerPersonId]),
  );

  if (reachable.has(targetPersonId)) {
    return { allowed: true, because: 'They work in a workstream you own' };
  }

  return {
    allowed: false,
    because:
      theirs.length === 0
        ? 'You can assign to people in a workstream you own, and you do not own one'
        : 'They do not work in a workstream you own. Ask them, or ask whoever does.',
  };
}
