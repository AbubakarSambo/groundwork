import { BISI, KWAME, SALES_RUN, boardAs, commitment, type Setup } from './the-switchboards-sections-harness';

/**
 * REQUEST 123, ITEM 9. Under Hafsah's rule (what people say in a check-in can be shown to the people in it), a commitment is
 * said with what it was, never as "made a commitment, which is in the record". Where the stored words are not the person's
 * own typed words they are said about the person, without marks: "me" is "them" to the lead and "you" to the person.
 */
const WORDS = 'ask Bisi to provide me with the commercial terms for each client';
const SETUP: Setup = {
  ...SALES_RUN,
  commitments: [commitment('k-1', 'p-kwame', WORDS, { statedInSession: 2, saidWordForWord: false, createdAt: new Date('2026-09-16T18:00:00Z') })],
};

describe('a commitment with "me" in its words', () => {
  it('the lead reads what Kwame Mensah committed to, about him, without the words in marks', async () => {
    const b = JSON.stringify(await boardAs(SETUP, ...BISI));
    expect(b).not.toContain('which is in the record');
    expect(b).toContain('Kwame Mensah committed to ask Bisi to provide them with the commercial terms for each client.');
  });

  it('Kwame reads it about himself', async () => {
    const b = JSON.stringify(await boardAs(SETUP, ...KWAME));
    expect(b).not.toContain('which is in the record');
    expect(b).toContain('you committed to ask Bisi to provide you with the commercial terms for each client.');
  });
});
