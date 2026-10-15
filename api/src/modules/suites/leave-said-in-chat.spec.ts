import { readLeaveDates, soundsLikeLeave, sayBackLeave, sendLeave, theDaysAsRead, LEAVE_SUITE_OFF, plainlyAsksForLeave } from './leave-said-in-chat';

/**
 * WEEK 20. LEAVE DATES SAID IN CHAT: READ BY RULES, NEVER GUESSED, SAID BACK, SENT ONLY ON A YES.
 *
 * "Today" is Thursday 1 October 2026 throughout.
 */
const TODAY = new Date('2026-10-01T09:00:00Z');

describe('the exact days, or nothing', () => {
  it.each([
    ['I need next Thursday and Friday off', '2026-10-08', '2026-10-09'],
    ['I need tomorrow off', '2026-10-02', '2026-10-02'],
    ['I will be on leave from 12 to 16 October', '2026-10-12', '2026-10-16'],
    ['I want to take leave from 12 October to 16 October', '2026-10-12', '2026-10-16'],
    ['I am away on 20 October', '2026-10-20', '2026-10-20'],
    ['Can I take 2026-11-02 to 2026-11-04 as annual leave', '2026-11-02', '2026-11-04'],
    ['I need next week off', '2026-10-05', '2026-10-09'],
    ['I would like Monday to Wednesday off next week', '2026-10-05', '2026-10-07'],
  ])('%s', (said, from, to) => {
    expect(readLeaveDates(said, TODAY)).toEqual({ startsOn: from, endsOn: to });
  });

  it('never reads a day nobody asked for: "Monday and Wednesday" could include Tuesday, so it is not read', () => {
    expect(readLeaveDates('I need Monday and Wednesday off', TODAY)).toBeNull();
  });

  it('is not fooled by other uses of the words', () => {
    expect(soundsLikeLeave('I need sign-off on the quote by Friday')).toBe(false);
    expect(soundsLikeLeave('Every quote over 1 million needs Amina\'s sign-off')).toBe(false);
    expect(soundsLikeLeave('Amina is off on Friday')).toBe(false);
    expect(readLeaveDates('About three months, checking in once a week', TODAY)).toBeNull();
  });

  it('says the days as a person reads them', () => {
    expect(theDaysAsRead({ startsOn: '2026-10-09', endsOn: '2026-10-09' })).toBe('on Friday 9 October');
    expect(theDaysAsRead({ startsOn: '2026-10-08', endsOn: '2026-10-09' })).toBe('from Thursday 8 October to Friday 9 October');
  });
});

function world(opts: { on?: boolean; daysLeft?: number | null; alsoOff?: string[]; approver?: string | null } = {}) {
  const prisma: any = {
    organizationSuite: { findUnique: async () => ({ isOn: opts.on ?? true, answers: { approver: opts.approver === undefined ? 'Their manager' : opts.approver } }) },
    person: {
      findFirst: async ({ where }: any) => where.externalId === 'mgr'
        ? { givenName: 'Wairimu', displayName: 'Wairimu Kamau', linkedUserId: 'u-mgr' }
        : { department: 'Sales', managerExternalId: 'mgr' },
      findMany: async () => (opts.alsoOff ?? []).map((n) => ({ givenName: n, displayName: n })),
    },
    organizationMembership: { findUnique: async () => ({ role: 'LEAD' }) },
    leaveRequest: { findMany: async () => (opts.alsoOff ?? []).map((_n, i) => ({ userId: `u${i}` })) },
  };
  const ask = jest.fn(async () => ({ id: 'l1' }));
  const leave: any = { mine: async () => ({ daysLeft: opts.daysLeft === undefined ? 16 : opts.daysLeft }), ask };
  return { prisma, leave, ask };
}
const dates = { startsOn: '2026-10-08', endsOn: '2026-10-09' };
const reader = { userId: 'u-me', organizationId: 'o1' };

describe('what is said back, and what is sent', () => {
  it('says the days, the days left, who else is off, and who it goes to, and asks', async () => {
    const { prisma, leave } = world();
    const out = await sayBackLeave(prisma, leave, reader, dates, TODAY);
    expect(out).toEqual({
      ok: true,
      say: 'You asked for leave from Thursday 8 October to Friday 9 October, which is 2 working days. You have 16 days of leave left this year, and nobody else in Sales is off then. Shall I send it to Wairimu to approve?',
    });
  });

  it('names a colleague in the same team who is also off', async () => {
    const { prisma, leave } = world({ alsoOff: ['Kwame'] });
    const out: any = await sayBackLeave(prisma, leave, reader, dates, TODAY);
    expect(out.say).toContain('and Kwame is also off then.');
  });

  it('leaves out the days left when the organisation has not said how many there are', async () => {
    const { prisma, leave } = world({ daysLeft: null });
    const out: any = await sayBackLeave(prisma, leave, reader, dates, TODAY);
    expect(out.say).toBe('You asked for leave from Thursday 8 October to Friday 9 October, which is 2 working days. Nobody else in Sales is off then. Shall I send it to Wairimu to approve?');
  });

  it('with the leave suite off, says so plainly and sends nothing', async () => {
    const { prisma, leave, ask } = world({ on: false });
    expect(await sayBackLeave(prisma, leave, reader, dates, TODAY)).toEqual({ ok: false, say: LEAVE_SUITE_OFF });
    expect(ask).not.toHaveBeenCalled();
    expect(LEAVE_SUITE_OFF).toBe('Leave requests are not switched on in your organisation, so I have not sent or kept these dates. An admin can switch them on under Suites.');
  });

  it('after the yes, sends it through the leave suite and says to whom', async () => {
    const { prisma, leave, ask } = world();
    const say = await sendLeave(leave, prisma, reader, dates);
    expect(ask).toHaveBeenCalledWith('o1', 'u-me', dates);
    expect(say).toBe('I have sent your leave request from Thursday 8 October to Friday 9 October to Wairimu. It is not approved until they decide, and you will see it under your leave.');
  });
});

/*
 * FOUND LIVE, 1 October 2026 (item 6, journey/memory-requests-and-being-away-live.ts): "I need leave
 * today and tomorrow" was said back as one day, Friday 2 October, because "today" was not read.
 */
describe('today is never dropped', () => {
  it.each([
    ['I need leave today and tomorrow', '2026-10-01', '2026-10-02'],
    ['I need today and tomorrow off', '2026-10-01', '2026-10-02'],
    ['I need leave from today to Friday', '2026-10-01', '2026-10-02'],
    ['I need leave from today until next Tuesday', '2026-10-01', '2026-10-06'],
  ])('%s', (said, from, to) => {
    expect(readLeaveDates(said, TODAY)).toEqual({ startsOn: from, endsOn: to });
  });

  it('today with a day it cannot join to is not half read', () => {
    expect(readLeaveDates('I need leave today and on 20 October', TODAY)).toBeNull();
  });
});

describe('a plain request for time off whose days cannot be read is asked again', () => {
  it.each([
    'I need Monday and Wednesday off next week.',
    'I need leave on Monday and Wednesday.',
    'Can I take a holiday on Monday and Thursday?',
  ])('%s', (said) => {
    expect(readLeaveDates(said, TODAY)).toBeNull();
    expect(plainlyAsksForLeave(said)).toBe(true);
  });

  it('but not words that only mention a day and "off"', () => {
    expect(plainlyAsksForLeave('I am off to Kisumu on Monday and Wednesday to see Green Mart')).toBe(false);
    expect(plainlyAsksForLeave('I need sign-off on the quote by Friday')).toBe(false);
  });
});
