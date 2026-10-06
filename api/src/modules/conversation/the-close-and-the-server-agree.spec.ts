import { ConversationService } from './conversation.service';
import { TurnRole } from '@prisma/client';

/**
 * THE CLOSE AND THE SERVER AGREE (request 47). Walked live: Rukia gave three short answers, read
 * "Your report is ready now. Speak soon.", pressed "That's right, finish", and the server refused.
 * Whatever the engine's close says, the server's completion now says the same on the same record:
 * the close is never ready where completion would refuse, and never refused where it would pass.
 */
function aService(personSaid: string[]) {
  const turns = [{ role: TurnRole.AI, content: 'How is it going?' }, ...personSaid.map((c) => ({ role: TurnRole.PERSON, content: c }))];
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async () => ({ closeHeldAt: new Date(), participantId: 'p1', startedAt: new Date(0), ground: { cadence: 'WEEKLY', scenario: 'NEW_HIRE' }, participant: { partyType: 'PARTICIPANT' } })),
      update: jest.fn(async () => ({})),
    },
    conversationTurn: { findMany: jest.fn(async (a: any) => (a?.where?.role ? turns.filter((t) => t.role === a.where.role) : turns)) },
    groundDocument: { count: jest.fn(async () => 0) },
    ground: { findUnique: jest.fn(async () => ({ scenario: 'NEW_HIRE' })) },
  };
  const s = new ConversationService(
    prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    { sendParticipantBlockedNudge: () => Promise.resolve() } as any, { emit: () => Promise.resolve() } as any, { get: () => '' } as any,
  ) as any;
  s.openTheDoor = jest.fn(async () => ({ id: 'c1', groundId: 'g1', isSelfCorrection: false }));
  s.finishTheSession = jest.fn(async () => ({ ok: true }));
  s.whatThisSessionNeverAsked = jest.fn(async () => []);
  return s;
}

async function bothEnds(personSaid: string[]) {
  const s = aService(personSaid);
  const close = await s.mayClose('c1', false);
  const server = await s.complete('c1', 'u1').then(() => 'written', (e: any) => `refused: ${e?.response?.message ?? e?.message}`);
  return { closes: close.ready, server };
}

describe('the engine\'s close and the server\'s completion, on the same record', () => {
  it('three short answers ending in "please finish": neither closes, so no goodbye is written for a refusal', async () => {
    const { closes, server } = await bothEnds(['ok', 'fine', 'Please finish my check-in']);
    expect(server).toMatch(/^refused: There is almost nothing here yet/);
    expect(closes).toBe(false);
  });

  it('three real answers ending in "please finish": both close', async () => {
    const { closes, server } = await bothEnds([
      'I shadowed Amani on two customer visits in Westlands this week.',
      'I am waiting on Rukia for the price list before I can quote Kano.',
      'Please finish my check-in',
    ]);
    expect(closes).toBe(true);
    expect(server).toBe('written');
  });
});

describe('the sentence the server refuses a finish with, when there is too little yet', () => {
  it('is the plain sentence the app and WhatsApp say, and the person can answer it', async () => {
    const s = aService(['Things are going fine, thanks.']);
    const refusal = await s.complete('c1', 'u1').then(() => null, (e: any) => e);
    expect(refusal?.response?.message).toBe('I need a little more from you before this check-in can close. Please answer one or two more questions, then finish again.');
    expect(refusal?.response?.canContinue).toBe(true);
    expect(refusal?.response?.message).not.toMatch(/ - |exchanges|record is still thin/);
  });
});
