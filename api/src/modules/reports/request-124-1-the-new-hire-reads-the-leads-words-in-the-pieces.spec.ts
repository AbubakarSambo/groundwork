import { whoOwnsWhatForTheSubject, divergenceForTheSubject, theNewHireReadsTheLeadsWords } from './colleagues-exact-words-stay-with-the-manager';

/**
 * REQUEST 124, PART 1, IN THE PIECES: on an onboarding check-in the new hire reads the lead's own row and words; a colleague's
 * words still come out; a plan, a promotion and a renewal are not the new hire's case.
 */
const ROWS = [
  { participantId: 'p-tobi', items: [{ text: 'I will read the files.' }] },
  { participantId: 'p-amina', items: [{ text: 'I will give Tobi the terms by Friday.' }] },
  { participantId: 'p-baraka', items: [{ text: 'I will introduce Tobi to finance.' }] },
];

describe('request 124 (1): who the new hire reads the words of', () => {
  it('only a new hire\'s check-in is the new hire\'s case', () => {
    expect(theNewHireReadsTheLeadsWords('NEW_HIRE')).toBe(true);
    for (const s of ['PIP', 'RECOGNITION', 'CONTRACT_RENEWAL', 'COHORT_CHECK', 'NEW_MANAGER', 'OKR_ALIGNMENT', null, undefined]) expect(theNewHireReadsTheLeadsWords(s as any)).toBe(false);
  });

  it('"Who owns what": the lead\'s row keeps the lead\'s words, a colleague\'s loses them', () => {
    const out = whoOwnsWhatForTheSubject(ROWS, 'p-tobi', { theLeadsRow: 'p-amina' });
    expect(out[0].items[0].text).toBe('I will read the files.');
    expect(out[1].items[0].text).toBe('I will give Tobi the terms by Friday.');
    expect(out[2].items[0].text).toBe("A colleague's own words are not shown to you here. What was found is below.");
  });

  it('"Who owns what": without the new hire\'s case, the lead\'s words stay out as before', () => {
    expect(whoOwnsWhatForTheSubject(ROWS, 'p-tobi')[1].items[0].text).toMatch(/not shown to you here/);
  });

  it('a difference: the lead\'s side keeps its words only in the new hire\'s case', () => {
    const items = [{ positions: [{ who: 'You', view: 'Mine.' }, { who: 'Amina Bello', view: 'We agreed 98%.' }, { who: 'A colleague', view: 'Passing.' }] }];
    const mine = divergenceForTheSubject(items, ['Tobi Adewale'], { leadNames: ['Amina Bello'], theLeadsWordsAreReadable: true });
    expect(mine[0].positions.map((p: any) => p.view)).toEqual(['Mine.', 'We agreed 98%.', "A colleague's own words are not shown to you here. What was found is below."]);
    const other = divergenceForTheSubject(items, ['Tobi Adewale'], { leadNames: ['Amina Bello'] });
    expect(other[0].positions[1].view).toBe('The words your lead used are not shown to you here. What was found is below.');
  });
});
