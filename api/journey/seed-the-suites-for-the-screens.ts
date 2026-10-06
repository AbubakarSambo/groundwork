/**
 * A LOCAL ORGANISATION WITH EVERY SUITE SWITCHED ON, so the suite screens can be walked like a
 * real user (request 154, item 1: "no suite can be tested with data").
 *
 * It makes one organisation, five people with a role each, and leave, spending and performance
 * reviews switched on with an approver, then a few requests and reviews sitting in every state a
 * screen has to draw. No model is called and nothing is read from anywhere: every row is written
 * here, so running it twice leaves the same thing behind.
 *
 * IT ACCEPTS ONLY A DATABASE ON THIS COMPUTER, the same rule as the MarketView Q4 seed (decision
 * 98, item 2): the host in the connection string must be exactly localhost or 127.0.0.1. Anything
 * else is refused and nothing is read or written. The check is shared with that seed, in
 * a-database-on-this-computer.ts, so there is one rule and not two.
 *
 * From api/, with the connection string as the argument (or in this computer's own DATABASE_URL):
 *
 *   npx ts-node -T journey/seed-the-suites-for-the-screens.ts postgresql://localhost:5432/groundwork_dev
 *
 * The database must already have its migrations applied.
 *
 * WHO SIGNS IN, AND AS WHAT. Every person has the same password, which is written in the output
 * and is local only. The emails are fixed so the screens workspace can keep its own notes:
 *
 *   amina@suites.test    admin, the approver for what Daniel asks and for spending above the limit
 *   daniel@suites.test   lead, the manager of Grace, Peter and Sara: approves their leave and writes their reviews
 *   grace@suites.test    team, with a request in every state and a review of her own
 *   peter@suites.test    team, whose requests are the declined ones
 *   sara@suites.test     team, who has asked for nothing, for the empty states
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { itIsADatabaseOnThisComputer, NOT_A_DATABASE_ON_THIS_COMPUTER, theyAreInThisOrganisation } from './a-database-on-this-computer';

/** Local only, and said in the output rather than hidden, because it exists to be typed in. */
const PASSWORD = 'suites-local-only';
const SLUG = 'suites-for-the-screens';

const THE_PEOPLE = [
  { key: 'amina', first: 'Amina', last: 'Yusuf', role: 'ADMIN' as const, title: 'Operations director' },
  { key: 'daniel', first: 'Daniel', last: 'Park', role: 'LEAD' as const, title: 'Team lead' },
  { key: 'grace', first: 'Grace', last: 'Mwangi', role: 'MEMBER' as const, title: 'Field officer' },
  { key: 'peter', first: 'Peter', last: 'Okoro', role: 'MEMBER' as const, title: 'Field officer' },
  { key: 'sara', first: 'Sara', last: 'Lindqvist', role: 'MEMBER' as const, title: 'Analyst' },
];

const email = (key: string) => `${key}@suites.test`;
/** A whole day counted from today, moved to a weekday so no leave starts or ends on a weekend (request 162, item 5). */
const day = (daysFromToday: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + (daysFromToday >= 0 ? 1 : -1));
  return d;
};
const at = (daysFromToday: number) => new Date(Date.now() + daysFromToday * 86400000);

export async function loadTheSuites(url: string) {
  if (!itIsADatabaseOnThisComputer(url)) {
    throw new Error(NOT_A_DATABASE_ON_THIS_COMPUTER);
  }
  const db = new PrismaClient({ datasourceUrl: url });
  const said: string[] = [];
  try {
    /* One organisation, found by its slug, so a second run writes into the same one. */
    const org = await db.organization.upsert({
      where: { slug: SLUG },
      update: {},
      create: { name: 'Suites Test Company', slug: SLUG, email: email('amina') },
    });

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const users: Record<string, { id: string }> = {};
    for (const p of THE_PEOPLE) {
      users[p.key] = await db.user.upsert({
        where: { email: email(p.key) },
        update: { organizationId: org.id, isEmailVerified: true, passwordHash, role: p.role },
        create: {
          email: email(p.key), firstName: p.first, lastName: p.last,
          organizationId: org.id, isEmailVerified: true, passwordHash, role: p.role,
        },
        select: { id: true },
      });
      await theyAreInThisOrganisation(db, org.id, users[p.key].id, p.role);
    }

    /*
     * THE ROSTER, because a review is about a roster entry and not about a sign-in. Each person's
     * external id is their key, so the reviews below can name them without a lookup.
     */
    for (const p of THE_PEOPLE) {
      await db.person.upsert({
        where: { organizationId_sourceSystem_externalId: { organizationId: org.id, sourceSystem: 'seed', externalId: p.key } },
        update: { displayName: `${p.first} ${p.last}`, email: email(p.key), title: p.title, linkedUserId: users[p.key].id },
        create: {
          organizationId: org.id, sourceSystem: 'seed', externalId: p.key,
          userName: p.key, displayName: `${p.first} ${p.last}`, givenName: p.first, familyName: p.last,
          email: email(p.key), title: p.title, linkedUserId: users[p.key].id,
          managerExternalId: p.key === 'daniel' || p.key === 'amina' ? null : 'daniel',
        },
      }).catch(() => undefined);
    }

    /*
     * THE THREE SUITES, ON, WITH AMINA AS THE APPROVER. `answers` is keyed by question id and a
     * "person" answer holds a user id and never a name, which is what the suite rules read.
     */
    /*
     * The ids are the questions' own (the-ten-suites.ts): leave asks "days" and a choice between "Their manager" and
     * "An admin"; reviews ask who writes each one with the person (request 162, item 4). The categories are a spending
     * rule, not an answer, so they are kept where the rules are (`spendRules`).
     */
    const suites: { suite: string; answers: Record<string, unknown>; isOn?: boolean }[] = [
      { suite: 'leave', answers: { days: 21, approver: 'Their manager' } },
      { suite: 'spend', answers: { currency: 'KES', limit: 50000, above: users.amina.id } },
      { suite: 'reviews', answers: { every: 'Every 6 months', writer: 'Their manager' } },
      { suite: 'spendRules', isOn: false, answers: { categories: [{ name: 'Fuel' }, { name: 'Travel' }, { name: 'Equipment' }], categoryCalled: 'category' } },
    ];
    for (const s of suites) {
      await db.organizationSuite.upsert({
        where: { organizationId_suite: { organizationId: org.id, suite: s.suite } },
        update: { isOn: s.isOn ?? true, answers: s.answers as any, changedById: users.amina.id },
        create: { organizationId: org.id, suite: s.suite, isOn: s.isOn ?? true, answers: s.answers as any, changedById: users.amina.id },
      });
    }
    said.push('three suites on: leave, spend, reviews. Daniel is the manager of Grace, Peter and Sara, and so approves their leave and writes their reviews; Amina is the admin and the approver above the limit');

    /* LEAVE, one in each state a screen draws. Cleared first so a second run does not stack them. */
    await db.leaveRequest.deleteMany({ where: { organizationId: org.id } });
    await db.leaveRequest.createMany({
      data: [
        { organizationId: org.id, userId: users.daniel.id, startsOn: day(14), endsOn: day(18), status: 'waiting', askedAt: at(-2), stepSince: at(-2) },
        { organizationId: org.id, userId: users.grace.id, startsOn: day(30), endsOn: day(37), status: 'waiting', askedAt: at(-9), stepSince: at(-9) },
        /* Grace is away this week, and Sara stands in for her, so "Who's off" has somebody in it (request 162, item 5). */
        { organizationId: org.id, userId: users.grace.id, startsOn: day(-1), endsOn: day(2), status: 'approved', standInUserId: users.sara.id, askedAt: at(-12), decidedById: users.daniel.id, decidedAt: at(-10), approvedByIds: [users.daniel.id] },
        { organizationId: org.id, userId: users.grace.id, startsOn: day(-20), endsOn: day(-16), status: 'approved', askedAt: at(-30), decidedById: users.daniel.id, decidedAt: at(-28), approvedByIds: [users.daniel.id] },
        { organizationId: org.id, userId: users.peter.id, startsOn: day(3), endsOn: day(10), status: 'declined', askedAt: at(-6), decidedById: users.daniel.id, decidedAt: at(-5), declineReason: 'Two people are already away that week and the route would have nobody on it.' },
      ],
    });
    said.push('leave: 2 waiting (one of them nine days old), 2 approved (Grace is away this week with Sara standing in), 1 declined with a reason');

    /* SPENDING, the same, with one under the limit and one over it. */
    await db.spendRequest.deleteMany({ where: { organizationId: org.id } });
    await db.spendRequest.createMany({
      data: [
        { organizationId: org.id, userId: users.daniel.id, amount: '18000' as any, what: 'Fuel for the Karen route for October', category: 'Fuel', status: 'waiting', createdAt: at(-1), stepSince: at(-1), evidenceNeeded: ['receipt'] },
        { organizationId: org.id, userId: users.grace.id, amount: '120000' as any, what: 'Two tablets for the field team', category: 'Equipment', status: 'waiting', createdAt: at(-11), stepSince: at(-11), evidenceNeeded: ['quote'] },
        { organizationId: org.id, userId: users.grace.id, amount: '7500' as any, what: 'Travel to the Westlands shops', category: 'Travel', status: 'approved', createdAt: at(-20), decidedById: users.amina.id, decidedAt: at(-19), approvedByIds: [users.amina.id] },
        { organizationId: org.id, userId: users.peter.id, amount: '64000' as any, what: 'A second van for the month', category: 'Travel', status: 'declined', createdAt: at(-8), decidedById: users.amina.id, decidedAt: at(-7), declineReason: 'The budget for the quarter is already committed. Ask again in January with the route numbers.' },
      ],
    });
    said.push('spending: 2 waiting (one over the 50,000 limit, one eleven days old), 1 approved, 1 declined with a reason');

    /*
     * REVIEWS, one at each stage: just started, the manager has written, the person has answered,
     * and decided. Each needs its own EvaluationDue, which is what a review hangs off.
     */
    await db.performanceReview.deleteMany({ where: { organizationId: org.id } });
    await db.evaluationDue.deleteMany({ where: { organizationId: org.id } });
    const stages = [
      { person: 'grace', kind: 'Half-year review', stage: 'started' },
      { person: 'peter', kind: 'Half-year review', stage: 'managers words' },
      { person: 'sara', kind: 'Probation', stage: 'their view' },
      { person: 'daniel', kind: 'Half-year review', stage: 'decided' },
    ];
    for (const s of stages) {
      const due = await db.evaluationDue.create({
        data: { organizationId: org.id, personExternalId: s.person, dueOn: day(7), kind: s.kind, source: 'the suites seed' },
        select: { id: true },
      });
      const words = s.stage === 'started' ? null
        : 'The record shows every commitment settled on the day it was due, and two routes picked up that nobody asked for.';
      await db.performanceReview.create({
        data: {
          organizationId: org.id, evaluationDueId: due.id, personExternalId: s.person,
          startedById: s.person === 'daniel' ? users.amina.id : users.daniel.id, startedAt: at(-4), recordFrom: at(-120),
          ...(words ? { managersWords: words, managersWordsById: s.person === 'daniel' ? users.amina.id : users.daniel.id, managersWordsAt: at(-3) } : {}),
          ...(s.stage === 'their view' || s.stage === 'decided'
            ? { theirView: 'I agree about the routes. The part I would add is that the second one took three weeks longer because the warehouse cut-off moved.', theirViewAt: at(-2) }
            : {}),
          ...(s.stage === 'decided'
            ? { decision: 'Stay in the role, with the Westlands route added from November.', decisionReasons: 'Everything committed to was settled on time, and the two extra routes were taken on without being asked.', decidedById: users.amina.id, decidedAt: at(-1) }
            : {}),
        },
      });
    }
    said.push('reviews: 4, one just started, one with the manager\'s words, one with the person\'s answer, one decided');

    console.log(`\nLoaded into ${new URL(url).pathname.replace(/^\//, '')}:\n`);
    console.log(`  organisation "Suites Test Company" (slug ${SLUG}, id ${org.id})`);
    for (const line of said) console.log(`  ${line}`);
    console.log(`\n  Sign in with the password  ${PASSWORD}  (local only):\n`);
    for (const p of THE_PEOPLE) {
      const what = p.key === 'amina' ? 'admin, and the approver' : p.key === 'daniel' ? 'lead, asks and writes a review' : p.key === 'sara' ? 'team, has asked for nothing (the empty states)' : 'team';
      console.log(`    ${email(p.key).padEnd(22)} ${what}`);
    }
    console.log('');
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  const url = process.argv[2] ?? process.env.DATABASE_URL;
  loadTheSuites(String(url ?? '')).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
