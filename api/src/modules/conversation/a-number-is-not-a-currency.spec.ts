import { VOCABULARY_RULE } from './prompt-library';

/**
 * "$4M TARGET" ON A NIGERIAN SALES TEAM.
 *
 * Read live, 22 September 2026. The lead pasted "4m" for Amina; the product wrote "What moved for
 * sales closed against your $4M target?". A target is a number and a name in words by design, so a
 * symbol in front of it is the product deciding what currency somebody is measured in.
 */
describe('a number is not a currency', () => {
  it('the rule is in the block that goes into every prompt', () => {
    expect(VOCABULARY_RULE).toContain('NUMBERS AS THE RECORD HOLDS THEM');
    expect(VOCABULARY_RULE).toContain('Never add a currency symbol');
    expect(VOCABULARY_RULE).toContain('unless the person or the');
  });

  it('and the rule itself carries no currency for anybody to copy', () => {
    const line = VOCABULARY_RULE.slice(VOCABULARY_RULE.indexOf('NUMBERS AS THE RECORD HOLDS THEM'));
    expect(line).toContain('"4m sales" stays "4m sales"');
  });
});
