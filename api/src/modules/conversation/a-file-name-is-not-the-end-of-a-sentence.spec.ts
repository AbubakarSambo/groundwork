import { intoSentences } from './nothing-invented-reaches-them';

/**
 * A FULL STOP INSIDE A WORD IS NOT THE END OF A SENTENCE (final real-model check, item 17). Kevin sent mpesa-kilele-hotel.pdf on WhatsApp,
 * the reply's first sentence named the file, and the final check, reading "The mpesa-kilele-hotel." and "pdf ..." as two sentences, took
 * the second out: Kevin read "The mpesa-kilele-hotel.That counts as proof for that deal." A sentence is cut, or kept, whole.
 */
describe('a file name in a sentence', () => {
  it('stays in its sentence', () => {
    expect(intoSentences('The mpesa-kilele-hotel.pdf shows KES 200,000 for 40 units. That counts as proof for that deal.'))
      .toEqual(['The mpesa-kilele-hotel.pdf shows KES 200,000 for 40 units. ', 'That counts as proof for that deal.']);
  });
  it('and a number with a point in it is not cut either, while sentences still end where they end', () => {
    expect(intoSentences('It is 3.5 units. Done!')).toEqual(['It is 3.5 units. ', 'Done!']);
    expect(intoSentences('One. Two! Three?')).toEqual(['One. ', 'Two! ', 'Three?']);
  });
});
