/**
 * RELEASE 2, COLLECT WHAT'S OWED, A SWITCH PER ORGANISATION (release plan, Release 2, and Part 0, "Existing users: in every
 * release": "Each release's new boards sit behind a switch per organisation ... switching it off returns them to their
 * previous board with nothing lost").
 *
 * WHERE IT IS KEPT. `Organization.release2CollectionsOn`, false for every organisation until Groundwork staff switch it on
 * (Admin, Orgs: PATCH /admin/organisations/:id/release-2-collections) or a script does for a "(test)" organisation
 * (scripts/the-release-2-collections.ts). A row that cannot be read reads as off: it fails closed, to what people had.
 *
 * WHAT IT HOLDS BACK, AND ONLY THAT (Release 2, pull request 1 of 3):
 *  - the scenario "Collect what's owed" (COLLECTIONS) in the picker, and the server's yes to a new check-in with it;
 *  - the switchboard's Release 2 rows (board/the-switchboard.ts), and what the board, the team report and People and setup
 *    are told about the switchboard's choice;
 *  - "Type" in "What it is" on People and setup, where the lead confirms the type, and the route that stores it.
 * It writes nothing on its own. Existing check-ins keep their scenario, cadence and every setting whatever it says.
 */
export const THE_RELEASE_2_COLLECTIONS = 'release2CollectionsOn';

type Reader = { organization?: { findUnique: (a: any) => Promise<any> } } | any;

export async function theRelease2CollectionsIsOn(prisma: Reader, organizationId: string | null | undefined): Promise<boolean> {
  if (!organizationId) return false;
  try {
    const org = await prisma?.organization?.findUnique?.({ where: { id: organizationId }, select: { release2CollectionsOn: true } });
    return org?.release2CollectionsOn === true;
  } catch {
    return false;
  }
}

/** The same, read from a check-in. */
export async function theRelease2CollectionsIsOnFor(prisma: Reader, groundId: string): Promise<boolean> {
  try {
    const g = await prisma?.ground?.findUnique?.({ where: { id: groundId }, select: { organizationId: true } });
    return theRelease2CollectionsIsOn(prisma, g?.organizationId ?? null);
  } catch {
    return false;
  }
}
