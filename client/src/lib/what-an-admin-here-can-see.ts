/**
 * WHAT AN ADMIN WHO DOES NOT LEAD A CHECK-IN CAN SEE IN IT, SAID TRUTHFULLY (U.7 review).
 *
 * The banner said "You can see everything here, which is the point of being an admin". Read live as
 * Otieno, an admin who is not in Wanjiru's check-in: the Context page under it could not open the
 * documents, did not show each person's share of a target, and does not show the lead's private
 * notes. The first sentence is the prototype's own for an admin who only reads a check-in ("You can
 * read this check-in’s board and reports. Wairimu Kamau runs it."), and the rest says what stays
 * with the people in it, which is what the server enforces.
 */
export function whatAnAdminHereCanSee(p: { leadName: string | null; leadFirstName: string | null; inIt: boolean }): string {
  const runs = p.leadName ? ` ${p.leadName} runs it.` : ''
  const whose = p.leadFirstName ? `${p.leadFirstName}’s` : 'the lead’s'
  const kept = p.inIt
    ? `You cannot see ${whose} private notes, or anyone else’s share of a target.`
    : `You cannot see ${whose} private notes, anyone’s share of a target, or the documents people add here.`
  const decides = p.leadFirstName
    ? `Sharing the report and ending the check-in are ${whose} to decide, and nothing you do here is hidden from ${p.leadFirstName}.`
    : 'Sharing the report and ending the check-in are the lead’s to decide, and nothing you do here is hidden from them.'
  return `You can read this check-in’s board and reports.${runs} ${kept} ${decides}`
}
