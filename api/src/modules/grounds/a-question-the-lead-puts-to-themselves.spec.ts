import { aSetupConversation } from './request-92-harness';
import { whatWeTookFromThat } from './a-dump-is-many-things';

/*
 * A question the lead writes to themselves in a paste ("I need to decide whether ...") was dropped, because
 * the reader only took a question written for a named person. It is now kept for the lead alone.
 */
const PEOPLE = [
  { id: 'pW', email: 'wairimu@x.test', nameGiven: null, roleAsDescribed: null, managingOnly: false, userId: 'uW', user: { firstName: 'Wairimu', lastName: 'Njoroge' } },
  { id: 'pA', email: 'amani@x.test', nameGiven: null, roleAsDescribed: null, managingOnly: false, userId: 'uA', user: { firstName: 'Amani', lastName: 'Wekesa' } },
];
const PASTE = 'I need to decide whether we keep the Kisumu contract past March. Amani, which accounts actually have a buying process?'.repeat(2);

async function read() {
  const { service } = aSetupConversation({
    ground: { participants: PEOPLE },
    seed: { ground: { findUnique: async () => ({ id: 'g1', initiatorId: 'uW', participants: PEOPLE }) } },
    extract: () => ({
      questionsForPeople: [
        { personName: 'the lead', question: 'I need to decide whether we keep the Kisumu contract past March' },
        { personName: 'Amani', question: 'which accounts actually have a buying process?' },
      ],
    }),
  });
  return (service as any).whatAPasteGives('g1', PASTE) as Promise<any>;
}

describe('a question the lead writes to themselves', () => {
  it('is kept on the lead, not on Amani, and not dropped', async () => {
    const got = await read();
    const mine = got.questionsForPeople.filter((q: any) => q.participantId === 'pW');
    expect(mine).toHaveLength(1);
    expect(got.questionsForPeople.filter((q: any) => q.participantId === 'pA')).toHaveLength(1);
  });

  it('is said back to the lead as their own, with no one else asked', async () => {
    const got = await read();
    const said = whatWeTookFromThat(got, { asking: true, reader: { participantId: 'pW' } })!;
    expect(said).toContain('You put this question to yourself, so it stays open for you and nobody else is asked it: "I need to decide whether we keep the Kisumu contract past March?"');
    expect(said).toContain('Groundwork will ask Amani Wekesa: "Which accounts actually have a buying process?"');
    expect(said).not.toContain('Groundwork will ask Wairimu');
  });
});
