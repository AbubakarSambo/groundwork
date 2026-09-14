import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE REPORT READ LIKE A TELLING-OFF, TO THE PERSON DECIDING WHETHER TO BUY THIS.
 *
 * "It looks a bit rude and will put off the lead. And in this case it is not accurate and they can't
 * even change it, the chat boxed them in."
 *
 * Three faults in one page, and the prompt caused two of them.
 *
 * It was told to ALWAYS include at least one open item for any topic not addressed directly, so a
 * gap got manufactured whether or not one existed, and a topic she had deliberately steered away
 * from qualified. And it asserted her team was "not named here" when she had named them in setup,
 * because the read was never given what setup collected.
 */
describe('the report does not tell the lead off', () => {
  const src = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('no longer forces an open item into existence', () => {
    expect(src).not.toMatch(/always include at least one entry/i);
    expect(src).toMatch(/Do NOT pad it to reach a number/);
    expect(src).toMatch(/A first session with nothing open is a real answer/);
  });

  it('says a decision they made is not a finding', () => {
    expect(src).toMatch(/SOMETHING THEY CHOSE NOT TO DO IS NOT AN OPEN GAP/);
    expect(src).toMatch(/It is theirs to make and it is not a finding/);
  });

  it('says do not claim something is missing that you were handed', () => {
    expect(src).toMatch(/NEVER SAY SOMETHING IS MISSING THAT YOU WERE GIVEN/);
  });

  it('and names who is reading it, because that is what the tone got wrong', () => {
    expect(src).toMatch(/THE READER IS THE PERSON WHO JUST DID THIS, AND THEY ARE NOT BEING MARKED/);
    expect(src).toMatch(/No open item may be phrased as an instruction to correct their own behaviour/);
  });

  it('and the rule is held in code too, not only asked for', () => {
    expect(src).toMatch(/withoutWhatTheyDeclined\(/);
  });
});
