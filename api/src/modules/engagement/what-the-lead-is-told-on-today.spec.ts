import { WhatNeedsYouService } from '../grounds/what-needs-you.service';
import { TodayController } from '../grounds/today.controller';
import { theWaitingWords } from './waiting-on-the-people-you-invited';
import { theRestOfTheWeekIn } from '../email/the-leads-weekly-letter';

/**
 * WHAT A LEAD READS ON TODAY THAT THE MAIL ALSO TELLS HER (screens request 198, b), AS EACH PERSON READS IT.
 *
 * Baraka leads "Distributor review", where nobody has started and Groundwork is reminding them; his weekly report names two things for him to do. Today carries
 * the mail's own sentences for both. Lerato is a participant in it, and Amina is an admin who is not in it: neither is told anything.
 */
const RELEASE = new Date('2026-10-01T00:00:00Z');
const INVITED = new Date('2026-10-08T08:00:00Z');
const NOW = new Date('2026-10-11T09:30:00Z');
const person = (id: string, first: string, extra: any = {}) => ({ id, userId: `u-${id}`, email: `${first.toLowerCase()}@x.test`, managingOnly: false, nameGiven: null, invitedAt: INVITED, createdAt: INVITED, lastNudgedAt: null, user: { firstName: first, lastName: null, awaitingOrgApproval: false }, checkIns: [{ status: 'NOT_STARTED' }], ...extra });
const REPORT = { weekStart: '2026-10-05', whatChanged: { moved: [] }, forNextWeek: [{ do: 'Name one owner for the distributor relationship.', why: 'Nobody owns the next step with the distributor.' }, { do: 'Ask finance to confirm the discount limit.', why: 'Two people gave two different limits.' }] };

function world(over: { needs?: any[]; outstanding?: string[]; report?: any } = {}) {
  const lead = { id: 'u-lead', firstName: 'Baraka' };
  const ground = {
    id: 'g1', label: 'Distributor review', initiatorId: 'u-lead', chaseAfterDays: [3, 7, 14], createdAt: new Date('2026-10-08T07:00:00Z'), chasingStopped: false,
    participants: [person('lead', 'Baraka', { userId: 'u-lead' }), person('k', 'Kito', { lastNudgedAt: new Date('2026-10-11T07:00:00Z') }), person('l', 'Lerato')],
  };
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => ({ value: { at: RELEASE.toISOString() } })) },
    emailAddressPreference: { findUnique: jest.fn(async () => null) },
    user: { findUnique: jest.fn(async ({ where }: any) => (where.id === 'u-lead' ? lead : { emailNotifications: true })) },
    ground: { findMany: jest.fn(async ({ where }: any) => (where.initiatorId === 'u-lead' ? [ground] : [])) },
  };
  const weekly = { read: jest.fn(async () => over.report ?? REPORT) };
  const svc: any = new WhatNeedsYouService(prisma, {} as any, undefined, undefined, undefined, undefined, undefined, { get: () => weekly } as any);
  svc.forReader = jest.fn(async () => ({ needs: over.needs ?? [], count: (over.needs ?? []).length, line: null, comingUp: [] }));
  svc.outstanding = jest.fn(async () => (over.outstanding ? { needsYou: over.outstanding, overdueOnYourTeam: [], risks: [], about: { needsYou: [], overdueOnYourTeam: [], risks: [] } } : null));
  return { svc, weekly, prisma, today: (userId: string) => svc.today(userId, `${userId}@x.test`, 'org1', 'MEMBER') };
}

beforeAll(() => { jest.useFakeTimers({ now: NOW }); });
afterAll(() => { jest.useRealTimers(); });

describe('Baraka, who leads the check-in', () => {
  it('is told, in the mail\'s own words, that nobody has started and Groundwork is following up', async () => {
    const got = (await world().today('u-lead')).forTheLead!;
    const mail = theWaitingWords('Baraka', { label: 'Distributor review', invited: ['Kito', 'Lerato'], invitedOn: INVITED, reminded: ['Kito'], remindingAgainOn: [new Date(INVITED.getTime() + 7 * 86_400_000), new Date(INVITED.getTime() + 14 * 86_400_000)] });
    expect(got.nobodyHasStarted).toHaveLength(1);
    /* The mail's own sentences, except that Today has already greeted her, so the card does not open "Hello Baraka." (test bed copy a, 9 October). */
    expect(mail.lines[0].startsWith('Hello Baraka. ')).toBe(true);
    expect(got.nobodyHasStarted[0]).toMatchObject({ groundId: 'g1', label: 'Distributor review', subject: mail.subject, lines: [mail.lines[0].slice('Hello Baraka. '.length), ...mail.lines.slice(1)], linkLabel: 'See who has started', to: '/grounds/g1' });
    expect(got.nobodyHasStarted[0].lines[0]).toMatch(/^Kito and Lerato were invited to "Distributor review" on /);
    expect(got.nobodyHasStarted[0].subject).toBe('Nobody has started "Distributor review" yet');
  });

  it('is told what Groundwork would do this week, from the weekly report, in the Friday letter\'s sentences', async () => {
    const got = (await world().today('u-lead')).forTheLead!;
    const letter = theRestOfTheWeekIn({ groundId: 'g1', label: 'x', ofHowMany: 0, checkedIn: 0, notYet: [], saidWhatNext: 0, done: 0, waiting: 0, toDo: REPORT.forNextWeek }, 3);
    expect(got.whatIWouldDoThisWeek).toEqual([{ groundId: 'g1', label: 'Distributor review', lines: letter }]);
    expect(got.whatIWouldDoThisWeek[0].lines).toEqual([
      'Here is what I would do this week.',
      'Name one owner for the distributor relationship. Nobody owns the next step with the distributor.',
      'Ask finance to confirm the discount limit. Two people gave two different limits.',
    ]);
  });

  it('is not told a sentence Today already says, nor one the daily nudge\'s page says', async () => {
    const onTheCards = await world({ needs: [{ title: 'Nobody has started "Distributor review" yet', detail: null }] }).today('u-lead');
    expect(onTheCards.forTheLead?.nobodyHasStarted ?? []).toHaveLength(0);
    const inTheNudge = await world({ outstanding: ['Name one owner for the distributor relationship. Nobody owns the next step with the distributor.'] }).today('u-lead');
    expect(inTheNudge.forTheLead!.whatIWouldDoThisWeek[0].lines).toEqual(['Here is what I would do this week.', 'Ask finance to confirm the discount limit. Two people gave two different limits.']);
  });

  it('is told nothing when everything is already said, or the report is from an earlier week', async () => {
    const old = await world({ report: { ...REPORT, weekStart: '2026-09-21' } }).today('u-lead');
    expect(old.forTheLead?.whatIWouldDoThisWeek ?? []).toHaveLength(0);
    expect(old.forTheLead?.nobodyHasStarted).toHaveLength(1);
  });

  it('is told no "following up" for a check-in whose reminders she stopped', async () => {
    const w = world();
    const was = w.prisma.ground.findMany;
    w.prisma.ground.findMany = jest.fn(async (a: any) => (await was(a)).map((g: any) => ({ ...g, chasingStopped: true })));
    expect((await w.today('u-lead')).forTheLead?.nobodyHasStarted ?? []).toHaveLength(0);
  });
});

describe('a participant and an admin who is not in the check-in', () => {
  it('Lerato, a participant, receives no key for it at all', async () => {
    const got = await world().today('u-l');
    expect(got).not.toHaveProperty('forTheLead');
    expect(JSON.stringify(got)).not.toMatch(/Groundwork is following up|what I would do/);
  });

  it('Amina, an admin who does not run it, receives none either, and the weekly report is not even opened for her', async () => {
    const w = world();
    const got = await w.today('u-amina');
    expect(got).not.toHaveProperty('forTheLead');
    expect(w.weekly.read).not.toHaveBeenCalled();
  });

  it('GET /today serves it, and it is the one read of Today', async () => {
    const w = world();
    const c = new TodayController(w.svc);
    expect((await c.today({ id: 'u-lead', email: 'a@x.test', organizationId: 'org1', role: 'MEMBER' } as any)).forTheLead).toBeDefined();
  });
});
