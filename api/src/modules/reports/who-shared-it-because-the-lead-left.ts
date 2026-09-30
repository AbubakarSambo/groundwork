/**
 * IF THE LEAD HAS LEFT THE ORGANISATION, AN ADMIN MAY SHARE THE REPORT IN THEIR PLACE (decision 53,
 * changing request 57's "only the lead releases", `only-the-lead-releases.ts`).
 *
 * Request 57 was right that another admin pressing Release while the lead is still here is exactly
 * the thing the lead's own Sessions tab tells them not to do. It did not have an answer for the
 * lead who is simply gone - deactivated, removed, quit - whose check-in would otherwise sit
 * released-never, with a report nobody who is still here is allowed to hand to the people waiting
 * for it. Hafsah, 29 September 2026: an admin may then share it, and everybody is told who did, and
 * why, in a plain sentence.
 *
 * "LEFT" IS THE SAME FLAG THE REST OF THE PRODUCT ALREADY USES: `User.isActive === false`. Both
 * `leaveOrg` and the admin's `remove` (users.service.ts) set it - quitting and being removed read
 * the same way here, which is right: either way, the lead is not coming back to press the button.
 */

/** The one sentence, built once so the release path and every reader of it agree on the words. */
export function whoSharedItBecauseTheLeadLeft(byName: string, leadName: string): string {
  return `${byName} shared this report, because ${leadName} has left the organisation.`;
}

/** The shape kept on the ground's audit log (`Ground.groundAuditLog`, already a free-form JSON
 * column - no schema change needed) under the key `sharedBecauseLeadLeft`, and served back to every
 * reader of the report as `sharedByAnAdmin`. */
export interface SharedBecauseLeadLeft {
  byUserId: string;
  byName: string;
  leadName: string;
  sentence: string;
  at: string;
}

export function fullNameOf(person: { firstName?: string | null; lastName?: string | null } | null | undefined, fallback: string): string {
  const full = [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
  return full || fallback;
}

/**
 * READ BACK OUT AT THE REPORT, for every reader: the fact of who shared it, and why, is not one of
 * this product's private things. `groundAuditLog` is `Ground.groundAuditLog`, read as-is off the row
 * - this is the one place that turns the stored key into what a reader is served.
 */
export function sharedByAnAdminFrom(groundAuditLog: unknown): { byName: string; leadName: string; sentence: string } | undefined {
  if (!groundAuditLog || typeof groundAuditLog !== 'object' || Array.isArray(groundAuditLog)) return undefined;
  const entry = (groundAuditLog as Record<string, unknown>).sharedBecauseLeadLeft;
  if (!entry || typeof entry !== 'object') return undefined;
  const { byName, leadName, sentence } = entry as Record<string, unknown>;
  if (typeof byName !== 'string' || typeof leadName !== 'string' || typeof sentence !== 'string') return undefined;
  return { byName, leadName, sentence };
}
