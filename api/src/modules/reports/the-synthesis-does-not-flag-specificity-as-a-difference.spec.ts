import { SYNTHESIS_RULES } from './reports.service';

/**
 * THE PERSON WHO WAS SPECIFIC IS NOT A DIFFERENCE (fix plan 16 November, group 5; end-to-end I-10, day 90).
 * Wairimu's Today read: "People in this check-in said different things. Amani Wekesa reports progress with a specific number of deals closed,
 * while all other team members report ... as planned." The only difference was that Amani gave a number. The synthesis rule read "If parties
 * described the same topic differently in any session, that is a divergence", which is the sentence that produced it. These rules are added in
 * code to whatever version of the base prompt is stored, so the stored version cannot bring the old sentence back.
 */
describe('the synthesis rules on what a divergence is', () => {
  it('no longer count describing a topic differently as a divergence, and say that being specific is never one', () => {
    expect(SYNTHESIS_RULES).not.toContain('described the same topic differently in any session');
    expect(SYNTHESIS_RULES).toContain('cannot both be true');
    expect(SYNTHESIS_RULES).toContain('BEING MORE SPECIFIC IS NEVER A DIVERGENCE');
    expect(SYNTHESIS_RULES).toContain('A divergence needs two sides, each said by somebody, that conflict.');
  });
});
