import { ConversationService } from '../conversation/conversation.service';

/**
 * A RULE THAT ONLY WRITES TO A LOG IS NOT ENFORCED, IT IS OBSERVED.
 *
 * Two detectors already ran on every report and neither did anything. `tallyInReport` catches a
 * report establishing something by counting accounts - "three of four people said the process is
 * broken" - which the rules forbid, because a gap is real when the record supports it and not when
 * it wins a vote. `doesThisReportMarkItsInferences` catches a full synthesis that marked nothing it
 * concluded; ten of twelve reports on the local database came back exactly that way.
 *
 * Both wrote a warning and let the report ship with the fault in it. They now ask the model again,
 * once, naming what was wrong - the same second pass the post-report guide has always done.
 *
 * This is a source assertion on purpose: the synthesis path needs a model, a corpus, a ground and
 * a dozen collaborators, and the thing worth guarding is small and structural - that the faults are
 * computed, that a second attempt is made, and that it is not trusted blindly.
 */
const src = require('fs')
  .readFileSync(__dirname + '/reports.service.ts', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

describe('the rules that were only logged now ask again', () => {
  it('reads the real file, so an empty one cannot pass', () => {
    expect(src.length).toBeGreaterThan(20000);
  });

  it('computes both faults on the synthesis result', () => {
    expect(src).toMatch(/const faultsIn = \(r: SynthesisResult\)/);
    expect(src).toMatch(/tallyInReport\(r as any/);
    expect(src).toMatch(/doesThisReportMarkItsInferences\(/);
  });

  it('asks the model again when there is a fault, naming it', () => {
    expect(src).toMatch(/A previous attempt had a problem and was not used/);
    expect(src).toMatch(/fixing this: \$\{faults\.join/);
  });

  it('and only takes the second attempt if it is actually better', () => {
    /*
     * The failure this prevents: a retry that fixes the tally and drops a finding, or one that is
     * wrong in a new way. A rule is not worth a worse report.
     */
    expect(src).toMatch(/faultsIn\(secondPass\)\.length < faults\.length/);
  });

  it('asks once and never loops', () => {
    /* A model that fails twice is telling us the prompt needs work. The log is what says so. */
    /*
     * Bounded to the retry itself. Two earlier attempts at this assertion were wrong in opposite
     * ways: one sliced to a landmark that lives in a comment, so the region was empty and the test
     * passed on nothing; the next took 3000 characters and caught a `for` belonging to unrelated
     * code further down. The property worth asserting is narrow - one model call in the block that
     * handles the faults, and no recursion back into it.
     */
    const start = src.indexOf('const faults = faultsIn(result)');
    expect(start).toBeGreaterThan(0);
    /* Up to the lift block, which is a SEPARATE, bounded ask - see below. */
    const block = src.slice(start, src.indexOf('const stillLifted = liftsInReport'));
    expect((block.match(/anthropic\s*\n?\s*\.extract/g) ?? []).length).toBe(1);
    expect(block).not.toMatch(/faultsIn\(result\)[\s\S]*faultsIn\(result\)/);
  });

  it('and the restate of lifted phrases is one more ask, once, never a loop', () => {
    /* Decided 11 September 2026: their words do not ship in any field, and the information does. So
       a lift that survives the general retry gets exactly one targeted ask to say those phrases
       differently, and then its sentence is withheld. Two asks in the worst case, never a third. */
    const start = src.indexOf('const stillLifted = liftsInReport');
    expect(start).toBeGreaterThan(0);
    const block = src.slice(start, src.indexOf('const stillSevere = severeFaultsIn'));
    expect((block.match(/anthropic\s*\n?\s*\.extract/g) ?? []).length).toBe(1);
    expect(block).toMatch(/withholdLiftsIn\(/);
    expect(block).not.toMatch(/while\s*\(|for \(let attempt/);
  });

  it('keeps the first report when the second is no better, and says so', () => {
    expect(src).toMatch(/the second attempt was no better, keeping the first/);
  });
});
