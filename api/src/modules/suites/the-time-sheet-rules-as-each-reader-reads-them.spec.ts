import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ORG, TODAY, aTimeSheetsOrganisation } from './a-time-sheets-organisation-for-specs';
import { TIME_RULES_REFUSED } from './the-time-sheet-rules';
import { TIME_REFUSED } from './the-time-sheets.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require('xlsx') as typeof import('xlsx');

/**
 * THE TIME SHEET RULES, AS EACH PERSON READS THEM (decision 85, item 3; build step 11).
 *
 * Grace, the admin, sets who keeps a time sheet (Sales), weekly, 40 hours a week, a cut-off of Friday
 * at 17:00 in Lagos, and that hours on Internal are not billable. Aisha, in Sales, reads where she
 * stands on Today, under her hours and in Ask Groundwork, and nobody else reads that sentence. Kamau,
 * in Operations, is not asked for a time sheet. Wairimu approves through the approval steps, as before.
 * Grace and Omar, who looks after finance, take the approved billable hours away as a file. Hours are
 * for billing only (decision 10).
 *
 * And first, the before and after: with nothing set, every reader reads exactly what they read
 * before this change.
 */
const RULES = { submitters: { teams: ['Sales'] }, every: 'week', hoursAWeek: 40, cutOff: { day: 'friday', time: '17:00' }, billable: { clients: { Internal: false } } };
const FAKE = { doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate'] as any };

beforeEach(() => jest.useFakeTimers({ now: TODAY, ...FAKE }));
afterEach(() => jest.useRealTimers());

/* ------------------------------------------- before and after ------------------------------------------- */

describe('with no time sheet rules set, every reader reads exactly what they read before', () => {
  for (const [label, rules] of [['no rules row at all', undefined], ['an empty rules row', {}]] as const) {
    it(`${label}: Aisha's own hours read as before, with nothing about where she stands`, async () => {
      const o = aTimeSheetsOrganisation({ rules });
      const mine = await o.svc.mine(o.as('u-aisha'), TODAY);
      expect(mine.standing).toBeNull();
      expect(mine.weeks.map((w: any) => [w.weekOf, w.total / 60, w.approved, w.where])).toEqual([
        ['2026-10-05', 31, false, 'Your hours for the week of Monday 5 October are waiting for Wairimu.'],
        ['2026-09-28', 8, true, 'Your hours for the week of Monday 28 September are approved by Wairimu.'],
      ]);
    });

    it(`${label}: Aisha's say-back for Internal is exactly as before, and the hours are kept with no billable mark`, async () => {
      const o = aTimeSheetsOrganisation({ rules });
      expect(await o.says('u-aisha', 'I spent 3 hours on Internal today, not billable')).toBe('Shall I log 3 hours on Internal for Wednesday 7 October and send it to Wairimu to approve?');
      await o.says('u-aisha', 'yes');
      const kept = o.prisma.timeEntry.createMany.mock.calls[0][0].data;
      expect(kept).toEqual([{ organizationId: ORG, userId: 'u-aisha', client: 'Internal', onDay: new Date('2026-10-07T00:00:00.000Z'), minutes: 180 }]);
    });

    it(`${label}: Ask Groundwork does not answer "how many hours" from the time sheet`, async () => {
      const o = aTimeSheetsOrganisation({ rules });
      const r: any = await o.assistant.respond(ORG, 'pid-aisha', 'How many hours have I logged this week?').catch(() => null);
      expect(r?.lane).not.toBe('log_hours');
      expect(JSON.stringify(r ?? {})).not.toMatch(/You have recorded/);
    });

    it(`${label}: Aisha's Today has no line about her hours`, async () => {
      const o = aTimeSheetsOrganisation({ rules });
      expect(await o.onToday('u-aisha')).toEqual([]);
    });

    it(`${label}: Wairimu's board reads as before`, async () => {
      const o = aTimeSheetsOrganisation({ rules });
      const b = await o.svc.board(o.as('u-wairimu'), TODAY);
      const w = b.weeks.find((x: any) => x.weekOf === '2026-10-05')!;
      expect(w.people.map((p: any) => [p.name, p.total / 60, p.mayApprove, p.where])).toEqual([['Aisha Otieno', 31, true, 'They are waiting for you.']]);
    });

    it(`${label}: the billing file holds every approved hour, Internal too`, async () => {
      const o = aTimeSheetsOrganisation({ rules });
      const f = await o.svc.billingExport(o.as('u-grace'), 'csv', {}, TODAY);
      expect(f.body.toString('utf8')).toBe([
        'Client or project,Person,Day,Hours,Week of,Approved by,Approved on',
        'Naivas,Aisha Otieno,2026-09-30,6,2026-09-28,Wairimu Kamau,2026-10-02',
        'Internal,Aisha Otieno,2026-10-01,2,2026-09-28,Wairimu Kamau,2026-10-02',
        '',
      ].join('\n'));
    });
  }
});

/* ------------------------------------------- Grace, the admin ------------------------------------------- */

describe('Grace, the admin, sets the rules and reads them back in full sentences', () => {
  it('reads the rules with nothing set', async () => {
    const o = aTimeSheetsOrganisation();
    expect((await o.suites.timeRules(o.as('u-grace'))).said).toEqual([
      'Everybody in the organisation who is not a guest keeps a time sheet.',
      'Hours are sent each week.',
      'No number of hours is asked for each week.',
      'There is no cut-off.',
      'Every hour is billable, so the billing file holds every approved hour.',
      'A week of hours goes to the person’s manager, or else an admin. An admin changes who approves under the approval steps.',
      'Hours are for billing only. They never appear in anyone’s check-in report, their signals or a review.',
    ]);
  });

  it('sets them, reads them back, and the change is kept in the rules history', async () => {
    const o = aTimeSheetsOrganisation();
    const r = await o.suites.setTimeRules(o.as('u-grace'), { ...RULES, submitters: { teams: ['sales'], people: ['u-kamau'] }, billable: { clients: { internal: false } } });
    expect(r.rules).toEqual({ ...RULES, submitters: { teams: ['Sales'], people: ['u-kamau'] } });
    expect(r.said).toEqual([
      'People in Sales keep a time sheet, and so does Kamau Njenga. Anybody else may still give their hours.',
      'Hours are sent each week.',
      'Each person is asked for 40 hours a week.',
      'The cut-off is Friday at 17:00, Lagos time, each week.',
      'Hours on Internal are not billable.',
      'Hours on every other client or project are billable.',
      'A person can say that one entry is billable or not billable, and that entry follows what they said.',
      'A week of hours goes to the person’s manager, or else an admin. An admin changes who approves under the approval steps.',
      'Hours are for billing only. They never appear in anyone’s check-in report, their signals or a review.',
    ]);
    const h = await o.suites.rulesHistory(o.as('u-grace'));
    expect(h.changes[0].said).toBe('Grace changed the time sheet rules on 7 October.');
    expect(h.changes[0].details).toEqual([
      'This was added. People in Sales keep a time sheet, and so does Kamau Njenga. Anybody else may still give their hours.',
      'This was added. Each person is asked for 40 hours a week.',
      'This was added. The cut-off is Friday at 17:00, Lagos time, each week.',
      'This was added. Hours on Internal are not billable.',
      'This was added. Hours on every other client or project are billable.',
      'This was added. A person can say that one entry is billable or not billable, and that entry follows what they said.',
      'This was taken away. Everybody in the organisation who is not a guest keeps a time sheet.',
      'This was taken away. No number of hours is asked for each week.',
      'This was taken away. There is no cut-off.',
      'This was taken away. Every hour is billable, so the billing file holds every approved hour.',
    ]);
  });

  it('a monthly time sheet with its cut-off on the last day of the month', async () => {
    const o = aTimeSheetsOrganisation();
    const r = await o.suites.setTimeRules(o.as('u-grace'), { every: 'month', cutOff: { day: 'last', time: '12:00' } });
    expect(r.said.slice(1, 4)).toEqual(['Hours are sent each month.', 'No number of hours is asked for each week.', 'The cut-off is the last day of each month at 12:00, Lagos time.']);
  });

  it('is refused anything that cannot be read, in full sentences', async () => {
    const o = aTimeSheetsOrganisation();
    const as = o.as('u-grace');
    await expect(o.suites.setTimeRules(as, { hoursAWeek: 0 })).rejects.toThrow(new BadRequestException(TIME_RULES_REFUSED.badHours));
    await expect(o.suites.setTimeRules(as, { hoursAWeek: 100 })).rejects.toThrow(new BadRequestException(TIME_RULES_REFUSED.badHours));
    await expect(o.suites.setTimeRules(as, { cutOff: { day: 'someday', time: '17:00' } })).rejects.toThrow(new BadRequestException(TIME_RULES_REFUSED.badCutOff));
    await expect(o.suites.setTimeRules(as, { cutOff: { day: 'friday', time: '5pm' } })).rejects.toThrow(new BadRequestException(TIME_RULES_REFUSED.badCutOff));
    await expect(o.suites.setTimeRules(as, { every: 'month', cutOff: { day: 'friday', time: '17:00' } })).rejects.toThrow(new BadRequestException(TIME_RULES_REFUSED.badCutOff));
    await expect(o.suites.setTimeRules(as, { every: 'fortnight' })).rejects.toThrow(new BadRequestException(TIME_RULES_REFUSED.badEvery));
    await expect(o.suites.setTimeRules(as, { submitters: { teams: ['Marketing'] } })).rejects.toThrow(new BadRequestException(TIME_RULES_REFUSED.badSubmitters));
    await expect(o.suites.setTimeRules(as, { submitters: { people: ['u-nobody'] } })).rejects.toThrow(new BadRequestException(TIME_RULES_REFUSED.badSubmitters));
    await expect(o.suites.setTimeRules(as, { billable: { clients: { Carrefour: false } } })).rejects.toThrow(new BadRequestException(TIME_RULES_REFUSED.badBillable));
  });
});

/* Decision 85: whoever holds the finance duty sets up time sheets, so Omar may now read and set them. */
describe('Omar, who looks after finance, reads and sets the time sheet rules', () => {
  it('reads them and sets them', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    expect((await o.suites.setTimeRules(o.as('u-omar'), { hoursAWeek: 10 })).rules.hoursAWeek).toBe(10);
  });
});

describe('nobody but an admin or whoever looks after finance reads or sets the time sheet rules', () => {
  for (const u of ['u-wairimu', 'u-aisha', 'u-tomas']) {
    it(u.slice(2), async () => {
      const o = aTimeSheetsOrganisation({ rules: RULES });
      await expect(o.suites.timeRules(o.as(u))).rejects.toThrow(new ForbiddenException(TIME_RULES_REFUSED.onlyAnAdmin));
      await expect(o.suites.setTimeRules(o.as(u), { hoursAWeek: 10 })).rejects.toThrow(new ForbiddenException(TIME_RULES_REFUSED.onlyAnAdmin));
    });
  }
});

/* ------------------------------------------- Aisha, who keeps a time sheet ------------------------------------------- */

const STANDING = 'You have recorded 31 hours this week. You still need 9 hours by Friday at 17:00.';

describe('Aisha, in Sales, reads where she stands, and only she reads it', () => {
  it('under her own hours', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    expect((await o.svc.mine(o.as('u-aisha'), TODAY)).standing).toBe(STANDING);
  });

  it('on Today', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    expect(await o.onToday('u-aisha')).toEqual([{
      key: 'time-standing', kind: 'look', title: STANDING,
      detail: 'Tell Groundwork your hours in your check-in or in Ask Groundwork. There is no grid to fill in.',
      action: { label: 'See your hours', to: '/suite/time' }, groundId: '', organizationId: ORG,
    }]);
  });

  it('in Ask Groundwork', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    expect(await o.says('u-aisha', 'How many hours have I logged this week?')).toBe(
      `${STANDING} You can tell me your hours here at any time, for example "I spent 3 hours on a client today".`,
    );
  });

  it('after the cut-off has passed, on Saturday', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    const saturday = new Date('2026-10-10T08:00:00Z');
    jest.setSystemTime(saturday);
    expect((await o.svc.mine(o.as('u-aisha'), saturday)).standing).toBe('You have recorded 31 hours this week. You still need 9 hours. The cut-off was Friday at 17:00, so please send them as soon as you can.');
  });

  it('once she has given all 40 hours, Today has nothing more to say', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    o.entries.push({ organizationId: ORG, userId: 'u-aisha', client: 'Naivas', onDay: new Date('2026-10-07T00:00:00Z'), minutes: 9 * 60 });
    expect((await o.svc.mine(o.as('u-aisha'), TODAY)).standing).toBe('You have recorded 40 hours this week. That is the 40 hours a week your organisation asks for.');
    expect(await o.onToday('u-aisha')).toEqual([]);
  });

  it('with a monthly time sheet, she reads when the month is due', async () => {
    const o = aTimeSheetsOrganisation({ rules: { hoursAWeek: 40, every: 'month', cutOff: { day: 'last', time: '17:00' } } });
    expect((await o.svc.mine(o.as('u-aisha'), TODAY)).standing).toBe('You have recorded 31 hours this week. You still need 9 hours this week. Please send October\'s hours by Saturday 31 October at 17:00.');
  });

  it('says that Internal is not billable before her yes, and keeps "not billable" when she says it', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    expect(await o.says('u-aisha', 'I spent 3 hours on Internal today')).toBe('Shall I log 3 hours on Internal for Wednesday 7 October and send it to Wairimu to approve? The hours on Internal are not billable.');
    await o.says('u-aisha', 'no');
    expect(await o.says('u-aisha', 'I spent 2 hours on Naivas today, not billable')).toBe('Shall I log 2 hours on Naivas for Wednesday 7 October and send it to Wairimu to approve? The hours on Naivas are not billable.');
    await o.says('u-aisha', 'yes');
    expect(o.prisma.timeEntry.createMany.mock.calls[0][0].data).toEqual([{ organizationId: ORG, userId: 'u-aisha', client: 'Naivas', onDay: new Date('2026-10-07T00:00:00.000Z'), minutes: 120, billable: false }]);
  });

  it('a Naivas entry with nothing said about billing is said back as before', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    expect(await o.says('u-aisha', 'I spent 2 hours on Naivas today')).toBe('Shall I log 2 hours on Naivas for Wednesday 7 October and send it to Wairimu to approve?');
  });
});

describe('Kamau, in Operations, is not asked for a time sheet', () => {
  it('reads nothing about where he stands, and nothing on Today, but may still give hours', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    expect((await o.svc.mine(o.as('u-kamau'), TODAY)).standing).toBeNull();
    expect(await o.onToday('u-kamau')).toEqual([]);
    expect(await o.says('u-kamau', 'I spent 2 hours on Lakeside today')).toBe('Shall I log 2 hours on Lakeside for Wednesday 7 October and send it to an admin to approve?');
  });
});

describe('Wairimu, who approves Aisha’s hours, reads her board as before and never Aisha’s standing', () => {
  it('the board has the same rows and no sentence about what Aisha still needs', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    const b = await o.svc.board(o.as('u-wairimu'), TODAY);
    const w = b.weeks.find((x: any) => x.weekOf === '2026-10-05')!;
    expect(w.people.map((p: any) => [p.name, p.total / 60, p.mayApprove, p.where])).toEqual([['Aisha Otieno', 31, true, 'They are waiting for you.']]);
    expect(JSON.stringify(b)).not.toMatch(/still need|You have recorded|asks for/);
    /* Wairimu is in Sales, so she keeps a time sheet too: Today tells her about her own hours, never Aisha's. */
    expect((await o.onToday('u-wairimu')).map((n) => n.title)).toEqual(['You have not recorded any hours this week. You still need 40 hours by Friday at 17:00.']);
  });
});

/* ------------------------------------------- the billing file ------------------------------------------- */

describe('the billing file of approved billable hours', () => {
  it('Grace takes it as CSV: approved weeks only, and Internal left out because it is not billable', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    const f = await o.svc.billingExport(o.as('u-grace'), 'csv', {}, TODAY);
    expect(f.fileName).toBe('billable-hours-2026-08-10-to-2026-10-07.csv');
    expect(f.contentType).toBe('text/csv; charset=utf-8');
    expect(f.body.toString('utf8')).toBe([
      'Client or project,Person,Day,Hours,Week of,Approved by,Approved on',
      'Naivas,Aisha Otieno,2026-09-30,6,2026-09-28,Wairimu Kamau,2026-10-02',
      '',
    ].join('\n'));
    expect(o.events).toEqual([expect.objectContaining({ suite: 'time', ref: 'u-aisha|2026-09-28', kind: 'exported', byUserId: 'u-grace' })]);
    expect((await o.svc.history(o.as('u-aisha'), 'u-aisha', '2026-09-28')).said).toContain('Grace put these hours in a file for billing on 7 October.');
  });

  it('Omar, who looks after finance, takes it as Excel, between two days', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    const f = await o.svc.billingExport(o.as('u-omar'), 'xlsx', { from: '2026-09-28', to: '2026-10-04' }, TODAY);
    expect(f.fileName).toBe('billable-hours-2026-09-28-to-2026-10-04.xlsx');
    const sheet = XLSX.read(f.body, { type: 'buffer' }).Sheets['Billable hours'];
    expect(XLSX.utils.sheet_to_json(sheet, { header: 1 })).toEqual([
      ['Client or project', 'Person', 'Day', 'Hours', 'Week of', 'Approved by', 'Approved on'],
      ['Naivas', 'Aisha Otieno', '2026-09-30', 6, '2026-09-28', 'Wairimu Kamau', '2026-10-02'],
    ]);
  });

  it('an entry Aisha said was billable follows what she said, against the rule for Internal', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    o.entries.find((e) => e.client === 'Internal' && e.minutes === 120)!.billable = true;
    const f = await o.svc.billingExport(o.as('u-grace'), 'csv', {}, TODAY);
    expect(f.body.toString('utf8')).toContain('Internal,Aisha Otieno,2026-10-01,2,2026-09-28,Wairimu Kamau,2026-10-02');
  });

  for (const u of ['u-wairimu', 'u-aisha', 'u-kamau', 'u-tomas']) {
    it(`${u.slice(2)} is refused it`, async () => {
      const o = aTimeSheetsOrganisation({ rules: RULES });
      await expect(o.svc.billingExport(o.as(u), 'csv', {}, TODAY)).rejects.toThrow(new ForbiddenException(TIME_REFUSED.onlyBilling));
    });
  }

  it('is refused a format or days it cannot read', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    await expect(o.svc.billingExport(o.as('u-grace'), 'pdf', {}, TODAY)).rejects.toThrow(new BadRequestException(TIME_REFUSED.badFormat));
    await expect(o.svc.billingExport(o.as('u-grace'), 'csv', { from: '2026-10-07', to: '2026-10-01' }, TODAY)).rejects.toThrow(new BadRequestException(TIME_REFUSED.badRange));
  });
});

describe('hours stay for billing only (decision 10)', () => {
  it('nothing served about the rules rates how much anybody works, or labels anybody', async () => {
    const o = aTimeSheetsOrganisation({ rules: RULES });
    const served = JSON.stringify([
      await o.suites.timeRules(o.as('u-grace')), await o.svc.mine(o.as('u-aisha'), TODAY), await o.onToday('u-aisha'),
    ]);
    expect(served).not.toMatch(/busiest|most|least|average|rank|score|productiv|PIP|at[- ]risk|behind|lazy/i);
  });
});
