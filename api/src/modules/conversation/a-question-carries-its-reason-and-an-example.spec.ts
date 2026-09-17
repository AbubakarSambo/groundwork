import { ENGINE_RULES, SCENARIO_PACKS } from './prompt-library';

/**
 * "WHAT DOES HER GOAL LOOK LIKE?" COLD, WITH NOTHING AROUND IT.
 *
 * Read off a live check-in, asked of somebody who had just said she had not worked the number out.
 * Her reply: "i have no fucking clue what you are saying here."
 *
 * There was a rule about showing what an answer looks like and it lived in ONE place: the retry
 * instruction a guard sends after the question has already gone out badly. So the standing prompt,
 * which is what writes the question in the first place, said nothing about it at all - on the
 * signed-in path or the entry path.
 *
 * It is craft, not a correction, so it belongs in the engine every path loads.
 */
describe('a question carries its reason and an example', () => {
  it('the engine asks for the reason, in her own words for what that sounds like', () => {
    expect(ENGINE_RULES).toMatch(/A QUESTION CARRIES ITS REASON/);
    expect(ENGINE_RULES).toContain('It helps to keep a definition of what clear success looks like.');
  });

  it('and for two or three concrete options whenever the question is abstract', () => {
    expect(ENGINE_RULES).toMatch(/THE EXAMPLE, WHENEVER YOU ASK FOR SOMETHING ABSTRACT/);
    expect(ENGINE_RULES).toContain('A distributor list, a photo from a shop visit, an invoice');
  });

  it('from their world, never from somebody else\'s', () => {
    expect(ENGINE_RULES).toMatch(/pipeline, conversion and sign-ups belong to another business/);
  });

  it('and says an example inside a question is still one question', () => {
    /* Otherwise the one-question rule two paragraphs up eats every example that gets written. */
    expect(ENGINE_RULES).toMatch(/An example fragment inside the question is ONE ask, not two/);
  });
});

describe('two or three is a suggestion', () => {
  it('and says so, rather than cutting somebody off at three', () => {
    expect(SCENARIO_PACKS.OKR_ALIGNMENT).toMatch(/it is a suggestion, never a limit/);
    expect(SCENARIO_PACKS.OKR_ALIGNMENT).toMatch(/somebody with five real goals has five/);
    expect(SCENARIO_PACKS.OKR_ALIGNMENT).not.toMatch(/Two or three things at most/);
  });
});
