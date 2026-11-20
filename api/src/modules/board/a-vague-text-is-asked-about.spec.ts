import { THE_KIND_OF_WORK_PROMPT, oneOfTheKinds } from './the-kind-of-work';

/**
 * A VAGUE TEXT IS ASKED ABOUT, AND MONEY OWED FOR WORK DONE IS NOT A PROJECT (fix plan 16 November, group 10; boards pass 4, defects 2 and 3).
 *
 * "Something is not right in the business." reached the leadership board in all three runs with no question, because the leadership kind
 * was described by what its people worry about and "the business" read as the company's leaders. And two of the three fee-note texts reached
 * the project board in a run, because "work done for clients" read as client delivery. The model's answer is "none" for both, and a "none"
 * is what makes the conversation ask. This holds the words the model is given, which is where the fix is: no word list, no default board.
 * It is proven on the real model by the typed-situation harness, not here.
 */
describe('what the model is told about a vague text and about fee notes', () => {
  it('a lead who says only that something is wrong has named no kind', () => {
    expect(THE_KIND_OF_WORK_PROMPT).toContain('says only that something is wrong, or that they are worried, without saying who is involved or what the work is, has not named a kind: give none');
  });
  it('"the business" is not the leadership team', () => {
    expect(THE_KIND_OF_WORK_PROMPT).toContain('"The business", "the company" or "my team" with something going wrong is not leadership.');
  });
  it('money clients owe for work done is not client delivery, and not a loan', () => {
    expect(THE_KIND_OF_WORK_PROMPT).toContain('is not client delivery');
    expect(THE_KIND_OF_WORK_PROMPT).toContain('is not a loan');
  });
  it('and "none" is an answer the product reads as no kind, so the conversation asks', () => {
    expect(oneOfTheKinds('none')).toBeNull();
  });
});
