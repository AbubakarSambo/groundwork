import { ReportsService } from './reports.service';

/**
 * #7: a participant's soloArtifact ("Your private record shows:") is generated
 * as soon as their own check-in completes, but was only ever attached to the
 * response after the FINAL release - so a participant who finished before the
 * other party had no way to see their own private record while the report is
 * still forming. This locks that get() surfaces it in the forming branch too.
 */

function makeParticipant(overrides: Partial<{ id: string; userId: string; partyType: string; soloArtifact: string | null }> = {}) {
  return {
    id: 'p1',
    userId: 'user-1',
    partyType: 'INITIATOR',
    email: 'p1@test.com',
    soloArtifact: null,
    ...overrides,
  };
}

function makeGround(overrides: Partial<{ id: string; organizationId: string; initiatorId: string; participants: any[]; report: any }> = {}) {
  return {
    id: 'g1',
    organizationId: 'org-1',
    initiatorId: 'user-1',
    participants: [
      makeParticipant({ id: 'p1', userId: 'user-1', partyType: 'INITIATOR' }),
      makeParticipant({ id: 'p2', userId: 'user-2', partyType: 'PARTICIPANT' }),
    ],
    report: null,
    ...overrides,
  };
}

function makeUnreleasedReport(groundId = 'g1') {
  return {
    id: 'r1',
    groundId,
    sharedPicture: 'Both accounts described the same goal.',
    agreements: ['Goal agreed'],
    divergences: [],
    centralQuestion: 'What does success look like in six months?',
    releasedAt: null,
    engagement: {},
    createdAt: new Date(),
  };
}

function makeService(groundRow: any) {
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => groundRow), findFirst: jest.fn(async () => groundRow) },
    reportActivation: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
  };
  const email: any = { sendReportReady: jest.fn(async () => undefined) };
  const config: any = { get: () => 'http://localhost:5173' };
  const grounds: any = { getSessionProgress: jest.fn(async () => null) };
  return new ReportsService(prisma, {} as any, {} as any, email, config, { emit: () => Promise.resolve() } as any, grounds);
}

describe('#7 forming report surfaces the requesting participant\'s soloArtifact', () => {
  it('includes soloArtifact for a participant when the report is still forming', async () => {
    const ground = makeGround({
      report: makeUnreleasedReport(),
      participants: [
        makeParticipant({ id: 'p1', userId: 'user-1', partyType: 'INITIATOR' }),
        makeParticipant({ id: 'p2', userId: 'user-2', partyType: 'PARTICIPANT', soloArtifact: JSON.stringify({ summary: 'Your private record shows: you raised scope twice.', whatToCarry: 'Ask about the timeline.' }) }),
      ],
    });
    const service = makeService(ground);
    const result: any = await service.get('g1', 'user-2');
    expect(result.forming).toBe(true);
    expect(result.soloArtifact).toEqual({ summary: 'Your private record shows: you raised scope twice.', whatToCarry: 'Ask about the timeline.' });
  });

  it('returns null soloArtifact for a participant who has not completed a session yet', async () => {
    const ground = makeGround({ report: makeUnreleasedReport() });
    const service = makeService(ground);
    const result: any = await service.get('g1', 'user-2');
    expect(result.forming).toBe(true);
    expect(result.soloArtifact).toBeNull();
  });
});
