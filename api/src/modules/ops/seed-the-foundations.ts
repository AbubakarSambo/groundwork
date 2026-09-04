import { PrismaClient, OpsFunctionalRole, OpsPeriodKind, OpsPeriodStatus } from '@prisma/client';
import { DEFAULT_GRANTS } from './what-somebody-may-do';
import { SETTING_DEFAULTS } from './ops-settings.service';

/**
 * The standing furniture of the company: who is here, the time we work in, and
 * the areas we work on.
 *
 * CONFIGURATION ONLY. This file never writes an operational record — no
 * companies, no pipeline, no progress. Everything here is a fact that was true
 * before anybody did any work, which is what makes running it twice safe and
 * running it on a live database honest.
 */

const TEAM: Array<{
  key: string;
  displayName: string;
  email: string | null;
  functionalRole: OpsFunctionalRole;
}> = [
  { key: 'hafsah', displayName: 'Hafsah Jumare', email: 'hafsah.jumare@coamana.com', functionalRole: 'CEO' },
  { key: 'sahar', displayName: 'Sahar', email: null, functionalRole: 'SALES_MARKETING' },
  { key: 'james', displayName: 'James', email: null, functionalRole: 'PRODUCT_TECH_LEAD' },
  { key: 'abubakar', displayName: 'Abubakar Sambo', email: null, functionalRole: 'TECH' },
  { key: 'adam', displayName: 'Adam', email: null, functionalRole: 'CONTRIBUTOR' },
  { key: 'nate', displayName: 'Nate', email: null, functionalRole: 'CONTRIBUTOR' },
];

const WORKSTREAMS = [
  {
    key: 'sales',
    name: 'Sales',
    owner: 'sahar',
    oversight: 'hafsah',
    partner: null,
    areas: ['Pipeline', 'Outreach', 'Marketing', 'Conversion'],
  },
  {
    key: 'product-and-tech',
    name: 'Product & Tech',
    owner: 'james',
    oversight: 'hafsah',
    partner: 'abubakar',
    areas: ['Roadmap', 'Use-case readiness', 'UX', 'Infrastructure'],
  },
  {
    key: 'deployment',
    name: 'Deployment',
    owner: 'sahar',
    oversight: 'hafsah',
    partner: 'abubakar',
    areas: ['Onboarding', 'First use', 'Blockers', 'Going live'],
  },
  {
    key: 'fundraise',
    name: 'Fundraise',
    owner: 'hafsah',
    oversight: null,
    partner: null,
    areas: ['Grants', 'Investors', 'Applications', 'Diligence'],
  },
  {
    key: 'strategy-and-outreach',
    name: 'Strategy & Outreach',
    owner: 'hafsah',
    oversight: null,
    partner: null,
    areas: ['Network', 'Partners', 'Contributors', 'Introductions'],
  },
];

/** Cycles are fourteen days, anchored on the first day of the quarter. */
const CYCLE_LENGTH_DAYS = 14;
const CYCLE_COUNT = 7;
const QUARTER_STARTS = '2026-10-01';
const QUARTER_END = '2026-12-31';

/** Everybody here brings six, by the end of the year. */
const SIX_CLIENTS_BY_YEAR_END = 6;

const asDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export async function seedTheFoundations(prisma: PrismaClient) {
  // --- People, and the grants their role comes with -----------------------
  for (const member of TEAM) {
    const person = await prisma.opsPerson.upsert({
      where: { key: member.key },
      update: { displayName: member.displayName, functionalRole: member.functionalRole },
      create: {
        key: member.key,
        displayName: member.displayName,
        email: member.email,
        functionalRole: member.functionalRole,
      },
    });

    await prisma.opsGrant.createMany({
      data: DEFAULT_GRANTS[member.functionalRole].map((capability) => ({
        personId: person.id,
        capability,
      })),
      skipDuplicates: true,
    });
  }

  const people = await prisma.opsPerson.findMany();
  const byKey = new Map(people.map((p) => [p.key, p.id]));

  // --- The time we work in ------------------------------------------------
  const periods: Array<{
    key: string;
    name: string;
    kind: OpsPeriodKind;
    startsOn: string;
    endsOn: string;
    goal: string | null;
    status: OpsPeriodStatus;
    parentKey: string | null;
  }> = [
    {
      key: 'sept-2026-sprint',
      name: 'September sprint',
      kind: 'SPRINT',
      startsOn: '2026-09-01',
      endsOn: '2026-09-30',
      goal: 'Ten companies lined up, their use cases supported, and onboarded.',
      status: 'OPEN',
      parentKey: null,
    },
    {
      key: 'q4-2026',
      name: 'Q4 2026',
      kind: 'QUARTER',
      startsOn: QUARTER_STARTS,
      endsOn: QUARTER_END,
      goal: null,
      status: 'PLANNED',
      parentKey: null,
    },
  ];

  const anchor = asDate(QUARTER_STARTS);
  const quarterEnds = asDate(QUARTER_END);
  for (let i = 0; i < CYCLE_COUNT; i++) {
    const startsOn = addDays(anchor, i * CYCLE_LENGTH_DAYS);
    /**
     * Seven fortnights is ninety-eight days and the quarter is ninety-two, so
     * the last cycle runs eight days instead of fourteen.
     *
     * The alternative was letting cycle seven finish on 6 January, which is how
     * a quarterly review ends up asking about work that belongs to the next
     * quarter. A short cycle is visible and understood; a cycle that outlives
     * its quarter is a wrong number nobody looks for.
     */
    const uncapped = addDays(startsOn, CYCLE_LENGTH_DAYS - 1);
    const endsOn = uncapped > quarterEnds ? quarterEnds : uncapped;
    periods.push({
      key: `q4-2026-cycle-${i + 1}`,
      name: `Cycle ${i + 1}`,
      kind: 'CYCLE',
      startsOn: isoDay(startsOn),
      endsOn: isoDay(endsOn),
      goal: null,
      status: 'PLANNED',
      parentKey: 'q4-2026',
    });
  }

  // Parents before children, so a cycle always has a quarter to hang off.
  for (const period of periods) {
    const parentPeriodId = period.parentKey
      ? (await prisma.opsPeriod.findUnique({ where: { key: period.parentKey } }))?.id ?? null
      : null;

    await prisma.opsPeriod.upsert({
      where: { key: period.key },
      update: {
        name: period.name,
        startsOn: asDate(period.startsOn),
        endsOn: asDate(period.endsOn),
        goal: period.goal,
        parentPeriodId,
      },
      create: {
        key: period.key,
        name: period.name,
        kind: period.kind,
        startsOn: asDate(period.startsOn),
        endsOn: asDate(period.endsOn),
        goal: period.goal,
        status: period.status,
        parentPeriodId,
      },
    });
  }

  // --- The areas we work on ----------------------------------------------
  for (const stream of WORKSTREAMS) {
    const ownerPersonId = byKey.get(stream.owner);
    if (!ownerPersonId) throw new Error(`${stream.key} names an owner who is not on the team`);

    await prisma.opsWorkstream.upsert({
      where: { key: stream.key },
      update: {
        name: stream.name,
        ownerPersonId,
        oversightPersonId: stream.oversight ? byKey.get(stream.oversight) ?? null : null,
        technicalPartnerPersonId: stream.partner ? byKey.get(stream.partner) ?? null : null,
        areas: stream.areas,
      },
      create: {
        key: stream.key,
        name: stream.name,
        ownerPersonId,
        oversightPersonId: stream.oversight ? byKey.get(stream.oversight) ?? null : null,
        technicalPartnerPersonId: stream.partner ? byKey.get(stream.partner) ?? null : null,
        areas: stream.areas,
      },
    });
  }

  // --- The decisions, written down where they can be changed ---------------
  for (const [key, { value, note }] of Object.entries(SETTING_DEFAULTS)) {
    await prisma.opsSetting.upsert({
      where: { key },
      // The note is refreshed, the VALUE is not: a decision somebody has since
      // made must survive the next time this runs.
      update: { note },
      create: { key, value, note },
    });
  }

  // --- What each person is expected to bring -------------------------------
  const quarter = await prisma.opsPeriod.findUnique({ where: { key: 'q4-2026' } });
  const sprint = await prisma.opsPeriod.findUnique({ where: { key: 'sept-2026-sprint' } });
  let targets = 0;

  for (const member of TEAM) {
    const personId = byKey.get(member.key);
    if (!personId || !quarter || !sprint) continue;

    /**
     * Two rows per person, and they mean different things. The standing target
     * is the year's number; the sprint expectation is one company this month.
     * Kept apart so a board never reads "1 of 6" at somebody who did exactly
     * what September asked of them.
     */
    for (const target of [
      { period: quarter, count: SIX_CLIENTS_BY_YEAR_END, due: '2026-12-31', sprintExpectation: false },
      { period: sprint, count: 1, due: '2026-09-30', sprintExpectation: true },
    ]) {
      await prisma.opsContributorTarget.upsert({
        where: {
          personId_periodId_isSprintExpectation: {
            personId,
            periodId: target.period.id,
            isSprintExpectation: target.sprintExpectation,
          },
        },
        update: { targetCount: target.count, dueDate: asDate(target.due) },
        create: {
          personId,
          periodId: target.period.id,
          targetCount: target.count,
          dueDate: asDate(target.due),
          isSprintExpectation: target.sprintExpectation,
        },
      });
      targets++;
    }
  }

  return {
    people: TEAM.length,
    periods: periods.length,
    workstreams: WORKSTREAMS.length,
    settings: Object.keys(SETTING_DEFAULTS).length,
    targets,
  };
}
