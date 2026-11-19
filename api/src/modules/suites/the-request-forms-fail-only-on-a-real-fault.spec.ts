import { HttpException } from '@nestjs/common';
import { aLeaveOrganisation } from './a-leave-organisation-for-specs';
import { aSpendingOrganisation } from './a-spending-organisation-for-specs';
import { ARequestFiledFromItsForm, THE_REQUEST_WAS_SENT } from './a-request-filed-from-its-form';

// These suites are written as of 2026-10-05. The services under test read the real clock, so freeze the
// date (and only the date: timers stay real) or the "more than a month ago" checks start failing
// the day the calendar moves on.
beforeAll(() => {
  jest.useFakeTimers({
    now: new Date('2026-10-05T09:00:00Z'),
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask', 'performance', 'hrtime'],
  });
});
afterAll(() => jest.useRealTimers());

/**
 * S3 (nothing-removed audit): THE REQUEST FORMS ANSWER A SERVER FAULT ONLY WHEN THERE IS ONE.
 *
 * A person asking for leave or money met an error note and no form. The screens now show the form again with a way to try
 * once more, but only if the server keeps its promise: whatever a person types into the form that is wrong is a refusal in
 * a plain sentence (a 400, never a 500), and a rules row that is broken still leaves a form to fill in.
 */
const leaveWorld = () => {
  const w = aLeaveOrganisation({});
  return { ...w, filed: new ARequestFiledFromItsForm(w.prisma, w.leave, {} as any) };
};
const spendWorld = () => {
  const w = aSpendingOrganisation({});
  return { ...w, filed: new ARequestFiledFromItsForm(w.prisma, {} as any, w.svc) };
};

async function statusAndWords(run: () => Promise<unknown>): Promise<{ status: number; words: string } | 'sent'> {
  try {
    await run();
    return 'sent';
  } catch (e) {
    if (e instanceof HttpException) return { status: e.getStatus(), words: String(e.message) };
    return { status: 500, words: String((e as Error)?.message) };
  }
}

describe('what a person can type into the spending form is refused, never a fault', () => {
  const bad: [string, number][] = [['nothing', 0], ['less than nothing', -20], ['more than the sum can hold', 1e30], ['not a number', Number.NaN], ['infinity', Infinity]];
  it.each(bad)('an amount of %s is a refusal in a plain sentence', async (_name, amount) => {
    const w = spendWorld();
    const got = await statusAndWords(() => w.filed.spendingRequest(w.as('u-kamau'), { amount, what: 'A new chair' }));
    expect(got).not.toBe('sent');
    expect((got as any).status).toBe(400);
    expect((got as any).words).toMatch(/^[A-Z].*\.$/);
    expect(w.created).toHaveLength(0);
  });

  it('a category nobody set, and a purpose of only spaces, are refusals too', async () => {
    const w = spendWorld();
    const a = await statusAndWords(() => w.filed.spendingRequest(w.as('u-kamau'), { amount: 40, what: 'Chair', category: 'nothing like this' }));
    const b = await statusAndWords(() => w.filed.spendingRequest(w.as('u-kamau'), { amount: 40, what: '   ' }));
    expect((a as any).status).toBe(400);
    expect((b as any).status).toBe(400);
  });
});

describe('what a person can type into the leave form is refused, never a fault', () => {
  const bad: [string, string, string][] = [
    ['a day that is not on the calendar', '2026-13-45', '2026-13-46'],
    ['the last day before the first', '2026-10-14', '2026-10-12'],
    ['days from the year nought', '0000-01-01', '0000-01-02'],
    ['days from the far future', '9999-12-30', '9999-12-31'],
  ];
  it.each(bad)('%s', async (_name, startsOn, endsOn) => {
    const w = leaveWorld();
    const got = await statusAndWords(() => w.filed.leaveRequest(w.as('u-aisha'), { startsOn, endsOn }));
    if (got !== 'sent') {
      expect(got.status).toBe(400);
      expect(got.words).toMatch(/^[A-Z].*\.$/);
    }
    expect(got === 'sent' ? 'a 500 would not be sent' : got.status).not.toBe(500);
  });
});

describe('a broken rules row still leaves a form to fill in', () => {
  it('serves the leave form when the rules row holds rubbish', async () => {
    const w = aLeaveOrganisation({ rules: 'rubbish' as any });
    const form = await w.suites.leaveForm(w.as('u-aisha'));
    expect(Array.isArray(form.kinds)).toBe(true);
    expect(form.standIns.length).toBeGreaterThan(0);
  });
  it('serves the payment form when the rules row holds rubbish', async () => {
    const w = aSpendingOrganisation({ rules: ['rubbish'] as any });
    const form = await w.suites.spendForm(w.as('u-kamau'));
    expect(form.categories).toEqual([]);
    expect(form.categoryCalled).toBe('category');
  });
});

describe('a request that was sent is never answered as a fault because its sentence could not be put together', () => {
  it('a leave request recorded, with the sentence failing, still answers with its id and a plain sentence', async () => {
    const w = leaveWorld();
    const filed = new ARequestFiledFromItsForm(w.prisma, w.leave, {} as any);
    const sentence = require('./leave-said-in-chat');
    const spy = jest.spyOn(sentence, 'theLeaveRequestSent').mockRejectedValue(new Error('connection reset'));
    try {
      const got = await filed.leaveRequest(w.as('u-aisha'), { startsOn: '2026-10-12', endsOn: '2026-10-14' });
      expect(got.says).toBe(THE_REQUEST_WAS_SENT);
      expect(got.id).toBeTruthy();
      expect(w.rows).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });
});
