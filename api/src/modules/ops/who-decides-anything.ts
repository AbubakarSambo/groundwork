import { OpsCapability, OPS_CAPABILITIES } from './what-somebody-may-do';

/**
 * Whether anything is ever going to wait on this person.
 *
 * Derived from the capability names rather than listed, so a new kind of
 * approval added later is covered on the day it is added — a hand-kept list is
 * the thing that goes stale silently, and going stale here means somebody
 * cannot reach a queue that has their name on it.
 */
export const APPROVAL_CAPABILITIES: OpsCapability[] = OPS_CAPABILITIES.filter((c) =>
  c.endsWith(':approve'),
);

export function decidesSomething(identity: { capabilities: readonly string[] }): boolean {
  return APPROVAL_CAPABILITIES.some((c) => identity.capabilities.includes(c));
}
