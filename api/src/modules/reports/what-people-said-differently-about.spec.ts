import { peopleSaidDifferentThingsAbout, isAWholeSentence } from './what-people-said-differently-about';
import { atAGlanceTiles } from './what-this-session-holds';

/** The Differences tile, as every reader of re-d (sales) read it in sessions 1 to 3. */
describe('the Differences tile says what people differed about in a sentence', () => {
  const base = { agreed: 0, movedOnTargets: null, blocked: 0, waiting: 0, backedPct: null, numberWasSaid: false };
  const differences = (topic: string, stillOpen: number) => atAGlanceTiles({ ...base, stillOpen, theDifference: topic } as any).find((t) => t.label === 'Differences')!.sub;

  it.each([
    ['The team is not aligned on the primary reason that applications are being held up.', 1,
      'People said different things. The team is not aligned on the primary reason that applications are being held up.'],
    ['The accounts differ on the primary cause of delays in the application process.', 2,
      'People said different things. The accounts differ on the primary cause of delays in the application process. 1 more difference is still open.'],
    ['The sum of the targets described in individual records is higher than the overall team target.', 2,
      'People said different things. The sum of the targets described in individual records is higher than the overall team target. 1 more difference is still open.'],
  ])('%s', (topic, open, says) => {
    expect(differences(topic, open)).toBe(says);
    expect(differences(topic, open)).not.toMatch(/about the (?:team|accounts|sum) /);
  });

  it('a topic that is a noun phrase still follows "about"', () => {
    expect(peopleSaidDifferentThingsAbout('Whether a price range counts as a budget')).toBe('People said different things about whether a price range counts as a budget.');
    expect(peopleSaidDifferentThingsAbout('The price list')).toBe('People said different things about the price list.');
  });
});

/**
 * FOUND ON THE TEST BED, 8 OCTOBER. "Who owns the next step with the distributor is not agreed upon by the team." is a whole sentence, and was read as a noun
 * clause because the check wanted the sentence to end at "agreed upon". The report's question then read "That is what settles who owns the next step with the
 * distributor is not agreed upon by the team." Said of the people (by the team, to the team), it is still the same sentence.
 */
describe('a clause that says something of the people it is about is a whole sentence', () => {
  it.each([
    'Who owns the next step with the distributor is not agreed upon by the team.',
    'Who has the authority to sign off on discounts is not clear to the team.',
    'Who signs off the discount is not agreed among the sales leads.',
    /* Found on the test bed, 5 November: "see" was not among the verbs, so this read "differ on" and "That is what settles the parties see different things...". */
    'The parties see different things as the biggest safety risk at the depots.',
  ])('%s', (t) => {
    expect(isAWholeSentence(t)).toBe(true);
  });
  it('and a noun clause with nothing said of it is still not one', () => {
    for (const t of ['Who owns the next step with the distributor', 'Whether a price range counts as a budget', 'Who is accountable for pricing']) expect(isAWholeSentence(t)).toBe(false);
  });
  it('so the question reads as a sentence, never after "settles"', () => {
    expect(peopleSaidDifferentThingsAbout('Who owns the next step with the distributor is not agreed upon by the team.')).toBe('People said different things. Who owns the next step with the distributor is not agreed upon by the team.');
  });
});

/* F5 part 3 (stage 8 and 9): named people "see it differently"; unnamed, the sentence every board says is unchanged. */
describe('a difference between people named for the reader', () => {
  const say = peopleSaidDifferentThingsAbout;
  it('reads as the approved journey says it', () => {
    expect(say('the Westgate deal', 'Jane and John')).toBe('Jane and John see the Westgate deal differently.');
    expect(say('The accounts differ on the primary cause of delays.', 'You and Kwame')).toBe('You and Kwame see this differently. The accounts differ on the primary cause of delays.');
    expect(say('the price list')).toBe('People said different things about the price list.');
    expect(say('the price list', 'People in this check-in')).toBe('People in this check-in said different things about the price list.');
  });
});
