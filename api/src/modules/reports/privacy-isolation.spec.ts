import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';

/**
 * Privacy isolation test suite (GW-PRI).
 *
 * Spec release gate: cross-party reads must provably fail. These tests assert
 * that a user who is not a party to a ground cannot read the report, and that
 * data from one party is never exposed via the other party's view.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function makeReleasedReport(groundId = 'g1') {
  return {
    id: 'r1',
    groundId,
    sharedPicture: 'Both accounts described the same goal.',
    agreements: ['Goal agreed'],
    divergences: [],
    centralQuestion: 'What does success look like in six months?',
    releasedAt: new Date(),
    engagement: {},
    createdAt: new Date(),
  };
}

function makeService(groundRow: any, activationStatus: 'ACTIVATED' | 'PENDING' | null = 'ACTIVATED') {
  const activation = activationStatus ? { status: activationStatus } : null;
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => groundRow), findFirst: jest.fn(async () => groundRow) },
    report: { update: jest.fn(async () => ({ releasedAt: new Date() })) },
    reportActivation: { findUnique: jest.fn(async () => activation), findMany: jest.fn(async () => []) },
  };
  const email: any = { sendReportReady: jest.fn(async () => undefined) };
  const config: any = { get: () => 'http://localhost:5173' };
  return new ReportsService(prisma, {} as any, {} as any, email, config, { emit: () => Promise.resolve() } as any);
}

// ---------------------------------------------------------------------------
// GW-PRI-01: Non-party user cannot read the report
// ---------------------------------------------------------------------------

describe('GW-PRI-01: non-party user is denied the report', () => {
  it('throws ForbiddenException when userId is not in participants and is not initiator', async () => {
    const ground = makeGround({ report: makeReleasedReport() });
    const service = makeService(ground);
    await expect(service.get('g1', 'user-stranger')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException for a user from a different org who guesses the ground ID', async () => {
    const ground = makeGround({ report: makeReleasedReport(), initiatorId: 'user-1' });
    const service = makeService(ground);
    await expect(service.get('g1', 'user-other-org')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

// ---------------------------------------------------------------------------
// GW-PRI-02: Pre-release - participant cannot read report before release
// ---------------------------------------------------------------------------

describe('GW-PRI-02: report is not readable before releasedAt is set', () => {
  it('throws ForbiddenException for a participant when releasedAt is null', async () => {
    const unreleasedReport = { ...makeReleasedReport(), releasedAt: null };
    const ground = makeGround({ report: unreleasedReport });
    const service = makeService(ground);
    // user-2 is a valid participant but report not yet released
    await expect(service.get('g1', 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns a locked stub (no content) for the initiator before release', async () => {
    const unreleasedReport = { ...makeReleasedReport(), releasedAt: null };
    const ground = makeGround({ report: unreleasedReport });
    const service = makeService(ground);
    const result = await service.get('g1', 'user-1');
    // Stub must not contain the shared picture or agreements
    expect(result).not.toHaveProperty('sharedPicture');
    expect(result).not.toHaveProperty('agreements');
    expect(result).toHaveProperty('releasedAt', null);
  });
});

// ---------------------------------------------------------------------------
// GW-PRI-03: Post-release - both parties can read
// ---------------------------------------------------------------------------

describe('GW-PRI-03: both parties can read the report after release', () => {
  it('returns the full report to the initiator after release', async () => {
    const ground = makeGround({ report: makeReleasedReport() });
    const service = makeService(ground);
    const result = await service.get('g1', 'user-1');
    expect(result).toHaveProperty('sharedPicture');
    expect(result).toHaveProperty('agreements');
  });

  it('returns the full report to the participant after release', async () => {
    const ground = makeGround({ report: makeReleasedReport() });
    const service = makeService(ground);
    const result = await service.get('g1', 'user-2');
    expect(result).toHaveProperty('sharedPicture');
    expect(result).toHaveProperty('centralQuestion');
  });
});

// ---------------------------------------------------------------------------
// GW-PRI-04: Report not found yields NotFoundException, not a 403 that leaks existence
// ---------------------------------------------------------------------------

describe('GW-PRI-04: missing report does not leak ground existence', () => {
  it('throws NotFoundException when there is no report on the ground', async () => {
    const ground = makeGround({ report: null });
    const service = makeService(ground);
    await expect(service.get('g1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when the ground itself does not exist', async () => {
    const prisma: any = { ground: { findUnique: jest.fn(async () => null) } };
    const config: any = { get: () => 'http://localhost:5173' };
    const service = new ReportsService(prisma, {} as any, {} as any, {} as any, config, { emit: () => Promise.resolve() } as any);
    await expect(service.get('g1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// GW-PRI-05: Release org-scoping - admin of org B cannot release org A's report
// ---------------------------------------------------------------------------

describe('GW-PRI-05: release() is scoped to the requesting org', () => {
  it('throws NotFoundException when org does not match ground owner', async () => {
    const ground = makeGround({ organizationId: 'org-A', report: makeReleasedReport() });
    const prisma: any = {
      ground: {
        findFirst: jest.fn(async (args: any) =>
          args.where.organizationId === 'org-A' ? ground : null,
        ),
      },
    };
    const email: any = { sendReportReady: jest.fn(async () => undefined) };
    const config: any = { get: () => 'http://localhost:5173' };
    const service = new ReportsService(prisma, {} as any, {} as any, email, config, { emit: () => Promise.resolve() } as any);
    await expect(service.release('g1', 'org-B')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('release() succeeds and notifies all participants when org matches', async () => {
    const ground = makeGround({
      organizationId: 'org-A',
      report: { ...makeReleasedReport(), releasedAt: null },
    });
    const prisma: any = {
      ground: {
        findFirst: jest.fn(async (args: any) =>
          args.where.organizationId === 'org-A' ? ground : null,
        ),
      },
      report: { update: jest.fn(async () => ({ releasedAt: new Date() })) },
    };
    const email: any = { sendReportReady: jest.fn(async () => undefined) };
    const config: any = { get: () => 'http://localhost:5173' };
    const service = new ReportsService(prisma, {} as any, {} as any, email, config, { emit: () => Promise.resolve() } as any);
    await service.release('g1', 'org-A');
    expect(email.sendReportReady).toHaveBeenCalledTimes(ground.participants.length);
  });
});

// ---------------------------------------------------------------------------
// GW-PRI-06: Solo artifact is party-scoped
// ---------------------------------------------------------------------------

describe('GW-PRI-06: post-report guide and solo artifact are scoped to each party', () => {
  it('returns postReportGuide only for the requesting participant, not for another', async () => {
    const p1Guide = { openingLine: 'I wanted to start by...', questionToCarry: 'What does success look like?', toAcknowledge: 'Your concerns about timeline' };
    const p2Guide = { openingLine: 'My first question is...', questionToCarry: 'What is your biggest constraint?', toAcknowledge: 'Your concern about scope' };
    const report = {
      ...makeReleasedReport(),
      engagement: { postReportGuides: { p1: p1Guide, p2: p2Guide } },
    };
    const ground = makeGround({ report });

    const activated = { status: 'ACTIVATED' };
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ground) },
      reportActivation: { findUnique: jest.fn(async () => activated) },
    };
    const config: any = { get: () => 'http://localhost:5173' };
    const service = new ReportsService(prisma, {} as any, {} as any, {} as any, config, { emit: () => Promise.resolve() } as any);

    const resultForP1 = await service.get('g1', 'user-1') as any;
    const resultForP2 = await service.get('g1', 'user-2') as any;

    // Each party gets their own guide
    expect(resultForP1.postReportGuide).toEqual(p1Guide);
    expect(resultForP2.postReportGuide).toEqual(p2Guide);

    // Guides must differ - a party must not receive the other's guide
    expect(resultForP1.postReportGuide).not.toEqual(resultForP2.postReportGuide);
  });

  it('does not expose one party\'s soloArtifact to the other party', async () => {
    const p1Artifact = JSON.stringify({ summary: 'Your private record shows: you contributed X.', whatToCarry: 'Bring the timeline data.' });
    const report = makeReleasedReport();
    const ground = {
      ...makeGround({ report }),
      participants: [
        makeParticipant({ id: 'p1', userId: 'user-1', partyType: 'INITIATOR', soloArtifact: p1Artifact }),
        makeParticipant({ id: 'p2', userId: 'user-2', partyType: 'PARTICIPANT', soloArtifact: null }),
      ],
    };

    const activated = { status: 'ACTIVATED' };
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ground) },
      reportActivation: { findUnique: jest.fn(async () => activated) },
    };
    const config: any = { get: () => 'http://localhost:5173' };
    const service = new ReportsService(prisma, {} as any, {} as any, {} as any, config, { emit: () => Promise.resolve() } as any);

    const resultForP2 = await service.get('g1', 'user-2') as any;
    // p2 has no soloArtifact - result must be null, not p1's artifact
    expect(resultForP2.soloArtifact).toBeNull();
  });
});
