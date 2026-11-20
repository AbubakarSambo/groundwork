import { readFileSync } from 'fs';
import { join } from 'path';
import { aLastTimeInTheirOwnWords } from './a-last-time-is-their-own-words';

/**
 * "YOU SAID LAST TIME" IS CHECKED IN EVERY REPLY (fix plan 16 November, group 5; end-to-end I-11, Amani's week 3).
 * Amani wrote, every week, "Nothing is blocking me." The check-in's second message of week 3 told him: "You said last time you were waiting on
 * a decision from another team. Did that decision come through for you?" The same check had only ever run on the opening.
 */
const theirWords = [
  'Week 1: I closed 3 deals and sent two quotes to Kilele Foods. The signed order for Kilele is attached on Friday',
  'Nothing is blocking me. That is all for this week, thanks',
  'Week 2: I closed 4 deals and sent two quotes to Kilele Foods. The signed order for Kilele is attached on Friday',
].map((text, i) => ({ text, at: new Date(Date.UTC(2026, 10, 17 + i * 7)) }));

describe('"you said last time" in a reply in the middle of a check-in', () => {
  it('a claim nothing Amani wrote supports is cut, and the question that pointed at it is asked plainly', () => {
    const reply = 'You said last time you were waiting on a decision from another team. Did that decision come through for you?';
    const out = aLastTimeInTheirOwnWords(reply, theirWords, { keepWhatIsTheirs: true });
    expect(out.changed).toBe(true);
    expect(out.text).toBe('What has moved since your last check-in?');
    expect(out.text).not.toMatch(/decision|another team|you said/i);
  });

  it('what he did write is left exactly as the reply said it, and nothing else in the reply is touched', () => {
    const reply = 'You said last time the signed order for Kilele would be attached on Friday. Did it go out?';
    const out = aLastTimeInTheirOwnWords(reply, theirWords, { keepWhatIsTheirs: true });
    expect(out).toEqual({ text: reply, changed: false });
    const plain = 'You closed four deals this week. What is still slowing things down?';
    expect(aLastTimeInTheirOwnWords(plain, theirWords, { keepWhatIsTheirs: true })).toEqual({ text: plain, changed: false });
  });

  it('the opening keeps its own behaviour: what is theirs is put back in their own words with the day', () => {
    const reply = 'Last time you said the signed order for Kilele would be attached on Friday. Did it go out?';
    expect(aLastTimeInTheirOwnWords(reply, theirWords).text).toMatch(/^You wrote on .*: “.*signed order for Kilele is attached on Friday”/);
  });

  it('every reply of a check-in goes through it, after the number check and before the day check', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    const at = (needle: string) => src.indexOf(needle);
    const asked = at('aLastTimeInTheirOwnWords(screened.text');
    expect(asked).toBeGreaterThan(at('withoutTheClaimsTheNumbersDoNotSupport(screened.text'));
    expect(asked).toBeLessThan(at('withoutADateNobodyGave(screened.text'));
  });
});
