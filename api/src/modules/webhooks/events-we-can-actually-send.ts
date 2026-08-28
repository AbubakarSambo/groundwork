/**
 * ONLY EVENTS THAT CAN FIRE ARE OFFERED.
 *
 * The integration spec lists ten: round.completed, checkin.completed, finding.created,
 * finding.escalated, proposal.created, blocker.raised, blocker.escalated, scenario.proposed,
 * handover.ready, graph.conflict_detected. Two of them exist. The other eight describe subsystems
 * that have not been built - there are no proposals, no blockers, no scenario candidates and no
 * handover briefs in this codebase yet.
 *
 * Offering all ten would let an admin subscribe to `blocker.raised`, see it accepted, and wait
 * forever for a message that nothing in the product can send. They would conclude their endpoint
 * was broken and spend a day proving it was not. A subscription that can never fire is a promise
 * the product cannot keep, made in the one place a customer builds against.
 *
 * So this list is the honest one, and it grows as the things that emit them are built. The
 * validation refuses the rest by name, which also means an admin who tries gets told the event does
 * not exist yet rather than being quietly given nothing.
 */
export const SENDABLE_EVENTS = [
  /** Every party is in for a round. The one the delivery discipline hangs on. */
  'round.completed',
  /** One person finished one session. Fires per participant, not per round. */
  'checkin.completed',
] as const;

export type SendableEvent = (typeof SENDABLE_EVENTS)[number];

/**
 * Named so the refusal can explain itself. These are real events in the contract that nothing emits
 * yet - a different answer from a typo, and worth saying differently.
 */
export const NOT_YET_EMITTED = [
  'finding.created',
  'finding.escalated',
  'proposal.created',
  'blocker.raised',
  'blocker.escalated',
  'scenario.proposed',
  'handover.ready',
  'graph.conflict_detected',
] as const;

export function validateEvents(events: string[]): { ok: true } | { ok: false; message: string } {
  if (!events?.length) {
    return { ok: false, message: 'Choose at least one event. An endpoint subscribed to nothing receives nothing.' };
  }
  const unknown = events.filter((e) => !(SENDABLE_EVENTS as readonly string[]).includes(e));
  if (!unknown.length) return { ok: true };

  const notYet = unknown.filter((e) => (NOT_YET_EMITTED as readonly string[]).includes(e));
  const nonsense = unknown.filter((e) => !notYet.includes(e));

  const parts: string[] = [];
  if (nonsense.length) parts.push(`Unknown event(s): ${nonsense.join(', ')}.`);
  if (notYet.length) {
    parts.push(
      `Not emitted yet, so subscribing would receive nothing: ${notYet.join(', ')}.`,
    );
  }
  parts.push(`Available now: ${SENDABLE_EVENTS.join(', ')}.`);
  return { ok: false, message: parts.join(' ') };
}
