import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// Only the org + Sahar are seeded. Everything after this happens through the
// real HTTP API as the real users, so the journey is the journey.
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const hash = await bcrypt.hash('Journey123!', 10);
  const org = await prisma.organization.create({
    // No care fee, no subscription: the org's FIRST ground must come out free
    // via the FREE_TIER path, which is the case being tested.
    data: { name: 'Coamana', slug: `coamana-${Date.now()}` },
  });
  const sahar = await prisma.user.create({
    data: {
      email: 'sahar@coamana.test', organizationId: org.id, firstName: 'Sahar', lastName: 'Ali',
      passwordHash: hash, isEmailVerified: true, role: 'ADMIN', jobTitle: 'Operations lead',
    },
  });
  console.log(JSON.stringify({ orgId: org.id, saharId: sahar.id }));
  await app.close(); process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
