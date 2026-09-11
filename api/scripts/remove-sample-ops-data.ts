/**
 * REMOVE THE MADE-UP ROWS FROM THE BACK OFFICE. A "Sample list DELETE ME" period, five "Sample Co"
 * companies, a "Sample travel" claim and a "Sample:" request were typed in so every board had
 * something on it. Anything whose name starts with "Sample" goes, and what hangs off it. Dry run
 * without --yes.  npx ts-node -P tsconfig.json --transpile-only scripts/remove-sample-ops-data.ts --yes
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const yes = process.argv.includes('--yes');
(async () => {
  const periods = await prisma.opsPeriod.findMany({ where: { name: { startsWith: 'Sample' } }, select: { id: true, name: true } });
  const companies = await prisma.opsCompany.findMany({ where: { name: { startsWith: 'Sample' } }, select: { id: true, name: true } });
  const expenses = await prisma.opsExpense.findMany({ where: { description: { startsWith: 'Sample' } }, select: { id: true, description: true } });
  const requests = await prisma.opsResourceRequest.findMany({ where: { OR: [{ supportNeeded: { startsWith: 'Sample' } }, { reason: { startsWith: 'Sample' } }] }, select: { id: true, supportNeeded: true } });
  const opps = await prisma.opsCommercialOpportunity.findMany({ where: { OR: [{ name: { startsWith: 'Sample' } }, { companyId: { in: companies.map((c) => c.id) } }] }, select: { id: true, name: true } });
  console.log(yes ? 'Removing:' : 'Would remove (add --yes):');
  console.log(' periods', periods.map((p) => p.name), '\n companies', companies.map((c) => c.name), '\n expenses', expenses.map((e) => e.description), '\n requests', requests.map((r) => r.supportNeeded), '\n opportunities', opps.map((o) => o.name));
  if (!yes) return prisma.$disconnect();
  const tryDelete = async (label: string, fn: () => Promise<unknown>) => { try { await fn(); } catch (e: any) { console.log(` ${label}: kept, ${e.message.split('\n').pop()?.slice(0, 100)}`); } };
  await tryDelete('opportunities', () => prisma.opsCommercialOpportunity.deleteMany({ where: { id: { in: opps.map((o) => o.id) } } }));
  await tryDelete('expenses', () => prisma.opsExpense.deleteMany({ where: { id: { in: expenses.map((e) => e.id) } } }));
  await tryDelete('requests', () => prisma.opsResourceRequest.deleteMany({ where: { id: { in: requests.map((r) => r.id) } } }));
  for (const c of companies) await tryDelete(c.name, () => prisma.opsCompany.delete({ where: { id: c.id } }));
  for (const p of periods) await tryDelete(p.name, () => prisma.opsPeriod.delete({ where: { id: p.id } }));
  console.log('Done.');
  await prisma.$disconnect();
})();
