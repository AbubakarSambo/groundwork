/**
 * RELEASE 3, RAISING INVOICES ON TIME, FOR ONE ORGANISATION, BY ITS ID (Hafsah, 24 October 2026; api/src/modules/board/raising-invoices-on-time.ts).
 * Off for every organisation until this sets it on. "after-a-sale" also makes a sale won an invoice to raise. Says what it would do
 * without --yes, and never runs as part of a deploy.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/release-3-invoices.ts <organisation id> on --yes
 *   npx ts-node -P tsconfig.json --transpile-only scripts/release-3-invoices.ts <organisation id> on after-a-sale --yes
 *   npx ts-node -P tsconfig.json --transpile-only scripts/release-3-invoices.ts <organisation id> off --yes
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const [id, onOff, ...rest] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const yes = process.argv.includes('--yes');
  const afterASale = rest.includes('after-a-sale');
  if (!id || !['on', 'off'].includes(String(onOff))) {
    console.log('Give the organisation\'s id and "on" or "off", and "after-a-sale" where a sale won should become an invoice to raise.');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const o = await prisma.organization.findUnique({ where: { id }, select: { id: true, name: true, release3InvoicesOn: true, invoicesAfterASaleOn: true, release2CollectionsOn: true } });
    if (!o) { console.log(`There is no organisation with the id ${id} on this database.`); process.exitCode = 1; return; }
    const on = onOff === 'on';
    console.log(`${o.name} (${o.id}): Release 3 is ${o.release3InvoicesOn ? 'on' : 'off'}, invoices after a sale ${o.invoicesAfterASaleOn ? 'on' : 'off'}; ${yes ? 'setting' : 'would set (add --yes)'} Release 3 ${on ? 'on' : 'off'}${on ? `, invoices after a sale ${afterASale ? 'on' : 'off'}` : ''}.`);
    if (on && !o.release2CollectionsOn) console.log('Release 2 (Collect what\'s owed) is off for this organisation. Switch it on first, or there are no bills to raise.');
    if (yes) await prisma.organization.update({ where: { id: o.id }, data: { release3InvoicesOn: on, invoicesAfterASaleOn: on && afterASale } });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) void main();
