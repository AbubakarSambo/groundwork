import { PartyType } from '@prisma/client';
import { ConversationService } from './conversation.service';

/**
 * THROUGH THE STEP EVERY REPLY IS SAVED BY, AS EACH PERSON READS IT (decision 139, must-fix 3; final evaluation, problems 4 and 5).
 *
 *   Felix (a team member) was asked about "the four items you escalated 15 days ago". He had escalated nothing (profile 2, problem 7).
 *   Victor (a team member) was told his promise "counts as a new account". The order never came (profile 3, problem 1).
 *   Wairimu (the lead) is never told in her own check-in that Groundwork reminded Brian, unless it did (profile 1, problem 2).
 */
function aCheckIn(over: { said?: string[]; triedSaid?: (string | null)[]; ledger?: any[] } = {}) {
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => null) },
    conversationTurn: {
      findMany: jest.fn(async (a: any) => (a?.where?.role === 'PERSON' ? (over.said ?? []).map((content) => ({ content })) : [])),
    },
    groundObjective: { findMany: jest.fn(async () => []) },
    groundDependency: { findMany: jest.fn(async () => (over.triedSaid ?? [null]).map((triedSaid) => ({ triedSaid }))) },
    recordEntry: { findMany: jest.fn(async () => []) },
    groundParticipant: { findMany: jest.fn(async () => [{ email: 'brian@msingi.test' }, { email: 'wairimu@msingi.test' }]) },
    notification: { findMany: jest.fn(async () => over.ledger ?? []) },
  };
  const s: any = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => '' } as any);
  jest.spyOn(s.logger, 'warn').mockImplementation(() => undefined);
  /* What a real turn sets before it is saved: the people's names, as buildSystemPrompt does. Since the final check (12 October) a
     name the check-in does not hold is cut, and Brian is one of Wairimu's people. */
  s.knownForThisTurn.set('ci-wairimu', ['Brian', 'Kiprop', 'Wairimu', 'Kamau']);
  return s;
}
const member = (id: string) => ({ id, groundId: 'g1', participantId: `p-${id}`, participant: { partyType: PartyType.PARTICIPANT } });
const lead = { id: 'ci-wairimu', groundId: 'g1', participantId: 'p-wairimu', participant: { partyType: PartyType.INITIATOR } };

describe('nothing Groundwork did not do, or the record does not hold, reaches a check-in', () => {
  it('Felix is not asked about items he escalated, when he escalated nothing', async () => {
    const s = aCheckIn({ said: ['Having lots of calls and conversations with them, aligning all the necessary stakeholders.'] });
    const saved: string = await s.theTurnAsItIsSaved(member('ci-felix'), 'You said the Kenya Power application went in on Wednesday. What happened to the four items you escalated 15 days ago?');
    expect(saved).toBe('You said the Kenya Power application went in on Wednesday.');
  });

  it('where Felix did say he took it to the head of the property team, the question stays', async () => {
    const s = aCheckIn({ said: ['I escalated it to the head of the property team on Monday.'] });
    const turn = 'What happened to the four items you escalated 15 days ago?';
    expect(await s.theTurnAsItIsSaved(member('ci-felix'), turn)).toBe(turn);
  });

  it('Victor\'s promise of an order is not counted as a new account', async () => {
    const s = aCheckIn({ said: ['And Donholm Distributors is placing a 100-bag order this week!'] });
    const saved: string = await s.theTurnAsItIsSaved(
      member('ci-victor'),
      'Donholm Distributors placing a 100-bag order this week counts as a new account and meets the minimum order size. That\'s one of the six new wholesale accounts. What is stopping any other potential new accounts from placing their first orders?',
    );
    expect(saved).toBe('What is stopping any other potential new accounts from placing their first orders?');
  });

  it('Wairimu is not told Brian was reminded when no reminder went, and is when one did', async () => {
    const turn = 'I have already sent reminders to Brian this week. What do you think got in the way for him?';
    expect(await aCheckIn().theTurnAsItIsSaved(lead, turn)).toBe('What do you think got in the way for him?');
    const sent = aCheckIn({ ledger: [{ toAddress: 'brian@msingi.test', createdAt: new Date() }] });
    expect(await sent.theTurnAsItIsSaved(lead, turn)).toBe(turn);
  });
});
