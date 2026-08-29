/**
 * THE ONE CONTRIBUTION NOBODY CAN CLAIM FOR THEMSELVES.
 *
 * `UNBLOCKING` sat in the enum unproduced, on a comment saying there are no blockers in this
 * product. There were - `GroundDependency` has been written on every check-in for a long time. The
 * premise had gone stale and took the feature with it.
 *
 * What makes this kind worth having is where the evidence comes from. STATED is somebody describing
 * their own work, which is exactly as reliable as they are. UNBLOCKING cannot be self-reported at
 * all: it exists only because the person who was WAITING stopped describing themselves as waiting,
 * and that is what moves the handoff to CLEARED. The person credited said nothing. They may not
 * know it happened.
 *
 * That also makes it the quiet load-bearer's signal - the colleague whose own account is modest and
 * who keeps turning up as the reason other people got moving again.
 */
import { SubjectRef } from './nobody-wrote-the-dependency-down';
import { STOPWORDS } from '../knowledge/knowledge.service';

export type ClearedHandoff = {
  /** What the waiting person said they were waiting for. Never stored - matched and discarded. */
  what: string;
  /** The person who was holding it, resolved across grounds. Null when it sat outside the org. */
  onPersonKey: string | null;
  /** The person who was waiting. Needed only to refuse crediting somebody for their own handoff. */
  fromPersonKey: string;
};

export type UnblockingCredit = {
  personExternalId: string;
  subjectExternalId: string;
  /** HOW MANY people they unblocked on this subject. Never which - see the REFERENCED rule. */
  weight: number;
};

/**
 * The same title matching the rest of the detectors use, so a handoff and a turn agree about what
 * counts as talking about a subject. Restating it here would let the two drift, and a subject that
 * matches in one place and not the other is the shape of bug this codebase keeps finding.
 */
function mentions(what: string, s: SubjectRef): boolean {
  const words = s.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  if (!words.length) return false;
  const flat = what.toLowerCase().replace(/[^a-z0-9]/g, '');
  return words.every((w) => flat.includes(w));
}

export function unblockingCredits(cleared: ClearedHandoff[], subjects: SubjectRef[]): UnblockingCredit[] {
  /*
   * A SET, AND THEN ONLY ITS SIZE - the same decision as REFERENCED, for the same reason. Keeping
   * which colleagues somebody unblocked would be a list of who was stuck, attributed, sitting in a
   * table one careless serialiser away from leaving the boundary. Clearing three people's handoffs
   * is the fact worth having; naming the three is not ours to keep.
   */
  const by = new Map<string, Set<string>>();

  for (const c of cleared) {
    if (!c.onPersonKey) continue;
    /* You cannot unblock yourself. Somebody recording their own outstanding decision and then
       recording it done would otherwise earn a contribution for finishing their own work twice. */
    if (c.onPersonKey === c.fromPersonKey) continue;

    for (const s of subjects) {
      if (!mentions(c.what, s)) continue;
      const k = `${c.onPersonKey}::${s.externalId}`;
      by.set(k, (by.get(k) ?? new Set()).add(c.fromPersonKey));
    }
  }

  return [...by.entries()].map(([k, whoTheyUnblocked]) => {
    const [personExternalId, subjectExternalId] = k.split('::');
    return { personExternalId, subjectExternalId, weight: whoTheyUnblocked.size };
  });
}
