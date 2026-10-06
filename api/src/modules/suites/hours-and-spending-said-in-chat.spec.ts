import { readHours, hoursSaidBack, hoursSent, hoursAsRead, soundsLikeHours } from './hours-said-in-chat';
import { readSpending, spendingSaidBack, spendingSent } from './spend-said-in-chat';
import { whoApprovesFor, mayApproveFor } from './who-approves';

/** Today is Thursday 1 October 2026. */
const TODAY = new Date('2026-10-01T09:00:00Z');
const CLIENTS = ['Atlas', 'Naivas Ngong Road', 'Lakeside'];

describe('hours are read by rules and never guessed', () => {
  it('reads "I did 6 hours on Atlas today" as the project, the hours and the real day', () => {
    expect(readHours('I did 6 hours on Atlas today', CLIENTS, TODAY)).toEqual({ kind: 'ok', said: { onDay: '2026-10-01', entries: [{ client: 'Atlas', hours: 6 }] } });
  });

  it('says it back with the real date and the project, and sends nothing in the say-back', () => {
    const r: any = readHours('I did 6 hours on Atlas today', CLIENTS, TODAY);
    expect(hoursSaidBack(r.said, 'Wairimu')).toBe('Shall I log 6 hours on Atlas for Thursday 1 October and send it to Wairimu to approve?');
    expect(hoursSaidBack(r.said, null)).toBe('Shall I log 6 hours on Atlas for Thursday 1 October and send it to an admin to approve?');
    expect(hoursSent(r.said, 'Wairimu')).toBe('I have logged 6 hours on Atlas for Thursday 1 October and sent it to Wairimu to approve. It is not approved until they decide, and you will see it under your hours.');
  });

  it('reads several projects on one day, and a day by name', () => {
    const r: any = readHours('I spent 3 hours at Naivas Ngong Road and 1 hour on Lakeside yesterday', CLIENTS, TODAY);
    expect(r.kind).toBe('ok');
    expect(hoursSaidBack(r.said, 'Wairimu')).toBe('Shall I log 3 hours on Naivas Ngong Road and 1 hour on Lakeside for Wednesday 30 September and send it to Wairimu to approve?');
    expect((readHours('I worked 2.5 hours on Atlas on Monday', CLIENTS, TODAY) as any).said).toEqual({ onDay: '2026-09-28', entries: [{ client: 'Atlas', hours: 2.5 }] });
    expect(hoursAsRead(6.5)).toBe('6 hours 30 minutes');
  });

  it('asks which project when it is not on the list, and names the ones that are', () => {
    expect(readHours('I did 6 hours on Zebra today', CLIENTS, TODAY)).toEqual({
      kind: 'ask',
      say: 'I do not have Zebra on the list of clients and projects. Which one did you mean? The ones I have are Atlas, Naivas Ngong Road and Lakeside.',
    });
  });

  it('asks the day when none was said, and refuses a day that has not come', () => {
    expect((readHours('I did 6 hours on Atlas', CLIENTS, TODAY) as any).say).toMatch(/^Which day was that\?/);
    expect((readHours('I did 6 hours on Atlas on 5 October', CLIENTS, TODAY) as any).say).toBe('Monday 5 October has not come yet. Tell me the day the hours were on, and I will ask again.');
  });

  it('asks when the hours cannot be read: more than a day, or too little', () => {
    expect((readHours('I did 20 hours on Atlas and 10 hours on Lakeside today', CLIENTS, TODAY) as any).say).toMatch(/^I could not tell how many hours/);
    expect((readHours('I did 30 hours on Atlas today', CLIENTS, TODAY) as any).say).toMatch(/^I could not tell how many hours/);
    expect((readHours('I did 6 hours today', CLIENTS, TODAY) as any).say).toMatch(/^Which project or client was 6 hours on\?/);
  });

  it('does not take ordinary talk for hours', () => {
    expect(readHours('How many hours does a check-in take?', CLIENTS, TODAY)).toEqual({ kind: 'none' });
    expect(soundsLikeHours('I need next Thursday off')).toBe(false);
  });

  it('says nothing about how much or how well anybody works', () => {
    const r: any = readHours('I did 12 hours on Atlas today', CLIENTS, TODAY);
    const all = hoursSaidBack(r.said, 'Wairimu') + hoursSent(r.said, 'Wairimu');
    expect(all).not.toMatch(/busy|busiest|most|least|average|rank|score|productiv|long day|overwork|PIP|at[- ]risk/i);
  });
});

describe('a request to spend is read by rules and checked before the yes', () => {
  const base = { currency: 'KES', team: 'Operations', limit: 20000, approver: 'manager' as const, approverFirstName: 'Wairimu' };

  it('reads the amount and what it is for', () => {
    expect(readSpending('I spent 12,000 on fuel for the Kisumu trip', 'KES')).toEqual({ kind: 'ok', said: { amount: 12000, what: 'fuel for the Kisumu trip', currency: 'KES' } });
    expect(readSpending('Can I spend KES 18,000 on fuel for the Kisumu deliveries?', 'KES')).toEqual({ kind: 'ok', said: { amount: 18000, what: 'fuel for the Kisumu deliveries', currency: 'KES' } });
    expect((readSpending('I need to spend 2k on printing', 'KES') as any).said.amount).toBe(2000);
  });

  it('says it fits when it does', () => {
    const s: any = readSpending('I spent 12,000 on fuel for the Kisumu trip', 'KES').valueOf();
    expect(spendingSaidBack(s.said, { ...base, left: 38000, limit: null }, 'October')).toBe(
      'You asked to spend KES 12,000 on fuel for the Kisumu trip. Operations has KES 38,000 left for October, so that fits. Shall I send it to Wairimu to approve?');
  });

  it('says plainly, before the yes, that it is over the budget left', () => {
    const s: any = readSpending('I spent 12,000 on fuel for the Kisumu trip', 'KES');
    expect(spendingSaidBack(s.said, { ...base, left: 8000, limit: null }, 'October')).toBe(
      'You asked to spend KES 12,000 on fuel for the Kisumu trip. That is over the Operations budget left for October, which is KES 8,000. Shall I still send it to Wairimu to approve?');
    expect(spendingSaidBack(s.said, { ...base, left: 0, limit: null }, 'October')).toContain('Operations has no budget left for October.');
  });

  it('says plainly when it is against the spending rule, and who must approve it', () => {
    const s: any = readSpending('Can I spend 30,000 on a generator?', 'KES');
    expect(spendingSaidBack(s.said, { ...base, left: 90000, approver: 'person', approverFirstName: 'Grace' }, 'October')).toBe(
      'You asked to spend KES 30,000 on a generator. Operations has KES 90,000 left for October, so that fits. This is over KES 20,000, so Grace must approve it. Shall I still send it to Grace to approve?');
  });

  it('says nothing of a budget that is not set, and never of anybody else', () => {
    const s: any = readSpending('I spent 5,000 on airtime', 'KES');
    const say = spendingSaidBack(s.said, { ...base, left: null, limit: null }, 'October');
    expect(say).toBe('You asked to spend KES 5,000 on airtime. There is no budget set for Operations for October. Shall I send it to Wairimu to approve?');
    expect(spendingSent(s.said, 'KES', 'Wairimu')).toBe('I have sent your request to spend KES 5,000 on airtime to Wairimu. It is not approved until they decide, and nothing is spent until then.');
  });

  it('asks again when the amount, the currency or the reason cannot be read', () => {
    expect((readSpending('I spent 12,000 or 15,000 on fuel', 'KES') as any).say).toMatch(/^I found more than one amount/);
    expect((readSpending('I spent 12,000 USD on fuel', 'KES') as any).say).toBe('Your organisation counts spending in KES, and you wrote USD. Tell me the amount in KES and I will ask again.');
    expect((readSpending('I spent 12,000', 'KES') as any).say).toBe('What is the KES 12,000 for? Tell me in a few words and I will ask again.');
    expect(readSpending('I spent a lot on fuel', 'KES')).toEqual({ kind: 'none' });
    expect(readSpending('I spent 3 hours on Atlas', 'KES')).toEqual({ kind: 'none' });
  });
});

describe('who approves for a person is one answer', () => {
  const people: Record<string, any> = {
    mgr: { linkedUserId: 'u-mgr', givenName: 'Wairimu', displayName: 'Wairimu Kamau' },
    plain: { linkedUserId: 'u-plain', givenName: 'Pat', displayName: 'Pat X' },
  };
  const roles: Record<string, string> = { 'u-mgr': 'LEAD', 'u-plain': 'MEMBER' };
  const prisma: any = {
    person: { findFirst: jest.fn(async ({ where }: any) => (where.externalId ? people[where.externalId] ?? null : { managerExternalId: where.linkedUserId === 'u-a' ? 'mgr' : where.linkedUserId === 'u-b' ? 'plain' : null })) },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: roles[where.userId_organizationId.userId] ?? 'MEMBER' })) },
  };
  it('is the line manager when they can open the board, otherwise an admin', async () => {
    expect(await whoApprovesFor(prisma, { organizationId: 'o', personUserId: 'u-a' })).toEqual({ kind: 'manager', userId: 'u-mgr', firstName: 'Wairimu' });
    expect(await whoApprovesFor(prisma, { organizationId: 'o', personUserId: 'u-b' })).toEqual({ kind: 'admin' });
    expect(await whoApprovesFor(prisma, { organizationId: 'o', personUserId: 'u-c' })).toEqual({ kind: 'admin' });
  });
  it('is never the person themselves, and never the person who only runs the check-in', async () => {
    expect(await mayApproveFor(prisma, { organizationId: 'o', readerId: 'u-mgr', readerRole: 'LEAD', personUserId: 'u-a' })).toBe(true);
    expect(await mayApproveFor(prisma, { organizationId: 'o', readerId: 'u-a', readerRole: 'ADMIN', personUserId: 'u-a' })).toBe(false);
    expect(await mayApproveFor(prisma, { organizationId: 'o', readerId: 'u-runner', readerRole: 'LEAD', personUserId: 'u-c' })).toBe(false);
    expect(await mayApproveFor(prisma, { organizationId: 'o', readerId: 'u-admin', readerRole: 'ADMIN', personUserId: 'u-c' })).toBe(true);
    expect(await mayApproveFor(prisma, { organizationId: 'o', readerId: 'u-admin', readerRole: 'ADMIN', personUserId: 'u-a' })).toBe(false);
  });
});

describe('the budget left, with what is already asked for and waiting (found live, 1 October 2026)', () => {
  const base = { currency: 'KES', team: 'Sales', limit: null, approver: 'manager' as const, approverFirstName: 'Wairimu' };
  const said = { amount: 30000, what: 'a stand for the Nairobi show', currency: 'KES' };
  it('says what is free once the waiting requests are counted, and says it plainly when there is none', () => {
    expect(spendingSaidBack(said, { ...base, left: 38000, waiting: 12000 }, 'October')).toBe(
      'You asked to spend KES 30,000 on a stand for the Nairobi show. Sales has KES 38,000 left for October, and KES 12,000 of that is already asked for and waiting, so KES 26,000 is free. This is more than that. Shall I still send it to Wairimu to approve?');
    expect(spendingSaidBack(said, { ...base, left: 38000, waiting: 40000 }, 'October')).toBe(
      'You asked to spend KES 30,000 on a stand for the Nairobi show. Sales has KES 38,000 left for October, and all of it is already asked for and waiting, so none of it is free. Shall I still send it to Wairimu to approve?');
    expect(spendingSaidBack(said, { ...base, left: 38000, waiting: 0 }, 'October')).toContain('Sales has KES 38,000 left for October, so that fits.');
  });
});

describe('a weekday with "next week" after it is next week\'s day (6 October)', () => {
  /* Tuesday 6 October 2026. */
  const TODAY = new Date('2026-10-06T09:00:00Z');
  it.each([
    ['Can I take Friday off next week?', '2026-10-16', '2026-10-16'],
    ['I need Monday off next week.', '2026-10-12', '2026-10-12'],
    ['Can I take Thursday and Friday off next week?', '2026-10-15', '2026-10-16'],
    ['I need Friday off.', '2026-10-09', '2026-10-09'],
    ['I need next Friday off.', '2026-10-16', '2026-10-16'],
    /* An explicit "this", or a "next week" about something else, keeps the day it always read as. */
    ['Can I take this Friday off? I will be back next week.', '2026-10-09', '2026-10-09'],
    ['I need leave this Thursday and Friday, then next week I am in the office.', '2026-10-08', '2026-10-09'],
    ['Can I take leave on Thursday? My exams are next week.', '2026-10-08', '2026-10-08'],
    ['I need a day off on Friday because next week is the audit.', '2026-10-09', '2026-10-09'],
    ['Can I take Friday off as I travel next week?', '2026-10-09', '2026-10-09'],
    ['Can I take Friday off, and next week too?', '2026-10-09', '2026-10-09'],
    ['I need Friday of next week off.', '2026-10-16', '2026-10-16'],
    ['I need Friday next week off.', '2026-10-16', '2026-10-16'],
    ['I need this coming Friday off.', '2026-10-09', '2026-10-09'],
    ['I need Monday to Wednesday off next week.', '2026-10-12', '2026-10-14'],
  ])('%s is read as %s to %s', async (said, startsOn, endsOn) => {
    const { readLeaveDates } = await import('./leave-said-in-chat');
    expect(readLeaveDates(said, TODAY)).toEqual({ startsOn, endsOn });
  });
});
