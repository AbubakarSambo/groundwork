import { theStreamedRouteRunsThePlainRoute } from './__fixtures__/the-streamed-route-is-the-plain-route';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isAnApology, NOTHING_TO_APOLOGISE_FOR } from './an-apology-is-not-owed';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SRC = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));

describe('an apology is not owed, and it is not met with silence', () => {
  it('knows one when it hears one', () => {
    expect(isAnApology("I'm sorry. I will pay.")).toBe(true);
    expect(isAnApology('Sorry, I was away.')).toBe(true);
    expect(isAnApology('I am one payment behind.')).toBe(false);
    expect(isAnApology('Nothing else this week.')).toBe(false);
  });

  it('the line is plain, and the product’s own', () => {
    expect(NOTHING_TO_APOLOGISE_FOR).toBe('No need to say sorry here. This is a record of where things are, not a judgement of you.');
  });

  it('goes in front of the close on both paths, and never on a close that is still asking', () => {
    /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
    expect(SRC.match(/if \(close\.ready && !close\.ask && isAnApology\(message\)\) close\.sayFirst = NOTHING_TO_APOLOGISE_FOR;/g)).toHaveLength(1);
    expect(theStreamedRouteRunsThePlainRoute(SRC)).toBe(true);
  });
});
