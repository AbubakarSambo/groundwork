/**
 * WHAT THE LEAD IS GIVEN BACK WHEN SHE ADDS SOMEBODY SHE HAS ALREADY ADDED (reviewer's audit, 7 October).
 *
 * The "already invited" path returned the whole participant row. The same fields the first-time path returns, and no others: nothing
 * of the stop-reminders token, the invitation's expiry or token, how specific their answers were, the function they were detected in,
 * or their private summary.
 */
export function theInvitedRowAsServed(row: Record<string, any>) {
  const { id, email, partyType, userId, roleAsDescribed, invitedAt, notifiedAt, soloArtifactAt, createdAt, nameGiven } = row;
  /* The name the lead typed beside the address, so the row she is given back is not nameless (journey test, 12 October). */
  return { id, email, partyType, userId, roleAsDescribed, invitedAt, notifiedAt, soloArtifactAt, createdAt, nameGiven: nameGiven ?? null };
}
