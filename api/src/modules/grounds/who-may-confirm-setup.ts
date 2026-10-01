/**
 * WHO MAY CONFIRM SETUP ON THIS CHECK-IN: ONE RULE (decision 63, 30 September 2026).
 *
 * "Only the lead confirms setup changes and questions for people, unless the lead has left the
 * organisation; then an admin of that organisation can, and the people on the check-in are told who
 * did it."
 *
 * Before this, the doors disagreed with each other, and with decision 63 itself:
 *   - `applyContextProposal`, `confirmQuestionForPerson` and `declineQuestionForPerson`
 *     (grounds.service.ts) were the lead's alone, with no way through even once the lead had left -
 *     a check-in whose lead left the organisation kept every open question and every proposal
 *     stuck, for ever, with nobody left who could ever confirm one.
 *   - `addContextLine`, `changeContextLine`, `addLeadContext`, `shareLeadContext` and
 *     `stateBaseline` let ANY admin of the organisation confirm at ANY time, whether or not the lead
 *     was still here - the opposite defect: a lead mid-check-in could be silently overridden by any
 *     admin who felt like it.
 *
 * "THE LEAD HAS LEFT" IS THE SAME FLAG THE REST OF THE PRODUCT ALREADY USES:
 * `User.isActive === false` - the flag both `leaveOrg` and the admin's `remove` set
 * (users.service.ts), and the one `who-shared-it-because-the-lead-left.ts` reads for the same
 * question about releasing a report (decision 53). Read here rather than invented again, so "has the
 * lead left" never has two different answers in the same product.
 *
 * Every one of the eight writers above now calls `whoMayConfirmSetup`, so "who may confirm setup
 * here" is decided once.
 */

export interface CheckInForSetupConfirm {
  initiatorId: string | null;
}

export interface LeadAccountState {
  isActive: boolean;
  firstName?: string | null;
  lastName?: string | null;
}

export interface SetupConfirmer {
  role?: string | null;
  organizationId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export type SetupConfirmDecision =
  | { allowed: true; as: 'lead' }
  | { allowed: true; as: 'admin'; confirmedByName: string; leadName: string }
  | { allowed: false };

export function fullNameOr(person: { firstName?: string | null; lastName?: string | null } | null | undefined, fallback: string): string {
  const full = [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
  return full || fallback;
}

/**
 * The decision itself, from what the caller has already looked up.
 *
 * `lead` and `confirmer` are only read once the requester is not the lead themselves - a caller
 * confirming their own check-in never has to look either up, which is the common case and keeps
 * every writer's fast path a single query.
 */
export function whoMayConfirmSetup(
  requestingUserId: string | null | undefined,
  checkIn: CheckInForSetupConfirm,
  opts: { lead?: LeadAccountState | null; confirmer?: SetupConfirmer | null; organizationId?: string | null } = {},
): SetupConfirmDecision {
  if (requestingUserId && checkIn.initiatorId && checkIn.initiatorId === requestingUserId) {
    return { allowed: true, as: 'lead' };
  }
  const { lead, confirmer, organizationId } = opts;
  /* Present, just not the lead: refused, exactly as before. Only once the lead's own account shows
     they have left is anybody else even considered - never guessed from their being away, slow to
     answer, or simply not the one who happened to press this. */
  if (!lead || lead.isActive) return { allowed: false };
  const isAdminHere = confirmer?.role === 'ADMIN' && !!organizationId && confirmer.organizationId === organizationId;
  if (!isAdminHere) return { allowed: false };
  return {
    allowed: true,
    as: 'admin',
    confirmedByName: fullNameOr(confirmer, 'An admin'),
    leadName: fullNameOr(lead, 'The person who ran this check-in'),
  };
}

/**
 * THE ONE SENTENCE (decision 63's "the people on the check-in are told who did it"), built once so
 * every surface that names the admin who confirmed in the lead's place agrees on the words. For
 * example: "Ngozi Bello confirmed this because Tunde Ade has left the organisation."
 */
export function confirmedByAnAdminSentence(byName: string, leadName: string): string {
  return `${byName} confirmed this because ${leadName} has left the organisation.`;
}

/** The one refusal, for a caller who is neither the lead nor (the lead having left) an admin here. */
export const ONLY_THE_LEAD_CONFIRMS_SETUP =
  'Only the person who runs this check-in can change how it is set up. An admin can only do that once that person has left the organisation. Nothing was changed.';

/**
 * THE SAME REFUSAL WITH THE LEAD'S REAL NAME, as a full sentence (request 92, point 8). Used wherever
 * the lead's name is known; the constant above is what is said when it is not.
 */
export function onlyTheLeadConfirmsSetup(leadName: string | null | undefined): string {
  const name = (leadName ?? '').trim();
  if (!name) return ONLY_THE_LEAD_CONFIRMS_SETUP;
  const first = name.split(/\s+/)[0];
  return `Only ${name}, who runs this check-in, can change how it is set up. An admin can only do that once ${first} has left the organisation. Nothing was changed.`;
}

/**
 * DECISION 72's SENTENCE: the brief (what the check-in says it is for) rewritten by an admin because
 * the lead has left, told to everybody on the check-in. For example: "Otieno Kamau changed what this
 * check-in is for because Wanjiru Mwangi has left the organisation."
 */
export function briefChangedByAnAdminSentence(byName: string, leadName: string): string {
  return `${byName} changed what this check-in is for because ${leadName} has left the organisation.`;
}
