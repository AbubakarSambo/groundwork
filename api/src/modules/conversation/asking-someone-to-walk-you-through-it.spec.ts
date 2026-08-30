import { howThisCompanyDoesIt, whatToLookUp, MOST_CARDS_IN_A_SESSION, MOST_WORDS_IN_A_LOOKUP } from './how-this-company-does-it';

/**
 * THE COMPANY'S OWN PROCESS, IN THE ROOM.
 *
 * "Do you understand our pricing process?" can be answered yes by somebody who does not. The
 * organisation's own handbook was sitting in the database, versioned and effective-dated, and the
 * check-in could not see it - so there was no way to tell a confident answer from a correct one.
 *
 * The line this must never cross is the one between asking somebody to describe how something works
 * and testing them on it. A test produces a score, a score produces a competency database, and that
 * is the thing this product is explicitly not.
 */
const card = (over: any = {}) => ({ key: 'pricing', title: 'How pricing works', body: 'Deals over 50k need sign-off.', ...over });

describe('what the interview is given', () => {
  it('the company\'s own words, marked as what the company says rather than as truth', () => {
    const block = howThisCompanyDoesIt([card()]);
    expect(block).toContain('Deals over 50k need sign-off.');
    expect(block).toContain('what the organisation says, not');
    expect(block).toContain('can be out of date');
  });

  it('and nothing at all when nothing is written down', () => {
    /* The common case. A check-in with no cards behind it is the check-in this product has always
       run, and it has to stay comfortable. */
    expect(howThisCompanyDoesIt([])).toBe('');
  });

  it('never more than a conversation can use', () => {
    const many = Array.from({ length: 9 }, (_, i) => card({ key: `k${i}`, title: `T${i}` }));
    const block = howThisCompanyDoesIt(many);
    expect(MOST_CARDS_IN_A_SESSION).toBeLessThanOrEqual(3);
    expect(block).toContain('T0');
    expect(block).not.toContain('T5');
  });
});

describe('the line it must not cross', () => {
  const block = howThisCompanyDoesIt([card()]);

  it('says outright that this is not a test', () => {
    expect(block).toContain('NOT testing them');
    expect(block).toContain('No quiz, no marking');
  });

  it('asks for one walk-through, not a round of them', () => {
    expect(block).toContain('One walk-through');
    expect(block).toContain('never several of these in one session');
  });

  it('treats a difference as a difference, not as somebody being wrong', () => {
    expect(block).toContain('at least as likely to be the');
    expect(block).toContain('Never say they are wrong');
  });

  it('and points a never-told finding at whoever should have told them', () => {
    /* The unfairest available reading is "he does not know" when nobody ever said. */
    expect(block).toContain('belongs to');
    expect(block).toContain('should have told them');
  });
});

describe('what it looks up', () => {
  it('a few words from what they just said, not the sentence', () => {
    /*
     * Found by running it. The retriever scores partly by what fraction of the query's words
     * appear in a card, so a whole conversational turn buries the two words that matter under
     * twenty that do not: this exact sentence returned nothing against a card called "How
     * contracting works", and "contract" alone found it immediately.
     */
    const said = 'The client wants to proceed and I was going to send them the contract myself';
    const q = whatToLookUp(said)!;
    expect(q).toContain('client');
    expect(q).toContain('contract');
    expect(q.split(' ').length).toBeLessThanOrEqual(MOST_WORDS_IN_A_LOOKUP);
  });

  it('drops the words a process would never be written about', () => {
    const q = whatToLookUp('I was going to send them the contract myself this week you know')!;
    expect(q).not.toContain('going');
    expect(q).not.toContain('week');
  });

  it('and says nothing when what is left is too thin to search on', () => {
    expect(whatToLookUp('I think that we should probably just go and do that thing you said')).toBeNull();
  });

  it('and nothing on a short answer', () => {
    /* "Yes" and "I think so" are the answers most likely to hide a gap and least likely to name a
       process. Pulling three pages of handbook behind a one-word reply helps nobody. */
    for (const said of ['Yes', 'not yet', 'I think so', '']) expect(whatToLookUp(said)).toBeNull();
  });

  it('or on nothing at all', () => {
    expect(whatToLookUp(null)).toBeNull();
    expect(whatToLookUp(undefined)).toBeNull();
  });
});
