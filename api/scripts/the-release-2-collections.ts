/**
 * RELEASE 2 (COLLECT WHAT'S OWED, AND THE SWITCHBOARD'S RELEASE 2 ROWS) FOR A TEST ORGANISATION, BY SCRIPT (release plan,
 * Part 0: "switch it on for the test organisations" first). Only an organisation whose name ends in "(test)": a real client is
 * switched on one at a time by Groundwork staff in Admin, Orgs, once Hafsah says so, never by this script. Says what it would
 * do without --yes.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/the-release-2-collections.ts "Muchemi & Co (test)" on --yes
 *   npx ts-node -P tsconfig.json --transpile-only scripts/the-release-2-collections.ts "Muchemi & Co (test)" off --yes
 */
import { PrismaClient } from '@prisma/client';

export const ONLY_A_TEST_ORGANISATION = /\(test\)\s*$/i;

async function main() {
  const [name, onOff] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const yes = process.argv.includes('--yes');
  if (!name || !['on', 'off'].includes(String(onOff))) {
    console.log('Give the organisation\'s name and "on" or "off", for example: "Muchemi & Co (test)" on --yes');
    process.exit(1);
  }
  if (!ONLY_A_TEST_ORGANISATION.test(name)) {
    console.log(`"${name}" is not a test organisation. A real client is switched on in Admin, Orgs, by Groundwork staff.`);
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const orgs = await prisma.organization.findMany({ where: { name }, select: { id: true, name: true, release2CollectionsOn: true } });
    if (!orgs.length) { console.log(`There is no organisation called "${name}" on this database.`); process.exitCode = 1; return; }
    const on = onOff === 'on';
    for (const o of orgs) {
      console.log(`${o.name} (${o.id}): Release 2 is ${o.release2CollectionsOn ? 'on' : 'off'} now; ${yes ? 'setting' : 'would set (add --yes)'} it ${on ? 'on' : 'off'}.`);
      if (yes) await prisma.organization.update({ where: { id: o.id }, data: { release2CollectionsOn: on } });
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) void main();
