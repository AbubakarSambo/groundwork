/**
 * THE FIVE TEST ORGANISATIONS, ON A FRESH LOCAL DATABASE (user journey sweep, 7 October 2026).
 *
 * Hafsah's table in docs/user-journey-tests.md names five organisations plus Groundwork staff. This
 * makes them, and writes every sign-in and number to the-five-orgs.json, which the testers read.
 *
 *   New org       brand new, on the one-month trial, one admin, nothing set up.
 *   Client org    a paid client: a sales check-in, an onboarding check-in and a project check-in, leave,
 *                 spending, timesheets and reviews on, WhatsApp on, fifteen people.
 *   Big org       a hundred people (the existing hundred-people seed), many check-ins on top, and several
 *                 approvers with dozens of requests waiting.
 *   Existing org  the SHAPE of an existing client's data (gw_existing_6oct_a): check-ins made before the
 *                 rebuild, some stalled, some people with no name or no number. Every name and address
 *                 here is made up; nothing is copied from a real person.
 *   Second org    shares one person with Client org.
 *
 * NO MODEL IS CALLED. Every row is written here, so it loads in seconds and is the same shape every
 * time (dates are counted from the day it is run). Test values only: the password is a test password,
 * the WhatsApp values are the test ones in the-test-bed.ts, and nothing here can reach a live service.
 *
 * IT ACCEPTS ONLY A DATABASE ON THIS COMPUTER whose name starts gw_sweep_ (the same host rule as every
 * other seed: a-database-on-this-computer.ts). It must be a fresh one: reset.sh makes it.
 *
 *   npx ts-node -T journey/sweep/seed.ts            # SWEEP=a is the default
 *   SWEEP=b npx ts-node -T journey/sweep/seed.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { itIsADatabaseOnThisComputer, NOT_A_DATABASE_ON_THIS_COMPUTER, theyAreInThisOrganisation } from '../a-database-on-this-computer';
import { loadTheHundredPeople, thePeople } from '../seed-a-hundred-people-for-the-suites';
import { TEST_PASSWORD, TEST_WHATSAPP, theBed } from './the-test-bed';
import { putTheOldShapeIn } from './put-the-old-shape-in';

type Role = 'ADMIN' | 'LEAD' | 'MEMBER';
const DAY = 86_400_000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000);
const ahead = (days: number) => new Date(Date.now() + days * DAY);
/** A weekday counted from today, so leave never starts on a weekend. */
const weekday = (n: number): Date => {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setTime(d.getTime() + n * DAY);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setTime(d.getTime() + (n >= 0 ? DAY : -DAY));
  return d;
};

export interface APerson { key: string; first: string; last: string; role: Role; title: string; team: string | null; manager: string | null; phone: string | null }
interface FixturePerson { key: string; name: string; email: string; role: string; title: string | null; team: string | null; managerEmail: string | null; whatsappNumber: string | null; password: string; notes?: string }
interface FixtureCheckIn { id: string; label: string; scenario: string; status: string; cadence: string; lead: string; participants: string[]; notes?: string }
interface FixtureOrg { name: string; slug: string; id: string; what: string; plan: string; trial: string | null; whatsappAddOn: boolean; people: FixturePerson[]; checkIns: FixtureCheckIn[]; notes: string[] }

export async function seedTheFiveOrgs(url: string, outFile: string): Promise<FixtureOrg[] | any> {
  if (!itIsADatabaseOnThisComputer(url) || !/\/gw_sweep_[a-z0-9_]+(\?|$)/.test(url)) throw new Error(`${NOT_A_DATABASE_ON_THIS_COMPUTER} The database must also be one called gw_sweep_ and a name.`);
  const db = new PrismaClient({ datasourceUrl: url });
  const bed = Object.values({ a: theBed('a'), b: theBed('b') }).find((b) => url.includes(`/${b.database}`)) ?? theBed('a');
  try {
    if (await db.organization.count()) throw new Error('This database is not fresh, so nothing was written. Run reset.sh to make it again.');
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    /* ---------------------------------------------------------------- platform settings */
    const setting = (key: string, value: unknown) => db.platformSetting.upsert({ where: { key }, create: { key, value: value as never, updatedBy: 'the-test-bed' }, update: { value: value as never } });
    /* The trial is on, since twenty days ago: an organisation made before that keeps the free plan it has; New org, made today, is given the trial. */
    await setting('pricing.freeTrial', { on: true, teamsUnder: 20, months: 1, onSince: ago(20).toISOString() });
    /* The platform's own WhatsApp switch, as Groundwork staff turn it on in the back office. */
    await setting('whatsapp_enabled', true);

    const made = new Map<string, { id: string }>(); // email -> user
    const users = async (org: { id: string }, list: APerson[], domain: string, o: { password?: string; namesBlank?: string[]; noNumber?: string[] } = {}) => {
      const out: FixturePerson[] = [];
      for (const [i, p] of list.entries()) {
        const email = `${p.key}@${domain}`;
        const blank = o.namesBlank?.includes(p.key);
        const phone = o.noNumber?.includes(p.key) ? null : p.phone;
        const u = await db.user.create({
          data: { email, firstName: blank ? '' : p.first, lastName: blank ? '' : p.last, organizationId: org.id, isEmailVerified: true, passwordHash, role: p.role, jobTitle: p.title, ...(phone ? { phoneNumber: phone } : {}) } as never,
          select: { id: true },
        });
        made.set(email, u);
        await theyAreInThisOrganisation(db, org.id, u.id, p.role);
        await db.person.create({
          data: {
            organizationId: org.id, sourceSystem: 'seed', externalId: p.key, userName: p.key, displayName: blank ? null : `${p.first} ${p.last}`, givenName: blank ? null : p.first, familyName: blank ? null : p.last,
            email, title: p.title, department: p.team, managerExternalId: p.manager, linkedUserId: u.id, phone, active: true,
            ...(phone && i % 2 === 0 ? { whatsappConsentAt: ago(30) } : {}),
          } as never,
        });
        out.push({ key: p.key, name: blank ? '(no name on record)' : `${p.first} ${p.last}`, email, role: p.role, title: p.title, team: p.team, managerEmail: p.manager ? `${p.manager}@${domain}` : null, whatsappNumber: phone, password: o.password ?? TEST_PASSWORD, ...(blank ? { notes: 'Has no name on the sign-in or the roster, as in old data.' } : {}), ...(!phone ? { notes: [blank ? 'Has no name on the sign-in or the roster, as in old data.' : '', 'No WhatsApp number.'].filter(Boolean).join(' ') } : {}) });
      }
      return out;
    };
    const uid = (key: string, domain: string) => made.get(`${key}@${domain}`)!.id;

    /* A check-in with its people and its rounds. Cleared of nothing: the database is fresh. */
    interface Round { n: number; availableDaysAgo: number; answered: string[]; started?: string[] }
    interface CheckInSpec {
      label: string; scenario: string; cadence: string; status: string; lead: string; members: string[]; createdDaysAgo: number; rounds: Round[];
      kindOfWork?: string | null; brief?: string | null; told?: string | null; mode?: 'PRIVATE' | 'SHARED'; overWhatsApp?: boolean | null; timelineDays?: number;
      stalled?: boolean; noLeadRound?: boolean; neverJoined?: string[]; notes?: string;
    }
    const SAID = [
      ['PROGRESS', 'I have kept this moving and the main piece is on track.'],
      ['WORRY', 'The one thing slowing me down is waiting on a decision from another team.'],
      ['COMMITMENT', 'I will send the update on Friday.'],
    ] as const;
    const addCheckIn = async (org: { id: string }, domain: string, spec: CheckInSpec): Promise<FixtureCheckIn> => {
      const ground = await db.ground.create({
        data: {
          organizationId: org.id, initiatorId: uid(spec.lead, domain), scenario: spec.scenario as never, moment: 'STARTING' as never, status: spec.status as never,
          label: spec.label, timelineDays: spec.timelineDays ?? 90, cadence: spec.cadence as never, createdAt: ago(spec.createdDaysAgo), mode: (spec.mode ?? 'SHARED') as never,
          brief: spec.brief ?? null, kindOfWork: spec.kindOfWork ?? null, toldToParticipants: spec.told ?? null, overWhatsApp: spec.overWhatsApp ?? null,
          createdByUserId: uid(spec.lead, domain), startsAt: ago(spec.createdDaysAgo),
          ...(spec.stalled ? { stalledFromStatus: 'ACTIVE' as never, stalledAt: ago(20) } : {}),
        } as never,
        select: { id: true },
      });
      const everyone = [spec.lead, ...spec.members];
      const party: Record<string, string> = {};
      for (const [i, k] of everyone.entries()) {
        const never = spec.neverJoined?.includes(k);
        const row = await db.groundParticipant.create({
          data: {
            groundId: ground.id, email: `${k}@${domain}`, partyType: (i === 0 ? 'INITIATOR' : 'PARTICIPANT') as never, createdAt: ago(spec.createdDaysAgo),
            ...(never ? { invitedAt: ago(spec.createdDaysAgo), notifiedAt: ago(spec.createdDaysAgo), inviteToken: `expired-${spec.label}-${k}`.replace(/\W/g, '-').slice(0, 60), inviteTokenExpiresAt: ago(spec.createdDaysAgo - 14) }
              : { userId: uid(k, domain), invitedAt: ago(spec.createdDaysAgo), notifiedAt: ago(spec.createdDaysAgo), joinedAt: ago(spec.createdDaysAgo) }),
          } as never,
          select: { id: true },
        });
        party[k] = row.id;
      }
      /* ONE OPEN SESSION PER PERSON, as the product makes them: a person who has not finished a round does not get the next one until they do. */
      const stillOpen = new Set<string>();
      for (const r of spec.rounds) {
        for (const k of everyone) {
          if (spec.neverJoined?.includes(k) || stillOpen.has(k)) continue;
          const answered = r.answered.includes(k);
          const started = !answered && r.started?.includes(k);
          if (!answered) stillOpen.add(k);
          const when = ago(r.availableDaysAgo);
          const ci = await db.checkIn.create({
            data: {
              groundId: ground.id, participantId: party[k], sessionNumber: r.n, status: (answered ? 'COMPLETED' : started ? 'IN_PROGRESS' : 'NOT_STARTED') as never,
              availableFrom: when, createdAt: when, sessionReadyNotifiedAt: when, openedAnnouncedAt: when,
              ...(answered ? { startedAt: new Date(when.getTime() + 3_600_000), completedAt: new Date(when.getTime() + 4_000_000) } : started ? { startedAt: new Date(when.getTime() + 3_600_000) } : {}),
            } as never,
            select: { id: true },
          });
          if (answered || started) {
            for (const [type, text] of SAID.slice(0, answered ? 3 : 1)) await db.recordEntry.create({ data: { participantId: party[k], checkInId: ci.id, type: type as never, text } as never });
          }
        }
      }
      return { id: ground.id, label: spec.label, scenario: spec.scenario, status: spec.status, cadence: spec.cadence, lead: `${spec.lead}@${domain}`, participants: spec.members.map((m) => `${m}@${domain}`), ...(spec.notes ? { notes: spec.notes } : {}) };
    };

    const suite = async (orgId: string, by: string, rows: { suite: string; isOn: boolean; answers: unknown }[]) => {
      for (const r of rows) await db.organizationSuite.create({ data: { organizationId: orgId, suite: r.suite, isOn: r.isOn, answers: r.answers as never, changedById: by } });
    };
    const orgs: FixtureOrg[] = [];

    /* ---------------------------------------------------------------- Groundwork staff */
    {
      const staffOrg = await db.organization.create({ data: { name: 'Groundwork staff', slug: 'sweep-groundwork-staff', email: 'staff@groundwork.test', isInternal: true, createdAt: ago(90) } as never });
      const ama = await db.user.create({ data: { email: 'ama.staff@groundwork.test', firstName: 'Ama', lastName: 'Staff', organizationId: staffOrg.id, isEmailVerified: true, passwordHash, role: 'ADMIN', isPlatformAdmin: true } as never });
      await theyAreInThisOrganisation(db, staffOrg.id, ama.id, 'ADMIN');
      /* The week's back-office pass is written straight in, as the WhatsApp journeys do, because the emailed code is a separate door. */
      await db.backOfficePass.create({ data: { userId: ama.id, via: 'email', expiresAt: ahead(30) } });
      const notStaff = await db.user.create({ data: { email: 'ops.admin@groundwork.test', firstName: 'Ops', lastName: 'Admin', organizationId: staffOrg.id, isEmailVerified: true, passwordHash, role: 'ADMIN' } as never });
      await theyAreInThisOrganisation(db, staffOrg.id, notStaff.id, 'ADMIN');
      orgs.push({
        name: 'Groundwork staff', slug: staffOrg.slug, id: staffOrg.id, what: 'Groundwork staff: the back office.', plan: 'none', trial: null, whatsappAddOn: false,
        people: [
          { key: 'ama.staff', name: 'Ama Staff', email: 'ama.staff@groundwork.test', role: 'ADMIN (platform admin)', title: null, team: null, managerEmail: null, whatsappNumber: null, password: TEST_PASSWORD, notes: 'Groundwork staff. Has a back-office pass for 30 days. Use for the back office WhatsApp page (A7).' },
          { key: 'ops.admin', name: 'Ops Admin', email: 'ops.admin@groundwork.test', role: 'ADMIN (not staff)', title: null, team: null, managerEmail: null, whatsappNumber: null, password: TEST_PASSWORD, notes: 'An admin of the same organisation who is NOT Groundwork staff: must be refused at the back office.' },
        ],
        checkIns: [], notes: ['The only organisation with a platform admin.'],
      });
    }

    /* ---------------------------------------------------------------- New org */
    {
      const org = await db.organization.create({
        data: { name: 'Fieldnote Studio', slug: 'sweep-new-org', email: 'admin@fieldnote.test', joinDomain: 'fieldnote.test', freeTrialStartedAt: new Date(), freeUntil: ahead(30), freePlan: 'SMALL_TEAM' } as never,
      });
      const admin = await db.user.create({ data: { email: 'admin@fieldnote.test', firstName: 'Ruth', lastName: 'Kamara', organizationId: org.id, isEmailVerified: true, passwordHash, role: 'ADMIN' } as never });
      await theyAreInThisOrganisation(db, org.id, admin.id, 'ADMIN');
      await db.organization.update({ where: { id: org.id }, data: { ownerUserId: admin.id } as never });
      orgs.push({
        name: org.name, slug: org.slug, id: org.id, what: 'New org: brand new, on the one-month trial, nothing set up, one admin.', plan: 'free trial (Small Team) for one month', trial: `until ${ahead(30).toISOString().slice(0, 10)}`, whatsappAddOn: false,
        people: [{ key: 'admin', name: 'Ruth Kamara', email: 'admin@fieldnote.test', role: 'ADMIN', title: null, team: null, managerEmail: null, whatsappNumber: null, password: TEST_PASSWORD, notes: 'The only person. Sign-in domain fieldnote.test, so anyone else at that domain is offered to join.' }],
        checkIns: [], notes: ['No check-ins, no people, no suites, no WhatsApp number.'],
      });
    }

    /* ---------------------------------------------------------------- Client org */
    const CLIENT = 'msingi.test';
    const clientPeople: APerson[] = [
      { key: 'grace', first: 'Grace', last: 'Achieng', role: 'ADMIN', title: 'Managing director', team: 'Management', manager: null, phone: '+254700100001' },
      { key: 'wairimu', first: 'Wairimu', last: 'Njoroge', role: 'LEAD', title: 'Head of sales', team: 'Sales', manager: 'grace', phone: '+254700100002' },
      { key: 'baraka', first: 'Baraka', last: 'Mutua', role: 'LEAD', title: 'Head of operations', team: 'Operations', manager: 'grace', phone: '+254700100003' },
      { key: 'amani', first: 'Amani', last: 'Wekesa', role: 'MEMBER', title: 'Account manager', team: 'Sales', manager: 'wairimu', phone: '+254700100004' },
      { key: 'chidi', first: 'Chidi', last: 'Okeke', role: 'MEMBER', title: 'Account manager', team: 'Sales', manager: 'wairimu', phone: '+254700100005' },
      { key: 'zawadi', first: 'Zawadi', last: 'Mwangi', role: 'MEMBER', title: 'Sales executive', team: 'Sales', manager: 'wairimu', phone: '+254700100006' },
      { key: 'juma', first: 'Juma', last: 'Otieno', role: 'MEMBER', title: 'Sales executive', team: 'Sales', manager: 'wairimu', phone: null },
      { key: 'neema', first: 'Neema', last: 'Kamau', role: 'MEMBER', title: 'Account manager', team: 'Sales', manager: 'wairimu', phone: '+254700100008' },
      { key: 'kito', first: 'Kito', last: 'Dube', role: 'MEMBER', title: 'Depot supervisor', team: 'Operations', manager: 'baraka', phone: '+254700100009' },
      { key: 'lerato', first: 'Lerato', last: 'Nkosi', role: 'MEMBER', title: 'Logistics officer', team: 'Operations', manager: 'baraka', phone: '+254700100010' },
      { key: 'tobi', first: 'Tobi', last: 'Adeyemi', role: 'MEMBER', title: 'Engineer', team: 'Operations', manager: 'baraka', phone: null },
      { key: 'imani', first: 'Imani', last: 'Hassan', role: 'MEMBER', title: 'Operations analyst (new)', team: 'Operations', manager: 'baraka', phone: '+254700100012' },
      { key: 'fatuma', first: 'Fatuma', last: 'Bello', role: 'MEMBER', title: 'Finance officer', team: 'Finance', manager: 'grace', phone: '+254700100013' },
      { key: 'peter', first: 'Peter', last: 'Mwangi', role: 'MEMBER', title: 'HR officer', team: 'People', manager: 'grace', phone: '+254700100014' },
      { key: 'sade', first: 'Sade', last: 'Balogun', role: 'MEMBER', title: 'Customer support', team: 'Operations', manager: 'baraka', phone: null },
    ];
    let clientOrgId = '';
    {
      const org = await db.organization.create({
        data: {
          name: 'Msingi Foods', slug: 'sweep-client-org', email: 'grace@msingi.test', createdAt: ago(60), subscriptionPlan: 'GROWTH', subscriptionStatus: 'active', whatsappAddOnOn: true, whatsappAddOnChangedAt: ago(30),
          checkInsNeedApproval: false, whoMayOpenCheckIns: 'NAMED_LEADS', joinDomain: CLIENT,
        } as never,
      });
      clientOrgId = org.id;
      const people = await users(org, clientPeople, CLIENT);
      await db.organization.update({ where: { id: org.id }, data: { ownerUserId: uid('grace', CLIENT) } as never });
      const grace = uid('grace', CLIENT); const baraka = uid('baraka', CLIENT); const wairimu = uid('wairimu', CLIENT);
      /* THE COMPANY'S PRIORITIES, each with an owner, for the Company page (A6). */
      const priorities = [
        { title: 'Get 40 more shops buying from us every week', measure: 'Shops ordering weekly', target: '40', owner: 'wairimu' },
        { title: 'Cut the time an order takes to reach a shop to two days', measure: 'Days from order to delivery', target: '2', owner: 'baraka' },
        { title: 'Bring the cost of a delivery down to 850 shillings', measure: 'Cost per delivery', target: '850', owner: 'baraka' },
        { title: 'Have every depot on the new stock system by the end of the quarter', measure: 'Depots on the new system', target: '4', owner: 'kito' },
      ];
      for (const [i, p] of priorities.entries()) {
        await db.subject.create({ data: { organizationId: org.id, sourceSystem: 'seed', externalId: `priority-${i + 1}`, type: 'OBJECTIVE', title: p.title, measure: p.measure, target: p.target, ownerExternalId: p.owner } as never });
      }
      /* THE SUITES, with approval rules and a spending limit. Leave goes to the line manager (an admin where there is none); spending above 100,000 goes to Fatuma, who looks after finance. */
      await suite(org.id, grace, [
        { suite: 'leave', isOn: true, answers: { days: 21, approver: 'Their manager' } },
        { suite: 'spend', isOn: true, answers: { currency: 'KES', limit: 100_000, above: uid('fatuma', CLIENT), categories: ['Fuel', 'Labels', 'Travel', 'Training'] } },
        { suite: 'timesheets', isOn: true, answers: { approver: 'Their manager' } },
        { suite: 'reviews', isOn: true, answers: { approver: 'Their manager', workflow: 'one_approver' } },
        { suite: 'duties', isOn: false, answers: { finance: uid('fatuma', CLIENT), hr: uid('peter', CLIENT), chiefExecutive: grace, departmentHeads: { Sales: wairimu, Operations: baraka }, budgetOwners: { Sales: wairimu, Operations: baraka } } },
        { suite: 'workflows', isOn: false, answers: { leave: { steps: [['manager', 'admin']], escalateAfter: 2 }, spend: { steps: [['manager', 'admin']], stepsAbove: [['manager', 'finance', 'admin']], escalateAfter: 2 } } },
        { suite: 'spendRules', isOn: false, answers: { categories: ['Fuel', 'Labels', 'Travel', 'Training'].map((name) => ({ name })), categoryCalled: 'category' } },
      ]);
      /* A few requests, so the suites are not empty: some waiting at the manager, one over the limit, one each way decided. */
      await db.leaveRequest.createMany({ data: [
        { organizationId: org.id, userId: uid('amani', CLIENT), startsOn: weekday(14), endsOn: weekday(18), status: 'waiting', askedAt: ago(1), stepSince: ago(1) },
        { organizationId: org.id, userId: uid('kito', CLIENT), startsOn: weekday(20), endsOn: weekday(21), status: 'waiting', askedAt: ago(3), stepSince: ago(3) },
        { organizationId: org.id, userId: uid('chidi', CLIENT), startsOn: weekday(-20), endsOn: weekday(-16), status: 'approved', askedAt: ago(30), decidedById: wairimu, decidedAt: ago(28), approvedByIds: [wairimu] },
        { organizationId: org.id, userId: uid('zawadi', CLIENT), startsOn: weekday(5), endsOn: weekday(6), status: 'declined', askedAt: ago(6), decidedById: wairimu, decidedAt: ago(5), declineReason: 'Two of the team are already away that week and the shops would have nobody.' },
      ] as never });
      await db.spendRequest.createMany({ data: [
        { organizationId: org.id, userId: uid('tobi', CLIENT), amount: '42000', what: 'Label printer for the Mombasa depot', category: 'Labels', status: 'waiting', createdAt: ago(2), stepSince: ago(2), evidenceNeeded: ['quote'] },
        { organizationId: org.id, userId: uid('wairimu', CLIENT), amount: '300000', what: 'The Mwangi agency, for the quarter', category: 'Training', status: 'waiting', createdAt: ago(1), stepSince: ago(1), evidenceNeeded: ['quote', 'receipt'] },
        { organizationId: org.id, userId: uid('lerato', CLIENT), amount: '9500', what: 'Fuel for the depot run', category: 'Fuel', status: 'approved', createdAt: ago(15), decidedById: baraka, decidedAt: ago(14), approvedByIds: [baraka] },
      ] as never });

      /* THE THREE CHECK-INS, live, with WhatsApp on, in the middle of a round. Each lead is also a person in their own check-in. */
      const sales = await addCheckIn(org, CLIENT, {
        label: 'Sales team, Q4', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', status: 'ACTIVE', lead: 'wairimu', members: ['amani', 'chidi', 'zawadi', 'juma', 'neema'], createdDaysAgo: 21,
        kindOfWork: 'a sales team', brief: 'The sales team is working to bring forty more shops to order every week by the end of the quarter.', told: 'Wairimu Njoroge reads what the team says, and uses it to see where the target is and is not shared.', overWhatsApp: true,
        rounds: [{ n: 1, availableDaysAgo: 14, answered: ['wairimu', 'amani', 'chidi', 'zawadi', 'juma', 'neema'] }, { n: 2, availableDaysAgo: 7, answered: ['wairimu', 'amani', 'chidi'], started: ['zawadi'] }, { n: 3, availableDaysAgo: 0, answered: [] }],
        notes: 'Round 3 opened today for Wairimu, Amani and Chidi. Zawadi started round 2 and stopped halfway, and Juma and Neema have not answered round 2, so round 2 is still the one open for those three.',
      });
      const onboarding = await addCheckIn(org, CLIENT, {
        label: 'Imani Hassan, first ninety days', scenario: 'NEW_HIRE', cadence: 'FORTNIGHTLY', status: 'ACTIVE', lead: 'baraka', members: ['imani'], createdDaysAgo: 28,
        kindOfWork: "a new hire's first weeks", brief: 'Imani Hassan joined as an operations analyst four weeks ago. Baraka Mutua expects her to take on the move to the new stock system in all four depots.', overWhatsApp: true,
        rounds: [{ n: 1, availableDaysAgo: 28, answered: ['baraka', 'imani'] }, { n: 2, availableDaysAgo: 14, answered: ['baraka'] }],
        notes: 'Round 2 is open for Imani, who has not answered it. Baraka has answered it.',
      });
      const project = await addCheckIn(org, CLIENT, {
        label: 'The new stock system, four depots', scenario: 'NEW_PROJECT', cadence: 'WEEKLY', status: 'ACTIVE', lead: 'baraka', members: ['kito', 'lerato', 'tobi', 'imani'], createdDaysAgo: 35,
        kindOfWork: 'a project', brief: 'Four depots are moving onto the new stock system. Two are on it. Mombasa has gone back to the paper book because it cannot print labels.', overWhatsApp: true,
        rounds: [{ n: 1, availableDaysAgo: 28, answered: ['baraka', 'kito', 'lerato', 'tobi', 'imani'] }, { n: 2, availableDaysAgo: 21, answered: ['baraka', 'kito', 'lerato', 'tobi'] }, { n: 3, availableDaysAgo: 14, answered: ['baraka', 'kito', 'lerato'] }, { n: 4, availableDaysAgo: 7, answered: ['baraka', 'kito'] }, { n: 5, availableDaysAgo: 1, answered: [] }],
        notes: 'Round 5 opened yesterday and nobody has answered it. Imani is in two check-ins (onboarding and this one), so she has two open on WhatsApp.',
      });
      orgs.push({
        name: org.name, slug: org.slug, id: org.id, what: 'Client org: like the paid client. Sales, onboarding and project check-ins; leave, spending, timesheets and reviews on; WhatsApp on; fifteen people.',
        plan: 'Growth, paid (no Stripe customer: nothing can be charged)', trial: null, whatsappAddOn: true, people, checkIns: [sales, onboarding, project],
        notes: ['Leave goes to the line manager; spending over 100,000 shillings goes to Fatuma Bello, who looks after finance.', 'Three people have no WhatsApp number: Juma Otieno, Tobi Adeyemi and Sade Balogun.', 'Company page: four priorities, each with an owner.', 'Neema Kamau is also a member of Second org.'],
      });
    }

    /* ---------------------------------------------------------------- Second org */
    {
      const DOM = 'lakeview.test';
      const org = await db.organization.create({ data: { name: 'Lakeview Clinic', slug: 'sweep-second-org', email: 'dr.okello@lakeview.test', createdAt: ago(45), subscriptionPlan: 'STARTER', subscriptionStatus: 'active' } as never });
      const list: APerson[] = [
        { key: 'okello', first: 'Esther', last: 'Okello', role: 'ADMIN', title: 'Clinic director', team: 'Management', manager: null, phone: '+254700200001' },
        { key: 'rukia', first: 'Rukia', last: 'Salim', role: 'LEAD', title: 'Head nurse', team: 'Nursing', manager: 'okello', phone: '+254700200002' },
        { key: 'musa', first: 'Musa', last: 'Barasa', role: 'MEMBER', title: 'Nurse', team: 'Nursing', manager: 'rukia', phone: '+254700200003' },
      ];
      const people = await users(org, list, DOM);
      /* THE SHARED PERSON: Neema Kamau, of Client org, is also a member here. One sign-in, two organisations, one number. */
      const neema = made.get(`neema@${CLIENT}`)!;
      await theyAreInThisOrganisation(db, org.id, neema.id, 'MEMBER');
      await db.person.create({ data: { organizationId: org.id, sourceSystem: 'seed', externalId: 'neema', userName: 'neema', displayName: 'Neema Kamau', givenName: 'Neema', familyName: 'Kamau', email: `neema@${CLIENT}`, title: 'Part-time pharmacist', department: 'Nursing', managerExternalId: 'rukia', linkedUserId: neema.id, phone: '+254700100008', active: true } as never });
      const ci = await addCheckIn(org, DOM, {
        label: 'Ward handover, weekly', scenario: 'PULSE_CHECK', cadence: 'WEEKLY', status: 'ACTIVE', lead: 'rukia', members: ['musa'], createdDaysAgo: 14, kindOfWork: 'a team',
        brief: 'How the ward handover is working between shifts.', overWhatsApp: true, rounds: [{ n: 1, availableDaysAgo: 14, answered: ['rukia', 'musa'] }, { n: 2, availableDaysAgo: 7, answered: ['rukia'] }],
      });
      /* Neema is a participant here too, by her Client org address. */
      const g = await db.groundParticipant.create({ data: { groundId: ci.id, email: `neema@${CLIENT}`, userId: neema.id, partyType: 'PARTICIPANT' as never, invitedAt: ago(14), notifiedAt: ago(14), joinedAt: ago(14) } as never });
      for (const r of [{ n: 1, d: 14, done: true }, { n: 2, d: 7, done: false }]) {
        await db.checkIn.create({ data: { groundId: ci.id, participantId: g.id, sessionNumber: r.n, status: (r.done ? 'COMPLETED' : 'NOT_STARTED') as never, availableFrom: ago(r.d), createdAt: ago(r.d), sessionReadyNotifiedAt: ago(r.d), openedAnnouncedAt: ago(r.d), ...(r.done ? { startedAt: ago(r.d), completedAt: ago(r.d) } : {}) } as never });
      }
      people.push({ key: 'neema', name: 'Neema Kamau', email: `neema@${CLIENT}`, role: 'MEMBER', title: 'Part-time pharmacist', team: 'Nursing', managerEmail: `rukia@${DOM}`, whatsappNumber: '+254700100008', password: TEST_PASSWORD, notes: 'THE SHARED PERSON. The same sign-in and the same number as Neema Kamau in Client org. She is in Ward handover here and in the Sales check-in there.' });
      ci.participants.push(`neema@${CLIENT}`);
      orgs.push({ name: org.name, slug: org.slug, id: org.id, what: 'Second org: shares one person (Neema Kamau) with Client org.', plan: 'Starter, paid (no Stripe customer)', trial: null, whatsappAddOn: false, people, checkIns: [ci], notes: ['WhatsApp add-on is OFF here, though it is on for Client org, so Neema should be reached on WhatsApp only about Client org.'] });
    }

    /* ---------------------------------------------------------------- Existing org */
    {
      const DOM = 'riverbank.test';
      const org = await db.organization.create({
        data: { name: 'Riverbank Trading', slug: 'sweep-existing-org', email: 'lead@riverbank.test', createdAt: ago(45), subscriptionPlan: 'SMALL_TEAM', subscriptionStatus: 'active', checkInsNeedApproval: true, whoMayOpenCheckIns: 'NAMED_LEADS' } as never,
      });
      /* The shape of an organisation like Northwind in gw_existing_6oct_a: one admin, a handful of named members, several blank, a guest. Names and addresses are made up. */
      const list: APerson[] = [
        { key: 'lead', first: 'Mira', last: 'Costa', role: 'ADMIN', title: 'Director', team: null, manager: null, phone: '+254720100001' },
        { key: 'dov', first: 'Dov', last: 'Ellison', role: 'MEMBER', title: null, team: 'Sales', manager: 'lead', phone: '+254720100002' },
        { key: 'pia', first: 'Pia', last: 'Lund', role: 'MEMBER', title: null, team: 'Sales', manager: 'lead', phone: null },
        { key: 'qx7', first: '', last: '', role: 'MEMBER', title: null, team: 'Sales', manager: 'dov', phone: '+254720100004' },
        { key: 'zt2', first: '', last: '', role: 'MEMBER', title: null, team: 'Sales', manager: 'dov', phone: null },
        { key: 'bn5', first: '', last: '', role: 'MEMBER', title: null, team: 'Operations', manager: 'lead', phone: null },
        { key: 'hk9', first: '', last: '', role: 'MEMBER', title: null, team: 'Operations', manager: 'lead', phone: '+254720100007' },
        { key: 'wr3', first: '', last: '', role: 'MEMBER', title: null, team: 'Operations', manager: 'lead', phone: null },
        { key: 'guest', first: 'Tomas', last: 'Verhoeven', role: 'MEMBER', title: null, team: null, manager: null, phone: null },
        { key: 'ines', first: 'Ines', last: 'Barros', role: 'MEMBER', title: null, team: 'Health', manager: 'lead', phone: '+254720100010' },
        { key: 'fo4', first: '', last: '', role: 'MEMBER', title: null, team: 'Health', manager: 'ines', phone: null },
        { key: 'lu8', first: '', last: '', role: 'MEMBER', title: null, team: 'Health', manager: 'ines', phone: '+254720100012' },
      ];
      const blank = list.filter((p) => !p.first).map((p) => p.key);
      const people = await users(org, list, DOM, { namesBlank: blank });
      const mk = (label: string, scenario: string, cadence: string, status: string, lead: string, members: string[], extra: Partial<CheckInSpec> = {}): CheckInSpec => ({
        label, scenario, cadence, status, lead, members, createdDaysAgo: 40, kindOfWork: null, mode: 'SHARED', ...extra, rounds: extra.rounds ?? [],
      });
      const sess = (upTo: number, openAt?: number, answeredBy: string[] = []): Round[] => [
        ...Array.from({ length: upTo }, (_, i) => ({ n: i + 1, availableDaysAgo: 40 - i * 7, answered: answeredBy })),
        ...(openAt !== undefined ? [{ n: upTo + 1, availableDaysAgo: openAt, answered: [] as string[] }] : []),
      ];
      const sales = ['dov', 'pia', 'qx7', 'zt2'];
      const ops = ['bn5', 'hk9', 'wr3'];
      const specs: CheckInSpec[] = [
        mk('Warehouse rollout', 'NEW_PROJECT', 'WEEKLY', 'ACTIVE', 'lead', ops, { mode: 'PRIVATE', timelineDays: 60, createdDaysAgo: 42, rounds: [{ n: 1, availableDaysAgo: 42, answered: ['lead', ...ops] }, { n: 2, availableDaysAgo: 35, answered: ['lead', 'bn5', 'hk9'] }, { n: 3, availableDaysAgo: 28, answered: ['lead', 'bn5'] }, { n: 4, availableDaysAgo: 21, answered: ['lead', 'bn5'] }, { n: 5, availableDaysAgo: 7, answered: [] }], notes: 'Made before the rebuild: no kind of work, private. A live weekly round is open now.' }),
        mk('Sales organisation', 'OKR_ALIGNMENT', 'WEEKLY', 'ACTIVE', 'lead', sales, { kindOfWork: 'sales org', timelineDays: 90, createdDaysAgo: 26, rounds: [{ n: 1, availableDaysAgo: 26, answered: ['lead', ...sales] }, { n: 2, availableDaysAgo: 19, answered: ['lead', 'dov', 'pia', 'qx7'] }, { n: 3, availableDaysAgo: 12, answered: ['lead', 'dov'] }, { n: 4, availableDaysAgo: 5, answered: [] }], notes: 'Carries a kind of work from the old setup.' }),
        mk('Quarter alignment, fortnightly', 'OKR_ALIGNMENT', 'FORTNIGHTLY', 'ACTIVE', 'lead', ['dov', 'ines'], { mode: 'PRIVATE', timelineDays: 90, createdDaysAgo: 33, rounds: [{ n: 1, availableDaysAgo: 33, answered: ['lead', 'dov', 'ines'] }, { n: 2, availableDaysAgo: 19, answered: ['lead', 'dov'] }, { n: 3, availableDaysAgo: 0, answered: [] }] }),
        ...[1, 2, 3, 4, 5].map((n) => mk(`Where next, part ${n}`, 'OKR_ALIGNMENT', 'WEEKLY', 'STALLED', 'lead', sales.slice(0, 3), { timelineDays: 21, createdDaysAgo: 45, stalled: true, kindOfWork: n < 5 ? 'where next' : null, rounds: [{ n: 1, availableDaysAgo: 45, answered: ['lead', 'dov'] }, { n: 2, availableDaysAgo: 38, answered: ['lead'] }], notes: 'STALLED: must send no messages after the release.' })),
        mk('First ninety days for a new starter', 'NEW_HIRE', 'FORTNIGHTLY', 'ACTIVE', 'lead', ['qx7'], { timelineDays: 90, createdDaysAgo: 30, rounds: [{ n: 1, availableDaysAgo: 30, answered: ['lead', 'qx7'] }, { n: 2, availableDaysAgo: 16, answered: ['lead'] }, { n: 3, availableDaysAgo: 2, answered: [] }] }),
        mk('A support plan, fortnightly', 'PIP', 'FORTNIGHTLY', 'ACTIVE', 'ines', ['fo4'], { timelineDays: 60, createdDaysAgo: 28, rounds: [{ n: 1, availableDaysAgo: 28, answered: ['ines', 'fo4'] }, { n: 2, availableDaysAgo: 14, answered: ['ines'] }, { n: 3, availableDaysAgo: 0, answered: [] }] }),
        mk('A matter for review', 'OPEN_READ', 'WEEKLY', 'ACTIVE', 'ines', ['lu8', 'fo4'], { kindOfWork: 'a law firm matter', timelineDays: 30, createdDaysAgo: 24, rounds: [{ n: 1, availableDaysAgo: 24, answered: ['ines', 'lu8', 'fo4'] }, { n: 2, availableDaysAgo: 17, answered: ['ines', 'lu8'] }, { n: 3, availableDaysAgo: 10, answered: ['ines'] }, { n: 4, availableDaysAgo: 3, answered: [] }] }),
        mk('Realigning operations', 'REALIGN_TEAM', 'WEEKLY', 'AWAITING_PARTIES', 'lead', ops, { timelineDays: 30, createdDaysAgo: 12, neverJoined: ['hk9', 'wr3'], rounds: [{ n: 1, availableDaysAgo: 12, answered: ['lead', 'bn5'] }], notes: 'Two people were invited and never joined; their invitation links have lapsed.' }),
        mk('A new starter, not yet begun', 'NEW_HIRE', 'FORTNIGHTLY', 'OPEN', 'lead', [], { timelineDays: 90, createdDaysAgo: 10, rounds: [{ n: 1, availableDaysAgo: 10, answered: ['lead'] }] }),
        mk('A support plan, waiting for people', 'PIP', 'FORTNIGHTLY', 'AWAITING_PARTIES', 'ines', ['lu8'], { timelineDays: 60, createdDaysAgo: 9, neverJoined: ['lu8'], rounds: [{ n: 1, availableDaysAgo: 9, answered: ['ines'] }] }),
        mk('Hiring plan for next quarter', 'WORKPLAN_BUDGET', 'MONTHLY', 'AWAITING_APPROVAL', 'dov', ['pia'], { timelineDays: 60, createdDaysAgo: 1, rounds: [] }),
      ];
      const checkIns: FixtureCheckIn[] = [];
      for (const s of specs) checkIns.push(await addCheckIn(org, DOM, s));
      /* THE OLD SHAPE: check-ins an existing client made before the rebuild, with their real-shaped answers, finished sessions, released reports and boards (E1). */
      for (const c of await putTheOldShapeIn(db, org.id, DOM, (k) => uid(k, DOM))) checkIns.push({ ...c, notes: 'Made before the rebuild, copied in shape from a made-up existing client: real-shaped answers, finished sessions, a released report and a board. Names scrambled.' });
      /* A small leave and spend history, as old clients have none of the suites switched on except what they set up. */
      await suite(org.id, uid('lead', DOM), [{ suite: 'leave', isOn: true, answers: { days: 20, approver: 'Their manager' } }]);
      orgs.push({
        name: org.name, slug: org.slug, id: org.id, what: 'Existing org: the shape of an existing client (check-ins made before the rebuild, some stalled, some people with no name or number).',
        plan: 'Small Team, paid (no Stripe customer)', trial: null, whatsappAddOn: false, people, checkIns,
        notes: [
          'Names and addresses are made up. Nothing is copied from a real person.',
          `${blank.length} people have no name on their sign-in or the roster; ${list.filter((p) => !p.phone).length} have no WhatsApp number.`,
          'Five check-ins are STALLED. Two are waiting for people who never joined. One waits for an admin to accept it ("each new check-in waits for an admin" is on).',
          'No kind of work on most check-ins, as before the rebuild.',
        ],
      });
    }

    /* ---------------------------------------------------------------- Big org */
    {
      console.log('Loading the hundred people (the existing seed) ...');
      /* Its own sign-in list names a different password, so its output is not shown; the fixtures file is the only list. */
      const say = console.log; console.log = () => undefined;
      const big = await loadTheHundredPeople(url).finally(() => { console.log = say; });
      const org = await db.organization.update({ where: { id: big.organizationId }, data: { slug: 'sweep-big-org', createdAt: ago(60), subscriptionPlan: 'BUSINESS', subscriptionStatus: 'active', whatsappAddOnOn: true } as never });
      /* One password for everybody, the test password the others use. */
      await db.user.updateMany({ where: { organizationId: org.id }, data: { passwordHash } });
      const DOM = 'baobab.test';
      const roster = thePeople();
      const mapped = new Map(roster.map((p) => [p.key, p]));
      for (const k of roster.map((p) => p.key)) made.set(`${k}@${DOM}`, { id: big.userIds[k] });

      /* MANY CHECK-INS: four in every team, led by its manager, in every state a list has to tell apart. */
      const teams = [...new Set(roster.map((p) => p.team).filter(Boolean))] as string[];
      const key = (t: string) => roster.find((p) => p.team === t)!.key.split('.')[0];
      const checkIns: FixtureCheckIn[] = [];
      for (const [d, t] of teams.entries()) {
        const k = key(t);
        const six = [1, 2, 3, 4, 5, 6].map((m) => `${k}.m${m}`);
        const kinds: [string, string, string, string, string][] = [
          [`${t} weekly update`, 'OKR_ALIGNMENT', 'WEEKLY', 'a team', 'ACTIVE'],
          [`${t} new starter, first weeks`, 'NEW_HIRE', 'FORTNIGHTLY', "a new hire's first weeks", 'ACTIVE'],
          [`${t} project, the new stock system`, 'NEW_PROJECT', 'WEEKLY', 'a project', d % 2 ? 'ACTIVE' : 'CLOSED'],
          [`${t} pulse`, 'PULSE_CHECK', 'MONTHLY', 'a team', d % 3 ? 'ACTIVE' : 'AWAITING_PARTIES'],
        ];
        for (const [i, [label, scenario, cadence, kind, status]] of kinds.entries()) {
          const who = six.slice(0, i === 1 ? 1 : 6 - i);
          checkIns.push(await addCheckIn(org, DOM, {
            label, scenario, cadence, status, lead: `${k}.manager`, members: who, createdDaysAgo: 30 + d, kindOfWork: kind, overWhatsApp: i % 2 === 0, timelineDays: 90,
            rounds: status === 'AWAITING_PARTIES' ? [{ n: 1, availableDaysAgo: 30, answered: [`${k}.manager`] }]
              : [{ n: 1, availableDaysAgo: 21, answered: [`${k}.manager`, ...who] }, { n: 2, availableDaysAgo: 14, answered: [`${k}.manager`, ...who.slice(0, 4)] }, { n: 3, availableDaysAgo: 7, answered: [`${k}.manager`, ...who.slice(0, 2)] }, ...(status === 'ACTIVE' ? [{ n: 4, availableDaysAgo: 0, answered: [] as string[] }] : [])],
          }));
        }
      }

      /* DOZENS WAITING, PER APPROVER. The hundred-people seed already spreads about 70 leave and 80 spending requests across the heads, managers and finance.
         Here the three biggest teams' managers and finance each get a further stack, so each has dozens (leave and spending) waiting on them alone. */
      const extraLeave: any[] = []; const extraSpend: any[] = [];
      for (const t of ['sales', 'ops', 'support']) {
        for (let m = 1; m <= 9; m++) {
          for (let r = 0; r < 3; r++) {
            const who = big.userIds[`${t}.m${m}`];
            extraLeave.push({ organizationId: org.id, userId: who, startsOn: weekday(50 + r * 9 + m), endsOn: weekday(52 + r * 9 + m), status: 'waiting', askedAt: ago(r % 3, m), stepSince: ago(r % 3, m) });
            extraSpend.push({ organizationId: org.id, userId: who, amount: String(4000 + m * 700 + r * 1300), what: ['Fuel for the Karen route', 'Printer toner for the office', 'A scanner for the warehouse'][r], team: mapped.get(`${t}.m${m}`)!.team, category: ['Fuel', 'Supplies', 'Equipment'][r], status: 'waiting', createdAt: ago(r % 3, m), stepSince: ago(r % 3, m), evidenceNeeded: [] });
          }
        }
      }
      await db.leaveRequest.createMany({ data: extraLeave as never });
      await db.spendRequest.createMany({ data: extraSpend as never });
      const waitingLeave = await db.leaveRequest.count({ where: { organizationId: org.id, status: 'waiting' } });
      const waitingSpend = await db.spendRequest.count({ where: { organizationId: org.id, status: 'waiting' } });

      const people: FixturePerson[] = roster.map((p, i) => ({ key: p.key, name: `${p.first} ${p.last}`, email: `${p.key}@${DOM}`, role: p.role, title: p.title, team: p.team, managerEmail: p.manager ? `${p.manager}@${DOM}` : null, whatsappNumber: `+2547${String(10_000_000 + i)}`, password: TEST_PASSWORD }));
      await db.user.updateMany({ where: { organizationId: org.id }, data: {} });
      for (const [i, p] of roster.entries()) await db.user.update({ where: { id: big.userIds[p.key] }, data: { phoneNumber: `+2547${String(10_000_000 + i)}` } }).catch(() => undefined);
      orgs.push({
        name: org.name, slug: org.slug, id: org.id, what: 'Big org: a hundred people in nine teams, many check-ins, several approvers each with dozens of requests waiting.', plan: 'Business, paid (no Stripe customer)', trial: null, whatsappAddOn: true, people, checkIns,
        notes: [
          `${waitingLeave} leave requests and ${waitingSpend} spending requests are waiting in all.`,
          'Approvers with the most waiting: the Sales, Operations and Customer Support managers (sales.manager, ops.manager, support.manager) and finance (finance.m1).',
          'Several approvers are away this week on approved leave, some with a stand-in and one without (support.manager).',
          'Leave: manager, then head, then an admin after two working days. Spending in KES: manager then finance up to 50,000; above that manager, head, then finance.',
          'Admins: ceo and ops.head.',
        ],
      });
    }

    /* ---------------------------------------------------------------- the fixtures file */
    const fixtures = {
      about: 'The five test organisations and Groundwork staff, made by journey/sweep/seed.ts. Test values only. Dates in the data are counted from the day it was made.',
      madeAt: new Date().toISOString(),
      copy: bed.name,
      database: bed.database,
      api: bed.api,
      passwordForEveryone: TEST_PASSWORD,
      whatsapp: {
        note: 'Test values. The API is started with these by bed.ts start-api, and signed messages are signed with the app secret.',
        groundworksNumber: TEST_WHATSAPP.displayNumber, phoneNumberId: TEST_WHATSAPP.phoneNumberId, appSecret: TEST_WHATSAPP.appSecret, verifyToken: TEST_WHATSAPP.verifyToken, accessToken: TEST_WHATSAPP.accessToken,
        platformSwitchOn: true, webhookPath: '/api/v1/webhooks/whatsapp', graphRecorder: bed.recorder,
      },
      freeTrial: { on: true, teamsUnder: 20, months: 1 },
      organisations: Object.fromEntries(orgs.map((o) => [({ 'sweep-new-org': 'newOrg', 'sweep-client-org': 'clientOrg', 'sweep-big-org': 'bigOrg', 'sweep-existing-org': 'existingOrg', 'sweep-second-org': 'secondOrg', 'sweep-groundwork-staff': 'staff' } as Record<string, string>)[o.slug], o])),
    };
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    /* The shared file has no database ids, so it is true for both copies (the emails, numbers and labels are the same in each). The copy's own file keeps the ids, for addresses like /grounds/<id>. */
    const withoutIds = JSON.parse(JSON.stringify(fixtures, (k, v) => (k === 'id' || k === 'api' || k === 'database' || k === 'graphRecorder' || k === 'copy' ? undefined : v)));
    fs.writeFileSync(outFile, JSON.stringify(withoutIds, null, 2) + '\n');
    fs.writeFileSync(outFile.replace(/\.json$/, `.${bed.name}.json`), JSON.stringify(fixtures, null, 2) + '\n');
    return fixtures;
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  const bed = theBed();
  const url = process.argv[2] ?? bed.databaseUrl;
  const out = process.env.SWEEP_FIXTURES ?? path.join(__dirname, 'the-five-orgs.json');
  seedTheFiveOrgs(url, out).then((f) => {
    console.log(`\nMade the five organisations and Groundwork staff in ${bed.database}.`);
    for (const [k, o] of Object.entries<any>(f.organisations)) console.log(`  ${k.padEnd(12)} ${o.name.padEnd(22)} ${String(o.people.length).padStart(3)} people, ${String(o.checkIns.length).padStart(3)} check-ins`);
    console.log(`\nSign-ins and numbers: ${out}\nPassword for everybody: ${TEST_PASSWORD} (test only)\n`);
  }).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
