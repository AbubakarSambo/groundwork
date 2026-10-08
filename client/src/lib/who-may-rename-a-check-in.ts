/**
 * WHO MAY RENAME A CHECK-IN.
 *
 * A name is what everybody else sees this check-in as, so renaming has always been the same class
 * of change as moving its dates: the lead's call, or - once the lead has left the organisation -
 * an admin's (decision 119, H10). The server enforces exactly this (`mayConfirmSetupOn` /
 * `whoMayConfirmSetup` in grounds.service.ts) and answers 403 otherwise.
 *
 * It lives here rather than inside the rail because the rail and the server were disagreeing: the
 * pencil was offered to every party, and the audit found it inert - press it, type, nothing
 * happens, no error. Once the server started refusing properly, the same control started failing
 * silently instead. One rule, written once, is what stops the two drifting apart again.
 *
 * H10, 8 October 2026: this used to let ANY admin in - `viewer.role === 'ADMIN'` alone - because
 * at the time that was the server's rule too. It no longer is: an admin who is not the lead may
 * rename only once the lead's own account shows they have left. The check-in row the rail renders
 * from (`GET /grounds`, the list) does not carry that yet - unlike the ground's own read
 * (`GET /grounds/:id`), which serves `mayChangeSetup` worked out from it - so `leadHasLeft` is an
 * optional field here for when the list grows one (see docs/requests-to-engine.md). Until it does,
 * an admin who is not the lead is shown no pencil at all: the safe side, which matches the server
 * for every lead who is still with the organisation, which is the common case.
 */
export function mayRenameACheckIn(
  checkIn: { initiatorId: string; leadHasLeft?: boolean },
  viewer: { id?: string; role?: string } | null | undefined,
): boolean {
  if (!viewer?.id) return false
  if (checkIn.initiatorId === viewer.id) return true
  if (viewer.role !== 'ADMIN') return false
  return checkIn.leadHasLeft === true
}
