import { OpsFunctionalRole, PrismaClient } from '@prisma/client';
import { DEFAULT_GRANTS, OPS_CAPABILITIES, OpsCapability } from './what-somebody-may-do';

/**
 * A CAPABILITY ADDED TO THE CODE REACHED NOBODY.
 *
 * Grants are rows. That is the whole point of them: once a person exists their
 * grants are the answer, so taking one away does not mean arguing with their
 * role. The cost, found by adding `spend:read-all` and watching the CEO's own
 * `/ops/me` come back without it: a capability added to `DEFAULT_GRANTS` reaches
 * only people created afterwards. Everybody already here keeps the set they were
 * seeded with, for ever, and the feature looks built and is unreachable.
 *
 * A blanket re-apply of the defaults at boot would fix that and break the other
 * half — it would hand back every capability anybody had deliberately revoked,
 * quietly, on a restart.
 *
 * So this applies a capability EXACTLY ONCE, and remembers that it did. The
 * record is the list of capability names already rolled out; anything in the
 * code that is not on that list is new, is granted to the roles whose defaults
 * name it, and is then added to the list. A revoked capability is on the list
 * already, so it is never handed back.
 */
export const ROLLED_OUT = 'capabilities.rolledOut';

type MinimalPrisma = Pick<PrismaClient, 'opsSetting' | 'opsPerson' | 'opsGrant' | '$transaction'>;

export function whatIsNew(alreadyRolledOut: readonly string[]): OpsCapability[] {
  return OPS_CAPABILITIES.filter((c) => !alreadyRolledOut.includes(c));
}

/** Which of these people should get a newly added capability, by their role. */
export function whoGets(
  capability: OpsCapability,
  people: Array<{ id: string; functionalRole: OpsFunctionalRole }>,
): string[] {
  return people.filter((p) => DEFAULT_GRANTS[p.functionalRole].includes(capability)).map((p) => p.id);
}

export async function rollOutNewCapabilities(prisma: MinimalPrisma) {
  const row = await prisma.opsSetting.findUnique({ where: { key: ROLLED_OUT } });

  /*
   * NO RECORD MEANS NOTHING HAS BEEN ROLLED OUT, NOT THAT NOTHING NEEDS TO BE.
   *
   * The first run therefore applies every default once. On a fresh install that
   * is a no-op — the seed has already written those exact rows and the insert
   * skips duplicates. On this database, which predates the mechanism, it is the
   * correction that hands out the capabilities added since it was seeded.
   *
   * It is worth being plain about the one thing this costs: a capability revoked
   * from somebody BEFORE this file existed is handed back, once. Nothing revoked
   * after it is ever touched, because by then the name is on the list. The log
   * line names every capability it granted, so the once is visible rather than
   * silent.
   */
  const alreadyRolledOut = row ? (JSON.parse(row.value) as string[]) : [];
  const brandNew = whatIsNew(alreadyRolledOut);
  if (brandNew.length === 0) return { granted: 0, capabilities: [] as OpsCapability[] };

  const people = await prisma.opsPerson.findMany({ where: { active: true } });

  /*
   * THE RECORD AND THE GRANTS LAND TOGETHER, OR NEITHER DOES.
   *
   * Watched three API watchers restart on one file save and race this. The
   * outcome that must never happen is a capability marked as rolled out with
   * nobody holding it — the record then says the job is done for ever, and the
   * feature is unreachable with nothing to look at. Writing them in one
   * transaction means a boot that fails part-way leaves the record untouched
   * and the next boot simply tries again.
   *
   * Concurrent boots serialise on the unique key: whichever transaction commits
   * second conflicts on `ops_settings.key` and rolls back whole, having granted
   * nothing the winner did not already grant.
   */
  return prisma.$transaction(async (tx) => {
    let granted = 0;
    for (const capability of brandNew) {
      const ids = whoGets(capability, people);
      if (ids.length === 0) continue;
      const written = await tx.opsGrant.createMany({
        data: ids.map((personId) => ({ personId, capability })),
        skipDuplicates: true,
      });
      granted += written.count;
    }

    const NOTE =
      'Every capability that has already been handed to the roles whose defaults name it. Anything in the code and not on this list is granted once, at boot, and added here. Removing a name from this list hands that capability out again.';
    const value = JSON.stringify([...alreadyRolledOut, ...brandNew]);
    if (row) {
      await tx.opsSetting.update({ where: { key: ROLLED_OUT }, data: { value } });
    } else {
      /* create, not upsert: a second boot that got here first must collide and
         roll this transaction back rather than quietly overwrite its work. */
      await tx.opsSetting.create({ data: { key: ROLLED_OUT, value, note: NOTE } });
    }

    return { granted, capabilities: brandNew };
  });
}
