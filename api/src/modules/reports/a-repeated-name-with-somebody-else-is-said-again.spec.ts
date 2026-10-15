import { withNames } from './party-labels';

/**
 * A NAME SAID AGAIN IS SAID AS A NAME WHERE SOMEBODY ELSE IS IN THE SENTENCE (review of the judgement prompt,
 * 5 October 2026). The new judgement prompt repeats a person's label rather than use a pronoun. The read turned the
 * repeat into "they" (request 129 item 6), which is right with one person in the sentence and ambiguous with two.
 * So with somebody else there, including the reader as "you", the name is said again.
 */
const NAMES = new Map([['the initiator', 'Wairimu Kamau'], ['Participant A', 'Amina Yusuf'], ['Participant B', 'Tobi Adewale']]);
const LABELS = ['the initiator', 'Participant A', 'Participant B'];
const as = (text: string, viewerLabel: string | null) => withNames(text, NAMES as any, LABELS, { viewerLabel });

describe('a repeated name, as each reader reads it', () => {
  const twoPeople = 'Participant A said, about Participant B, that Participant A would send the sheets.';
  it('the lead and an admin read the name again where a second person is named', () => {
    for (const v of ['the initiator', null]) expect(as(twoPeople, v)).toBe('Amina Yusuf said, about Tobi Adewale, that Amina would send the sheets.');
  });
  it('the second person reads "you" for themselves, and the name again for Amina', () => {
    expect(as(twoPeople, 'Participant B')).toBe('Amina Yusuf said, about you, that Amina would send the sheets.');
  });
  it('Amina herself reads "you" throughout', () => {
    expect(as(twoPeople, 'Participant A')).toBe('You said, about Tobi Adewale, that you would send the sheets.');
  });
  it('with one person in the sentence, "they" stays, as request 129 item 6 asked', () => {
    expect(as('Participant A said Participant A would send the sheets.', 'the initiator')).toBe('Amina Yusuf said they would send the sheets.');
    expect(as('Participant A says that for refunds, Participant A closes the ticket.', null)).toBe('Amina Yusuf says that for refunds, they close the ticket.');
  });
});
