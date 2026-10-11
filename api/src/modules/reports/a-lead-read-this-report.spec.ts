import { recordThatTheLeadRead } from './a-lead-read-this-report';
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
