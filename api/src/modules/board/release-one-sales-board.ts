/**
 * RELEASE 1'S SALES BOARD, A SWITCH PER ORGANISATION (release plan, Part 0, "Existing users: in every release").
 *
 * "Each release's new boards sit behind a switch per organisation ... switch it on for the test organisations; then on
 * staging; then for real clients, one at a time ... If a real client's board looks wrong, switching it off returns them to
 * their previous board with nothing lost."
 *
 * WHERE IT IS KEPT. `Organization.release1SalesBoardOn`, false for every organisation until Groundwork staff switch it on
 * (Admin, Orgs: PATCH /admin/organisations/:id/release-one-sales-board) or a script does for a test organisation
 * (scripts/the-release-one-sales-board.ts). A row that cannot be read reads as off: it fails closed, to the board people had.
 *
 * NOTHING READS IT YET (Release 1, pull request 2 of 5): the switch exists and staff can turn it on. The parts of Release 1's
 * sales board that follow read it here, so an organisation with it off keeps exactly the board it has now.
 *
 * WHAT IT WILL HOLD BACK, AND ONLY THAT (the final surface, never the writers; "default on, hold the last inch"):
 *  - on the board: each sales aim counted from the deals ("65 sold, 65 with proof of payment", the headline in the
 *    prototype's shape, your share in sales), a customer's reply moved onto its deal, the lead's yes-or-no answer to a wait
 *    in What needs you, each deal at the stall rule, and the heading of To close the gap;
 *  - in the board listener: keeping a sales aim's stored count at the deals (off, the count is read from what was said, as before);
 *  - in the weekly report: the week's deals and the sales targets they count.
 * The deal rows, each stage kept with its day, and the check-in's gathering of them run either way, because they only add.
 */
export const THE_RELEASE_ONE_SALES_BOARD = 'release1SalesBoardOn';

type Reader = { organization?: { findUnique: (a: any) => Promise<any> } } | any;

export async function theReleaseOneSalesBoardIsOn(prisma: Reader, organizationId: string | null | undefined): Promise<boolean> {
  if (!organizationId) return false;
  try {
    const org = await prisma?.organization?.findUnique?.({ where: { id: organizationId }, select: { release1SalesBoardOn: true } });
    return org?.release1SalesBoardOn === true;
  } catch {
    return false;
  }
}

/** The same, read from a check-in. */
export async function theReleaseOneSalesBoardIsOnFor(prisma: Reader, groundId: string): Promise<boolean> {
  try {
    const g = await prisma?.ground?.findUnique?.({ where: { id: groundId }, select: { organizationId: true } });
    return theReleaseOneSalesBoardIsOn(prisma, g?.organizationId ?? null);
  } catch {
    return false;
  }
}
