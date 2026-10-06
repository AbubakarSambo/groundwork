import { PLAIN_WORDS, PLAIN_WORDS_WITH_EXAMPLES } from './plain-words';
import { SEED_PROMPTS } from './prompt-library';
import { STYLE } from '../assistant/the-model-words-it-and-nothing-more';

/**
 * PEOPLE'S OWN WORDS STAY EXACTLY AS THEY SAID THEM.
 *
 * Hafsah, 26 September 2026: "People's own words stay exactly as they said them. Never change a
 * quote to improve a score. Only fix what Groundwork itself writes."
 *
 * The rulebook only exempted quotations from ONE of its rules, the one about jargon. Every other
 * rule in it - full sentences, no fragments, no colons, a capital letter to start, plainer words -
 * read as applying to everything, quotations included. Nothing had been measured going wrong yet;
 * the exposure was that the wording score counts jargon inside quoted material too, so the
 * cheapest way to improve the number was always to tidy somebody's words, and nothing in the rules
 * stood in the way of it.
 *
 * The exemption is now the first thing in the rulebook and covers all of it.
 */
const flat = (t: string) => t.replace(/\s+/g, ' ');

describe('a quotation is never improved', () => {
  it('the exemption is stated before any rule it exempts', () => {
    const f = flat(PLAIN_WORDS);
    const exemption = f.indexOf('NONE OF THEM IS ABOUT WORDS SOMEBODY SAID');
    expect(exemption).toBeGreaterThan(-1);
    for (const rule of [
      'Write every sentence as a full sentence',
      'Never join pieces with colons',
      'Start every sentence with a capital letter',
      'Avoid management jargon',
    ]) {
      expect(f.indexOf(rule)).toBeGreaterThan(exemption);
    }
  });

  it('names each way a quotation could be tidied, and forbids it', () => {
    const f = flat(PLAIN_WORDS);
    expect(f).toContain('Never tidy a quotation');
    expect(f).toContain('never shorten one');
    expect(f).toContain('never make one a full sentence');
    expect(f).toContain('never swap a word in one for a plainer word');
  });

  it('says what to do instead, so the rule is not simply a prohibition', () => {
    expect(flat(PLAIN_WORDS)).toContain('write your own plain sentence around the quotation and leave the quotation untouched');
  });

  it('settles the conflict explicitly, rather than leaving two rules to fight', () => {
    expect(flat(PLAIN_WORDS)).toContain('If a rule below would change what is inside quotation marks, the rule does not apply there');
  });

  it('reaches the report prompt, the rewriting pass and the examples rulebook', () => {
    const synthesis = SEED_PROMPTS.find((p: any) => p.key === 'report_synthesis');
    expect(flat(synthesis!.content)).toContain('NONE OF THEM IS ABOUT WORDS SOMEBODY SAID');
    expect(flat(STYLE)).toContain('NONE OF THEM IS ABOUT WORDS SOMEBODY SAID');
    expect(flat(PLAIN_WORDS_WITH_EXAMPLES)).toContain('NONE OF THEM IS ABOUT WORDS SOMEBODY SAID');
  });
});
