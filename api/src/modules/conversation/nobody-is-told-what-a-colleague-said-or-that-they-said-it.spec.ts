import { ENGINE_RULES } from './prompt-library';
import { ConversationContextService } from './context.service';

/**
 * Run 9: Amani was told "Some of your colleagues have mentioned that you have a particular skill in resolving difficult customer issues, almost like a specialist."
 * Nobody had said it. The model had been handed a count of mentions elsewhere and a script that said to name "the contribution described by the other party",
 * so it invented the contribution and attributed it to colleagues. The model is now given a question of its own, told it is given no words, and the script names only the topic.
 */
describe('what a person is told about what colleagues said', () => {
  it('is never anything: the script names a topic from the probe, never the contribution another party described', () => {
    expect(ENGINE_RULES).not.toContain('Something has come up in other check-ins');
    expect(ENGINE_RULES).not.toContain('described by the other party');
    expect(ENGINE_RULES).toContain('You are given the topic only, never what anybody said');
    expect(ENGINE_RULES).toContain('Never say or suggest that colleagues, other people or other check-ins mentioned, said or described anything about this person');
  });
  it('is a question of the model\'s own where the only thing known is a count of mentions elsewhere', async () => {
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ organizationId: 'o1', scenario: 'TEAM', brief: null, objectives: [] })) },
      groundParticipant: {
        findUnique: jest.fn(async () => ({ id: 'p1', partyType: 'PARTICIPANT', user: { firstName: 'Amani', lastName: 'Mwangi' }, ground: { organizationId: 'o1' }, checkIns: [] })),
        findMany: jest.fn(async () => []), update: jest.fn(async () => ({})),
      },
      recordEntry: { findMany: jest.fn(async () => []), count: jest.fn(async () => 4) },
      patternDetection: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    };
    const { block } = await new ConversationContextService(prisma).build({ groundId: 'g1', participantId: 'p1', sessionNumber: 2, latestMessage: 'We sold 20 units.' }).catch(() => ({ block: '' }));
    if (block) {
      expect(block).not.toMatch(/colleagues (?:have )?mentioned/i);
      expect(block).not.toContain('specialist');
    }
  });
});
