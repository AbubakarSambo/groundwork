import { PLAIN_WORDS } from './plain-words';
import { SEED_PROMPTS } from './prompt-library';

/**
 * ONE SENTENCE IN THE RULEBOOK EMPTIED THE REPORTS.
 *
 * Task 1.4 put the plain-words rulebook into every prompt whose output a person reads, including
 * the one that writes the report. The rulebook ended with "write one plain, full sentence in every
 * field", which is right about a field holding one sentence and wrong about a field holding a list.
 *
 * What the 24-scenario run of 26 September produced, against the run before it:
 *
 *   crisis     findings 3 -> 1, agreements 3 -> 0.  Priya Raman and Ben Carter's accounts, gone.
 *   pip        findings 2 -> 1, agreements 3 -> 0.  Nathan Owusu's account, gone.
 *   cofounder  findings 2 -> 0, agreements 4 -> 0.  Nothing left at all.
 *
 * Twenty-two of the twenty-four lost their agreements entirely and kept only the lead's own
 * finding. The model was doing what it was told: one sentence per field, so one entry per list.
 *
 * Nothing in the code changed to cause this and nothing in the code could have shown it. These
 * tests are on the rulebook text, which is the thing that was wrong, and on the prompt that
 * carries it into the report.
 */
describe('the rulebook says how an entry is written, not how many there are', () => {
  it('says plainly that a list keeps every entry', () => {
    expect(PLAIN_WORDS).toContain('NEVER ABOUT HOW MANY THERE ARE');
    expect(PLAIN_WORDS).toContain('fill in EVERY entry it asks for');
  });

  it('forbids each of the three things the model actually did', () => {
    const flat = PLAIN_WORDS.replace(/\s+/g, ' ');
    expect(flat).toContain('Never merge two entries into one');
    expect(flat).toContain('never leave an entry out');
    expect(flat).toContain('never send back a shorter list because the sentences are longer');
  });

  it('names the case that happened, so it is not read as an abstraction', () => {
    /* The rulebook is wrapped, so the sentence is matched with its line breaks flattened. */
    expect(PLAIN_WORDS.replace(/\s+/g, ' ')).toContain("gives one person's account when three people answered is wrong");
  });

  it('still says what it was added to say, so the fix did not undo task 1.4', () => {
    expect(PLAIN_WORDS).toContain('write one plain, full sentence in every');
    expect(PLAIN_WORDS).toContain('EVERY FIELD YOU FILL IN IS READ BY A PERSON');
  });

  it('and the caution reaches the report prompt, which is where the damage was', () => {
    const synthesis = SEED_PROMPTS.find((p: any) => p.key === 'report_synthesis');
    expect(synthesis).toBeDefined();
    expect(synthesis!.content).toContain('fill in EVERY entry it asks for');
    /* Both halves, in the order a reader meets them: the rule, then its limit. */
    const rule = synthesis!.content.indexOf('write one plain, full sentence in every');
    const limit = synthesis!.content.indexOf('NEVER ABOUT HOW MANY THERE ARE');
    expect(rule).toBeGreaterThan(-1);
    expect(limit).toBeGreaterThan(rule);
  });
});
