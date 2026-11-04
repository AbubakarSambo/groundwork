/**
 * A WHOLE COMPANY ON THIS COMPUTER, so every screen can be reviewed with something real in it.
 *
 * Hafsah, 5 October: a proper company name, a plan with priorities, at least eight check-ins of
 * different kinds with people who have answered, and the suites on. It has to fill the Company
 * page, the boards, Today and the suites.
 *
 * NO MODEL IS CALLED. Every row is written here: the people, the plan, nine check-ins across nine
 * different situations, what each person said in their own words, and a report per check-in so the
 * boards and Today have something to read. That makes it fast, repeatable and the same every time,
 * which is what a review needs. It also means the sentences are mine rather than the engine's, so
 * **this is for walking the screens, never for judging the engine's writing** - the twenty-four
 * scenario run is what judges that.
 *
 * IT ACCEPTS ONLY A DATABASE ON THIS COMPUTER (decision 98, item 2), the shared rule in
 * a-database-on-this-computer.ts. Anything hosted is refused before a row is read or written.
 *
 * From api/:
 *
 *   npx ts-node -T journey/seed-a-company-for-review.ts postgresql://localhost:5432/<your database>
 *
 * Running it twice leaves one company, not two.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { itIsADatabaseOnThisComputer, NOT_A_DATABASE_ON_THIS_COMPUTER, theyAreInThisOrganisation } from './a-database-on-this-computer';

const PASSWORD = 'review-local-only';
const SLUG = 'kijani-foods';
const COMPANY = 'Kijani Foods';

const PEOPLE = [
  { key: 'naomi', first: 'Naomi', last: 'Kariuki', role: 'ADMIN' as const, title: 'Managing director' },
  { key: 'tendai', first: 'Tendai', last: 'Moyo', role: 'LEAD' as const, title: 'Head of sales' },
  { key: 'bilal', first: 'Bilal', last: 'Rahman', role: 'LEAD' as const, title: 'Head of operations' },
  { key: 'esther', first: 'Esther', last: 'Adeyemi', role: 'MEMBER' as const, title: 'Account manager' },
  { key: 'kwesi', first: 'Kwesi', last: 'Boateng', role: 'MEMBER' as const, title: 'Account manager' },
  { key: 'lindiwe', first: 'Lindiwe', last: 'Dube', role: 'MEMBER' as const, title: 'Depot supervisor' },
  { key: 'arjun', first: 'Arjun', last: 'Shah', role: 'MEMBER' as const, title: 'Engineer' },
  { key: 'fatou', first: 'Fatou', last: 'Diallo', role: 'MEMBER' as const, title: 'Finance officer' },
];

/** The company's plan: what it is trying to do this quarter, with a number against each. */
const PRIORITIES = [
  { title: 'Get 40 more shops buying from us every week', measure: 'Shops ordering weekly', target: '40' },
  { title: 'Cut the time an order takes to reach a shop to two days', measure: 'Days from order to delivery', target: '2' },
  { title: 'Bring the cost of a delivery down to 850 shillings', measure: 'Cost per delivery', target: '850' },
  { title: 'Have every depot using the new stock system by the end of the quarter', measure: 'Depots on the new system', target: '4' },
];

/**
 * NINE CHECK-INS, NINE SITUATIONS, so the boards and Today are not one shape repeated. Each names
 * who runs it and who answered, and carries what each of them said in their own words.
 */
const CHECK_INS: {
  key: string; label: string; scenario: string; moment: string; lead: string;
  people: { who: string; said: { type: string; text: string }[] }[];
  picture: string; question: string; agreements: string[];
}[] = [
  {
    key: 'sales', label: 'Weekly sales push, Nairobi', scenario: 'OKR_ALIGNMENT', moment: 'STARTING', lead: 'tendai',
    people: [
      { who: 'esther', said: [
        { type: 'SUCCESS_DEFINITION', text: 'Success for me is twelve new shops ordering every week by the end of the quarter.' },
        { type: 'PROGRESS', text: 'I have signed seven shops so far and four of them have ordered twice.' },
        { type: 'WORRY', text: 'Three shops are waiting on a credit decision and I cannot move them until that comes back.' },
        { type: 'COMMITMENT', text: 'I will take the three credit files to Fatou Diallo on Monday.' },
      ] },
      { who: 'kwesi', said: [
        { type: 'SUCCESS_DEFINITION', text: 'I am counting shops that have placed a second order, not shops that signed.' },
        { type: 'PROGRESS', text: 'Nine shops have signed and two have reordered.' },
        { type: 'INTENT', text: 'Tendai Moyo asked me to put Westlands first this month.' },
      ] },
    ],
    picture: 'Both account managers have checked in. Esther Adeyemi counts a shop once it signs, and Kwesi Boateng counts it once it orders a second time, so the two numbers on this board are not measuring the same thing.',
    question: 'Does a shop count when it signs, or when it orders again?',
    agreements: ['Both are working to the target of forty shops ordering weekly.', 'Both say the credit decision is what holds a new shop up.'],
  },
  {
    key: 'onboarding', label: 'Arjun Shah, first ninety days', scenario: 'NEW_HIRE', moment: 'STARTING', lead: 'bilal',
    people: [
      { who: 'arjun', said: [
        { type: 'SUCCESS_DEFINITION', text: 'I understood the job as keeping the stock system running and fixing what breaks.' },
        { type: 'PROGRESS', text: 'I have closed every ticket within a day since I started.' },
        { type: 'WORRY', text: 'Nobody has told me whether I should be changing how the system works or only keeping it up.' },
      ] },
    ],
    picture: 'Arjun Shah has checked in. He reads the job as keeping the stock system running. Bilal Rahman set it up expecting him to lead the move to the new system in all four depots.',
    question: 'Is this job keeping the system running, or moving four depots onto a new one?',
    agreements: ['Both say the tickets are being closed quickly.'],
  },
  {
    key: 'project', label: 'The new stock system, four depots', scenario: 'NEW_PROJECT', moment: 'STARTING', lead: 'bilal',
    people: [
      { who: 'arjun', said: [
        { type: 'PROGRESS', text: 'Two depots are on the new system and both are using it for every order.' },
        { type: 'WORRY', text: 'The Mombasa depot cannot print labels, so they have gone back to the paper book.' },
        { type: 'COMMITMENT', text: 'I will have an answer from the label supplier by Friday.' },
      ] },
      { who: 'lindiwe', said: [
        { type: 'PROGRESS', text: 'We are on the new system here and it has cut an hour off the morning.' },
        { type: 'TENSION', text: 'Mombasa are telling customers the old lead time and we are telling them the new one.' },
      ] },
    ],
    picture: 'Two of the four depots are on the new system and using it. Mombasa is counted as done and has gone back to the paper book because it cannot print labels.',
    question: 'What has to be true for a depot to count as moved over?',
    agreements: ['Both say the two depots that have moved are faster than before.'],
  },
  {
    key: 'renewal', label: 'The Mombasa haulage contract', scenario: 'CONTRACT_RENEWAL', moment: 'STARTING', lead: 'bilal',
    people: [
      { who: 'lindiwe', said: [
        { type: 'PROGRESS', text: 'Late deliveries went from four in a hundred to nineteen in a hundred since March.' },
        { type: 'INTENT', text: 'We moved our own cut-off to five in the afternoon in March and nobody told the haulier.' },
      ] },
    ],
    picture: 'Late deliveries have risen from four in a hundred to nineteen. The record shows our own order cut-off moved to five in the afternoon in March, and the haulier was never told.',
    question: 'Is the haulier late, or are we handing over three hours later than their trucks are scheduled for?',
    agreements: ['Everyone agrees the late deliveries are real and are being counted the same way.'],
  },
  {
    key: 'drift', label: 'Where the partnerships work went', scenario: 'DRIFT', moment: 'STARTING', lead: 'tendai',
    people: [
      { who: 'kwesi', said: [
        { type: 'INTENT', text: 'Naomi Kariuki asked me in March to cover inbound calls while we were short.' },
        { type: 'PROGRESS', text: 'I have been on inbound calls most of each day since then.' },
      ] },
    ],
    picture: 'Kwesi Boateng still holds the three partnership targets on paper. He has been covering inbound calls since March, at Naomi Kariuki’s request, and nobody moved the targets.',
    question: 'Who holds the three partnership targets now?',
    agreements: ['Both say the inbound calls are being covered.'],
  },
  {
    key: 'budget', label: 'The quarter’s plans and what they cost', scenario: 'WORKPLAN_BUDGET', moment: 'STARTING', lead: 'naomi',
    people: [
      { who: 'tendai', said: [
        { type: 'PROGRESS', text: 'My plan comes to 1,400,000 for the quarter, and 300,000 of that is the Mwangi agency.' },
      ] },
      { who: 'bilal', said: [
        { type: 'PROGRESS', text: 'Operations comes to 1,100,000, including 300,000 for the Mwangi agency to redo the labels.' },
      ] },
    ],
    picture: 'The two plans come to 2,500,000 against a budget of 2,000,000. Both plans include 300,000 for the Mwangi agency, and neither lead knows the other has costed it.',
    question: 'Is the Mwangi agency in one plan or two?',
    agreements: ['Both say the budget for the quarter is 2,000,000.'],
  },
  {
    key: 'pulse', label: 'How the depot week is going', scenario: 'PULSE_CHECK', moment: 'STARTING', lead: 'bilal',
    people: [
      { who: 'lindiwe', said: [
        { type: 'WORRY', text: 'Approvals are sitting with Fatou Diallo and she is on leave until the eighteenth.' },
        { type: 'PROGRESS', text: 'Everything else here is running normally.' },
      ] },
      { who: 'arjun', said: [
        { type: 'WORRY', text: 'I am waiting on the same approvals for the label order.' },
      ] },
    ],
    picture: 'Two of the three people here are waiting on the same thing: approvals that sit with Fatou Diallo, who is away until the eighteenth with nobody covering.',
    question: 'Who approves while Fatou Diallo is away?',
    agreements: ['Everyone says the depot itself is running normally.'],
  },
  {
    key: 'recognition', label: 'The move that saved the week', scenario: 'RECOGNITION', moment: 'RECOGNITION', lead: 'naomi',
    people: [
      { who: 'lindiwe', said: [
        { type: 'PROGRESS', text: 'We kept every delivery going the week the system went down.' },
        { type: 'INTENT', text: 'It was Fatou Diallo who sat with the paper book all night and got the orders out.' },
      ] },
    ],
    picture: 'The week the system went down, every delivery still went out. Lindiwe Dube names Fatou Diallo as the person who kept it going, working through the night from the paper book.',
    question: 'Who should be thanked for the week the system went down?',
    agreements: ['Everyone says no delivery was missed that week.'],
  },
  {
    key: 'handover', label: 'Fatou Diallo’s handover', scenario: 'ROLE_HANDOVER', moment: 'STARTING', lead: 'naomi',
    people: [
      { who: 'fatou', said: [
        { type: 'PROGRESS', text: 'The month-end reconciliation runs off a spreadsheet on my own drive.' },
        { type: 'WORRY', text: 'There is a payment arrangement with the Mwangi agency that is not written in any contract.' },
        { type: 'COMMITMENT', text: 'I will write both of those down before the thirtieth.' },
      ] },
    ],
    picture: 'Two things exist only with Fatou Diallo: the month-end reconciliation, which runs off a spreadsheet on her own drive, and a payment arrangement with the Mwangi agency that is in no contract.',
    question: 'Who owns the month-end reconciliation after the thirtieth?',
    agreements: ['Everyone agrees the handover date is the thirtieth.'],
  },
];

const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000);
const day = (daysFromToday: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d;
};
const email = (key: string) => `${key}@kijani.test`;

export async function loadTheCompany(url: string) {
  if (!itIsADatabaseOnThisComputer(url)) throw new Error(NOT_A_DATABASE_ON_THIS_COMPUTER);
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const org = await db.organization.upsert({
      where: { slug: SLUG },
      update: { name: COMPANY },
      create: { name: COMPANY, slug: SLUG, email: email('naomi') },
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
      await db.person.upsert({
        where: { organizationId_sourceSystem_externalId: { organizationId: org.id, sourceSystem: 'seed', externalId: p.key } },
        update: { displayName: `${p.first} ${p.last}`, email: email(p.key), title: p.title, linkedUserId: users[p.key].id },
        create: {
          organizationId: org.id, sourceSystem: 'seed', externalId: p.key, userName: p.key,
          displayName: `${p.first} ${p.last}`, givenName: p.first, familyName: p.last,
          email: email(p.key), title: p.title, linkedUserId: users[p.key].id,
          managerExternalId: p.key === 'naomi' ? null : p.role === 'LEAD' ? 'naomi' : 'bilal',
        },
      }).catch(() => undefined);
      await theyAreInThisOrganisation(db, org.id, users[p.key].id, p.role);
    }

    /* THE COMPANY'S PLAN. Subjects of type OBJECTIVE are what the Company page reads. */
    for (const [i, pr] of PRIORITIES.entries()) {
      await db.subject.upsert({
        where: { organizationId_sourceSystem_externalId: { organizationId: org.id, sourceSystem: 'seed', externalId: `priority-${i + 1}` } },
        update: { title: pr.title, measure: pr.measure, target: pr.target },
        create: { organizationId: org.id, sourceSystem: 'seed', externalId: `priority-${i + 1}`, type: 'OBJECTIVE' as any, title: pr.title, measure: pr.measure, target: pr.target },
      }).catch(() => undefined);
    }

    /*
     * The check-ins. Cleared by label first, so a second run replaces rather than doubles.
     * A record entry hangs off a participant and that key does not cascade, so the children go
     * first; deleting the grounds on their own fails on the second run with a foreign key error.
     */
    const labels = CHECK_INS.map((c) => c.label);
    const oldParties = await db.groundParticipant.findMany({
      where: { ground: { organizationId: org.id, label: { in: labels } } },
      select: { id: true },
    });
    if (oldParties.length) {
      const ids = oldParties.map((p) => p.id);
      await db.recordEntry.deleteMany({ where: { participantId: { in: ids } } });
      await db.checkIn.deleteMany({ where: { participantId: { in: ids } } });
      await db.groundCommitment.deleteMany({ where: { participantId: { in: ids } } });
      await db.groundParticipant.deleteMany({ where: { id: { in: ids } } });
    }
    await db.report.deleteMany({ where: { ground: { organizationId: org.id, label: { in: labels } } } });
    await db.ground.deleteMany({ where: { organizationId: org.id, label: { in: labels } } });

    let made = 0;
    for (const c of CHECK_INS) {
      const ground = await db.ground.create({
        data: {
          organizationId: org.id, initiatorId: users[c.lead].id,
          scenario: c.scenario as any, moment: c.moment as any, label: c.label, status: 'REPORT_READY' as any,
          timelineDays: 90, createdAt: at(21),
        },
        select: { id: true },
      });

      /* The lead is a party too, and is the one the board is drawn for. */
      const parties: Record<string, string> = {};
      const lead = PEOPLE.find((p) => p.key === c.lead)!;
      const asParty = await db.groundParticipant.create({
        data: { groundId: ground.id, userId: users[c.lead].id, email: email(c.lead), partyType: 'INITIATOR' as any, roleAsDescribed: lead.title },
        select: { id: true },
      });
      parties[c.lead] = asParty.id;
      for (const who of c.people) {
        const p = PEOPLE.find((x) => x.key === who.who)!;
        const row = await db.groundParticipant.create({
          data: { groundId: ground.id, userId: users[who.who].id, email: email(who.who), partyType: 'PARTICIPANT' as any, roleAsDescribed: p.title },
          select: { id: true },
        });
        parties[who.who] = row.id;
      }

      /* Each person's check-in, completed, with what they said on it. */
      for (const who of c.people) {
        const checkIn = await db.checkIn.create({
          data: {
            groundId: ground.id, participantId: parties[who.who], sessionNumber: 1,
            status: 'COMPLETED' as any, availableFrom: at(14), startedAt: at(12), completedAt: at(11),
          },
          select: { id: true },
        });
        for (const s of who.said) {
          await db.recordEntry.create({
            data: { participantId: parties[who.who], checkInId: checkIn.id, type: s.type as any, text: s.text },
          }).catch(() => undefined);
        }
      }

      /* One report, so the board and Today have something to read. */
      await db.report.create({
        data: {
          groundId: ground.id,
          sharedPicture: c.picture,
          centralQuestion: c.question,
          agreements: c.agreements as any,
          divergences: [] as any,
          findings: c.people.map((w) => {
            const p = PEOPLE.find((x) => x.key === w.who)!;
            return { participantId: parties[w.who], label: `${p.first} ${p.last}`, text: w.said.map((s) => s.text).join(' '), hasGap: false, headline: null };
          }) as any,
        },
      }).catch(() => undefined);
      made += 1;
    }

    /* The suites, on, with Naomi approving, and a little waiting in each. */
    for (const s of [
      { suite: 'leave', answers: { approver: users.naomi.id, workflow: 'one_approver', daysAYear: 21 } },
      { suite: 'spend', answers: { approver: users.naomi.id, workflow: 'one_approver', limit: 100000, above: users.naomi.id, categories: ['Fuel', 'Labels', 'Travel'] } },
      { suite: 'reviews', answers: { approver: users.naomi.id, workflow: 'one_approver' } },
    ]) {
      await db.organizationSuite.upsert({
        where: { organizationId_suite: { organizationId: org.id, suite: s.suite } },
        update: { isOn: true, answers: s.answers as any, changedById: users.naomi.id },
        create: { organizationId: org.id, suite: s.suite, isOn: true, answers: s.answers as any, changedById: users.naomi.id },
      });
    }
    await db.leaveRequest.deleteMany({ where: { organizationId: org.id } });
    await db.leaveRequest.createMany({ data: [
      { organizationId: org.id, userId: users.fatou.id, startsOn: day(2), endsOn: day(9), status: 'approved', askedAt: at(20), decidedById: users.naomi.id, decidedAt: at(18), approvedByIds: [users.naomi.id] },
      { organizationId: org.id, userId: users.esther.id, startsOn: day(21), endsOn: day(25), status: 'waiting', askedAt: at(8), stepSince: at(8) },
      { organizationId: org.id, userId: users.kwesi.id, startsOn: day(5), endsOn: day(6), status: 'declined', askedAt: at(4), decidedById: users.naomi.id, decidedAt: at(3), declineReason: 'Esther is already away that week and the Nairobi shops would have nobody.' },
    ] });
    await db.spendRequest.deleteMany({ where: { organizationId: org.id } });
    await db.spendRequest.createMany({ data: [
      { organizationId: org.id, userId: users.arjun.id, amount: '42000' as any, what: 'Label printer for the Mombasa depot', category: 'Labels', status: 'waiting', createdAt: at(10), stepSince: at(10), evidenceNeeded: ['quote'] },
      { organizationId: org.id, userId: users.lindiwe.id, amount: '9500' as any, what: 'Fuel for the depot run', category: 'Fuel', status: 'approved', createdAt: at(15), decidedById: users.naomi.id, decidedAt: at(14), approvedByIds: [users.naomi.id] },
      { organizationId: org.id, userId: users.tendai.id, amount: '300000' as any, what: 'The Mwangi agency, for the quarter', category: 'Labels', status: 'waiting', createdAt: at(2), stepSince: at(2), evidenceNeeded: ['quote', 'receipt'] },
    ] });

    console.log(`\n${COMPANY} is loaded into ${new URL(url).pathname.replace(/^\//, '')}.\n`);
    console.log(`  ${PEOPLE.length} people, ${PRIORITIES.length} company priorities, ${made} check-ins across ${new Set(CHECK_INS.map((c) => c.scenario)).size} situations,`);
    console.log('  leave, spending and reviews on, with Naomi Kariuki approving.\n');
    console.log(`  Sign in with the password  ${PASSWORD}  (local only):\n`);
    for (const p of PEOPLE) console.log(`    ${email(p.key).padEnd(24)} ${p.title}${p.role === 'ADMIN' ? ', admin and approver' : p.role === 'LEAD' ? ', runs check-ins' : ''}`);
    console.log('');
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  const url = process.argv[2] ?? process.env.DATABASE_URL;
  loadTheCompany(String(url ?? '')).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
