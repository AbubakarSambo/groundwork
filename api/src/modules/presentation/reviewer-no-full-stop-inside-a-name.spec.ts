import { forHumans, noFullStopInsideAName } from './outbound';
import { endingOnTheClose } from '../conversation/the-close-says-what-comes-next';
import { withoutAFragmentAtTheFront } from './outbound';

/**
 * REVIEWER, 14 OCTOBER 2026. David's opener began "Apex Ltd." and a close ended "Kamau v.": the reply was read sentence by
 * sentence at a full stop and a space, so the case name was cut in two and one half taken out.
 */
describe('a name keeps its parts together', () => {
  it('a case name, a company, a number and an initial are one sentence', () => {
    expect(noFullStopInsideAName('Brian filed the Kamau v. Apex Ltd. defence on Monday.')).toBe('Brian filed the Kamau v Apex Ltd defence on Monday.');
    expect(noFullStopInsideAName('The fee note No. MC/2026/118 is for the Estate of J. Otieno.')).toBe('The fee note No MC/2026/118 is for the Estate of J Otieno.');
  });
  it('a person’s own words in quotation marks are never changed', () => {
    expect(noFullStopInsideAName('You said "Kamau v. Apex Ltd. is filed." Is that right?')).toBe('You said "Kamau v. Apex Ltd. is filed." Is that right?');
  });
  it('a close keeps the case name whole', () => {
    const closed = endingOnTheClose(forHumans('You filed the defence in Kamau v. Apex Ltd. on Monday. Is the reply filed too?'), 'web');
    expect(closed.startsWith('You filed the defence in Kamau v Apex Ltd on Monday.')).toBe(true);
    expect(closed).not.toMatch(/Kamau v\.\s*\n/);
  });
  it('an opener does not lose its front half', () => {
    const opener = forHumans('Last time you said the documents for Kamau v. Apex Ltd. were nearly ready. What is left on them?');
    expect(withoutAFragmentAtTheFront(opener)).toBe('Last time you said the documents for Kamau v Apex Ltd were nearly ready. What is left on them?');
  });
});
