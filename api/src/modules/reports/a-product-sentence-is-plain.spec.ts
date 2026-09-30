import { whatIsNotPlainIn } from './a-product-sentence-is-plain';

const rules = (line: string, opts: { whole?: boolean; readerIsLead?: boolean } = {}) => whatIsNotPlainIn(line, opts).map((f) => f.rule);

describe('the wording check for sentences the product composes', () => {
  it.each([
    ['Done: the stock count', 'pieces joined with a colon'],
    ['Owner → Finance', 'pieces joined with an arrow'],
    ['It was said on 2026-09-03.', 'a date written as numbers'],
    ['This is the pipeline for the quarter.', 'work jargon'],
    ['Unassigned', 'a label where a sentence should be'],
    ['Ask the lead what is next.', 'the reader called "the lead"'],
    ['Rukia was late - again.', 'pieces joined with a dot, a slash or a dash'],
    ['Two people have answered and 3 of 5 are still to come.', 'a word and a figure for counts in one sentence'],
  ])('catches %s', (line, rule) => {
    expect(rules(line)).toContain(rule);
  });

  it('catches a fragment, a lower-case start and a sentence with no end when the field is a whole sentence', () => {
    expect(rules('A hard blocker. Someone cannot move.', { whole: true })).toContain('a fragment where a full sentence should be');
    expect(rules('nobody named anything', { whole: true })).toEqual(expect.arrayContaining(['a sentence that starts in lower case', 'a sentence with no end']));
  });

  it('passes plain full sentences, a time of day and the reader called "the lead" for somebody else', () => {
    expect(rules('Rukia Mwangi has answered 2 sessions and made 3 commitments.', { whole: true })).toEqual([]);
    expect(rules('The meeting is at 10:30 on Friday.', { whole: true })).toEqual([]);
    expect(rules('Ask the lead what is next.', { readerIsLead: false })).toEqual([]);
  });

  it('never reads what somebody said in their own words', () => {
    expect(rules('Rukia said, "Done: the pipeline 2026-09-03 -> Finance." Then nothing moved.', { whole: true })).toEqual([]);
  });
});
