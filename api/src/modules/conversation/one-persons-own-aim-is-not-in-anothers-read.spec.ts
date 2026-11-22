/**
 * A PERSON'S OWN AIM IS NEVER IN ANOTHER PERSON'S READ (end-to-end check of 16 November, C-1; fix plan 17 November, group B).
 *
 * Mary said "my own aim is 35". The invitation promises that only she and the lead see her share. Every aim on the ground was given to
 * every person's read as the team's priorities, so Sam's read wrote "My own aim is 35." for Sam, the board said Sam's and then Asha's
 * target was 35, and the lead's Today said Mary, Sam and Asha were all aiming for 35. This reads what the model is given for each person.
 */
import { assessTheConversation } from './assess-the-conversation';

const AIMS = [
  { name: 'The team is aiming to sell 120 units.', ownerParticipantId: null },
  { name: 'Mary is aiming to sell 35 units.', ownerParticipantId: 'p-mary' },
  { name: 'Sam is aiming to sell 28 units.', ownerParticipantId: 'p-sam' },
];

function whatTheModelIsGivenFor(participantId: string, partyType: 'INITIATOR' | 'PARTICIPANT', first: string) {
  const given: string[] = [];
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async () => ({
        id: 'ci-1', groundId: 'g', participantId, sessionNumber: 1, startedAt: new Date(), completedAt: new Date(), whatWeHave: null, sessionReport: null,
        turns: [{ id: 't1', role: 'PERSON', content: 'I sold 20 this week.' }],
        participant: { partyType, nameGiven: null, roleAsDescribed: null, user: { firstName: first, lastName: 'X', jobTitle: 'Sales' } }, ground: { label: 'Sales' },
      })),
      findMany: jest.fn(async () => []),
      update: jest.fn(async () => ({})),
    },
    groundObjective: { findMany: jest.fn(async () => AIMS) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    groundDocument: { findMany: jest.fn(async () => []) },
  };
  const anthropic = { extract: jest.fn(async (_s: string, h: any[]) => { given.push(h[0].content); return { summary: '', nothingToRecord: [1] }; }) };
  return assessTheConversation({ prisma, anthropic: anthropic as any }, 'ci-1', { howItEnded: 'finished by the person', closedAt: new Date() }).then(() => given[0]);
}

describe('the aims a person\'s read is given', () => {
  it('Sam reads the team\'s aim and his own, and never Mary\'s 35', async () => {
    const text = await whatTheModelIsGivenFor('p-sam', 'PARTICIPANT', 'Sam');
    expect(text).toContain('The team is aiming to sell 120 units.');
    expect(text).toContain('Sam is aiming to sell 28 units.');
    expect(text).not.toContain('35');
    expect(text).not.toContain('Mary is aiming');
  });

  it('Asha, who has no aim of her own, reads only the team\'s', async () => {
    const text = await whatTheModelIsGivenFor('p-asha', 'PARTICIPANT', 'Asha');
    expect(text).toContain('The team is aiming to sell 120 units.');
    expect(text).not.toMatch(/Mary is aiming|Sam is aiming|35|28/);
  });

  it('the lead\'s read does not carry a person\'s share into the team\'s aims either', async () => {
    const text = await whatTheModelIsGivenFor('p-lucy', 'INITIATOR', 'Lucy');
    const priorities = text.split("THE TEAM'S PRIORITIES:")[1]?.split('\n\n')[0] ?? '';
    expect(priorities).toContain('The team is aiming to sell 120 units.');
    expect(priorities).not.toContain('Mary is aiming');
    /* Since 22 November the lead's read is also given every goal on record by id, with whose it is, so a goal she changes is named
       (a-goal-changed-by-its-lead). The lead may see Mary's share; it is listed as Mary's, never as the team's. */
    expect(text).toMatch(/THE GOALS ON RECORD[^\n]*\n(?:  \[[^\n]*\n)*  \[[^\]]*\] Mary is aiming to sell 35 units\./);
  });
});
