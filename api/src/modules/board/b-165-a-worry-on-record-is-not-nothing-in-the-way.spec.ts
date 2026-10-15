import { theGlanceInASentence } from './the-glance-in-a-sentence';

/** B-165: Esther said three shops were waiting on a credit decision. The board read "Nothing is in the way." and the report "Nobody is waiting on anybody." */
describe('a worry on record is never read as nothing being in the way', () => {
  it('the header says both facts where no wait is listed and a worry is on record', () => {
    expect(theGlanceInASentence([], () => null, 1)).toBe('No wait is listed against a named person, but 1 worry is on record.');
    expect(theGlanceInASentence([], () => null, 3)).toBe('No wait is listed against a named person, but 3 worries are on record.');
  });
  it('still says nothing is in the way where there is no worry', () => {
    expect(theGlanceInASentence([], () => null, 0)).toBe('Nothing is in the way.');
  });
});
