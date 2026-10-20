/**
 * THE DIRECT MORNING, FOR ONE ORGANISATION, BY ITS ID (Hafsah, 20 October 2026; api/src/modules/organisation/the-direct-morning-switch.ts).
 * Off for every organisation until this sets it on. Says what it would do without --yes, and never runs as part of a deploy.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/the-direct-morning.ts <organisation id> on --yes
 *   npx ts-node -P tsconfig.json --transpile-only scripts/the-direct-morning.ts <organisation id> off --yes
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const [id, onOff] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const yes = process.argv.includes('--yes');
  if (!id || !['on', 'off'].includes(String(onOff))) {
    console.log('Give the organisation\'s id and "on" or "off", for example: 9b49c878-bb64-49c2-a791-abf412bd2aa0 on --yes');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const o = await prisma.organization.findUnique({ where: { id }, select: { id: true, name: true, directMorningOn: true, release1SalesBoardOn: true } });
    if (!o) { console.log(`There is no organisation with the id ${id} on this database.`); process.exitCode = 1; return; }
    const on = onOff === 'on';
    console.log(`${o.name} (${o.id}): the direct morning is ${o.directMorningOn ? 'on' : 'off'} now; ${yes ? 'setting' : 'would set (add --yes)'} it ${on ? 'on' : 'off'}.`);
    if (on && !o.release1SalesBoardOn) console.log('Release 1\'s sales board is off for this organisation. Switch it on first, or the summary has no deals to read.');
    if (yes) await prisma.organization.update({ where: { id: o.id }, data: { directMorningOn: on } });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) void main();
