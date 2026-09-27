import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GroundScenario, GroundStatus, PartyType } from '@prisma/client';
import { ResolutionService } from './resolution.service';
import { RESOLUTION_ON_THE_GROUND } from '../grounds/grounds.service';
import { whenTheBoardLastChanged } from '../board/when-the-board-last-changed';

/**
 * HOW A CHECK-IN ENDS, AND WHY, AS EACH READER READS IT (U.11, B6 ending-and-probation-review.txt).
 *
 * Decisions rule 6: a person decides, giving a reason, and the person it is about sees the decision
 * with its reasons. The prototype: "Why, in a sentence or two. Kwame reads this with the outcome."
 *
 * Wairimu runs "Kwame, first 90 days". Kwame is in it. Grace is an admin who is not in it. Omar is
 * a member of the organisation who is not in it and is not an admin.
 */
const WAIRIMU = 'u-wairimu';
const KWAME = 'u-kwame';
const GRACE = 'u-grace';
const OMAR = 'u-omar';

const REASON =
  'He brought in 5 new accounts against a goal of 4, and he has raised problems the same day since week 8.';

function world(opts: { closed: boolean; storedReason?: string | null }) {
  const participants = [
    {
      id: 'p-wairimu', userId: WAIRIMU, email: 'wairimu@baridi.test', partyType: PartyType.INITIATOR,
      createdAt: new Date('2026-07-01'), roleAsDescribed: 'Sales lead',
      user: { firstName: 'Wairimu', lastName: 'Kamau', email: 'wairimu@baridi.test' },
    },
    {
      id: 'p-kwame', userId: KWAME, email: 'kwame@baridi.test', partyType: PartyType.PARTICIPANT,
      createdAt: new Date('2026-07-01'), roleAsDescribed: 'Sales representative',
      user: { firstName: 'Kwame', lastName: 'Mensah', email: 'kwame@baridi.test' },
    },
  ];
  const closedAt = opts.closed ? new Date('2026-09-30T10:00:00Z') : null;
  const resolution = {
    id: 'r1', groundId: 'g1', endState: 'KEEP', closedAt,
    reason: opts.storedReason === undefined ? REASON : opts.storedReason,
    confirmations: opts.closed ? [{ participantId: 'p-wairimu', endState: 'KEEP' }] : [],
  };
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g1', organizationId: 'org1', initiatorId: WAIRIMU, scenario: GroundScenario.NEW_HIRE,
        label: 'Kwame, first 90 days', participants,
        status: opts.closed ? GroundStatus.CLOSED : GroundStatus.ACTIVE,
      })),
      update: jest.fn(async () => ({})),
    },
    groundParticipant: {
      findFirst: jest.fn(async ({ where }: any) => {
        const p = participants.find((x) => x.userId === where.userId);
        return p ? { ...p } : null;
      }),
      findMany: jest.fn(async () => participants),
    },
    user: {
      findFirst: jest.fn(async ({ where }: any) => (where.id === GRACE ? { id: GRACE } : null)),
    },
    resolution: {
      findUnique: jest.fn(async () => resolution),
      upsert: jest.fn(async () => ({ id: 'r1', endState: 'KEEP' })),
      update: jest.fn(async () => ({})),
    },
    resolutionConfirmation: {
      deleteMany: jest.fn(async () => ({})),
      upsert: jest.fn(async () => ({})),
      findMany: jest.fn(async () => [{ participantId: 'p-wairimu', endState: 'KEEP' }]),
    },
    $transaction: jest.fn(async () => []),
  };
  const intelligence: any = { recordOutcome: jest.fn(async () => {}) };
  const reports: any = { recordOutcomeLearning: jest.fn(async () => {}) };
  const email: any = { sendGroundClosed: jest.fn(async () => {}), sendResolutionProposal: jest.fn(async () => {}) };
  const config: any = { get: jest.fn(() => 'http://localhost:5173') };
  return { svc: new ResolutionService(prisma, intelligence, reports, email, config), prisma };
}

describe('Wairimu, who runs the check-in, decides how it ends and says why', () => {
  it('cannot end it on an outcome alone, and nothing is written when she tries', async () => {
    const { svc, prisma } = world({ closed: false });
    await expect(svc.propose('g1', WAIRIMU, 'KEEP')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.propose('g1', WAIRIMU, 'KEEP', '   ')).rejects.toThrow(
      'Say why, in a sentence or two. The people in this check-in read it with the outcome.',
    );
    expect(prisma.resolution.upsert).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('ends it with her reason kept beside the outcome', async () => {
    const { svc, prisma } = world({ closed: false });
    await svc.propose('g1', WAIRIMU, 'KEEP', `  ${REASON}  `);
    expect(prisma.resolution.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ endState: 'KEEP', reason: REASON }),
        update: expect.objectContaining({ endState: 'KEEP', reason: REASON }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('reads the outcome and her own reason once it has ended', async () => {
    const { svc } = world({ closed: true });
    const state: any = await svc.get('g1', WAIRIMU);
    expect(state.resolution).toMatchObject({ endState: 'KEEP', reason: REASON });
    expect(state.viewerIsLead).toBe(true);
    expect(state.viewerIsParty).toBe(true);
  });
});

describe('Kwame, the person it is about, reads the decision with its reason', () => {
  it('reads the outcome and Wairimu’s reason, and who decided, once it has ended', async () => {
    const { svc } = world({ closed: true });
    const state: any = await svc.get('g1', KWAME);
    expect(state.resolution).toMatchObject({ endState: 'KEEP', reason: REASON });
    expect(state.viewerIsLead).toBe(false);
    expect(state.viewerIsParty).toBe(true);
    const lead = state.confirmations.find((c: any) => c.partyType === PartyType.INITIATOR);
    expect(lead.label).toBe('Wairimu Kamau');
  });

  it('cannot decide it himself, with or without a reason', async () => {
    const { svc, prisma } = world({ closed: false });
    await expect(svc.propose('g1', KWAME, 'KEEP', 'I think I did well.')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.resolution.upsert).not.toHaveBeenCalled();
  });

  it('reads no reason before the check-in has ended', async () => {
    const { svc } = world({ closed: false, storedReason: 'A draft that was never saved as an ending.' });
    const state: any = await svc.get('g1', KWAME);
    expect(state.resolution.reason).toBeNull();
  });
});

describe('Grace, an admin who is not in the check-in, reads it; nobody else does', () => {
  it('Grace reads the outcome and the reason, and is told she is not in it', async () => {
    const { svc } = world({ closed: true });
    const state: any = await svc.get('g1', GRACE);
    expect(state.resolution).toMatchObject({ endState: 'KEEP', reason: REASON });
    expect(state.viewerIsParty).toBe(false);
    expect(state.viewerIsLead).toBe(false);
  });

  it('Omar, a member who is neither in it nor an admin, is refused', async () => {
    const { svc } = world({ closed: true });
    await expect(svc.get('g1', OMAR)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('the check-in’s own read never carries the reason, so it cannot reach anyone else that way', () => {
    expect(Object.keys(RESOLUTION_ON_THE_GROUND)).not.toContain('reason');
    expect(RESOLUTION_ON_THE_GROUND).toMatchObject({ endState: true, closedAt: true });
  });
});

describe('the board counts a decision as something new coming in', () => {
  it('its "last updated" time moves to the moment the check-in was decided', () => {
    const at = whenTheBoardLastChanged({
      checkIns: [{ completedAt: '2026-09-23T18:00:00Z' }],
      decidedAt: '2026-09-30T10:00:00Z',
    });
    expect(at).toBe('2026-09-30T10:00:00.000Z');
  });
});
