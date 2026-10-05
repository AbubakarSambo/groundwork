/**
 * AN ANCHOR CHECK-IN ON THIS COMPUTER, with the anchor switch on, so the anchor screens can be
 * walked as a real person (request 155).
 *
 * The screens for the front door, the reveal, the people step, the invitation, the month board,
 * the active line, "Groundwork recommends", ideas and the end of month are all built and pass
 * their tests, and none of them could be used here: `release.anchorScenario` is off and there is
 * no anchor check-in to open.
 *
 * It loads two, because the end-of-month page needs one and the month board needs the other:
 *
 *   - a LIVE one in its second week, with a lead and four people, their check-ins answered,
 *     commitments, a dependency between two of them, and a "Groundwork recommends" offer with an
 *     idea captured after its yes;
 *   - an ENDED one, started five weeks ago and closed, so the end-of-month read has something.
 *
 * THE SWITCH IS TURNED ON FOR THIS DATABASE ONLY. `release.anchorScenario` is a platform setting
 * and this writes `{ "on": true }` into the one database it is pointed at - which is why the rule
 * below matters more here than anywhere else.
 *
 * IT ACCEPTS ONLY A DATABASE ON THIS COMPUTER (decision 98, item 2), the shared rule in
 * a-database-on-this-computer.ts. Anything hosted is refused before a row is read or written.
 *
 * From api/:
 *
 *   npx ts-node -T journey/seed-an-anchor-check-in.ts postgresql://localhost:5432/<your database>
 *
 * Running it twice leaves two check-ins, not four.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { itIsADatabaseOnThisComputer, NOT_A_DATABASE_ON_THIS_COMPUTER } from './a-database-on-this-computer';
import { ANCHOR_SCENARIO_KEY } from '../src/modules/admin/what-is-hidden-at-release';
/* From the module that DEFINES it. the-anchor-door only imports it, so importing it from there
   came back undefined at runtime and every ground was written with started_from null - which is
   the one field that makes a check-in an anchor one. The seed looked like it had worked. */
import { STARTED_FROM_THE_ANCHOR } from '../src/modules/conversation/the-anchor-weekly-check-in';

const PASSWORD = 'anchor-local-only';
const SLUG = 'anchor-for-the-screens';

const PEOPLE = [
  { key: 'rukia', first: 'Rukia', last: 'Otieno', role: 'ADMIN' as const, title: 'Founder', lead: true },
  { key: 'amani', first: 'Amani', last: 'Wekesa', role: 'MEMBER' as const, title: 'Sales' },
  { key: 'baraka', first: 'Baraka', last: 'Mwangi', role: 'MEMBER' as const, title: 'Deliveries' },
  { key: 'neema', first: 'Neema', last: 'Achieng', role: 'MEMBER' as const, title: 'Shops' },
  { key: 'juma', first: 'Juma', last: 'Kariuki', role: 'MEMBER' as const, title: 'Warehouse' },
];

/** What the lead said at the front door. The end-of-month read needs her own first words. */
const HER_WORDS = 'I want everyone to understand that we win or lose on whether a shop can reorder the same week, and right now nobody owns that end to end.';

const SAID: Record<string, { type: string; text: string }[]> = {
  amani: [
    { type: 'SUCCESS_DEFINITION', text: 'For me this works if a shop can reorder without calling me first.' },
    { type: 'PROGRESS', text: 'Eleven shops reordered this week without me doing anything.' },
    { type: 'WORRY', text: 'The ones who do call are calling because the price list they have is out of date.' },
  ],
  baraka: [
    { type: 'PROGRESS', text: 'I got every delivery out by eleven for four days running.' },
    { type: 'WORRY', text: 'I am waiting on the warehouse to load the van earlier than seven.' },
  ],
  neema: [
    { type: 'SUCCESS_DEFINITION', text: 'A shop understands the offer well enough to order twice without being sold to again.' },
    { type: 'PROGRESS', text: 'I visited nine shops and four of them have ordered again.' },
  ],
  juma: [
    { type: 'PROGRESS', text: 'We load from six thirty now on three of the five days.' },
    { type: 'TENSION', text: 'Baraka is asking for seven and the pickers do not start until six thirty.' },
  ],
};

const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000);
const email = (key: string) => `${key}@anchor.test`;

export async function loadTheAnchor(url: string) {
  if (!itIsADatabaseOnThisComputer(url)) throw new Error(NOT_A_DATABASE_ON_THIS_COMPUTER);
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    /* THE SWITCH, for this database only. */
    await db.platformSetting.upsert({
      where: { key: ANCHOR_SCENARIO_KEY },
      update: { value: { on: true } as any },
      create: { key: ANCHOR_SCENARIO_KEY, value: { on: true } as any },
    });

    const org = await db.organization.upsert({
      where: { slug: SLUG },
      update: { name: 'Sokoni Fresh' },
      create: { name: 'Sokoni Fresh', slug: SLUG, email: email('rukia') },
    });

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const users: Record<string, { id: string }> = {};
    for (const p of PEOPLE) {
      users[p.key] = await db.user.upsert({
        where: { email: email(p.key) },
        update: { organizationId: org.id, isEmailVerified: true, passwordHash, role: p.role },
        create: { email: email(p.key), firstName: p.first, lastName: p.last, organizationId: org.id, isEmailVerified: true, passwordHash, role: p.role },
        select: { id: true },
      });
      await db.organizationMembership.upsert({
        where: { organizationId_userId: { organizationId: org.id, userId: users[p.key].id } },
        update: {},
        create: { organizationId: org.id, userId: users[p.key].id },
      }).catch(() => undefined);
    }

    const LABELS = ['Everyone pulling the same way', 'Everyone pulling the same way (last month)'];
    /*
     * CLEARED CHILD FIRST, because not every row cascades. The lead's own first words are a record
     * entry hanging off a participant with no check-in, and that foreign key has no cascade, so
     * deleting the grounds straight off failed on the second run. Children, then parents.
     */
    const old = await db.groundParticipant.findMany({
      where: { ground: { organizationId: org.id, label: { in: LABELS } } },
      select: { id: true },
    });
    if (old.length) {
      const ids = old.map((p) => p.id);
      await db.recordEntry.deleteMany({ where: { participantId: { in: ids } } });
      await db.checkIn.deleteMany({ where: { participantId: { in: ids } } });
      await db.groundCommitment.deleteMany({ where: { participantId: { in: ids } } });
      await db.groundDependency.deleteMany({ where: { fromParticipantId: { in: ids } } });
      await db.groundParticipant.deleteMany({ where: { id: { in: ids } } });
    }
    await db.ground.deleteMany({ where: { organizationId: org.id, label: { in: LABELS } } });

    /** One anchor check-in, with everything its board reads. */
    const makeOne = async (label: string, startedDaysAgo: number, ended: boolean) => {
      const ground = await db.ground.create({
        data: {
          organizationId: org.id, initiatorId: users.rukia.id,
          scenario: 'REALIGN_TEAM' as any, moment: 'STARTING' as any,
          status: (ended ? 'CLOSED' : 'REPORT_READY') as any,
          label, timelineDays: 28, startedFrom: STARTED_FROM_THE_ANCHOR,
          createdAt: at(startedDaysAgo),
        },
        select: { id: true },
      });

      const parties: Record<string, string> = {};
      for (const p of PEOPLE) {
        const row = await db.groundParticipant.create({
          data: {
            groundId: ground.id, userId: users[p.key].id, email: email(p.key),
            partyType: (p.lead ? 'INITIATOR' : 'PARTICIPANT') as any, roleAsDescribed: p.title,
          },
          select: { id: true },
        });
        parties[p.key] = row.id;
      }

      /* The lead's own first words, which the end-of-month read begins from. */
      await db.recordEntry.create({
        data: { participantId: parties.rukia, type: 'SUCCESS_DEFINITION' as any, text: HER_WORDS },
      }).catch(() => undefined);

      for (const p of PEOPLE.filter((x) => !x.lead)) {
        const checkIn = await db.checkIn.create({
          data: {
            groundId: ground.id, participantId: parties[p.key], sessionNumber: 1,
            status: 'COMPLETED' as any, availableFrom: at(startedDaysAgo - 1), startedAt: at(startedDaysAgo - 2), completedAt: at(startedDaysAgo - 3),
          },
          select: { id: true },
        });
        for (const s of SAID[p.key] ?? []) {
          await db.recordEntry.create({
            data: { participantId: parties[p.key], checkInId: checkIn.id, type: s.type as any, text: s.text },
          }).catch(() => undefined);
        }
      }

      /* What people said they would do, for the active line and the month board. */
      await db.groundCommitment.createMany({
        data: [
          { groundId: ground.id, participantId: parties.amani, text: 'Send every shop the current price list', status: 'OPEN' as any },
          { groundId: ground.id, participantId: parties.juma, text: 'Load the van from six thirty every day, not three days a week', status: 'OPEN' as any },
          { groundId: ground.id, participantId: parties.neema, text: 'Visit the four shops that have not reordered', status: 'DONE' as any },
        ] as any,
      });

      /* One person waiting on another, which is what the board draws as a dependency. The field is
         `what`, not `text`; a silent catch here hid that until the rows were counted. */
      await db.groundDependency.create({
        data: { groundId: ground.id, fromParticipantId: parties.baraka, onParticipantId: parties.juma, what: 'the warehouse to load the van earlier than seven' } as any,
      });

      return ground.id;
    };

    const live = await makeOne(LABELS[0], 9, false);
    const past = await makeOne(LABELS[1], 37, true);

    /*
     * "GROUNDWORK RECOMMENDS", and the idea captured after its yes. A recommendation is the offer;
     * the idea is the one that was kept once somebody said yes to it, so it is a second row in the
     * accepted state rather than a different table.
     */
    await db.recommendation.deleteMany({ where: { organizationId: org.id } }).catch(() => undefined);
    await db.recommendation.createMany({
      data: [
        {
          organizationId: org.id, kind: 'anchor_offer', body: 'Two people are waiting on the same thing: the van loading time. Settle that one and both of them move.',
          rationale: { from: 'the record', because: 'Baraka asked for seven and Juma loads from six thirty on three days of five.' } as any,
          sourceDetectorIds: [], state: 'PROPOSED' as any, proposedAt: at(2),
        },
        {
          organizationId: org.id, kind: 'anchor_idea', body: 'Put the current price list in the shop WhatsApp group every Monday.',
          rationale: { from: 'Amani Wekesa', because: 'The shops who call are calling because their price list is out of date.' } as any,
          sourceDetectorIds: [], state: 'ACCEPTED' as any, proposedAt: at(5), resolvedAt: at(4), resolvedByExternalId: 'rukia',
        },
      ] as any,
    });

    console.log(`\nThe anchor is loaded into ${new URL(url).pathname.replace(/^\//, '')}.\n`);
    console.log(`  release.anchorScenario is ON for this database.`);
    console.log(`  Sokoni Fresh, slug ${SLUG}`);
    console.log(`  live check-in   ${live}  (second week, four people answered)`);
    console.log(`  ended check-in  ${past}  (started five weeks ago, closed, for the end-of-month page)`);
    console.log(`\n  Sign in with the password  ${PASSWORD}  (local only):\n`);
    for (const p of PEOPLE) console.log(`    ${email(p.key).padEnd(22)} ${p.title}${p.lead ? ', runs it' : ''}`);
    console.log('');
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  const url = process.argv[2] ?? process.env.DATABASE_URL;
  loadTheAnchor(String(url ?? '')).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
