import { PrismaClient, OpsFunctionalRole, OpsPeriodKind, OpsPeriodStatus } from '@prisma/client';
import { DEFAULT_GRANTS } from './what-somebody-may-do';
import { SETTING_DEFAULTS } from './ops-settings.service';
import { MOAT_COMPONENTS, WHAT_GROUNDWORK_IS_BUILDING } from './what-the-moat-is-made-of';

/**
 * The standing furniture of the company: who is here, the time we work in, and
 * the areas we work on.
 *
 * CONFIGURATION ONLY. This file never writes an operational record — no
 * companies, no pipeline, no progress. Everything here is a fact that was true
 * before anybody did any work, which is what makes running it twice safe and
 * running it on a live database honest.
 */

/**
 * A STARTING POINT FOR AN EMPTY DATABASE, NOT A LIST OF WHO IS HERE.
 *
 * Written once, on the first run, so a fresh install is not an empty room.
 * After that the team page owns every one of these: add somebody, change what
 * they do, mark that they have left. Nothing here is re-asserted, so a role
 * somebody chose is never put back by a deploy.
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


/**
 * The five roadmap items, as given.
 *
 * Real content, so it seeds. Progress against it does not: every one of these
 * starts PROPOSED and awaiting a decision, because seeding an item as READY
 * would be this system's first lie about itself.
 */
const ROADMAP: Array<{
  key: string;
  title: string;
  description: string;
  itemType: string;
  priority: number;
  note?: string;
  /** A standing item is not a proposal. See the note on the schema field. */
  standing?: boolean;
}> = [
  {
    key: 'solidify-the-core-product',
    title: 'The product works, and works well',
    description:
      'Every bug fixed, every use case working well, no bottlenecks. Not a proposal: it is the frame the rest of this roadmap sits in, and while the freeze is on it is the only thing being worked on. Usability, security and bugs. Nothing added.',
    itemType: 'stability',
    priority: 1,
    standing: true,
    note: 'It read as a proposal like any other, with a status somebody could move to "done". "The product is solid" is exactly the kind of thing everybody agrees with in a meeting and nobody has measured, so it now carries a count instead of a status: bugs open, use cases that do not work, companies blocked. All three at zero or it is not done.',
  },
  {
    key: 'usability-and-the-marketing-site',
    title: 'Usability, and the marketing site',
    description:
      'The two surfaces somebody meets before they meet the product: the screens, and the pages that say what we are. Both are governed by nothing today - the site is the first claim a customer reads and is checked by nobody, and the screens are where "works well" is either true or a slogan.',
    itemType: 'usability',
    priority: 2,
    standing: true,
    note: 'Given its own line so the work is sayable out loud rather than smuggled in beside a feature. Permitted under the freeze: it changes nothing about what the product does.',
  },
  {
    key: 'solidify-the-moat',
    title: 'Solidify the moat',
    description: WHAT_GROUNDWORK_IS_BUILDING,
    itemType: 'moat',
    priority: 3,
    note: 'Was the only one of the five nothing could report on - "strengthen the moat" is not countable the way companies live or issues closed are, and an objective that cannot be counted is the one that quietly stops being worked on. It now has five named components and a record of what gets built on each, so the number is entries built in a window and it opens onto them.',
  },
  {
    key: 'separate-the-infrastructure',
    title: 'Separate the infrastructure',
    description:
      'GitHub organisation and access, Stripe and billing, domains, hosting, databases, cloud, storage, email, AI and API credentials, analytics, monitoring, deployment tooling. Groundwork owning its own code, data, credentials and billing relationships, with team access controls.',
    itemType: 'infrastructure',
    priority: 4,
    note: 'Lands on the API adapter. Separating infrastructure moves the credential that adapter uses, the Stripe account behind billing, and the AI credentials the Assistant runs on - so the adapter credential has to be created in whatever organisation and secret store this settles on, or it gets created twice.',
  },
  {
    key: 'coach-network',
    title: 'Build the coach network',
    description:
      'Partner with coaches outside the company. A customer using Groundwork can opt in to having a coach support them through the work and the reports. Recruit and onboard the coaches, give them the access and the workflow they need, and take a share of what they earn. Test with real customers before scaling.',
    itemType: 'feature',
    priority: 5,
    note: 'Named coach network because the product already has two things called coaching: the in-chat coaching step, and a lead form for people asking for one. This is a third thing - an outside person a customer opts into, who works alongside them and whose earnings we take a cut of. The access shape already exists: a coach is guest-shaped, so what this really adds is the commercial model and the coach\'s own workflow, not a new permission concept.',
  },
  {
    key: 'decide-the-next-components',
    title: 'Decide the next components',
    description:
      'Review with the team against what the first ten taught us. Prioritise on demand, revenue and moat. Do not expand before the core is proven.',
    itemType: 'improvement',
    priority: 6,
  },
];


/**
 * What September is for, per person, as objectives with numbers attached.
 *
 * Every one of these is sourced from a metric. None is MANUAL, and that is the
 * test of whether the target list is actually measurable: a target nobody can
 * compute is a target somebody has to remember to update, which means by
 * November it says whatever it said in September.
 */
const SEPTEMBER_OBJECTIVES: Array<{
  key: string;
  workstream: string;
  owner: string;
  title: string;
  keyResult: { title: string; target: number; unit: string; source: string };
}> = [
  {
    key: 'sept-ten-lined-up',
    workstream: 'sales',
    owner: 'hafsah',
    title: 'Ten companies lined up for the target list',
    keyResult: {
      title: 'Companies attached to the September target list',
      target: 10,
      unit: 'companies',
      source: 'targets.companies_lined_up',
    },
  },
  {
    key: 'sept-onboard-the-ten',
    workstream: 'deployment',
    owner: 'sahar',
    title: 'Get the ten onboarded and using it',
    keyResult: {
      title: 'Companies that have reached first use or gone live',
      target: 10,
      unit: 'companies',
      source: 'targets.companies_onboarded',
    },
  },
  {
    key: 'sept-use-cases-supported',
    workstream: 'product-and-tech',
    owner: 'james',
    title: 'The product supports what these ten actually want to do',
    keyResult: {
      title: 'Use cases at product ready, with no gap recorded',
      target: 10,
      unit: 'use cases',
      source: 'product.use_cases_supported',
    },
  },
  {
    key: 'sept-nothing-technical-in-the-way',
    workstream: 'product-and-tech',
    owner: 'abubakar',
    title: 'Nothing technical is standing between a company and using it',
    keyResult: {
      title: 'Unresolved technical items naming a company',
      target: 0,
      unit: 'items',
      source: 'tech.open_client_blockers',
    },
  },
];

export async function seedTheFoundations(prisma: PrismaClient) {
  // --- People, and the grants their role comes with -----------------------
  for (const member of TEAM) {
    /*
     * WHO IS ON THE TEAM IS NOT THIS FILE'S DECISION AFTER THE FIRST RUN.
     *
     * This used to re-assert `displayName` and `functionalRole` on every run,
     * so a role changed on the team page — Sahar taking over product, somebody
     * stepping back to contributor — was silently put back the next time the
     * seed ran. The names below are a STARTING POINT for an empty database and
     * nothing else; the team page owns them afterwards. Same lesson as the
     * target list that stopped being re-dated.
     */
    const person = await prisma.opsPerson.upsert({
      where: { key: member.key },
      update: {},
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
      key: 'sept-2026-target-list',
      name: 'September target list',
      kind: 'TARGET_LIST',
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

    /*
     * A TARGET_LIST IS CREATED ONCE AND THEN LEFT ALONE.
     *
     * Quarters and cycles are the calendar: if this file's idea of Q4 changes,
     * the stored one should follow, because nobody chose it. A target list is the
     * opposite — it is a stretch of time somebody set, and can be re-dated,
     * renamed and re-scoped from the target list page. Updating it here would mean
     * re-running the seed silently undid that, and the person who moved the
     * dates would find them moved back with nothing to say why.
     */
    const isATargetList = period.kind === 'TARGET_LIST';

    await prisma.opsPeriod.upsert({
      where: { key: period.key },
      update: isATargetList
        ? {}
        : {
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
  const targetCompanies = await prisma.opsPeriod.findUnique({ where: { key: 'sept-2026-target-list' } });
  let targets = 0;

  for (const member of TEAM) {
    const personId = byKey.get(member.key);
    if (!personId || !quarter || !targetCompanies) continue;

    /**
     * Two rows per person, and they mean different things. The standing target
     * is the year's number; the target list expectation is one company this month.
     * Kept apart so a board never reads "1 of 6" at somebody who did exactly
     * what September asked of them.
     */
    for (const target of [
      { period: quarter, count: SIX_CLIENTS_BY_YEAR_END, due: '2026-12-31', targetListExpectation: false },
      { period: targetCompanies, count: 1, due: '2026-09-30', targetListExpectation: true },
    ]) {
      await prisma.opsContributorTarget.upsert({
        where: {
          personId_periodId_isTargetListExpectation: {
            personId,
            periodId: target.period.id,
            isTargetListExpectation: target.targetListExpectation,
          },
        },
        update: { targetCount: target.count, dueDate: asDate(target.due) },
        create: {
          personId,
          periodId: target.period.id,
          targetCount: target.count,
          dueDate: asDate(target.due),
          isTargetListExpectation: target.targetListExpectation,
        },
      });
      targets++;
    }
  }

  // --- What we intend to build --------------------------------------------
  const james = byKey.get('james');
  for (const item of ROADMAP) {
    if (!james) break;
    await prisma.opsRoadmapItem.upsert({
      where: { key: item.key },
      update: { title: item.title, description: item.description, priority: item.priority, standing: item.standing ?? false },
      create: {
        key: item.key,
        title: item.title,
        description: item.description,
        itemType: item.itemType,
        priority: item.priority,
        proposedById: james,
        ownerId: james,
        standing: item.standing ?? false,
        /*
         * Every PROPOSAL is a material commitment of the team's time, so every
         * one waits for a decision. Seeding one as approved would be this
         * system's first lie about itself.
         *
         * A standing item is not a proposal and has nothing to approve — it is
         * the frame the proposals sit in. Leaving it waiting for a decision
         * would put a permanent "waiting" against the one thing nobody is
         * deciding.
         */
        approvalRequired: !(item.standing ?? false),
        rationale: item.note,
      },
    });
  }

  // --- What September is for ----------------------------------------------
  const septemberPeriod = await prisma.opsPeriod.findUnique({ where: { key: 'sept-2026-target-list' } });
  let objectives = 0;

  for (const objective of SEPTEMBER_OBJECTIVES) {
    const ownerId = byKey.get(objective.owner);
    const workstream = await prisma.opsWorkstream.findUnique({ where: { key: objective.workstream } });
    if (!ownerId || !workstream || !septemberPeriod) continue;

    /**
     * Keyed on title within the period rather than upserted on an id, because
     * an objective has no natural key and creating a second copy of "Ten
     * companies lined up" every time this runs would be worse than any
     * awkwardness here.
     */
    const already = await prisma.opsObjective.findFirst({
      where: { periodId: septemberPeriod.id, title: objective.title },
      include: { keyResults: true },
    });

    const record =
      already ??
      (await prisma.opsObjective.create({
        data: {
          periodId: septemberPeriod.id,
          workstreamId: workstream.id,
          title: objective.title,
          ownerId,
          status: 'ACTIVE',
          priority: objectives + 1,
        },
        include: { keyResults: true },
      }));

    if (record.keyResults.length === 0) {
      await prisma.opsKeyResult.create({
        data: {
          objectiveId: record.id,
          title: objective.keyResult.title,
          metricType: 'count',
          targetValue: objective.keyResult.target,
          unit: objective.keyResult.unit,
          startValue: 0,
          measurementSource: objective.keyResult.source,
          ownerId,
          dueDate: asDate('2026-09-30'),
        },
      });
    }
    objectives++;
  }

  // --- What the defensible advantage is made of ---------------------------
  for (const component of MOAT_COMPONENTS) {
    await prisma.opsMoatComponent.upsert({
      where: { key: component.key },
      // The statement is refreshed on every run: it is a strategy document, and
      // the file is where it is edited.
      update: { name: component.name, statement: component.statement, ordinal: component.ordinal },
      create: component,
    });
  }

  return {
    people: TEAM.length,
    periods: periods.length,
    workstreams: WORKSTREAMS.length,
    settings: Object.keys(SETTING_DEFAULTS).length,
    targets,
    roadmap: ROADMAP.length,
    objectives,
    moat: MOAT_COMPONENTS.length,
  };
}
