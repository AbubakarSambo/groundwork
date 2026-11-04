import { looksLikeAName } from './assistant.service';

/**
 * A REQUEST TO ADD NOTES, READ BACK AS A MISSING COLLEAGUE (screens request 154, item 2).
 *
 * Juma asked about looking after people while the road was closed, and read:
 *
 *   I do not have anybody called "looking after them while the road is closed. ...".
 *   I only know the people your organisation has sent me.
 *
 * `whoIs` echoed whatever it was handed. The router putting him there is worth fixing too, but
 * the damage is done at the echo, which is where it is held: anything that cannot be a name is
 * something we did not understand, not somebody we failed to find.
 */
describe('a sentence is not a colleague', () => {
  it('turns down the sentence that actually caused this', () => {
    expect(looksLikeAName('looking after them while the road is closed. I want to add that')).toBe(false);
  });

  it('still takes the names people really type', () => {
    for (const name of ['Juma', 'Juma Kariuki', 'Ada', 'Mary Jane Watson', 'de Souza', 'Ngozi']) {
      expect(looksLikeAName(name)).toBe(true);
    }
  });

  it('turns down anything with a sentence inside it, however short', () => {
    for (const notAName of ['who is on call?', 'Juma, Ada and Ngozi', 'add this: a note', 'Help!']) {
      expect(looksLikeAName(notAName)).toBe(false);
    }
  });

  it('turns down something far too long to be a name', () => {
    expect(looksLikeAName('the person who looks after the warehouse on the days when the road is closed')).toBe(false);
  });

  it('turns down nothing at all', () => {
    expect(looksLikeAName('')).toBe(false);
    expect(looksLikeAName('   ')).toBe(false);
  });
});
