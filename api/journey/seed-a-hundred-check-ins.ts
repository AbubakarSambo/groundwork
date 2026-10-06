/**
 * ONE ORGANISATION WITH A HUNDRED CHECK-INS, so the screens can be tested at a size that hurts
 * (screens request 157, from Hafsah's fault 4 on 6 October: the sidebar and the People page listed
 * every check-in, which is unusable with a hundred).
 *
 * About thirty people and a hundred check-ins across every situation and several states: some
 * waiting on the reader, some closed, some the reader is not in at all. No model is called - every
 * row is written here - so it loads in seconds and is the same every time.
 *
 * THE POINT IS THE SHAPE, NOT THE WORDS. The sentences in it are mine. It is for finding out what
 * a list does at a hundred, what search has to cope with, and which check-ins a person should see
 * first. It is no evidence about how the engine writes.
 *
 * IT ACCEPTS ONLY A DATABASE ON THIS COMPUTER (decision 98, item 2). Anything hosted is refused
 * before a row is read or written.
 *
 * From api/:
 *
 *   npx ts-node -T journey/seed-a-hundred-check-ins.ts postgresql://localhost:5432/<your database>
 *
 * Running it twice leaves one hundred, not two.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { itIsADatabaseOnThisComputer, NOT_A_DATABASE_ON_THIS_COMPUTER, theyAreInThisOrganisation } from './a-database-on-this-computer';

const PASSWORD = 'hundred-local-only';
const SLUG = 'a-hundred-check-ins';
const COMPANY = 'Harambee Logistics';
const HOW_MANY = 100;

/** The three sign-ins request 157 asks for, by name, plus the rest of the company. */
const ADMIN = 'zuri';
const BUSY_LEAD = 'kofi';
const QUIET_PARTICIPANT = 'imani';

const FIRST = ['Zuri', 'Kofi', 'Imani', 'Thabo', 'Nia', 'Jabari', 'Asha', 'Kwabena', 'Zola', 'Femi',
  'Ayana', 'Sekou', 'Nadia', 'Obi', 'Lerato', 'Idris', 'Chiamaka', 'Tendai', 'Hawa', 'Musa',
  'Amara', 'Kamau', 'Sade', 'Bakari', 'Rania', 'Gugu', 'Yusuf', 'Dalia', 'Kito', 'Nalu'];
const LAST = ['Mbeki', 'Asante', 'Okafor', 'Dube', 'Hassan', 'Mwangi', 'Diallo', 'Nkosi', 'Bello', 'Juma',
  'Osei', 'Keita', 'Abara', 'Zuma', 'Toure', 'Sanusi', 'Adeyemi', 'Moyo', 'Camara', 'Danjuma',
  'Eze', 'Njoroge', 'Balogun', 'Mutua', 'Farah', 'Ndlovu', 'Sow', 'Kone', 'Achieng', 'Were'];

const SCENARIOS = ['OKR_ALIGNMENT', 'NEW_HIRE', 'NEW_PROJECT', 'DRIFT', 'PULSE_CHECK', 'REALIGN_TEAM',
  'CONTRACT_RENEWAL', 'WORKPLAN_BUDGET', 'RECOGNITION', 'ROLE_HANDOVER', 'CRISIS_ALIGNMENT',
  'IMPLEMENTATION_TRACKING', 'NEW_MANAGER', 'BOARD_STRATEGY', 'SNAPSHOT', 'TEAM_UPDATES'];

const SUBJECTS = ['the Nairobi route', 'the Mombasa depot', 'weekly orders', 'the new stock system',
  'driver training', 'the cold chain', 'fuel costs', 'the Kisumu hub', 'shop onboarding',
  'the returns process', 'night loading', 'the label supplier', 'route planning', 'the van fleet',
  'customer calls', 'the warehouse move', 'stock counts', 'the delivery window', 'spare parts',
  'the Eldoret run'];

const key = (i: number) => `p${i}`;
const email = (k: string) => `${k}@harambee.test`;
const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000);

export async function loadAHundred(url: string) {
  if (!itIsADatabaseOnThisComputer(url)) throw new Error(NOT_A_DATABASE_ON_THIS_COMPUTER);
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const org = await db.organization.upsert({
      where: { slug: SLUG },
      update: { name: COMPANY },
      create: { name: COMPANY, slug: SLUG, email: email(ADMIN) },
    });

    /* The people. The three named sign-ins keep their own keys so the emails never move. */
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const people: { k: string; first: string; last: string; role: 'ADMIN' | 'LEAD' | 'MEMBER' }[] = [];
    for (let i = 0; i < 30; i++) {
      const k = i === 0 ? ADMIN : i === 1 ? BUSY_LEAD : i === 2 ? QUIET_PARTICIPANT : key(i);
      people.push({ k, first: FIRST[i], last: LAST[i], role: i === 0 ? 'ADMIN' : i < 6 ? 'LEAD' : 'MEMBER' });
    }
    const users: Record<string, string> = {};
    for (const p of people) {
      const u = await db.user.upsert({
        where: { email: email(p.k) },
        update: { organizationId: org.id, isEmailVerified: true, passwordHash, role: p.role },
        create: { email: email(p.k), firstName: p.first, lastName: p.last, organizationId: org.id, isEmailVerified: true, passwordHash, role: p.role },
        select: { id: true },
      });
      users[p.k] = u.id;
      await theyAreInThisOrganisation(db, org.id, u.id, p.role);
    }

    /* Cleared child first: a record entry hangs off a participant and that key does not cascade. */
    const old = await db.groundParticipant.findMany({ where: { ground: { organizationId: org.id } }, select: { id: true } });
    if (old.length) {
      const ids = old.map((p) => p.id);
      await db.recordEntry.deleteMany({ where: { participantId: { in: ids } } });
      await db.checkIn.deleteMany({ where: { participantId: { in: ids } } });
      await db.groundCommitment.deleteMany({ where: { participantId: { in: ids } } });
      await db.groundParticipant.deleteMany({ where: { id: { in: ids } } });
    }
    await db.report.deleteMany({ where: { ground: { organizationId: org.id } } }).catch(() => undefined);
    await db.ground.deleteMany({ where: { organizationId: org.id } });

    /*
     * A HUNDRED, IN THE STATES A LIST HAS TO TELL APART. Every fourth is closed, every third has
     * the reader waiting on it, and a fifth of them leave the busy lead and the quiet participant
     * out altogether - a person who is in everything tests nothing about "which ones are mine".
     */
    let waitingOnKofi = 0; let closed = 0; let withoutKofi = 0; let imaniIsIn = 0;
    for (let i = 0; i < HOW_MANY; i++) {
      const scenario = SCENARIOS[i % SCENARIOS.length];
      const isClosed = i % 4 === 3;
      const kofiIsIn = i % 5 !== 4;
      const kofiRunsIt = kofiIsIn && i % 3 !== 2;
      const lead = kofiRunsIt ? BUSY_LEAD : people[2 + (i % 4)].k;
      if (!kofiIsIn) withoutKofi += 1;
      if (isClosed) closed += 1;

      const ground = await db.ground.create({
        data: {
          organizationId: org.id, initiatorId: users[lead],
          scenario: scenario as any, moment: 'STARTING' as any,
          status: (isClosed ? 'CLOSED' : i % 3 === 0 ? 'REPORT_READY' : 'ACTIVE') as any,
          label: `${SUBJECTS[i % SUBJECTS.length]}, round ${Math.floor(i / SUBJECTS.length) + 1}`,
          timelineDays: 90, createdAt: at(120 - i),
        },
        select: { id: true },
      });

      /* The lead, two or three others, and sometimes the two named readers. */
      const others = [people[6 + (i % 20)].k, people[7 + ((i * 3) % 20)].k].filter((k, n, a) => k !== lead && a.indexOf(k) === n);
      if (i % 7 === 0) { others.push(QUIET_PARTICIPANT); imaniIsIn += 1; }
      if (kofiIsIn && !kofiRunsIt) others.push(BUSY_LEAD);

      /* One row per person: the pushes above can repeat somebody the first two picks already
         chose, and (ground_id, email) is unique. Deduped once, over the whole list. */
      const inIt = [lead, ...others].filter((k, n, a) => a.indexOf(k) === n);
      const partyIds: { k: string; id: string }[] = [];
      for (const [n, k] of inIt.entries()) {
        const row = await db.groundParticipant.create({
          data: { groundId: ground.id, userId: users[k], email: email(k), partyType: (n === 0 ? 'INITIATOR' : 'PARTICIPANT') as any },
          select: { id: true },
        });
        partyIds.push({ k, id: row.id });
      }

      /* Some are waiting on whoever reads them; the rest are answered. */
      const waiting = !isClosed && i % 3 === 0;
      if (waiting && kofiIsIn) waitingOnKofi += 1;
      for (const party of partyIds) {
        await db.checkIn.create({
          data: {
            groundId: ground.id, participantId: party.id, sessionNumber: 1,
            status: (waiting ? 'NOT_STARTED' : 'COMPLETED') as any,
            availableFrom: at(30), ...(waiting ? {} : { startedAt: at(20), completedAt: at(19) }),
          },
        });
        if (!waiting) {
          await db.recordEntry.create({
            data: { participantId: party.id, type: 'PROGRESS' as any, text: `I have kept ${SUBJECTS[i % SUBJECTS.length]} moving this round.` },
          }).catch(() => undefined);
        }
      }

      if (!waiting) {
        await db.report.create({
          data: {
            groundId: ground.id,
            sharedPicture: `Everybody on ${SUBJECTS[i % SUBJECTS.length]} has checked in. They agree the work is moving and differ on what counts as finished.`,
            centralQuestion: `What counts as finished on ${SUBJECTS[i % SUBJECTS.length]}?`,
            agreements: ['Everybody says the work is moving.'] as any,
            divergences: [] as any,
          },
        }).catch(() => undefined);
      }
    }

    console.log(`\n${COMPANY} is loaded into ${new URL(url).pathname.replace(/^\//, '')}.\n`);
    console.log(`  ${people.length} people, ${HOW_MANY} check-ins across ${SCENARIOS.length} situations.`);
    console.log(`  ${closed} closed, ${waitingOnKofi} waiting on the busy lead, ${withoutKofi} he is not in at all.`);
    console.log(`  The quiet participant is in ${imaniIsIn}.\n`);
    console.log(`  Sign in with the password  ${PASSWORD}  (local only):\n`);
    console.log(`    ${email(ADMIN).padEnd(26)} admin, sees everything`);
    console.log(`    ${email(BUSY_LEAD).padEnd(26)} the lead who runs many`);
    console.log(`    ${email(QUIET_PARTICIPANT).padEnd(26)} a participant in only a few`);
    console.log('');
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  const url = process.argv[2] ?? process.env.DATABASE_URL;
  loadAHundred(String(url ?? '')).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
