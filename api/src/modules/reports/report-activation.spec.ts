/*
 * FIXTURE NOTE. This said "Both parties value clarity." and went red when the reader boundary
 * started rewriting "parties" - a rule the prompt had asked for since August and never got.
 * These tests are about the activation gate, not about wording, so the fixture moved rather
 * than the expectation: a gate test that also pins vocabulary breaks every time the copy does.
 */
import { ReportsService } from './reports.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReportActivationStatus } from '@prisma/client';

/**
 * GW-PRI-ACT - ReportActivation invariants.
 *
 * After an admin releases a report, each participant must individually
 * activate before the full content is returned to THEM. The gate is
 * per-party, not mutual: get() only ever checks the calling participant's
 * own ReportActivation row (reports.service.ts get()) - one party activating
 * has no effect on what any other party sees. There is no "wait for the
 * other side" behavior here; each person's activation is purely their own
 * "I'm ready to see it" confirmation. The admin/initiator is exempt and
 * always sees full content once released - they are the one who released it.
 */

const MOCK_USAGE = { emit: () => Promise.resolve() } as any;

function makeService(prismaOverrides: any) {
  const base: any = {
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
    ground: { findUnique: jest.fn(), findFirst: jest.fn() },
    report: { update: jest.fn(), upsert: jest.fn() },
    reportActivation: { findUnique: jest.fn(), upsert: jest.fn(), findMany: jest.fn() },
    groundParticipant: { findFirst: jest.fn() },
    checkIn: { findMany: jest.fn(async () => []) },
  };
  const prisma = { ...base, ...prismaOverrides };
  /**
   * `grounds` is the 7th constructor argument and was `{}` here. It is stubbed now because the released
   * report names anyone who declined the round, which reads `getSessionProgress`. Returning null is the
   * honest default for these fixtures: no round in progress, so nobody declined.
   */
  return new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, MOCK_USAGE, { getSessionProgress: jest.fn(async () => null) } as any, { tell: async () => [] } as any);
}

const releasedReport = {
  id: 'r1',
  groundId: 'g1',
  createdAt: new Date(),
  releasedAt: new Date(),
  sharedPicture: 'You both value clarity.',
  engagement: {},
};

const unreleased = { ...releasedReport, releasedAt: null };

/**
 * GW-PRI-ACT-01, INVERTED. THERE IS NO REVEAL.
 *
 * This pinned the opposite: a released report withheld from every participant until they pressed
 * a button. It was removed, and this is now the guard that it stays removed.
 *
 * Two reasons, both walked on a real check-in. It protected nothing - `sessionReport`, the read
 * the report page actually makes, walls on `released || viewerIsLead` and had never heard of
 * activation, so the same person blocked here was handed the whole thing, every party's own words
 * included, one request later. And the stub it returned had no content, so the card that renders
 * it printed "Not enough has been said yet to draw one. Too little to say. 0 areas settled." to
 * somebody whose session had produced a full three-party synthesis.
 *
 * "Report updates as people check in, that's all it is."
 *
 * The independence that matters is protected where it lives: nobody reads a forming picture before
 * giving their own account. That is a test about having ANSWERED, in forming-report-symmetry.spec,
 * and it is untouched.
 */
describe('GW-PRI-ACT-01 - a released report reaches a participant with nothing to press', () => {
  const groundWith = (activationRow: any) => ({
    id: 'g1',
    initiatorId: 'admin',
    participants: [{ id: 'p1', userId: 'u1', soloArtifact: null }],
    report: releasedReport,
    _row: activationRow,
  });

  const prismaFor = (activationRow: any) => ({
    groundDocument: { findMany: jest.fn(async () => []) },
    ground: { findUnique: jest.fn(async () => groundWith(activationRow)) },
    reportActivation: {
      findUnique: jest.fn(async () => activationRow),
      findMany: jest.fn(async () => []),
    },
  }) as any;

  it('shows the report to somebody whose activation row is PENDING', async () => {
    const result = await makeService(prismaFor({ status: ReportActivationStatus.PENDING })).get('g1', 'u1') as any;
    expect(result.activated).toBe(true);
    expect(result.sharedPicture).toBeTruthy();
  });

  it('and to somebody who has no activation row at all', async () => {
    const result = await makeService(prismaFor(null)).get('g1', 'u1') as any;
    expect(result.activated).toBe(true);
    expect(result.sharedPicture).toBeTruthy();
  });

  it('and never answers with the empty stub that read as an empty report', async () => {
    const result = await makeService(prismaFor(null)).get('g1', 'u1') as any;
    expect(result.waitingToShow).toBeUndefined();
    expect(result.everyoneWasTold).toBeUndefined();
  });
});

// GW-PRI-ACT-02: initiator sees full content without activating
describe('GW-PRI-ACT-02 - initiator bypasses activation gate', () => {
  it('returns full report to initiator once released', async () => {
    const ground = {
      id: 'g1',
      initiatorId: 'admin',
      participants: [],
      report: releasedReport,
    };
    const prisma: any = {
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
      ground: { findUnique: jest.fn(async () => ground) },
      reportActivation: { findUnique: jest.fn() },
    };
    const service = makeService(prisma);
    const result = await service.get('g1', 'admin') as any;
    expect(result.sharedPicture).toBe('You both value clarity.');
    // Activation lookup should not be called for initiator
    expect(prisma.reportActivation.findUnique).not.toHaveBeenCalled();
  });
});

// GW-PRI-ACT-03: get() returns full content after activation
describe('GW-PRI-ACT-03 - get() returns full content after ACTIVATED', () => {
  it('returns report content when activation is ACTIVATED', async () => {
    const ground = {
      id: 'g1',
      initiatorId: 'admin',
      participants: [{ id: 'p1', userId: 'u1', soloArtifact: null }],
      report: releasedReport,
    };
    const prisma: any = {
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
      ground: { findUnique: jest.fn(async () => ground) },
      reportActivation: {
        findUnique: jest.fn(async () => ({ status: ReportActivationStatus.ACTIVATED })),
      },
    };
    const service = makeService(prisma);
    const result = await service.get('g1', 'u1') as any;
    expect(result.activated).toBe(true);
    expect(result.sharedPicture).toBe('You both value clarity.');
  });
});

// GW-PRI-ACT-04: activate() rejected before report is released
describe('GW-PRI-ACT-04 - activate() blocked before release', () => {
  it('throws ForbiddenException when report is not released', async () => {
    const ground = {
      id: 'g1',
      initiatorId: 'admin',
      participants: [{ id: 'p1', userId: 'u1' }],
      report: unreleased,
    };
    const prisma: any = {
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
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
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
      ground: { findUnique: jest.fn(async () => ground) },
    };
    const service = makeService(prisma);
    await expect(service.activate('g1', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

// GW-PRI-ACT-05: activate() upserts ACTIVATED row
describe('GW-PRI-ACT-05 - activate() writes activation row', () => {
  it('upserts an ACTIVATED row with activatedAt timestamp', async () => {
    const ground = {
      id: 'g1',
      initiatorId: 'admin',
      participants: [{ id: 'p1', userId: 'u1' }],
      report: releasedReport,
    };
    const upserted: any[] = [];
    const prisma: any = {
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
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
describe('GW-PRI-ACT-06 - getActivationStatus.allActivated', () => {
  it('is false when only one party has activated', async () => {
    const prisma: any = {
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
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
    /* The documents a report says it rests on. Stubbed because the report read asks for them now —
       see what-this-record-rests-on.ts; a report that cannot say what it rests on is the fault
       that list exists to stop. */
    groundDocument: { findMany: jest.fn(async () => []) },
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
