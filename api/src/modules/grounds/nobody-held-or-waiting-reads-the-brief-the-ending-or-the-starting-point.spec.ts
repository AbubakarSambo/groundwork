import { ForbiddenException } from '@nestjs/common';
import { GroundsService } from './grounds.service';
import { ResolutionService } from '../resolution/resolution.service';
import { OnlySomebodyInTheCheckInReadsIt } from '../alignment/only-somebody-in-the-check-in-reads-it.guard';
import { HELD_FOR_A_SEAT } from '../participants/held-for-a-seat';
import { CANNOT_CHECK_IN_YET } from '../participants/nobody-joins-your-company-by-being-invited-to-a-check-in';

/**
 * THE RELEASE CHECK, 7 OCTOBER 2026, READ ON THE SERVER AS EACH READER.
 *
 * 1. GET /grounds/:id/mediator-brief served the report's central question ("What does on track mean in terms of the number of new
 *    shops ordering each week...") to every participant of Sales team, Q4 while the report was not released, where the report itself
 *    tells them "The team's picture of session 2 is not shared yet." (decision 76, item 4).
 * 2. Neema, held for a seat, and Tomas, waiting for the organisation's approval, were refused the board and the report but served
 *    the mediator brief, the ending (everybody's end state), the check-in's starting point and the alignment reads (privacy row 5).
 */
const G = 'g-sales';
const ORG = 'org-msingi';
const people: Record<string, { role: string; awaitingOrgApproval: boolean }> = {
  wairimu: { role: 'LEAD', awaitingOrgApproval: false },
  amani: { role: 'MEMBER', awaitingOrgApproval: false },
  neema: { role: 'MEMBER', awaitingOrgApproval: false },
  tomas: { role: 'MEMBER', awaitingOrgApproval: true },
};
const rows = [
  { id: 'p-w', groundId: G, userId: 'wairimu', email: 'wairimu@msingi.test', partyType: 'INITIATOR', awaitingSeat: false },
  { id: 'p-a', groundId: G, userId: 'amani', email: 'amani@msingi.test', partyType: 'PARTICIPANT', awaitingSeat: false },
  { id: 'p-n', groundId: G, userId: 'neema', email: 'neema@msingi.test', partyType: 'PARTICIPANT', awaitingSeat: true },
  { id: 'p-t', groundId: G, userId: 'tomas', email: 'tomas@elsewhere.test', partyType: 'PARTICIPANT', awaitingSeat: false },
];
const QUESTION = 'What does on track mean in terms of the number of new shops ordering each week?';

function fake(releasedAt: Date | null) {
  const ground = {
    id: G, organizationId: ORG, initiatorId: 'wairimu', createdByUserId: 'wairimu', approvedById: null, scenario: 'OKR_ALIGNMENT',
    status: 'ACTIVE', label: 'Sales team, Q4', createdAt: new Date('2026-09-16T00:00:00Z'), participants: rows,
    report: { centralQuestion: QUESTION, releasedAt },
  };
  const user = (id: string) => (people[id] ? { id, ...people[id], organizationId: ORG, email: `${id}@msingi.test` } : null);
  return {
    ground: { findUnique: jest.fn(async () => ground), findFirst: jest.fn(async () => ground) },
    groundParticipant: {
      findFirst: jest.fn(async ({ where }: any) => rows.find((r) => r.groundId === where.groundId && r.userId === where.userId) ?? null),
      findMany: jest.fn(async () => rows),
    },
    user: { findUnique: jest.fn(async ({ where }: any) => user(where.id)), findFirst: jest.fn(async ({ where }: any) => user(where.id)) },
    groundBaselineEntry: { findMany: jest.fn(async () => [{ text: 'We sell to 120 shops a week.', capturedAtSession: 1, createdAt: new Date() }]) },
    groundBaseline: { findMany: jest.fn(async () => [{ version: 1, successLooksLike: '160 shops a week', conditions: null, changeReason: null, effectiveFrom: new Date(), confirmedByAdminNote: null }]) },
    checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: 2 } })) },
  } as any;
}
const grounds = (prisma: any): any =>
  new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, { get: () => '' } as any, { respond: async () => '' } as any);
const alignment = (prisma: any, userId: string) =>
  new OnlySomebodyInTheCheckInReadsIt(prisma).canActivate({ switchToHttp: () => ({ getRequest: () => ({ user: { id: userId }, params: { groundId: G } }) }) } as any);

describe('the mediator brief keeps the report question until the lead releases it (decision 76, item 4)', () => {
  it('a participant reads that the picture is not shared yet, not the question', async () => {
    const brief = await grounds(fake(null)).getMediatorBrief(G, 'amani');
    expect(brief.gapSummary).not.toContain('shops');
    expect(brief.gapSummary).toBe('The team’s picture is not shared yet.');
  });
  it('the lead reads the question before the release, and a participant reads it after', async () => {
    expect((await grounds(fake(null)).getMediatorBrief(G, 'wairimu')).gapSummary).toBe(QUESTION);
    expect((await grounds(fake(new Date())).getMediatorBrief(G, 'amani')).gapSummary).toBe(QUESTION);
  });
});

describe('nobody held for a seat or waiting for the organisation reads the brief, the ending, the starting point or the alignment (row 5)', () => {
  const prisma = fake(new Date());
  it('Neema, held for a seat, is refused each of them with the held sentence', async () => {
    await expect(grounds(prisma).getMediatorBrief(G, 'neema')).rejects.toThrow(new ForbiddenException(HELD_FOR_A_SEAT));
    await expect(grounds(prisma).baselineEntries(G, 'neema')).rejects.toThrow(new ForbiddenException(HELD_FOR_A_SEAT));
    await expect(grounds(prisma).baselineHistory(G, 'neema')).rejects.toThrow(new ForbiddenException(HELD_FOR_A_SEAT));
    await expect(new ResolutionService(prisma, {} as any, {} as any, {} as any, {} as any).get(G, 'neema')).rejects.toThrow(new ForbiddenException(HELD_FOR_A_SEAT));
    await expect(alignment(prisma, 'neema')).rejects.toThrow(new ForbiddenException(HELD_FOR_A_SEAT));
  });
  it('Tomas, waiting for the organisation, is refused each of them', async () => {
    await expect(grounds(prisma).getMediatorBrief(G, 'tomas')).rejects.toThrow(new ForbiddenException(CANNOT_CHECK_IN_YET));
    await expect(grounds(prisma).baselineEntries(G, 'tomas')).rejects.toThrow(new ForbiddenException(CANNOT_CHECK_IN_YET));
    await expect(grounds(prisma).baselineHistory(G, 'tomas')).rejects.toThrow(new ForbiddenException(CANNOT_CHECK_IN_YET));
    await expect(new ResolutionService(prisma, {} as any, {} as any, {} as any, {} as any).get(G, 'tomas')).rejects.toThrow(new ForbiddenException(CANNOT_CHECK_IN_YET));
  });
  it('Amani, in the check-in with a seat, still reads the brief and the starting point', async () => {
    await expect(grounds(prisma).getMediatorBrief(G, 'amani')).resolves.toMatchObject({ groundLabel: 'Sales team, Q4' });
    await expect(grounds(prisma).baselineEntries(G, 'amani')).resolves.toBeTruthy();
    await expect(alignment(prisma, 'amani')).resolves.toBe(true);
  });
});
