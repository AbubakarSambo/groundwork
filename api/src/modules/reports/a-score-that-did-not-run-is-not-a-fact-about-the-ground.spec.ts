import { confidenceInThePicture } from './confidence-in-the-picture';

/**
 * A SCORE THAT DID NOT RUN IS NOT A FACT ABOUT THE GROUND.
 *
 * The scorer failed silently and wrote null, and the picture then said "nothing has been scored
 * here yet, so this part of the picture has not been built" - about a ground where everybody had
 * answered. Two different silences: not asked, and asked-and-our-scorer-fell-over. And one scored
 * session read as a well-covered picture; one session is not a picture.
 */
describe('nothing scored', () => {
  it('because nobody has been asked is one sentence', () => {
    expect(confidenceInThePicture(0, 0).line).toMatch(/not been built rather than being empty/);
  });

  it('because the scorer failed is a different sentence, about us', () => {
    const { band, line } = confidenceInThePicture(0, 0, { failed: 2 });
    expect(band).toBe('nothing yet');
    expect(line).toMatch(/scoring did not run/);
    expect(line).toMatch(/fault on our side/);
    expect(line).not.toMatch(/not been built/);
  });
});

describe('one session is not a picture', () => {
  it('caps a single specific session at partly covered', () => {
    const one = confidenceInThePicture(1, 3);
    expect(one.band).toBe('partly covered');
    expect(one.line).toMatch(/One session is not a picture/);
  });

  it('two specific sessions are well covered', () => {
    expect(confidenceInThePicture(2, 3).band).toBe('well covered');
  });

  it('and every band says where it was read from', () => {
    for (const c of [confidenceInThePicture(2, 3), confidenceInThePicture(3, 1.6), confidenceInThePicture(3, 0.5), confidenceInThePicture(1, 3)]) {
      expect(c.line).toMatch(/Read from how much of what was said could be checked/);
    }
  });
});
