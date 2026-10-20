import { recordThatTheLeadRead, recordThatTheLeadReadTheWeek, theWeeksReadNumber } from './a-lead-read-this-report';
import { TheWeeklyReportController } from './the-weekly-report.controller';
import { ReportsController } from './reports.controller';

/** Decision 133: the product records when a lead reads a report, and opening it never rebuilds it. */
function prismaFor(initiatorId: string) {
  return { ground: { findUnique: jest.fn(async () => ({ initiatorId })) }, reportRead: { upsert: jest.fn(async () => ({})) } };
}

describe('when a lead reads a report', () => {
  it('keeps the first and the latest time Wairimu, the lead, opened session 2', async () => {
    const prisma = prismaFor('u-wairimu');
    const at = new Date('2026-10-12T09:00:00Z');
    expect(await recordThatTheLeadRead(prisma, 'g1', 2, 'u-wairimu', at)).toBe(true);
    expect(prisma.reportRead.upsert).toHaveBeenCalledWith({
      where: { groundId_sessionNumber_userId: { groundId: 'g1', sessionNumber: 2, userId: 'u-wairimu' } },
      create: { groundId: 'g1', sessionNumber: 2, userId: 'u-wairimu', firstReadAt: at, lastReadAt: at },
      update: { lastReadAt: at },
    });
  });

  it('records nothing for a participant or an admin who only reads', async () => {
    const prisma = prismaFor('u-wairimu');
    expect(await recordThatTheLeadRead(prisma, 'g1', 2, 'u-brian')).toBe(false);
    expect(prisma.reportRead.upsert).not.toHaveBeenCalled();
  });

  it('is written by the session report route after the read, with nothing rebuilt', async () => {
    const reports: any = { sessionReport: jest.fn(async () => ({ shape: 'x' })), noteTheLeadRead: jest.fn(async () => undefined), generateForAdmin: jest.fn() };
    const out = await new ReportsController(reports).sessionReport('g1', 2, 'u-wairimu', 'org1');
    expect(out).toEqual({ shape: 'x' });
    expect(reports.noteTheLeadRead).toHaveBeenCalledWith('g1', 2, 'u-wairimu');
    expect(reports.generateForAdmin).not.toHaveBeenCalled();
  });
});

describe('when a lead reads the weekly report (change 6)', () => {
  it('keeps the week of 12 October under -20261012, beside the session reports, for Wairimu only', async () => {
    expect(theWeeksReadNumber('2026-10-12')).toBe(-20261012);
    const prisma = prismaFor('u-wairimu');
    const at = new Date('2026-10-16T09:00:00Z');
    expect(await recordThatTheLeadReadTheWeek(prisma, 'g1', '2026-10-12', 'u-wairimu', at)).toBe(true);
    expect(prisma.reportRead.upsert).toHaveBeenCalledWith({
      where: { groundId_sessionNumber_userId: { groundId: 'g1', sessionNumber: -20261012, userId: 'u-wairimu' } },
      create: { groundId: 'g1', sessionNumber: -20261012, userId: 'u-wairimu', firstReadAt: at, lastReadAt: at },
      update: { lastReadAt: at },
    });
  });

  it('records nothing for Brian, a participant, nor when there is no weekly report yet', async () => {
    const prisma = prismaFor('u-wairimu');
    expect(await recordThatTheLeadReadTheWeek(prisma, 'g1', '2026-10-12', 'u-brian')).toBe(false);
    expect(await recordThatTheLeadReadTheWeek(prisma, 'g1', null, 'u-wairimu')).toBe(false);
    expect(prisma.reportRead.upsert).not.toHaveBeenCalled();
  });

  it('is written by the weekly report route for the week served, with nothing rebuilt', async () => {
    const weekly: any = { read: jest.fn(async () => ({ weekStart: '2026-10-12', eachPerson: [] })), noteTheLeadRead: jest.fn(async () => undefined), build: jest.fn() };
    const out = await new TheWeeklyReportController(weekly).week('g1', 'u-wairimu', 'USER', 'org1');
    expect(out).toEqual({ weekStart: '2026-10-12', eachPerson: [], directMorning: false });
    expect(weekly.noteTheLeadRead).toHaveBeenCalledWith('g1', '2026-10-12', 'u-wairimu');
    expect(weekly.build).not.toHaveBeenCalled();
  });
});
