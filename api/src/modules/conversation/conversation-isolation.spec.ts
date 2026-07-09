import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversationService } from './conversation.service';

/**
 * Conversation isolation test suite (GW-PRI-CONV).
 *
 * The core invariant: a party's check-in conversation is their private record.
 * No other user - including the other party on the same ground, a team member,
 * or a platform admin - may read or continue a check-in they do not own.
 */

// ---------------------------------------------------------------------------
// Minimal ConversationService constructor shim
// ---------------------------------------------------------------------------

function makeService(checkInRow: any) {
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async () => checkInRow),
    },
    conversationTurn: {
      findMany: jest.fn(async () => []),
    },
    groundParticipant: {
      findUnique: jest.fn(async () => checkInRow?.participant ?? null),
    },
  };

  return new ConversationService(
    prisma,
    {} as any, // PromptsService
    {} as any, // AnthropicService
    {} as any, // ConversationContextService
    {} as any, // EventEmitter2
    {} as any, // DocumentsService
    {} as any, // BillingService
    { sendParticipantBlockedNudge: () => Promise.resolve() } as any, // EmailService
    { emit: () => Promise.resolve() } as any, // UsageService
    { get: () => '' } as any, // ConfigService
  );
}

// A check-in owned by user-1 (participant p1)
const OWNED_CHECK_IN = {
  id: 'ci1',
  participantId: 'p1',
  groundId: 'g1',
  sessionNumber: 1,
  status: 'IN_PROGRESS',
  participant: {
    id: 'p1',
    userId: 'user-1',
    groundId: 'g1',
    partyType: 'INITIATOR',
  },
};

// ---------------------------------------------------------------------------
// GW-PRI-CONV-01: Only the owning user may load a check-in
// ---------------------------------------------------------------------------

describe('GW-PRI-CONV-01: loadOwnedCheckIn - owning user', () => {
  it('returns the check-in when userId matches the participant owner', async () => {
    const service = makeService(OWNED_CHECK_IN);
    // getSoloArtifact calls loadOwnedCheckIn and then prisma.groundParticipant.findUnique
    // We can exercise the ownership guard through getSoloArtifact
    const prisma: any = (service as any).prisma;
    prisma.groundParticipant.findUnique = jest.fn(async () => ({ soloArtifact: null }));
    const result = await service.getSoloArtifact('ci1', 'user-1');
    expect(result).toEqual({ artifact: null });
  });

  it('throws ForbiddenException when userId does not match participant owner', async () => {
    const service = makeService(OWNED_CHECK_IN);
    await expect(service.getSoloArtifact('ci1', 'user-stranger')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException for the other party on the same ground (user-2)', async () => {
    const service = makeService(OWNED_CHECK_IN);
    // user-2 is the other participant - they must not read user-1's check-in
    await expect(service.getSoloArtifact('ci1', 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException when the check-in does not exist', async () => {
    const service = makeService(null);
    await expect(service.getSoloArtifact('ci-nonexistent', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// GW-PRI-CONV-02: decline() is party-scoped
// ---------------------------------------------------------------------------

describe('GW-PRI-CONV-02: decline() - party scoping', () => {
  it('throws ForbiddenException when a non-owner tries to decline', async () => {
    const service = makeService(OWNED_CHECK_IN);
    await expect(service.decline('ci1', 'user-stranger')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException when the other party on the ground tries to decline', async () => {
    const service = makeService(OWNED_CHECK_IN);
    await expect(service.decline('ci1', 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows the owning user to decline', async () => {
    const checkIn = { ...OWNED_CHECK_IN, status: 'IN_PROGRESS' };
    const service = makeService(checkIn);
    const prisma: any = (service as any).prisma;
    prisma.checkIn.update = jest.fn(async () => ({}));
    const result = await service.decline('ci1', 'user-1');
    expect(result).toEqual({ status: 'declined' });
    expect(prisma.checkIn.update).toHaveBeenCalledWith({
      where: { id: 'ci1' },
      data: { status: 'DECLINED' },
    });
  });

  it('throws BadRequestException when the owning user tries to decline a completed check-in', async () => {
    const { BadRequestException } = require('@nestjs/common');
    const checkIn = { ...OWNED_CHECK_IN, status: 'COMPLETED' };
    const service = makeService(checkIn);
    await expect(service.decline('ci1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// GW-PRI-CONV-03: getSoloArtifact returns only this party's artifact
// ---------------------------------------------------------------------------

describe('GW-PRI-CONV-03: getSoloArtifact - owner-scoped content', () => {
  it('returns null when the participant has no stored artifact', async () => {
    const service = makeService(OWNED_CHECK_IN);
    const prisma: any = (service as any).prisma;
    prisma.groundParticipant.findUnique = jest.fn(async () => ({ soloArtifact: null }));
    const result = await service.getSoloArtifact('ci1', 'user-1');
    expect(result).toEqual({ artifact: null });
  });

  it('returns the parsed artifact when one exists', async () => {
    const artifact = { summary: 'Your private record shows: you described clear commitment.', whatToCarry: 'Bring the timeline concern.' };
    const service = makeService(OWNED_CHECK_IN);
    const prisma: any = (service as any).prisma;
    prisma.groundParticipant.findUnique = jest.fn(async () => ({
      soloArtifact: JSON.stringify(artifact),
      soloArtifactAt: new Date(),
    }));
    const result = await service.getSoloArtifact('ci1', 'user-1');
    expect(result.artifact).toEqual(artifact);
  });

  it('a different participant\'s artifact is never returned - their check-in is blocked at the ownership gate', async () => {
    // user-2 has their own check-in ci2 - trying to read ci1 (owned by user-1) must throw
    const service = makeService(OWNED_CHECK_IN);
    await expect(service.getSoloArtifact('ci1', 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
