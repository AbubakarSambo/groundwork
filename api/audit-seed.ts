/**
 * A ground with three real roles on it, so the page audit looks at pages with something in them.
 * An empty page tells you nothing about whether the right person sees the right thing.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * LOCAL DATABASES ONLY, ENFORCED RATHER THAN REQUESTED.
 *
 * This creates real accounts with a known password. Run against a shared or production database it
 * would be a set of working credentials committed to a git repository, which is the kind of mistake
 * that is permanent. So it refuses rather than warning: a comment saying "dev only" is not a
 * guardrail, and the person most likely to run this by accident is a future me in a hurry.
 */
function refuseIfNotLocal() {
  const url = process.env.DATABASE_URL ?? '';
  const local = /@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(url);
  if (!local) {
    console.error('Refusing to run: DATABASE_URL is not a local database. This script creates accounts with a known password.');
    process.exit(1);
  }
}
refuseIfNotLocal();

const PW = 'AuditPass123!';

async function main() {
  const hash = await bcrypt.hash(PW, 12);

  const org = await prisma.organization.upsert({
    where: { slug: 'audit-co' },
    update: {},
    create: { name: 'Audit Co', slug: 'audit-co', companyStage: 'EARLY_REVENUE' },
  });

  async function user(email: string, firstName: string, lastName: string, role: any, platform = false) {
    const u = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: hash, role, isEmailVerified: true, isPlatformAdmin: platform },
      create: {
        organizationId: org.id, email, passwordHash: hash, firstName, lastName,
        role, isEmailVerified: true, isPlatformAdmin: platform,
      },
    });
    await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: u.id, organizationId: org.id } },
      update: {},
      create: { userId: u.id, organizationId: org.id, role },
    }).catch(() => {});
    return u;
  }

  const admin = await user('audit-admin@example.test', 'Ada', 'Admin', 'ADMIN', true);
  const lead = await user('audit-lead@example.test', 'Leo', 'Lead', 'MEMBER');
  const party = await user('audit-party@example.test', 'Pat', 'Party', 'MEMBER');

  console.log(JSON.stringify({ org: org.id, admin: admin.id, lead: lead.id, party: party.id, password: PW }, null, 2));
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
