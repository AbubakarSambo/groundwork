/**
 * WHO MAY RENAME A CHECK-IN.
 *
 * A name is what everybody else sees this check-in as, so renaming is part of how the check-in is
 * set up: the lead's call, or an admin's once the lead has left the organisation (decision 119, H10).
 * The server enforces exactly this (`mayConfirmSetupOn` in grounds.service) and refuses anybody else
 * with "Only <lead>, who runs this check-in, can change how it is set up...".
 *
 * It lives here rather than inside the rail because the rail and the server were disagreeing: the
 * pencil was offered to every party, and the audit found it inert - press it, type, nothing
 * happens, no error. Once the server started refusing properly, the same control started failing
 * silently instead. One rule, written once, is what stops the two drifting apart again.
 *
 * WHETHER AN ADMIN MAY is the server's answer, never a guess here: `mayChangeSetup`, which the server
 * works out with the same function its writers use (it knows whether the lead has left; the screen
 * does not). Where a check-in does not carry that answer, only the lead is offered the pencil, so an
 * admin is never shown a control the server will refuse while the lead is still there.
 */
export function mayRenameACheckIn(
  checkIn: { initiatorId: string; mayChangeSetup?: unknown },
  viewer: { id?: string; role?: string } | null | undefined,
): boolean {
  if (!viewer?.id) return false
  if (checkIn.initiatorId === viewer.id) return true
  return typeof checkIn.mayChangeSetup === 'boolean' ? checkIn.mayChangeSetup : false
}
