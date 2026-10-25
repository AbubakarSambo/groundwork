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
  // Changed 26 October 2026 (Hafsah: item 2): a person's own finish is honoured with any answer, so both ends now close together (they still agree).
  it('three short answers ending in "please finish": both close, because it is the person\'s own end', async () => {
    const { closes, server } = await bothEnds(['ok', 'fine', 'Please finish my check-in']);
    expect(server).toBe('written');
    expect(closes).toBe(true);
  });

  it('three short answers with no finish asked for: neither closes, so no goodbye is written for a refusal', async () => {
    const { closes, server } = await bothEnds(['ok', 'fine', 'nothing']);
    expect(server).toMatch(/^refused: /);
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

describe('the server reads the last answer in the order it was said (journey 3, round 4)', () => {
  /* Ben's session as the database handed it back with no order: the rows as they lay on disk. */
  const SAID_IN_ORDER = [
    'Session 3: I called three shops and one agreed to stock us. The others want a lower price.',
    'The price approval from head office is still the block. I have photos of the shelf where we would sit.',
    'Next I will visit the two shops again and ask head office for an answer by Friday.',
    'Nothing more to add. That is everything for this week.',
  ];
  const ON_DISK = [SAID_IN_ORDER[3], SAID_IN_ORDER[1], SAID_IN_ORDER[0], SAID_IN_ORDER[2]];

  it('four answers ending in "That is everything for this week" finish, as the engine closed them', async () => {
    const at = (c: string) => new Date(Date.UTC(2026, 9, 12, 20, 47, SAID_IN_ORDER.indexOf(c)));
    const rows = ON_DISK.map((c) => ({ role: TurnRole.PERSON, content: c, createdAt: at(c) }));
    const prisma: any = {
      checkIn: { findUnique: jest.fn(async () => ({ closeHeldAt: new Date(), participantId: 'p1', startedAt: new Date(0), ground: { cadence: 'DAILY', scenario: 'PULSE_CHECK' }, participant: { partyType: 'PARTICIPANT' } })), update: jest.fn(async () => ({})) },
      conversationTurn: {
        /* Like Postgres: in the order asked for, and otherwise as they lie on disk. */
        findMany: jest.fn(async (a: any) => (a?.orderBy?.createdAt === 'asc' ? [...rows].sort((x, y) => +x.createdAt - +y.createdAt) : rows)),
      },
      groundDocument: { count: jest.fn(async () => 0) },
      ground: { findUnique: jest.fn(async () => ({ scenario: 'PULSE_CHECK' })) },
    };
    const s = new ConversationService(
      prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      { sendParticipantBlockedNudge: () => Promise.resolve() } as any, { emit: () => Promise.resolve() } as any, { get: () => '' } as any,
    ) as any;
    s.openTheDoor = jest.fn(async () => ({ id: 'c1', groundId: 'g1', isSelfCorrection: false }));
    s.finishTheSession = jest.fn(async () => ({ ok: true }));
    const server = await s.complete('c1', 'u1').then(() => 'written', (e: any) => `refused: ${e?.response?.message ?? e?.message}`);
    expect(server).toBe('written');
  });
});
