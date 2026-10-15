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
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
    ground: { findUnique: jest.fn(async () => groundRow), findFirst: jest.fn(async () => groundRow) },
    report: { update: jest.fn(async () => ({ releasedAt: new Date() })) },
    reportActivation: { findUnique: jest.fn(async () => activation), findMany: jest.fn(async () => []) },
    checkIn: { findMany: jest.fn(async () => []), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) },
    /* Who has been told the report is ready, once each: nobody yet. */
    reportNotice: { findMany: jest.fn(async () => []), create: jest.fn(async () => ({})), deleteMany: jest.fn(async () => ({})) },
  };
  const email: any = { sendReportReady: jest.fn(async () => undefined) };
  const config: any = { get: () => 'http://localhost:5173' };
  const grounds: any = { getSessionProgress: jest.fn(async () => null) };
  return new ReportsService(prisma, {} as any, {} as any, email, config, { emit: () => Promise.resolve() } as any, grounds, { tell: async () => [] } as any);
}

// ---------------------------------------------------------------------------
// GW-PRI-01: Non-party user cannot read the report
// ---------------------------------------------------------------------------

describe('GW-PRI-01: non-party user is denied the report', () => {
  /* The two tests below said ForbiddenException. A 403 tells a stranger the check-in is real (GW-PRI-04), so the report now answers
     NotFoundException ("That check-in could not be found, so go back to your check-ins and open it from the list.") as every other route does (privacy sweep finding 7). The stranger is still denied. */
  it('throws NotFoundException when userId is not in participants and is not initiator', async () => {
    const ground = makeGround({ report: makeReleasedReport() });
    const service = makeService(ground);
    await expect(service.get('g1', 'user-stranger')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException for a user from a different org who guesses the ground ID', async () => {
    const ground = makeGround({ report: makeReleasedReport(), initiatorId: 'user-1' });
    const service = makeService(ground);
    await expect(service.get('g1', 'user-other-org')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// GW-PRI-02: Pre-release - participant cannot read report before release
// ---------------------------------------------------------------------------

describe('GW-PRI-02: report before release shows the forming picture, not the final one', () => {
  it('tells a participant the picture is not shared yet (not Forbidden), and sends none of it, when releasedAt is null', async () => {
    const unreleasedReport = { ...makeReleasedReport(), releasedAt: null };
    const ground = makeGround({ report: unreleasedReport });
    const service = makeService(ground);
    // user-2 is a valid participant; the report isn't released yet. They are
    // not blocked outright: they are told plainly, and keep their own things.
    // Decision 76, item 4 (2 October 2026): each session's team picture is
    // released on its own, so before release they are sent none of it. This
    // test expected the forming picture, which is the reading the decision ends.
    const result: any = await service.get('g1', 'user-2');
    expect(result).toHaveProperty('forming', true);
    expect(result).not.toHaveProperty('sharedPicture');
    expect(result).not.toHaveProperty('agreements');
    expect(result).not.toHaveProperty('divergences');
    expect(result.saying).toBe("The team's picture of session 1 is not shared yet.");
  });

  it('returns the SAME forming picture to the initiator before release (symmetric with the participant above)', async () => {
    // Was: a locked stub with no content for the initiator. That asymmetry
    // had no privacy rationale - the mutual-reveal gate that protects the
    // FINAL simultaneous reveal is a post-release, participant-side gate;
    // a still-forming picture is already openly incomplete for everyone,
    // initiator included (see the comment in reports.service.ts get()).
    const unreleasedReport = { ...makeReleasedReport(), releasedAt: null };
    const ground = makeGround({ report: unreleasedReport });
    const service = makeService(ground);
    const result = await service.get('g1', 'user-1');
    expect(result).toHaveProperty('forming', true);
    expect(result).toHaveProperty('sharedPicture');
    expect(result).toHaveProperty('nextStep', 'release');
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
    const service = new ReportsService(prisma, {} as any, {} as any, {} as any, config, { emit: () => Promise.resolve() } as any, { getSessionProgress: jest.fn(async () => null) } as any, { tell: async () => [] } as any);
    await expect(service.get('g1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

/**
 * GW-PRI-04, ON THE TWO ENDPOINTS THAT WERE ADDED AFTER IT.
 *
 * `rounds()` and `sessionReport()` both answered a stranger with ForbiddenException, which says
 * "this check-in exists, it is just not yours" - the exact distinction the rule above exists to
 * remove. `rounds` has had it since it was written; `sessionReport` was written with it today.
 */
describe('GW-PRI-04: the newer report endpoints do not leak existence either', () => {
  const strangerSees404 = async (call: (s: any) => Promise<unknown>) => {
    const prisma: any = {
      ground: {
        findUnique: jest.fn(async () => ({
          organizationId: 'org-A',
          initiatorId: 'somebody-else',
          participants: [{ id: 'p1', userId: 'not-them' }],
          report: { releasedAt: new Date() },
        })),
      },
    };
    const config: any = { get: () => 'http://localhost:5173' };
    const service = new ReportsService(prisma, {} as any, {} as any, {} as any, config, { emit: () => Promise.resolve() } as any, { getSessionProgress: jest.fn(async () => null) } as any, { tell: async () => [] } as any);
    await expect(call(service)).rejects.toBeInstanceOf(NotFoundException);
  };

  it('rounds() answers a stranger with NotFound', async () => {
    await strangerSees404((s) => s.rounds('g1', 'a-stranger', 'org-B'));
  });

  it('sessionReport() answers a stranger with NotFound', async () => {
    await strangerSees404((s) => s.sessionReport('g1', 1, 'a-stranger', 'org-B'));
  });
});

// ---------------------------------------------------------------------------
// GW-PRI-05: Release org-scoping - admin of org B cannot release org A's report
// ---------------------------------------------------------------------------

describe('GW-PRI-05: release() is scoped to the requesting org', () => {
  it('throws NotFoundException when org does not match ground owner', async () => {
    const ground = makeGround({ organizationId: 'org-A', report: makeReleasedReport() });
    const prisma: any = {
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
      ground: {
        findFirst: jest.fn(async (args: any) =>
          args.where.organizationId === 'org-A' ? ground : null,
        ),
      },
    };
    const email: any = { sendReportReady: jest.fn(async () => undefined) };
    const config: any = { get: () => 'http://localhost:5173' };
    const service = new ReportsService(prisma, {} as any, {} as any, email, config, { emit: () => Promise.resolve() } as any, { getSessionProgress: jest.fn(async () => null) } as any, { tell: async () => [] } as any);
    await expect(service.release('g1', 'org-B')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('release() succeeds and notifies all participants when org matches', async () => {
    const ground = makeGround({
      organizationId: 'org-A',
      report: { ...makeReleasedReport(), releasedAt: null },
    });
    const prisma: any = {
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
      ground: {
        findFirst: jest.fn(async (args: any) =>
          args.where.organizationId === 'org-A' ? ground : null,
        ),
        /* The notifier reads the ground again by id, with everyone's address on it. */
        findUnique: jest.fn(async () => ground),
      },
      report: { update: jest.fn(async () => ({ releasedAt: new Date() })) },
      checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) },
      reportNotice: { findMany: jest.fn(async () => []), create: jest.fn(async () => ({})), deleteMany: jest.fn(async () => ({})) },
    };
    const email: any = { sendReportReady: jest.fn(async () => undefined) };
    const config: any = { get: () => 'http://localhost:5173' };
    const service = new ReportsService(prisma, {} as any, {} as any, email, config, { emit: () => Promise.resolve() } as any, { getSessionProgress: jest.fn(async () => null) } as any, { tell: async () => [] } as any);
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
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
      ground: { findUnique: jest.fn(async () => ground) },
      reportActivation: { findUnique: jest.fn(async () => activated) },
      checkIn: { findMany: jest.fn(async () => []) },
    };
    const config: any = { get: () => 'http://localhost:5173' };
    const service = new ReportsService(prisma, {} as any, {} as any, {} as any, config, { emit: () => Promise.resolve() } as any, { getSessionProgress: jest.fn(async () => null) } as any, { tell: async () => [] } as any);

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
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
      ground: { findUnique: jest.fn(async () => ground) },
      reportActivation: { findUnique: jest.fn(async () => activated) },
      checkIn: { findMany: jest.fn(async () => []) },
    };
    const config: any = { get: () => 'http://localhost:5173' };
    const service = new ReportsService(prisma, {} as any, {} as any, {} as any, config, { emit: () => Promise.resolve() } as any, { getSessionProgress: jest.fn(async () => null) } as any, { tell: async () => [] } as any);

    const resultForP2 = await service.get('g1', 'user-2') as any;
    // p2 has no soloArtifact - result must be null, not p1's artifact
    expect(resultForP2.soloArtifact).toBeNull();
  });
});
