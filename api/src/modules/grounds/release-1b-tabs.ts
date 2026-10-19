/**
 * RELEASE 1B'S NEW CHECK-IN TABS, A SWITCH PER ORGANISATION (Hafsah, 18 October 2026; release plan, Part 0, "Existing users:
 * in every release": "Each release's new boards sit behind a switch per organisation ... switching it off returns them to
 * their previous board with nothing lost").
 *
 * WHERE IT IS KEPT. `Organization.release1bTabsOn`, false for every organisation until Groundwork staff switch it on
 * (Admin, Orgs: PATCH /admin/organisations/:id/release-1b-tabs) or a script does for a "(test)" organisation
 * (scripts/the-release-1b-tabs.ts). A row that cannot be read reads as off: it fails closed, to the tabs people had.
 *
 * WHAT IT HOLDS BACK, AND ONLY THAT: People and setup as the B8 pictures draw it (Release 1B, pull request 1 of 3), for the
 * lead, a team member and an admin who does not run it. It writes nothing on its own. Every setting the new page changes is
 * changed through the routes that already exist, and only when the lead saves a change.
 */
export const THE_RELEASE_1B_TABS = 'release1bTabsOn';

type Reader = { organization?: { findUnique: (a: any) => Promise<any> } } | any;

export async function theRelease1bTabsAreOn(prisma: Reader, organizationId: string | null | undefined): Promise<boolean> {
  if (!organizationId) return false;
  try {
    const org = await prisma?.organization?.findUnique?.({ where: { id: organizationId }, select: { release1bTabsOn: true } });
    return org?.release1bTabsOn === true;
  } catch {
    return false;
  }
}
