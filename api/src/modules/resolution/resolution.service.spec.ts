import { ResolutionService } from './resolution.service';
import { GroundStatus, GroundScenario } from '@prisma/client';

/**
 * GW-16: when a party re-proposes with a DIFFERENT end state, all other
 * parties' confirmations must be cleared so they cannot silently confirm a
 * proposal they never saw.
 */
describe('ResolutionService.propose - GW-16 confirmation reset on re-propose', () => {
  const GROUND_ID = 'g1';
  const PARTICIPANT_ID = 'p1';
  const OTHER_ID = 'p2';
  const RESOLUTION_ID = 'r1';
  const USER_ID = 'u1';

  function makeGround(endState?: string) {
    return {
      id: GROUND_ID,
      status: GroundStatus.ACTIVE,
      scenario: GroundScenario.NEW_HIRE,
    };
  }

  function makeParticipant() {
    return { id: PARTICIPANT_ID, email: 'a@test.com', roleAsDescribed: 'the founder', userId: USER_ID };
  }

  function makePrisma({ existingEndState, existingOtherConfirmation }: { existingEndState?: string; existingOtherConfirmation?: boolean }) {
    const deleted: any[] = [];
    return {
      deleted,
      prisma: {
        ground: {
          findUnique: jest.fn(async ({ where }: any) => {
            if (where.id === GROUND_ID) return makeGround();
            return null;
          }),
        },
        groundParticipant: {
          findFirst: jest.fn(async () => makeParticipant()),
          findMany: jest.fn(async () => [
            { id: PARTICIPANT_ID, email: 'a@test.com', roleAsDescribed: 'the founder' },
            { id: OTHER_ID, email: 'b@test.com', roleAsDescribed: 'the hire' },
          ]),
        },
        resolution: {
          findUnique: jest.fn(async () =>
            existingEndState ? { id: RESOLUTION_ID, endState: existingEndState } : null,
          ),
          upsert: jest.fn(async () => ({ id: RESOLUTION_ID, endState: 'KEEP' })),
        },
        resolutionConfirmation: {
          deleteMany: jest.fn(async (args: any) => { deleted.push(args); return {}; }),
          upsert: jest.fn(async () => ({})),
          findMany: jest.fn(async () =>
            existingOtherConfirmation
              ? [{ participantId: OTHER_ID, endState: existingEndState }]
              : [],
          ),
        },
      } as any,
    };
  }

  it('deletes other parties confirmations when the end state changes', async () => {
    const { prisma, deleted } = makePrisma({ existingEndState: 'EXIT', existingOtherConfirmation: true });
    const intelligence: any = { recordOutcome: jest.fn() };
    const email: any = { sendResolutionProposal: jest.fn(async () => {}), sendGroundClosed: jest.fn() };
    const config: any = { get: jest.fn(() => 'http://localhost:5173') };
    const service = new ResolutionService(prisma, intelligence, email, config);

    await service.propose(GROUND_ID, USER_ID, 'KEEP');

    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toMatchObject({
      where: { resolutionId: RESOLUTION_ID, participantId: { not: PARTICIPANT_ID } },
    });
  });

  it('does NOT delete other confirmations when the same end state is re-proposed', async () => {
    const { prisma, deleted } = makePrisma({ existingEndState: 'KEEP', existingOtherConfirmation: true });
    const intelligence: any = { recordOutcome: jest.fn() };
    const email: any = { sendResolutionProposal: jest.fn(async () => {}), sendGroundClosed: jest.fn() };
    const config: any = { get: jest.fn(() => 'http://localhost:5173') };
    const service = new ResolutionService(prisma, intelligence, email, config);

    await service.propose(GROUND_ID, USER_ID, 'KEEP');

    expect(deleted).toHaveLength(0);
  });

  it('does NOT delete confirmations on a brand-new proposal (no prior resolution)', async () => {
    const { prisma, deleted } = makePrisma({ existingEndState: undefined });
    const intelligence: any = { recordOutcome: jest.fn() };
    const email: any = { sendResolutionProposal: jest.fn(async () => {}), sendGroundClosed: jest.fn() };
    const config: any = { get: jest.fn(() => 'http://localhost:5173') };
    const service = new ResolutionService(prisma, intelligence, email, config);

    await service.propose(GROUND_ID, USER_ID, 'KEEP');

    expect(deleted).toHaveLength(0);
  });
});
