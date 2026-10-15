import { ConversationService } from './conversation.service';
import { aThingToCarry } from './the-private-summary-opens-with-a-sentence';

/**
 * A WISH TO STOP IS NOT ADVICE FOR NEXT TIME (requests 40 (f) and 58). Read live on the done page:
 * "One thing for next time: I want to finish now." The person's own request to end the check-in,
 * handed back to them as the thing to carry into the next one. Read the way they read it, through
 * the check-in's own summary route.
 */
function served(whatToCarry: string) {
  const prisma: any = {
    groundParticipant: { findUnique: jest.fn(async () => ({ soloArtifact: JSON.stringify({ summary: 'Here is what you shared.', whatToCarry }), soloArtifactAt: new Date('2026-09-28T10:00:00Z') })) },
  };
  const service = new ConversationService(
    prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    { sendParticipantBlockedNudge: () => Promise.resolve() } as any, { emit: () => Promise.resolve() } as any, { get: () => '' } as any,
  );
  (service as any).loadOwnedCheckIn = jest.fn(async () => ({ participantId: 'p1', status: 'COMPLETED' }));
  return service.getSoloArtifact('c1', 'u1') as Promise<any>;
}

describe('the thing to carry, as the person reads it', () => {
  it.each(['I want to finish now.', '"I want to finish now."', 'Please finish my check-in', "That's all", "I'm done for today"])(
    '"%s" is served as nothing to carry', async (said) => {
      expect((await served(said)).artifact.whatToCarry).toBe('');
    });

  it.each([
    'Ask Juma for the Westgate order before Friday.',
    'I want to finish the proposal by Friday.',
    'Finish the Kano price list before the next check-in.',
  ])('"%s" is real advice and is served as written', async (said) => {
    expect((await served(said)).artifact.whatToCarry).toBe(said);
  });

  it('a missing one is nothing', () => {
    expect(aThingToCarry(undefined)).toBe('');
  });
});
