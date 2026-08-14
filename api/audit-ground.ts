/**
 * A ground with real content on it, so the page audit is looking at pages that have something to
 * show. Two completed sessions, so the movement gate is open and the report has both accounts.
 */
import { PrismaClient } from '@prisma/client';
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


const LEAD_LINES: [string, string][] = [
  ['TENSION', 'The handover notes from Tom never arrived, so she is working from what I can remember.'],
  ['TENSION', 'Her access to the finance system still is not set up, so she cannot see budgets.'],
  ['SUCCESS_DEFINITION', 'Owning at least one client account end to end by the end of the quarter.'],
  ['COMMITMENT', 'I will get her finance access sorted this week.'],
];
const PARTY_LINES: [string, string][] = [
  ['WORRY', 'I am not sure what I am meant to be delivering in the first month.'],
  ['TENSION', 'I have asked twice about the finance system and not heard back.'],
  ['COMMITMENT', 'I have taken the Aduna account and will run the next review myself.'],
];

async function main() {
  const org = await prisma.organization.findUniqueOrThrow({ where: { slug: 'audit-co' } });
  const lead = await prisma.user.findUniqueOrThrow({ where: { email: 'audit-lead@example.test' } });
  const party = await prisma.user.findUniqueOrThrow({ where: { email: 'audit-party@example.test' } });

  const existing = await prisma.ground.findFirst({ where: { organizationId: org.id, label: 'Michael Bello, first 90 days' } });
  if (existing) { console.log(JSON.stringify({ groundId: existing.id, reused: true })); await prisma.$disconnect(); return; }

  const ground = await prisma.ground.create({
    data: {
      organizationId: org.id,
      initiatorId: lead.id,
      scenario: 'NEW_HIRE' as any,
      moment: 'STARTING' as any,
      label: 'Michael Bello, first 90 days',
      timelineDays: 90,
      timelineStated: true,
      cadenceStated: true,
      cadence: 'FORTNIGHTLY' as any,
      status: 'OPEN' as any,
      brief: 'A new operations hire, making sure expectations are clear from the start.',
    },
  });

  const pLead = await prisma.groundParticipant.create({
    data: { groundId: ground.id, userId: lead.id, email: lead.email, partyType: 'INITIATOR' as any, roleAsDescribed: 'Operations lead, his manager' },
  });
  const pParty = await prisma.groundParticipant.create({
    data: { groundId: ground.id, userId: party.id, email: party.email, partyType: 'PARTICIPANT' as any, roleAsDescribed: 'The new operations hire' },
  });

  for (const session of [1, 2]) {
    for (const [p, lines] of [[pLead, LEAD_LINES], [pParty, PARTY_LINES]] as const) {
      const ci = await prisma.checkIn.create({
        data: {
          groundId: ground.id, participantId: p.id, sessionNumber: session,
          status: 'COMPLETED' as any, completedAt: new Date(),
        },
      });
      for (const [type, text] of lines) {
        await prisma.recordEntry.create({
          data: { participantId: p.id, checkInId: ci.id, type: type as any, text },
        });
      }
    }
  }

  /** The yardstick and the starting point, so both new panels have something in them. */
  await prisma.groundBaseline.create({
    data: {
      groundId: ground.id, version: 1,
      successLooksLike: 'He is running one client account without needing to check in on every decision.',
      conditions: ['Finance system access is granted', 'Tom hands over his account notes'],
      effectiveFrom: new Date(),
    },
  }).catch((e: any) => console.log('baseline skipped:', e.message));

  for (const [text, s] of [[LEAD_LINES[0][1], 1], [LEAD_LINES[1][1], 1]] as const) {
    await prisma.groundBaselineEntry.create({
      data: { groundId: ground.id, text, capturedAtSession: s },
    }).catch((e: any) => console.log('entry skipped:', e.message));
  }

  console.log(JSON.stringify({ groundId: ground.id, leadParticipant: pLead.id, partyParticipant: pParty.id }, null, 2));
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
