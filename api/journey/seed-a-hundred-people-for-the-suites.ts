/**
 * A LOCAL ORGANISATION OF A HUNDRED PEOPLE WITH THE LEAVE AND SPENDING SUITES SWITCHED ON AND ABOUT
 * A HUNDRED AND FIFTY REQUESTS WAITING IN EVERY STATE, so the suites can be tested at the size that
 * hurts (the weekly plan's "Suites at scale for 100-person organisations"; screens request 157).
 *
 * WHO IS IN IT. Baobab Distribution: a chief executive and nine teams of eleven. Each team has a
 * head, a manager who reports to the head, and nine people who report to the manager. The chief
 * executive and the head of Operations are admins; heads and managers are leads; everybody else is a
 * member. Finance is looked after by a member of the Finance team and HR by a member of the HR team,
 * so the people who approve most are not leads. Two people share a first name in several places,
 * because a screen that tells people apart by first name has to be tried on that.
 *
 * WHAT IS SWITCHED ON. Leave: 21 days a year, the manager approves, and a request passes to the head
 * and then an admin after two working days. Spending in KES: a manager approves up to 50,000, then
 * finance; above 50,000 it goes manager, head, then finance. Both pass a request on after two working
 * days. The duties (finance, HR, chief executive, each team's head and budget holder) are named.
 *
 * WHAT IS IN THE REQUESTS. About 70 leave and 80 spending requests: fresh, waiting past the two
 * working days, waiting at the second and third step, approved, declined with a reason, and for
 * spending also checked and paid. Several approvers are away this week on approved leave: some with
 * a stand-in (a lead, a lead in another team, and a plain member), one without. One manager is back
 * from leave, one is going on leave next week. Four people in Operations are off the same days, with
 * two more asking for them.
 *
 * NO MODEL IS CALLED. Every row is written here, so it loads in seconds and is the same shape every
 * time (the dates are counted from the day it is run).
 *
 * IT ACCEPTS ONLY A DATABASE ON THIS COMPUTER (decision 98, item 2): the host in the connection
 * string must be exactly localhost or 127.0.0.1. Anything else is refused and nothing is read or
 * written. The check is the one the other seeds use (a-database-on-this-computer.ts).
 *
 * From api/, with the connection string as the argument (or in this computer's own DATABASE_URL):
 *
 *   npx ts-node -T journey/seed-a-hundred-people-for-the-suites.ts postgresql://localhost:5432/<database>
 *
 * The database must already have its migrations applied. Running it twice leaves one organisation,
 * not two.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { itIsADatabaseOnThisComputer, NOT_A_DATABASE_ON_THIS_COMPUTER, theyAreInThisOrganisation } from './a-database-on-this-computer';

/** Local only, and said in the output rather than hidden, because it exists to be typed in. */
export const PASSWORD = 'baobab-local-only';
export const SLUG = 'a-hundred-people-for-the-suites';
const COMPANY = 'Baobab Distribution';

const TEAMS = [
  { key: 'sales', name: 'Sales' },
  { key: 'ops', name: 'Operations' },
  { key: 'finance', name: 'Finance' },
  { key: 'hr', name: 'HR' },
  { key: 'support', name: 'Customer Support' },
  { key: 'eng', name: 'Engineering' },
  { key: 'marketing', name: 'Marketing' },
  { key: 'logistics', name: 'Logistics' },
  { key: 'procurement', name: 'Procurement' },
] as const;

const FIRST = ['Amina', 'Daniel', 'Grace', 'Peter', 'Sara', 'Joseph', 'Wairimu', 'Omar', 'Aisha', 'Brian', 'Fatuma', 'Kamau', 'Neema', 'Tobi', 'Zainab', 'Imani',
  'Kofi', 'Zuri', 'Thabo', 'Nia', 'Jabari', 'Asha', 'Femi', 'Ayana', 'Sekou', 'Nadia', 'Obi', 'Lerato', 'Idris', 'Chiamaka', 'Tendai', 'Hawa', 'Musa', 'Amara',
  'Sade', 'Bakari', 'Rania', 'Gugu', 'Yusuf', 'Dalia', 'Kito', 'Nalu', 'Baraka', 'Lucy', 'Juma', 'Mercy', 'Linet', 'Salma', 'Rukia', 'Njeri'];
const LAST = ['Mbeki', 'Asante', 'Okafor', 'Dube', 'Hassan', 'Mwangi', 'Diallo', 'Nkosi', 'Bello', 'Juma', 'Osei', 'Keita', 'Abara', 'Zuma', 'Toure', 'Sanusi',
  'Adeyemi', 'Moyo', 'Camara', 'Danjuma', 'Eze', 'Njoroge', 'Balogun', 'Mutua', 'Farah', 'Ndlovu', 'Sow', 'Kone', 'Achieng', 'Were', 'Otieno', 'Kamau',
  'Wekesa', 'Kerubo', 'Lindqvist', 'Okoro', 'Yusuf', 'Park', 'Mwende', 'Barasa'];

const CATEGORIES = ['Fuel', 'Travel', 'Equipment', 'Supplies', 'Training'];
const WHAT = ['Fuel for the Karen route for the month', 'Two tablets for the field team', 'Travel to the Westlands shops', 'Printer paper and toner for the office',
  'A first aid course for six drivers', 'Spare tyres for the Kisumu van', 'A second scanner for the warehouse', 'Hotel for the Mombasa visit',
  'Safety vests for the loading bay', 'A laptop for the new starter', 'Fuel for the Eldoret run', 'Pallet wrap for the cold room'];

export interface ThePeopleOfTheOrganisation { key: string; first: string; last: string; role: 'ADMIN' | 'LEAD' | 'MEMBER'; team: string | null; title: string; manager: string | null }

/** The hundred, in a fixed order: the chief executive, then each team's head, manager and nine members. */
export function thePeople(): ThePeopleOfTheOrganisation[] {
  const out: ThePeopleOfTheOrganisation[] = [];
  const name = (i: number) => ({ first: FIRST[i % FIRST.length], last: LAST[(i * 7 + 3) % LAST.length] });
  out.push({ key: 'ceo', ...name(0), role: 'ADMIN', team: null, title: 'Chief executive', manager: null });
  TEAMS.forEach((t, d) => {
    const base = 1 + d * 11;
    out.push({ key: `${t.key}.head`, ...name(base), role: t.key === 'ops' ? 'ADMIN' : 'LEAD', team: t.name, title: `Head of ${t.name}`, manager: 'ceo' });
    out.push({ key: `${t.key}.manager`, ...name(base + 1), role: 'LEAD', team: t.name, title: `${t.name} manager`, manager: `${t.key}.head` });
    for (let m = 1; m <= 9; m++) out.push({ key: `${t.key}.m${m}`, ...name(base + 1 + m), role: 'MEMBER', team: t.name, title: `${t.name} officer`, manager: `${t.key}.manager` });
  });
  return out;
}

const email = (key: string) => `${key}@baobab.test`;
const DAY = 86_400_000;
const today = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; };
/** A whole day counted from today, moved back to a weekday so no leave starts or ends on a weekend. */
const day = (n: number): Date => {
  const d = new Date(today().getTime() + n * DAY);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setTime(d.getTime() + (n >= 0 ? DAY : -DAY));
  return d;
};
/** A moment counted back from now. */
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000);

export async function loadTheHundredPeople(url: string) {
  if (!itIsADatabaseOnThisComputer(url)) throw new Error(NOT_A_DATABASE_ON_THIS_COMPUTER);
  const db = new PrismaClient({ datasourceUrl: url });
  const said: string[] = [];
  try {
    const org = await db.organization.upsert({
      where: { slug: SLUG },
      update: { name: COMPANY },
      create: { name: COMPANY, slug: SLUG, email: email('ceo') },
    });

    /* THE PEOPLE: a sign-in, a membership and a staff-directory entry each. */
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const people = thePeople();
    const uid: Record<string, string> = {};
    for (const [i, p] of people.entries()) {
      const u = await db.user.upsert({
        where: { email: email(p.key) },
        update: { organizationId: org.id, isEmailVerified: true, passwordHash, role: p.role, firstName: p.first, lastName: p.last },
        create: { email: email(p.key), firstName: p.first, lastName: p.last, organizationId: org.id, isEmailVerified: true, passwordHash, role: p.role },
        select: { id: true },
      });
      uid[p.key] = u.id;
      await theyAreInThisOrganisation(db, org.id, u.id, p.role);
      await db.person.upsert({
        where: { organizationId_sourceSystem_externalId: { organizationId: org.id, sourceSystem: 'seed', externalId: p.key } },
        update: { displayName: `${p.first} ${p.last}`, givenName: p.first, familyName: p.last, email: email(p.key), title: p.title, department: p.team, managerExternalId: p.manager, linkedUserId: u.id, active: true },
        create: {
          organizationId: org.id, sourceSystem: 'seed', externalId: p.key, userName: p.key, displayName: `${p.first} ${p.last}`,
          givenName: p.first, familyName: p.last, email: email(p.key), title: p.title, department: p.team, managerExternalId: p.manager,
          linkedUserId: u.id, phone: `+2547${String(10_000_000 + i)}`,
        },
      });
    }
    said.push(`${people.length} people in ${TEAMS.length} teams: a head, a manager and nine people in each, and the chief executive`);

    /* THE SUITES AND WHO DECIDES (the suites' own questions, the duties, the approval steps and the spending rules). */
    const finance = uid['finance.m1'];
    const hr = uid['hr.m1'];
    const rows: { suite: string; isOn: boolean; answers: Record<string, unknown> }[] = [
      { suite: 'leave', isOn: true, answers: { days: 21, approver: 'Their manager' } },
      { suite: 'spend', isOn: true, answers: { currency: 'KES', limit: 50_000, above: finance } },
      {
        suite: 'duties', isOn: false,
        answers: {
          finance, hr, chiefExecutive: uid.ceo,
          departmentHeads: Object.fromEntries(TEAMS.map((t) => [t.name, uid[`${t.key}.head`]])),
          budgetOwners: Object.fromEntries(TEAMS.map((t) => [t.name, uid[`${t.key}.manager`]])),
        },
      },
      {
        suite: 'workflows', isOn: false,
        answers: {
          leave: { steps: [['manager', 'departmentHead', 'admin']], escalateAfter: 2 },
          spend: { steps: [['manager', 'admin'], ['finance', 'admin']], stepsAbove: [['manager', 'admin'], ['departmentHead', 'admin'], ['finance', 'admin']], escalateAfter: 2 },
        },
      },
      { suite: 'spendRules', isOn: false, answers: { categories: CATEGORIES.map((name) => ({ name })), categoryCalled: 'category' } },
    ];
    for (const r of rows) {
      await db.organizationSuite.upsert({
        where: { organizationId_suite: { organizationId: org.id, suite: r.suite } },
        update: { isOn: r.isOn, answers: r.answers as never, changedById: uid.ceo },
        create: { organizationId: org.id, suite: r.suite, isOn: r.isOn, answers: r.answers as never, changedById: uid.ceo },
      });
    }
    said.push('leave and spending on, with their approval steps and the duties named (finance, HR, each team\'s head and budget holder)');

    /* Cleared first, so a second run does not stack them. */
    await db.suiteEvent.deleteMany({ where: { organizationId: org.id } });
    await db.leaveRequest.deleteMany({ where: { organizationId: org.id } });
    await db.spendRequest.deleteMany({ where: { organizationId: org.id } });

    // -------------------------------------------------------------------------------------- leave
    type Leave = {
      organizationId: string; userId: string; startsOn: Date; endsOn: Date; status: string; askedAt: Date; stepSince?: Date; standInUserId?: string;
      decidedById?: string; decidedAt?: Date; approvedByIds?: string[]; declineReason?: string; step?: number;
    };
    const leave: Leave[] = [];
    const approvedLeave = (k: string, from: number, to: number, by: string, standIn?: string): Leave => ({
      organizationId: org.id, userId: uid[k], startsOn: day(from), endsOn: day(to), status: 'approved', askedAt: ago(Math.abs(from) + 14), stepSince: ago(Math.abs(from) + 14),
      decidedById: uid[by], decidedAt: ago(Math.abs(from) + 12), approvedByIds: [uid[by]], ...(standIn ? { standInUserId: uid[standIn] } : {}),
    });

    /* Approvers who are away this week, and who stands in. */
    leave.push(approvedLeave('sales.manager', -1, 3, 'sales.head', 'sales.head'));
    leave.push(approvedLeave('ops.manager', -1, 4, 'ops.head', 'support.manager'));
    leave.push(approvedLeave('support.manager', 0, 2, 'support.head'));
    leave.push(approvedLeave('marketing.head', -2, 2, 'ceo', 'marketing.manager'));
    leave.push(approvedLeave('procurement.manager', -1, 1, 'procurement.head', 'procurement.m1'));
    /* One manager is back (leave that ended last week), one goes next week. */
    leave.push(approvedLeave('eng.manager', -10, -4, 'eng.head', 'eng.head'));
    leave.push(approvedLeave('logistics.manager', 7, 11, 'logistics.head', 'logistics.head'));
    /* Four people in Operations off the same days, with two more asking for them. */
    for (const [m, [from, to]] of [[1, [7, 11]], [2, [8, 10]], [3, [9, 12]], [4, [7, 8]]] as [number, [number, number]][]) leave.push(approvedLeave(`ops.m${m}`, from, to, 'ops.manager'));
    for (const m of [5, 6]) leave.push({ organizationId: org.id, userId: uid[`ops.m${m}`], startsOn: day(8), endsOn: day(11), status: 'waiting', askedAt: ago(1), stepSince: ago(1) });

    /* Each team: fresh requests, one that has waited past the two working days, approved, one declined. */
    TEAMS.forEach((t, d) => {
      const m = (n: number) => `${t.key}.m${n}`;
      leave.push({ organizationId: org.id, userId: uid[m(1)], startsOn: day(14 + d), endsOn: day(18 + d), status: 'waiting', askedAt: ago(1), stepSince: ago(1) });
      leave.push({ organizationId: org.id, userId: uid[m(2)], startsOn: day(21 + d), endsOn: day(21 + d), status: 'waiting', askedAt: ago(0, 3), stepSince: ago(0, 3) });
      leave.push({ organizationId: org.id, userId: uid[m(3)], startsOn: day(30 + d), endsOn: day(36 + d), status: 'waiting', askedAt: ago(8 + (d % 3)), stepSince: ago(8 + (d % 3)) });
      leave.push(approvedLeave(m(7), -40 - d, -36 - d, `${t.key}.manager`));
      leave.push(approvedLeave(m(8), 40 + d, 44 + d, `${t.key}.manager`));
      leave.push({
        organizationId: org.id, userId: uid[m(9)], startsOn: day(5 + d), endsOn: day(9 + d), status: 'declined', askedAt: ago(6), decidedById: uid[`${t.key}.manager`], decidedAt: ago(5),
        declineReason: 'Two people are already away that week and the route would have nobody on it.',
      });
    });
    await db.leaveRequest.createMany({ data: leave as never });
    said.push(`leave: ${leave.length} requests, ${leave.filter((l) => l.status === 'waiting').length} waiting, ${leave.filter((l) => l.standInUserId).length} with a stand-in`);

    // ----------------------------------------------------------------------------------- spending
    type Spend = {
      organizationId: string; userId: string; amount: string; what: string; team: string; category: string; status: string; createdAt: Date; stepSince?: Date;
      step?: number; approvedByIds?: string[]; decidedById?: string; decidedAt?: Date; declineReason?: string; evidenceNeeded?: string[];
      verifiedById?: string; verifiedAt?: Date; code?: string; paidOn?: Date; paidById?: string; evidenceGiven?: string[];
    };
    const spend: Spend[] = [];
    let n = 0;
    const base = (t: (typeof TEAMS)[number], member: number, amount: number, createdAgo: number): Spend => {
      n += 1;
      return {
        organizationId: org.id, userId: uid[`${t.key}.m${member}`], amount: String(amount), what: WHAT[n % WHAT.length], team: t.name,
        category: CATEGORIES[n % CATEGORIES.length], status: 'waiting', createdAt: ago(createdAgo), stepSince: ago(createdAgo), evidenceNeeded: amount > 20_000 ? ['quote'] : [],
      };
    };
    TEAMS.forEach((t, d) => {
      const mgr = `${t.key}.manager`;
      const head = `${t.key}.head`;
      /* Two fresh at the manager, one that has waited past the two working days. */
      for (const [k, amt] of [[1, 8_500 + d * 500], [3, 42_000]] as [number, number][]) spend.push(base(t, k, amt, k === 3 ? 0 : 1));
      spend.push(base(t, 4, 12_500 + d * 750, 8 + (d % 3)));
      /* Two the manager has approved, now with finance; one of them has waited past the two working days. */
      spend.push({ ...base(t, 5, 26_000 + d * 400, 4), step: 1, approvedByIds: [uid[mgr]] });
      spend.push({ ...base(t, 6, 9_800, 0), step: 1, approvedByIds: [uid[mgr]] });
      /* One above the limit, waiting at the head, and one above it that the head has approved, now with finance. */
      spend.push({ ...base(t, 7, 120_000, 1), step: 1, approvedByIds: [uid[mgr]] });
      spend.push({ ...base(t, 8, 240_000, 2), step: 2, approvedByIds: [uid[mgr], uid[head]] });
      /* Approved: one not yet checked, one checked, one paid; and one declined. */
      const approved = (member: number, amt: number, ago_: number): Spend => ({ ...base(t, member, amt, ago_), status: 'approved', decidedById: uid['finance.m1'], decidedAt: ago(ago_ - 1), approvedByIds: [uid[mgr], uid['finance.m1']] });
      if (d % 2 === 0) spend.push(approved(9, 15_000, 6));
      spend.push({ ...approved(1, 22_000, 12), verifiedById: uid['finance.m2'], verifiedAt: ago(10), code: `${t.name} budget`, evidenceGiven: ['quote'] });
      spend.push({ ...approved(2, 31_000, 20), verifiedById: uid['finance.m2'], verifiedAt: ago(18), code: `${t.name} budget`, evidenceGiven: ['quote'], paidOn: ago(15), paidById: uid['finance.m2'] });
      /* Last month's, so a month's totals are only the month's. */
      if (d % 3 !== 2) spend.push({ ...approved(3, 17_000, 35 + d), createdAt: ago(35 + d), status: 'approved' });
      if (d < 6) spend.push({ ...base(t, 4, 64_000, 9), status: 'declined', decidedById: uid[mgr], decidedAt: ago(8), declineReason: 'The budget for the quarter is already committed. Ask again next month with the route numbers.' });
    });
    /* Whatever the sums, nobody asks for their own to be approved by themselves: the finance people ask in their own team. */
    await db.spendRequest.createMany({ data: spend as never });
    said.push(`spending: ${spend.length} requests, ${spend.filter((s) => s.status === 'waiting').length} waiting, ${spend.filter((s) => s.status === 'waiting' && (s.step ?? 0) >= 1).length} of them with finance or the head`);

    console.log(`\nLoaded into ${new URL(url).pathname.replace(/^\//, '')}:\n`);
    console.log(`  organisation "${COMPANY}" (slug ${SLUG}, id ${org.id})`);
    for (const line of said) console.log(`  ${line}`);
    console.log(`\n  Sign in with the password  ${PASSWORD}  (local only). The emails are the key and @baobab.test:\n`);
    const show: [string, string][] = [
      ['ceo', 'chief executive and an admin'], ['ops.head', 'head of Operations and an admin'], ['finance.m1', 'a member who looks after finance'],
      ['hr.m1', 'a member who looks after HR'], ['sales.manager', 'a manager who is away this week (Sales head stands in)'], ['sales.head', 'head of Sales, stands in'],
      ['ops.manager', 'a manager who is away this week (Customer Support manager stands in)'], ['support.manager', 'a manager away this week with nobody standing in'],
      ['procurement.m1', 'a plain member who stands in for the Procurement manager this week'], ['ops.m1', 'a member of Operations, off the same days as three others'],
      ['sales.m1', 'a member with leave and spending waiting'],
    ];
    for (const [k, what] of show) console.log(`    ${email(k).padEnd(28)} ${what}`);
    console.log('');
    return { organizationId: org.id, userIds: uid };
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  const url = process.argv[2] ?? process.env.DATABASE_URL;
  loadTheHundredPeople(String(url ?? '')).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
