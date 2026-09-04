/**
 * WHO MAY RENAME A CHECK-IN.
 *
 * A name is what everybody else sees this check-in as, so renaming is the lead's call or an
 * admin's - the same class of change as moving its dates. The server enforces exactly this and
 * answers 403 otherwise (GW-RENAME).
 *
 * It lives here rather than inside the rail because the rail and the server were disagreeing: the
 * pencil was offered to every party, and the audit found it inert - press it, type, nothing
 * happens, no error. Once the server started refusing properly, the same control started failing
 * silently instead. One rule, written once, is what stops the two drifting apart again.
 */
export function mayRenameACheckIn(
  checkIn: { initiatorId: string },
  viewer: { id?: string; role?: string } | null | undefined,
): boolean {
  if (!viewer?.id) return false
  if (checkIn.initiatorId === viewer.id) return true
  return viewer.role === 'ADMIN'
}
