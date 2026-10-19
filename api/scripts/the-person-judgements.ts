/**
 * WHETHER ANYTHING THAT JUDGES A PERSON IS BUILT AND SERVED, FOR ONE ORGANISATION, BY ITS ID (production truth, 19 October 2026;
 * api/src/modules/organisation/person-judgements.ts). On for every organisation until this sets it off. Says what it would do without
 * --yes, and never runs as part of a deploy.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/the-person-judgements.ts <organisation id> off --yes
 *   npx ts-node -P tsconfig.json --transpile-only scripts/the-person-judgements.ts <organisation id> on --yes
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const [id, onOff] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const yes = process.argv.includes('--yes');
  if (!id || !['on', 'off'].includes(String(onOff))) {
    console.log('Give the organisation\'s id and "on" or "off", for example: 9b49c878-bb64-49c2-a791-abf412bd2aa0 off --yes');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const o = await prisma.organization.findUnique({ where: { id }, select: { id: true, name: true, personJudgementsOn: true } });
    if (!o) { console.log(`There is no organisation with the id ${id} on this database.`); process.exitCode = 1; return; }
    const on = onOff === 'on';
    console.log(`${o.name} (${o.id}): judgements about people are ${o.personJudgementsOn ? 'on' : 'off'} now; ${yes ? 'setting' : 'would set (add --yes)'} them ${on ? 'on' : 'off'}.`);
    if (yes) await prisma.organization.update({ where: { id: o.id }, data: { personJudgementsOn: on } });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) void main();
