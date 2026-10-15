import { whyThereIsNowhereToPutIt } from './a-document-is-private-until-you-say-otherwise';
import { readFileSync } from 'fs';

/**
 * "YOU HAVE NONE OPEN, SO THERE IS NOWHERE TO PUT ONE YET" - READ BY SOMEBODY RUNNING TEN
 * (screens request 154, item 2).
 *
 * The sentence itself was never wrong: it is returned only when the count it is given is zero.
 * What was wrong is what was counted. `open` is the sessions open for THIS PERSON TO ANSWER, and a
 * lead who runs ten check-ins and has no session of her own to answer has none of those.
 *
 * The code already knew better and only half applied it: running a check-in counted when the
 * screen sent a `groundId`, and Ask now covers the whole organisation by default and is usually
 * opened with none. So the common path was the one that had the rule missing.
 *
 * A document belongs to a check-in, not to a session.
 */
describe('a lead who runs check-ins has somewhere to put a document', () => {
  it('the sentence is still right about nobody having anything at all', () => {
    expect(whyThereIsNowhereToPutIt(0)).toContain('there is nowhere to put one yet');
    expect(whyThereIsNowhereToPutIt(1)).toBeNull();
    expect(whyThereIsNowhereToPutIt(10)).toBeNull();
  });

  it('and the path with no check-in named looks for one she runs before refusing', () => {
    const src = readFileSync(__dirname + '/assistant.service.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const looks = src.indexOf('if (!chosen && !open.length && userId)');
    const refuses = src.indexOf('const nowhere = whyThereIsNowhereToPutIt(open.length)');
    expect(looks).toBeGreaterThan(-1);
    expect(refuses).toBeGreaterThan(-1);
    /* The order is the whole fix: look for one she runs, and only then say there is nowhere. */
    expect(looks).toBeLessThan(refuses);
    expect(src.slice(looks, refuses)).toContain('runsIt(userId, viewer, g as any)');
  });
});
