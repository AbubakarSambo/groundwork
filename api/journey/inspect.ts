// Read-only snapshot of what the engine has actually concluded, straight from
// the DB, so the reads can be checked against the personas' known truth.
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const g = await prisma.ground.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { participants: { include: { user: true } } },
  });
  if (!g) { console.log('no ground'); process.exit(0); }
  console.log(`ground: ${g.label}  mode=${g.mode}  free=${g.isFreeGround}(${g.freeReason})  status=${g.status}`);
  for (const p of g.participants) {
    const entries = await prisma.recordEntry.count({ where: { participantId: p.id } });
    const done = await prisma.checkIn.count({ where: { participantId: p.id, status: 'COMPLETED' } });
    const mAbout = await prisma.workMention.groupBy({ by: ['kind'], where: { aboutParticipantId: p.id }, _count: true });
    const mBy = await prisma.workMention.groupBy({ by: ['kind'], where: { sourceParticipantId: p.id }, _count: true });
    console.log(`\n${p.user?.firstName ?? p.email}`);
    console.log(`  fn=${(p as any).detectedFunction ?? '-'} conf=${((p as any).detectedFunctionConfidence ?? 0).toFixed?.(2) ?? '-'}`);
    console.log(`  sessions=${done} recordEntries=${entries}`);
    console.log(`  mentions ABOUT them: ${mAbout.map(m => m.kind + '=' + m._count).join(' ') || 'none'}`);
    console.log(`  mentions BY them:    ${mBy.map(m => m.kind + '=' + m._count).join(' ') || 'none'}`);
  }
  const deps = await prisma.groundDependency.findMany({ where: { groundId: g.id } });
  console.log(`\ndependencies: ${deps.length}`);
  for (const d of deps) console.log(`  ${d.what} [${d.status}]`);
  const pats = await prisma.patternDetection.findMany({ where: { groundId: g.id } });
  console.log(`\npatterns: ${pats.length}`);
  for (const p of pats) console.log(`  ${p.code} ${p.status} periods=${p.periodsObserved}`);
  await app.close(); process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
