import { KnowledgeService } from './knowledge.service';

/**
 * WHICH WRITTEN PROCESS WHAT SOMEBODY JUST SAID TOUCHES.
 *
 * `retrieve` is for a question and scores by what fraction of the QUERY a card covers. For a
 * conversational turn that is exactly backwards: twenty words, two of them matter, and the
 * fraction collapses. Measured, not guessed - "the client said yes to the eighty thousand piece of
 * work, so I was going to send them the contract myself" scored zero against a card called "How
 * contracting works", and the single word "contract" found it immediately.
 *
 * This asks it the other way round: how much of the CARD does what they said touch?
 */
const svc = (cards: any[]) => {
  const s = Object.create(KnowledgeService.prototype) as any;
  s.prisma = { knowledgeCard: { findMany: async () => cards } };
  return s;
};

const contracting = { key: 'contracting', title: 'How contracting works', body: 'Legal signs every contract.' };
const pricing = { key: 'pricing', title: 'Pricing and discounts', body: 'Anything over 20% needs sign-off.' };

describe('what a sentence touches', () => {
  it('finds the card its subject is about, however much else is in the sentence', async () => {
    const found = await svc([contracting, pricing])
      .covering('org1', 'client eighty thousand piece send contract');
    expect(found).toHaveLength(1);
    expect(found[0].key).toBe('contracting');
  });

  it('matches a word to its stem, because contracting and contract are one subject', async () => {
    /* A check that missed this would fail on the commonest case there is. */
    const found = await svc([contracting]).covering('org1', 'we need to get the contract signed first');
    expect(found).toHaveLength(1);
  });

  it('and finds nothing when the conversation is about something else', async () => {
    const found = await svc([contracting, pricing])
      .covering('org1', 'team offsite retro long everybody tired');
    expect(found).toHaveLength(0);
  });
});

describe('what it will not do', () => {
  it('return anything for a message too short to be about anything', async () => {
    expect(await svc([contracting]).covering('org1', 'yes ok')).toHaveLength(0);
  });

  it('return anything when the company has written nothing down', async () => {
    expect(await svc([]).covering('org1', 'the contract needs signing this week')).toHaveLength(0);
  });

  it('or bury a session in process', async () => {
    /* Three at most. Five cards of handbook is already more than one conversation can use. */
    const many = Array.from({ length: 8 }, (_, i) => ({ key: `k${i}`, title: 'How contracting works', body: 'b' }));
    expect(await svc(many).covering('org1', 'the contract needs signing this week')).toHaveLength(3);
  });
});
