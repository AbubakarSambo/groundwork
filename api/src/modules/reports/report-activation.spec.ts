import { ReportsService } from './reports.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReportActivationStatus } from '@prisma/client';

/**
 * GW-PRI-ACT — ReportActivation (mutual reveal gate) invariants.
 *
 * After an admin releases a report, each participant must individually
 * activate before the full content is returned. The admin/initiator always
 * sees full content once released. Neither party can see content before
 * the other has also activated — the gate is per-party, not shared.
 */

const MOCK_USAGE = { emit: () => Promise.resolve() } as any;

function makeService(prismaOverrides: any) {
  const base: any = {
    ground: { findUnique: jest.fn(), findFirst: jest.fn() },
    report: { update: jest.fn(), upsert: jest.fn() },
    reportActivation: { findUnique: jest.fn(), upsert: jest.fn(), findMany: jest.fn() },
    groundParticipant: { findFirst: jest.fn() },
  };
  const prisma = { ...base, ...prismaOverrides };
  return new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, MOCK_USAGE);
}

const releasedReport = {
  id: 'r1',
  groundId: 'g1',
  createdAt: new Date(),
  releasedAt: new Date(),
  sharedPicture: 'Both parties value clarity.',
  engagement: {},
};

const unreleased = { ...releasedReport, releasedAt: null };

// GW-PRI-ACT-01: get() returns pre-activation stub when not yet activated
describe('GW-PRI-ACT-01 — get() returns stub before participant activates', () => {
  it('returns activated:false stub when activation row is PENDING', async () => {
    const ground = {
      id: 'g1',
      initiatorId: 'admin',
      participants: [{ id: 'p1', userId: 'u1', soloArtifact: null }],
      report: releasedReport,
    };
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ground) },
      reportActivation: {
        findUnique: jest.fn(async () => ({ status: ReportActivationStatus.PENDING })),
      },
    };
    const service = makeService(prisma);
    const result = await service.get('g1', 'u1') as any;
    expect(result.activated).toBe(false);
    expect(result.sharedPicture).toBeUndefined();
  });

  it('returns activated:false stub when no activation row exists', async () => {
    const ground = {
      id: 'g1',
      initiatorId: 'admin',
      participants: [{ id: 'p1', userId: 'u1', soloArtifact: null }],
      report: releasedReport,
    };
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ground) },
      reportActivation: { findUnique: jest.fn(async () => null) },
    };
    const service = makeService(prisma);
    const result = await service.get('g1', 'u1') as any;
    expect(result.activated).toBe(false);
    expect(result.sharedPicture).toBeUndefined();
  });
});

// GW-PRI-ACT-02: initiator sees full content without activating
describe('GW-PRI-ACT-02 — initiator bypasses activation gate', () => {
  it('returns full report to initiator once released', async () => {
    const ground = {
      id: 'g1',
      initiatorId: 'admin',
      participants: [],
      report: releasedReport,
    };
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ground) },
      reportActivation: { findUnique: jest.fn() },
    };
    const service = makeService(prisma);
    const result = await service.get('g1', 'admin') as any;
    expect(result.sharedPicture).toBe('Both parties value clarity.');
    // Activation lookup should not be called for initiator
    expect(prisma.reportActivation.findUnique).not.toHaveBeenCalled();
  });
});

// GW-PRI-ACT-03: get() returns full content after activation
describe('GW-PRI-ACT-03 — get() returns full content after ACTIVATED', () => {
  it('returns report content when activation is ACTIVATED', async () => {
    const ground = {
      id: 'g1',
      initiatorId: 'admin',
      participants: [{ id: 'p1', userId: 'u1', soloArtifact: null }],
      report: releasedReport,
    };
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ground) },
      reportActivation: {
        findUnique: jest.fn(async () => ({ status: ReportActivationStatus.ACTIVATED })),
      },
    };
    const service = makeService(prisma);
    const result = await service.get('g1', 'u1') as any;
    expect(result.activated).toBe(true);
    expect(result.sharedPicture).toBe('Both parties value clarity.');
  });
});

// GW-PRI-ACT-04: activate() rejected before report is released
describe('GW-PRI-ACT-04 — activate() blocked before release', () => {
  it('throws ForbiddenException when report is not released', async () => {
    const ground = {
      id: 'g1',
      initiatorId: 'admin',
      participants: [{ id: 'p1', userId: 'u1' }],
      report: unreleased,
    };
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ground) },
    };
    const service = makeService(prisma);
    await expect(service.activate('g1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException when caller is not a participant', async () => {
    const ground = {
      id: 'g1',
      initiatorId: 'admin',
      participants: [{ id: 'p1', userId: 'u1' }],
      report: releasedReport,
    };
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ground) },
    };
    const service = makeService(prisma);
    await expect(service.activate('g1', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

// GW-PRI-ACT-05: activate() upserts ACTIVATED row
describe('GW-PRI-ACT-05 — activate() writes activation row', () => {
  it('upserts an ACTIVATED row with activatedAt timestamp', async () => {
    const ground = {
      id: 'g1',
      initiatorId: 'admin',
      participants: [{ id: 'p1', userId: 'u1' }],
      report: releasedReport,
    };
    const upserted: any[] = [];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ground) },
      reportActivation: {
        upsert: jest.fn(async (args: any) => { upserted.push(args); return {}; }),
        findMany: jest.fn(async () => [{ participantId: 'p1', status: ReportActivationStatus.ACTIVATED }]),
      },
    };
    const service = makeService(prisma);
    const result = await service.activate('g1', 'u1') as any;

    expect(upserted).toHaveLength(1);
    expect(upserted[0].create.status).toBe(ReportActivationStatus.ACTIVATED);
    expect(upserted[0].create.activatedAt).toBeInstanceOf(Date);
    expect(result.parties[0].activated).toBe(true);
  });
});

// GW-PRI-ACT-06: getActivationStatus allActivated flag
describe('GW-PRI-ACT-06 — getActivationStatus.allActivated', () => {
  it('is false when only one party has activated', async () => {
    const prisma: any = {
      reportActivation: {
        findMany: jest.fn(async () => [
          { participantId: 'p1', status: ReportActivationStatus.ACTIVATED },
          { participantId: 'p2', status: ReportActivationStatus.PENDING },
        ]),
      },
    };
    const service = makeService(prisma);
    const result = await service.getActivationStatus('g1', ['p1', 'p2']);
    expect(result.allActivated).toBe(false);
    expect(result.parties.find(p => p.participantId === 'p1')?.activated).toBe(true);
    expect(result.parties.find(p => p.participantId === 'p2')?.activated).toBe(false);
  });

  it('is true when all parties have activated', async () => {
    const prisma: any = {
      reportActivation: {
        findMany: jest.fn(async () => [
          { participantId: 'p1', status: ReportActivationStatus.ACTIVATED },
          { participantId: 'p2', status: ReportActivationStatus.ACTIVATED },
        ]),
      },
    };
    const service = makeService(prisma);
    const result = await service.getActivationStatus('g1', ['p1', 'p2']);
    expect(result.allActivated).toBe(true);
  });
});
