/**
 * ONE-OFF: split the field name back out of every stored divergence topic.
 *
 * Generation is fixed (reports.service calls everyDivergenceReadable), but reports already written
 * keep the mangled heading forever - nobody regenerates a released report because the wording
 * improved. This walks what exists and repairs it in place. Idempotent: a topic with no field name
 * in it is returned unchanged.
 */
import { PrismaClient } from '@prisma/client';
import { everyDivergenceReadable } from '../src/modules/reports/a-field-name-is-not-a-heading';

async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.report.findMany({ select: { id: true, divergences: true } });
  let changed = 0;
  for (const r of rows) {
    if (!Array.isArray(r.divergences)) continue;
    const next = everyDivergenceReadable(r.divergences as any[]);
    if (JSON.stringify(next) === JSON.stringify(r.divergences)) continue;
    await prisma.report.update({ where: { id: r.id }, data: { divergences: next as any } });
    changed++;
  }
  console.log(`repaired ${changed} of ${rows.length} reports`);
  await prisma.$disconnect();
}
main();
