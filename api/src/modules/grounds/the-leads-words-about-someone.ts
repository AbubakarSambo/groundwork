/**
 * WHAT THE LEAD WROTE ABOUT A PERSON IS FOR WHOEVER RUNS THE CHECK-IN (U.6 review).
 *
 * `roleAsDescribed` is mostly the lead's own sentence about someone, typed when they were added:
 * "Daniel - Your sales manager, who you said is not meeting his agreed targets for pipeline
 * building and coaching." Read live on Daniel's invitation, under "Your part in this". It judges
 * him, it speaks to the lead ("who you said"), and it is the lead's view, which a participant never
 * reads (the settled privacy rules). The row does not record who wrote it, so it is served only to
 * someone who runs this check-in: the lead or an admin. Everyone else gets nothing in its place.
 */
export function theLeadsWordsAbout(p: { roleAsDescribed?: string | null }, readerRunsThisCheckIn: boolean): string | null {
  return readerRunsThisCheckIn ? (p.roleAsDescribed ?? null) : null;
}
