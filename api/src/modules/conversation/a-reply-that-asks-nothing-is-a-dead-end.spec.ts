import { readFileSync } from 'fs';
import { join } from 'path';
import { isADeadEnd, asksSomething, ASK_SOMETHING_OR_CLOSE } from './a-reply-that-asks-nothing-is-a-dead-end';

/**
 * THE TWO REPLIES THAT STRANDED SOMEBODY, kept verbatim from a walked check-in.
 *
 * Both arrived right after the person had given exactly what was asked for, which is the worst
 * moment to go quiet: they have done their part and what comes back acknowledges it and stops.
 */
const STRANDED = [
  'You will go to their team lead directly on Monday.',
  'That is clear: the reconciliation module by 1 September, and the Monday call for weekly priorities.',
];

const FINE = [
  'You expect Zainab to escalate to the CFO. Does Zainab know that this is the expectation?',
  'That is worth knowing. What about Tomi?',
  /* A question without a question mark still asks. Sending these back would be a retry on good work. */
  'Tell me what has changed since last time.',
  'Say more about the finance hold-up.',
];

describe('a reply that asks nothing is a dead end', () => {
  it.each(STRANDED)('catches the ones that stranded somebody: %s', (said) => {
    expect(isADeadEnd(said, false)).toBe(true);
  });

  it.each(FINE)('and leaves a reply that asks alone: %s', (said) => {
    expect(isADeadEnd(said, false)).toBe(false);
  });

  it('a closing turn is allowed to be a statement, because that is the wrap-up', () => {
    for (const said of STRANDED) expect(isADeadEnd(said, true)).toBe(false);
  });

  it('and nothing at all is not a dead end, because there is another guard for that', () => {
    expect(isADeadEnd('', false)).toBe(false);
    expect(isADeadEnd(null, false)).toBe(false);
  });

  it('a question mark is enough, wherever it sits', () => {
    expect(asksSomething('What about Tomi?')).toBe(true);
    expect(asksSomething('Is that right, or have I got it backwards?')).toBe(true);
    expect(asksSomething('You will go on Monday.')).toBe(false);
  });

  it('the instruction asks for a question and does not supply one', () => {
    /*
     * The whole point. A canned question here would be the product doing the model's job, and the
     * question is the most valuable thing in a check-in because it comes from what THIS person just
     * said. Code holds the shape; the model writes the words.
     */
    expect(ASK_SOMETHING_OR_CLOSE).toContain('in your own words');
    expect(ASK_SOMETHING_OR_CLOSE).toContain('end the session instead');
    expect(ASK_SOMETHING_OR_CLOSE).not.toMatch(/\?/);
  });

  /**
   * AND IT IS WIRED AS A NOTE, WHICH IS NOT WHAT THIS FILE ORIGINALLY SAID.
   *
   * It was a retry: ask again with one instruction, keep the second only if it is genuinely better.
   * Measured on 17 September 2026, four retries of this shape fired in one live conversation and all
   * four logged "the second try was no better; the first stands", each having spent a model call of
   * latency on the turn somebody was waiting for. They went together. See DELETES_WHAT_IT_FINDS.
   *
   * This is the one of them with the best case for coming back - a reply with no question in it
   * really does strand somebody - so the detection is asserted here, and the log is what will say
   * whether it happens often enough to be worth a second call.
   */
  /**
   * AND THE LOG ANSWERED THE QUESTION THIS TEST LEFT OPEN.
   *
   * It said: the detection stays, the second model call does not, and the log will say whether it
   * happens often enough to be worth one. It happened - caught live on an open-link conversation
   * five answers in, 23 September 2026, on the turn after somebody described how they vet their
   * suppliers. The person was left with a paragraph and a text box.
   *
   * So the reply is fixed rather than only noted, and still WITHOUT a second model call, which is
   * the thing this test was really protecting: the person waiting on this turn would have paid for
   * that call. One plain question is appended instead. See nobody-is-left-looking-at-a-paragraph.
   */
  it('and is fixed in the reply rather than only noted, still without a second model call', () => {
    const SERVICE = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const at = SERVICE.indexOf('isADeadEnd(screened.text');
    expect(at).toBeGreaterThan(-1);
    const block = SERVICE.slice(at, at + 900);
    expect(block).toMatch(/asked nothing and did not close/);
    /* `asked` was added 1 October 2026 so the question added is never one this check-in already asked. */
    expect(block).toMatch(/withAQuestion\(screened\.text, \{ closing: closingNow, asked: /);
    /* Still no retry: no second respond() between finding it and fixing it. */
    expect(block).not.toContain('ASK_SOMETHING_OR_CLOSE');
    expect(block.slice(0, block.indexOf('withAQuestion'))).not.toContain('this.anthropic');
  });
});

/**
 * AND THE CHECK IS MADE AGAIN WHERE THE ANSWER IS KNOWN.
 *
 * Read live, 23 September 2026, five answers in: "That is a clear picture of the impact you want to
 * have. The goal of 30,000 smallholders with a 30% income increase is ambitious and specific."
 * Nothing to answer, and the conversation was not over. The guard above had let it through because
 * it asks whether the MODEL was closing - it had emitted the close marker - and the product then
 * declined to close, which is the product's call and not the model's.
 */
describe('the model closed and the product did not', () => {
  const SRC = require('node:fs')
    .readFileSync(require('node:path').join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('is caught after the close machinery has ruled', () => {
    const at = SRC.indexOf('if (!sessionComplete && isADeadEnd(aiTurn.content ?? \'\', false))');
    expect(at).toBeGreaterThan(-1);
    /* After the product's own decision, not before it. */
    expect(at).toBeGreaterThan(SRC.indexOf('const sessionComplete = close.ready'));
    expect(SRC.slice(at, at + 400)).toContain("withAQuestion(aiTurn.content ?? '', { closing: false, asked: ");
  });

  /* And `false` is passed deliberately: the question is whether the PRODUCT closed, and it did not. */
  it('and asks the product, not the marker', () => {
    const at = SRC.indexOf('if (!sessionComplete && isADeadEnd(aiTurn.content ?? \'\', false))');
    expect(SRC.slice(at, at + 400)).not.toContain('closingNow');
  });

  /* The early guard stays: it runs on every turn the close machinery never reaches. */
  it('and the earlier guard is still there', () => {
    expect(SRC).toContain('if (isADeadEnd(screened.text, closingNow))');
  });
});
