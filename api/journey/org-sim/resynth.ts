/**
 * Re-run the real synthesis over the real record, on the new schema.
 *
 * The eighteen-ground simulation left 353 record entries in a throwaway
 * database. Those are the genuine outputs of 265 check-ins - not fixtures, not
 * anything written to make a point. This script boots the actual application
 * and calls `ReportsService.synthesize()` on those grounds, so what comes back
 * is what a customer would get, produced by the same code path.
 *
 * That distinction is the whole reason this file exists rather than a mock. The
 * homepage sample is about to be replaced with output from here, and a sample
 * assembled by hand would be a claim about the product rather than the product.
 *
 *   DATABASE_URL=postgresql://.../gw_org18_... npx ts-node journey/org-sim/resynth.ts <groundId...>
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { ReportsService } from '../../src/modules/reports/reports.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import * as fs from 'fs';

async function main() {
  const groundIds = process.argv.slice(2);
  if (!groundIds.length) throw new Error('give at least one groundId');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const reports = app.get(ReportsService);
  const prisma = app.get(PrismaService);

  const out: any[] = [];
  for (const id of groundIds) {
    process.stderr.write(`synthesizing ${id}...\n`);
    try {
      await reports.synthesize(id);
      const r = await prisma.report.findFirst({
        where: { groundId: id },
        orderBy: { createdAt: 'desc' },
      });
      const g = await prisma.ground.findUnique({ where: { id } });
      out.push({ groundId: id, scenario: (g as any)?.scenario, report: r });
      const divs = ((r as any)?.divergences ?? []) as any[];
      process.stderr.write(`  -> ${divs.length} gaps, ${divs.filter((d) => d.atStake).length} with atStake\n`);
    } catch (e: any) {
      process.stderr.write(`  !! ${e.message}\n`);
      out.push({ groundId: id, error: e.message });
    }
  }

  fs.writeFileSync('journey/org-sim/out/resynth.json', JSON.stringify(out, null, 2));
  process.stderr.write('wrote journey/org-sim/out/resynth.json\n');
  await app.close();
  process.exit(0);
}

main();
