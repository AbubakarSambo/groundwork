import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * Only the org and Sahar. Everything after this happens through the real API as
 * the real user, because the free/paid gate and the returning-versus-new
 * recognition are exactly what is being tested and both are properties of how
 * the org accumulates - not something to be written straight into the database.
 *
 * No subscription and no care fee, so the first ten grounds have to come out
 * free through the FREE_TIER path and the eleventh has to stop.
 */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const org = await prisma.organization.create({ data: { name: 'Meridian Health Group', slug: `meridian-${Date.now()}` } });
  const sahar = await prisma.user.create({
    data: {
      email: 'sahar@org.test', organizationId: org.id, firstName: 'Sahar', lastName: 'Ali',
      passwordHash: await bcrypt.hash('OrgSim123!', 10), isEmailVerified: true, role: 'ADMIN',
      jobTitle: 'Operations lead',
    },
  });
  console.log(JSON.stringify({ orgId: org.id, saharId: sahar.id }));
  await app.close(); process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
