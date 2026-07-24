import { ConversationService } from './conversation.service';
import { Cadence, CheckInStatus, PartyType } from '@prisma/client';

/**
 * Item 3: ONE_TIME is a real cadence now, not a client-side FORTNIGHTLY
 * substitution. ensureNextSession() (called right after every check-in
 * completes) must early-return for ONE_TIME so session 2 is NEVER created -
 * not "not yet scheduled" like SEQUENTIAL, but genuinely never, for good.
 * A recurring cadence (FORTNIGHTLY here) is the control case, confirming the
 * guard doesn't accidentally suppress normal scheduling.
 */

function makeService(groundRow: any) {
  const checkInCreateCalls: any[] = [];
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => groundRow) },
    checkIn: {
      findUnique: jest.fn(async () => null), // no existing next session
      create: jest.fn(async (args: any) => { checkInCreateCalls.push(args); return { id: 'new-ci', ...args.data }; }),
      findFirst: jest.fn(async () => null),
    },
    groundParticipant: { findUnique: jest.fn(async () => ({ partyType: PartyType.INITIATOR })), findMany: jest.fn(async () => []) },
  };
  const service = new ConversationService(
    prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any, {} as any, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any,
  );
  return { service, prisma, checkInCreateCalls };
}

describe('ONE_TIME cadence: no session 2, ever', () => {
  it('never creates a session 2 checkIn row for a ONE_TIME ground', async () => {
    const { service, checkInCreateCalls } = makeService({ cadence: Cadence.ONE_TIME, cadenceAnchorDay: null, endsAt: null });
    await (service as any).ensureNextSession('g1', 'p1', 1);
    expect(checkInCreateCalls).toHaveLength(0);
  });

  it('does not even query for an existing next session (early return before any further work)', async () => {
    const { service, prisma } = makeService({ cadence: Cadence.ONE_TIME, cadenceAnchorDay: null, endsAt: null });
    await (service as any).ensureNextSession('g1', 'p1', 1);
    expect(prisma.checkIn.findUnique).not.toHaveBeenCalled();
  });

  it('control: a recurring cadence (FORTNIGHTLY) still creates session 2 normally', async () => {
    const { service, checkInCreateCalls } = makeService({ cadence: Cadence.FORTNIGHTLY, cadenceAnchorDay: null, endsAt: null });
    await (service as any).ensureNextSession('g1', 'p1', 1);
    expect(checkInCreateCalls).toHaveLength(1);
    expect(checkInCreateCalls[0].data.sessionNumber).toBe(2);
  });
});
