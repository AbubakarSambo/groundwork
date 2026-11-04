import { serviceFor, theSessionReportAs, everyString, at } from './__fixtures__/sales-team-q3-two-sessions';
import { ReportsListener } from './reports.listener';
import { asTheClockSaysIt, theTimeItSharesItself, whenItSharesItself } from './a-report-shares-itself';
/* Changed 1 November 2026: the report is written when the check-in's assessment is ready (onTheAssessmentReady), not on the completion itself; the same release logic, checked the same way. */

/**
 * A REPORT SHARES ITSELF AT ITS SET TIME, UNLESS THE LEAD HOLDS IT (Hafsah's answers 1 and 5, 16 October 2026).
 *
 * "Sales team, Q3": Rukia runs it; Amani, Baraka and Neema check in. Session 1 was shared on 27 September; session 2,
 * which everyone has checked in to, is not shared yet. Team members read the team's report of session 2 only once it
 * is shared, or once it shares itself at its set time (6:30pm unless Rukia set another). Rukia reads it before then,
 * and may hold it. Each person's own report is theirs throughout.
 */

const THE_TEAM_PICTURE_OF_SESSION_TWO = ['Two shops are signed.', 'What would bring the price list forward?'];

describe('a team member does not read the team report of a session until it is shared', () => {
  it('Amani reads none of session 2’s team picture, but still reads his own words', async () => {
    const { svc } = serviceFor('sales');
    const r = await theSessionReportAs(svc, 'u-amani', 2);
    expect(r.refused).toBeUndefined();
    const all = everyString(r).join('\n');
    for (const line of THE_TEAM_PICTURE_OF_SESSION_TWO) expect(all).not.toContain(line);
    /* Nobody else's words before it is shared. */
    expect(all).not.toContain('BARAKA-TWO');
    expect(all).not.toContain('RUKIA-TWO');
  });

  it('Amani’s team report page reads the last shared session, never the unshared one', async () => {
    const { svc } = serviceFor('sales');
    const r: any = await svc.get('g1', 'u-amani', 'org1');
    const all = everyString(r).join('\n');
    expect(all).not.toContain('Two shops are signed.');
    expect(all).not.toContain('SESSION-TWO-INFERENCE');
  });

  it('Rukia, who runs it, reads session 2’s team picture before it is shared, as before', async () => {
    const { svc } = serviceFor('sales');
    const r = await theSessionReportAs(svc, 'u-rukia', 2);
    expect(r.refused).toBeUndefined();
    expect(everyString(r).join('\n')).toContain('BARAKA-TWO');
  });

  it('once session 2 is shared, Amani reads it', async () => {
    const { svc, w } = serviceFor('sales');
    w.report.releasedSessions = [1, 2];
    const r = await theSessionReportAs(svc, 'u-amani', 2);
    expect(everyString(r).join('\n')).toContain('BARAKA-TWO');
  });
});

describe('when the report shares itself, as each reader reads it', () => {
  it('Rukia reads "Today’s report shares itself at 6:30pm."', async () => {
    const { svc } = serviceFor('sales');
    const said = await svc.howTodaysReportIsShared('g1', 'u-rukia', 'org1');
    expect(said).toEqual({ sessionNumber: 2, shared: false, held: false, at: '6:30pm', says: 'Today’s report shares itself at 6:30pm.' });
  });

  it('Amani reads "It is usually shared by 6:30pm. You’ll get an email when it is."', async () => {
    const { svc } = serviceFor('sales');
    const said = await svc.howTodaysReportIsShared('g1', 'u-amani', 'org1');
    expect(said?.says).toBe('It is usually shared by 6:30pm. You’ll get an email when it is.');
  });

  it('after Rukia holds it, she reads that she is holding it, and Amani reads that Rukia is reading it first, never "held"', async () => {
    const { svc, w } = serviceFor('sales');
    w.report.heldSessions = [2];
    const rukia = await svc.howTodaysReportIsShared('g1', 'u-rukia', 'org1');
    expect(rukia?.says).toBe('You are holding today’s report. Nobody in the team sees it until you share it.');
    expect(rukia?.held).toBe(true);
    const amani = await svc.howTodaysReportIsShared('g1', 'u-amani', 'org1');
    expect(amani?.says).toBe('Rukia is reading it first. You’ll get an email when Rukia shares it.');
    expect(amani?.held).toBe(false);
  });

  it('somebody with no part in the check-in is told nothing', async () => {
    const { svc } = serviceFor('sales');
    expect(await svc.howTodaysReportIsShared('g1', 'u-stranger', 'org2')).toBeNull();
  });
});

describe('"Hold it" is the lead’s alone', () => {
  it('Rukia holds session 2', async () => {
    const { svc } = serviceFor('sales');
    const writes: any[] = [];
    (svc as any).prisma.report.update = async (a: any) => { writes.push(a); return null; };
    const r = await svc.holdAsTheLead('g1', 'u-rukia', 'org1');
    expect(r.held).toBe(true);
    expect(writes[0].data.heldSessions).toEqual([2]);
  });

  it('Amani is refused', async () => {
    const { svc } = serviceFor('sales');
    await expect(svc.holdAsTheLead('g1', 'u-amani', 'org1')).rejects.toThrow('Only the person who runs this check-in can hold its report.');
  });

  it('a session already shared cannot be held back', async () => {
    const { svc, w } = serviceFor('sales');
    w.report.releasedSessions = [1, 2];
    await expect(svc.holdAsTheLead('g1', 'u-rukia', 'org1')).rejects.toThrow('Today’s report is already shared with the team, so it cannot be held now.');
  });
});

describe('the reports whose time has come share themselves', () => {
  /* Session 2's first check-in was at 18:00 UTC on 30 September, 7pm in Lagos: after 6:30pm, so it shares at 6:30pm on 1 October (17:30 UTC). */
  const job = (held: number[] = []) => {
    const { svc, w } = serviceFor('sales');
    w.report.heldSessions = held;
    (svc as any).prisma.ground.findMany = async () => [{ ...w.ground, report: w.report }];
    (svc as any).prisma.checkIn.findFirst = async () => ({ completedAt: at('30') });
    const released: string[] = [];
    (svc as any).release = async (id: string) => { released.push(id); return null; };
    return { svc, released };
  };

  it('does not share before its time', async () => {
    const { svc, released } = job();
    expect(await svc.shareTheReportsWhoseTimeHasCome(new Date('2026-10-01T17:00:00Z'))).toEqual({ shared: 0 });
    expect(released).toEqual([]);
  });

  it('shares at its time', async () => {
    const { svc, released } = job();
    expect(await svc.shareTheReportsWhoseTimeHasCome(new Date('2026-10-01T17:45:00Z'))).toEqual({ shared: 1 });
    expect(released).toEqual(['g1']);
  });

  it('never shares a session the lead held', async () => {
    const { svc, released } = job([2]);
    expect(await svc.shareTheReportsWhoseTimeHasCome(new Date('2026-10-02T17:45:00Z'))).toEqual({ shared: 0 });
    expect(released).toEqual([]);
  });
});

describe('everyone checking in no longer shares a repeating check-in’s report at once', () => {
  const listener = (cadence: string, reportSharesAt: string | null = '18:30') => {
    const prisma: any = { ground: { findUnique: jest.fn(async () => ({ organizationId: 'org', status: 'ACTIVE', cadence, reportSharesAt })), update: jest.fn() }, report: { findUnique: jest.fn(async () => null) } };
    const grounds: any = { isSessionReadyForReport: jest.fn(async () => true) };
    const reports: any = { synthesize: jest.fn(), release: jest.fn(), tellThemTheReportIsReady: jest.fn(async () => ({ attempted: 0, failed: 0 })), wordTheReadsFor: jest.fn(async () => []) };
    const l = new ReportsListener(prisma, grounds, reports, {} as any, { get: () => undefined } as any);
    return { l, reports };
  };

  it('a weekly check-in waits for its set time', async () => {
    const { l, reports } = listener('WEEKLY');
    await l.onTheAssessmentReady({ groundId: 'g', sessionNumber: 2 } as any);
    expect(reports.release).not.toHaveBeenCalled();
  });

  it('a one-time check-in shares once everyone is in, as before', async () => {
    const { l, reports } = listener('ONE_TIME');
    await l.onTheAssessmentReady({ groundId: 'g', sessionNumber: 1 } as any);
    expect(reports.release).toHaveBeenCalled();
  });
});

describe('the set time', () => {
  it('is the check-in\u2019s own time where it has one, none where it has none, and none for a one-time check-in', () => {
    /* Changed 18 October (Hafsah): an empty time is off, so existing check-ins keep sharing as they always did. */
    expect(theTimeItSharesItself({ cadence: 'DAILY' })).toBeNull();
    expect(theTimeItSharesItself({ cadence: 'DAILY', reportSharesAt: '18:30' })).toBe('18:30');
    expect(theTimeItSharesItself({ cadence: 'WEEKLY', reportSharesAt: '17:00' })).toBe('17:00');
    expect(theTimeItSharesItself({ cadence: 'ONE_TIME' })).toBeNull();
    expect(asTheClockSaysIt('18:30')).toBe('6:30pm');
    expect(asTheClockSaysIt('19:00')).toBe('7pm');
  });

  it('comes round in the organisation’s own day: a 4pm check-in in Nairobi shares at 6:30pm that day, a 9pm one the next day', () => {
    expect(whenItSharesItself(new Date('2026-09-23T13:00:00Z'), '18:30', 'Africa/Nairobi').toISOString()).toBe('2026-09-23T15:30:00.000Z');
    expect(whenItSharesItself(new Date('2026-09-23T18:00:00Z'), '18:30', 'Africa/Nairobi').toISOString()).toBe('2026-09-24T15:30:00.000Z');
  });
});


describe('an existing check-in keeps sharing as it always did (Hafsah, 18 October 2026)', () => {
  /* The migration adds report_shares_at empty on every existing check-in. Empty is off: the job never shares it, and
     everyone checking in shares it at once, as before. */
  const existing = () => {
    const { svc, w } = serviceFor('sales');
    const ground = { ...w.ground, reportSharesAt: null, report: w.report };
    (svc as any).prisma.ground.findMany = async () => [ground];
    (svc as any).prisma.checkIn.findFirst = async () => ({ completedAt: at('30') });
    const released: string[] = [];
    (svc as any).release = async (id: string) => { released.push(id); return null; };
    return { svc, released };
  };

  it('the job that shares reports at their time never shares an existing check-in\u2019s report', async () => {
    const { svc, released } = existing();
    expect(await svc.shareTheReportsWhoseTimeHasCome(new Date('2026-10-01T17:45:00Z'))).toEqual({ shared: 0 });
    expect(await svc.shareTheReportsWhoseTimeHasCome(new Date('2026-10-05T17:45:00Z'))).toEqual({ shared: 0 });
    expect(released).toEqual([]);
  });

  it('everyone checking in shares an existing weekly check-in\u2019s report at once, as before', async () => {
    const prisma: any = { ground: { findUnique: jest.fn(async () => ({ organizationId: 'org', status: 'ACTIVE', cadence: 'WEEKLY', reportSharesAt: null })), update: jest.fn() }, report: { findUnique: jest.fn(async () => null) } };
    const grounds: any = { isSessionReadyForReport: jest.fn(async () => true) };
    const reports: any = { synthesize: jest.fn(), release: jest.fn(), tellThemTheReportIsReady: jest.fn(async () => ({ attempted: 0, failed: 0 })), wordTheReadsFor: jest.fn(async () => []) };
    const l = new ReportsListener(prisma, grounds, reports, {} as any, { get: () => undefined } as any);
    await l.onTheAssessmentReady({ groundId: 'g', sessionNumber: 2 } as any);
    expect(reports.release).toHaveBeenCalled();
  });
});

describe('a new check-in starts with its scenario\u2019s default', () => {
  it('a new sales check-in that repeats shares at 6:30pm; other scenarios and one-time check-ins start off', () => {
    const { theShareTimeANewCheckInStartsWith } = require('./a-report-shares-itself');
    expect(theShareTimeANewCheckInStartsWith('OKR_ALIGNMENT', 'DAILY')).toBe('18:30');
    expect(theShareTimeANewCheckInStartsWith('OKR_ALIGNMENT', 'ONE_TIME')).toBeNull();
    expect(theShareTimeANewCheckInStartsWith('PULSE_CHECK', 'DAILY')).toBeNull();
    expect(theShareTimeANewCheckInStartsWith('NEW_HIRE', 'WEEKLY')).toBeNull();
  });
});
