import { PrismaService } from '../prisma/prisma.service';

/**
 * MIRRORING A GROUND'S COMMITMENT INTO THE ORG LAYER.
 *
 * ADDITIVE, AND THE GROUND STAYS AUTHORITATIVE. `PersonObjective` is untouched and remains the
 * record for the ground it belongs to; this is a second row that outlives the ground, so somebody's
 * word carries into the next check-in instead of ending with this one. If the org layer turns out
 * to be the wrong shape, deleting it loses nothing.
 *
 * Written as a plain function taking prisma, for the same reason as round completion: it is called
 * from the conversation service, and a Nest service would mean a module importing the module that
 * imports it.
 *
 * Best-effort by design. A mirror that fails must never fail the check-in it was mirroring - the
 * ground's own record is the one that matters, and this is the copy.
 */
export async function mirrorCommitment(
  prisma: PrismaService,
  args: {
    organizationId: string;
    groundId: string;
    personObjectiveId: string;
    /** The identity-system id, when we have one. Without it there is nothing to mirror against. */
    personExternalId: string | null;
    text: string;
    dueSaid: string | null;
    /** Only ever a date somebody actually gave. See what-somebody-said-they-would-do.ts. */
    dueAt: Date | null;
  },
): Promise<boolean> {
  /*
   * A participant with no identity-system id cannot be mirrored, and that is correct rather than a
   * gap: the org layer is keyed on the customer's own ids, and inventing one here would create a
   * person the customer's systems have never heard of.
   */
  if (!args.personExternalId) return false;

  try {
    /*
     * Keyed on the ground's row, so a re-stated expectation updates the mirror rather than adding a
     * second one. The same restatement problem the ground's own record already solved.
     */
    await prisma.commitment.upsert({
      where: { sourcePersonObjectiveId: args.personObjectiveId },
      create: {
        organizationId: args.organizationId,
        personExternalId: args.personExternalId,
        text: args.text,
        dueSaid: args.dueSaid,
        dueAt: args.dueAt,
        source: 'check_in',
        sourceGroundId: args.groundId,
        sourcePersonObjectiveId: args.personObjectiveId,
      },
      update: { text: args.text, dueSaid: args.dueSaid, dueAt: args.dueAt },
    });
    return true;
  } catch {
    return false;
  }
}
