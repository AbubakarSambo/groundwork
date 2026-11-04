import { ENGINE_RULES, SCENARIO_PACKS } from './prompt-library';

/**
 * A QUESTION IS ASKED PLAINLY, THE WAY A COLLEAGUE WOULD.
 *
 * REWRITTEN 4 November 2026 (fix plan, release batch 1, group 5). This pinned a rule that every question carries a reason ("It helps to
 * keep a definition of what clear success looks like.") and two or three example answers. Copied word for word into setup and the
 * check-in, it is what the leads in rounds 37 to 39 called a chatbot: "It helps to know what each person is working towards" sounded like
 * teaching her her job, and the law firm got sales examples. The rule is gone; answering a request for an example stays.
 */
describe('a question is asked plainly', () => {
  it('the engine no longer tells the model to give a reason and examples with each question', () => {
    expect(ENGINE_RULES).not.toMatch(/A QUESTION CARRIES ITS REASON/);
    expect(ENGINE_RULES).not.toContain('It helps to keep a definition of what clear success looks like.');
    expect(ENGINE_RULES).not.toMatch(/THE EXAMPLE, WHENEVER YOU ASK FOR SOMETHING ABSTRACT/);
  });

  it('but when somebody asks for an example, they get one from their own situation', () => {
    expect(ENGINE_RULES).toMatch(/They ask for examples, you give two or three from their own situation/);
  });
});

describe('two or three is a suggestion', () => {
  it('and says so, rather than cutting somebody off at three', () => {
    expect(SCENARIO_PACKS.OKR_ALIGNMENT).toMatch(/it is a suggestion, never a limit/);
    expect(SCENARIO_PACKS.OKR_ALIGNMENT).toMatch(/somebody with five real goals has five/);
    expect(SCENARIO_PACKS.OKR_ALIGNMENT).not.toMatch(/Two or three things at most/);
  });
});
