import { oneLineBackForEachLineIn, wordedByTheModel } from './the-engine-drafts-it-the-model-words-it';

/**
 * THE REWORDING PASS WAS PUTTING JARGON BACK, AND THE CODE LOOKED RIGHT.
 *
 * The rules this composer runs under end with the plain-words rulebook, and that rulebook says
 * "write one plain, full sentence in every field". A field is one thing. A block of nine claims is
 * not, and the model did the only sensible thing with the rule it was given: it sent back one
 * sentence for the whole block. `sameShape` then refused the lot and the engine's own words shipped,
 * jargon and all - so the change made to remove jargon was quietly restoring it.
 *
 * On the run of 26 September the refusals read "8 claims went out and 1 came back", "13 claims went
 * out and 1 came back", "14 claims went out and 1 came back". On the run before the rulebook
 * reached here they read "9 claims went out and 8 came back", "10 out and 9 back".
 *
 * These tests are on the PROMPT TEXT the model is handed, because that is the thing that was wrong.
 * A test on the guard would have passed throughout: the guard was working perfectly.
 */
describe('the composer is told how many lines to send back', () => {
  const three = ['The target is 40 renewals.', 'Nathan has renewed six.', 'Nobody wrote the target down.'];

  it('says the count, in both directions, in words the model cannot miss', () => {
    const p = oneLineBackForEachLineIn(three);
    expect(p).toContain('Below are 3 separate lines');
    expect(p).toContain('Send back exactly 3 lines');
  });

  it('names merging as the thing not to do, because merging is what it did', () => {
    const p = oneLineBackForEachLineIn(three);
    expect(p).toContain('Never merge two lines into one');
    expect(p).toContain('never drop a line');
  });

  it('protects the line the old guard lost most often: no number, no name', () => {
    expect(oneLineBackForEachLineIn(three)).toContain('not even a line that holds no number and no');
  });

  it('still hands over every draft line, unchanged, inside the draft tags', () => {
    const p = oneLineBackForEachLineIn(three);
    expect(p).toContain(`<draft>\n${three.join('\n')}\n</draft>`);
    for (const line of three) expect(p).toContain(line);
  });

  it('counts one line as one line, so a single draft is not told it is three', () => {
    const p = oneLineBackForEachLineIn(['The target is 40 renewals.']);
    expect(p).toContain('Below are 1 separate lines');
    expect(p).toContain('Send back exactly 1 lines');
  });
});

describe('and the collapse that was happening is refused, then shipped as the engine wrote it', () => {
  const drafts = [
    { key: 'a', text: 'The target is 40 renewals.' },
    { key: 'b', text: 'Nathan has renewed six.' },
    { key: 'c', text: 'Nobody wrote the target down.' },
  ];

  it('a model that collapses three lines into one changes nothing a person reads', async () => {
    const why: string[] = [];
    const out = await wordedByTheModel(drafts, async () => 'The target is 40 renewals and Nathan has renewed six.', (w) => why.push(w));
    expect(out.map((d) => d.text)).toEqual(drafts.map((d) => d.text));
    expect(why).toEqual(['3 claims went out and 1 came back']);
  });

  it('and a model that honours the count has its wording used', async () => {
    const why: string[] = [];
    const better = ['The target is 40 renewals.', 'Nathan has renewed six of them.', 'The target was never written down.'];
    const out = await wordedByTheModel(drafts, async () => better.join('\n'), (w) => why.push(w));
    expect(out.map((d) => d.text)).toEqual(better);
    expect(why).toEqual([]);
  });

  it('the prompt the model is actually handed carries the count', async () => {
    const seen: string[] = [];
    await wordedByTheModel(drafts, async (_style, user) => { seen.push(user); return drafts.map((d) => d.text).join('\n'); });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain('Send back exactly 3 lines');
  });
});
