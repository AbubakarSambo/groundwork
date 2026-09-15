import { ENGINE_RULES } from './prompt-library';
import { A_REPLY_IS_ABOUT, A_CLOSE_IS_AT_MOST } from './a-reply-is-not-an-essay';

/*
 * Decided by Hafsah, 15 September 2026. The prompt told the model to give a LONGER reply to a
 * vague answer - "name the vague language specifically, explain what is missing" - while the code
 * held every reply to sixty words. Her complaint was "the responses are soo long its insane", and
 * the rule behind it was still in the prompt asking for more explaining.
 *
 * Both arguments were put to her: a vague answer produces a thin record, and a thin record is what
 * the product is for. She took the sixty words, on the reasoning that one sharp question does more
 * than an explanation of why the last answer was weak.
 */
describe('one length for every reply, whatever the answer was like', () => {
  it('the prompt no longer asks for a longer reply to a vague answer', () => {
    expect(ENGINE_RULES).not.toMatch(/Vague submission: longer response/);
  });

  it('and says what to do instead, because a rule with no alternative is ignored', () => {
    expect(ENGINE_RULES).toMatch(/A vague answer does NOT earn a longer reply/);
    expect(ENGINE_RULES).toMatch(/name the one thing that is missing and ask for it/);
  });

  it('keeps the reason on record, so nobody re-adds it in six months', () => {
    expect(ENGINE_RULES).toMatch(/That is the rule behind every reply that read as a correction/);
  });

  it('and the prompt now agrees with the code on both numbers', () => {
    expect(ENGINE_RULES).toMatch(new RegExp(`${A_REPLY_IS_ABOUT === 60 ? 'Sixty' : A_REPLY_IS_ABOUT} words`));
    expect(A_CLOSE_IS_AT_MOST).toBe(3);
    expect(ENGINE_RULES).toMatch(/The closing turn is three sentences/);
  });

  it('and does not still say three to five lines somewhere else in the same block', () => {
    const block = ENGINE_RULES.slice(ENGINE_RULES.indexOf('RESPONSE LENGTH:'), ENGINE_RULES.indexOf('DO NOT COMMENT ON ENGAGEMENT'));
    expect(block).not.toMatch(/three to five lines/i);
  });
});
