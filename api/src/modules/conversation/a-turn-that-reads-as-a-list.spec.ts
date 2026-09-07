/**
 * THE RULE AND THE PRODUCT DID NOT AGREE, AND MEASURING SAID WHICH ONE WAS WRONG.
 *
 * The register's finding was "a reply asks three questions at once". Counted against 1,644 real
 * AI turns: 1,011 carry one question mark, 347 carry two, 56 carry three or more. So 28% of
 * question-bearing turns broke a rule the prompt states three times over.
 *
 * The obvious structural fix - trim everything after the first question mark - was measured
 * against real turns before being built, and it would have made the product WORSE. Three of four
 * sampled two-mark turns are not two questions at all:
 *
 *   "That's the heart of it, isn't it? ... Who has the authority to decide?"   <- rhetorical tag
 *   "Is there anything written down? A brief, a plan, even an email?"          <- examples
 *
 * Trimming at the first mark cuts the real question in the first case and the helpful specifics
 * in the second. A question-mark count is not a question count.
 *
 * The genuine violation is narrower and it clusters: turns that announce a list - "Two questions
 * to make that more specific. First, what is 'it'? And second, what's 'by the end'?" - on the
 * goal-defining step. Those two ARE halves of one fact, which is why the model bundles them and
 * why fighting the bundling is wrong. What is wrong is the shape: a turn that reads as a list
 * gets answered as a list, one half gets answered, and the other half looks avoided.
 *
 * Nothing mechanical treats an unanswered half as evasion - checked, and the synthesis rules
 * explicitly forbid inferring evasion from a thin record - so this is a writing fault and it is
 * fixed where writing faults belong. Not everything belongs in a guard; a guard that mangles
 * good prose is worse than the fault it removes.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

/*
 * COMMENTS STRIPPED, and the meta-guard was right to insist. This file asserts that a RULE the
 * model is handed says certain things - and prompt-library.ts explains its own rules in long
 * comments right beside them, so every assertion here could have passed on an explanation of the
 * rule rather than the rule itself. That is the whole failure mode a-guard-that-a-comment-
 * satisfies-is-not-a-guard.spec.ts exists to catch, and it caught mine.
 */
const library = readFileSync(join(__dirname, 'prompt-library.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

describe('the one-question rule', () => {
  it('still says one question', () => {
    expect(library).toMatch(/Ask one question per response/);
  });

  it('names the goal step alongside evidence, because both are halves of one fact', () => {
    const rule = library.slice(library.indexOf('ONE QUESTION RULE:'), library.indexOf('TIMEFRAME RULE'));
    expect(rule).toMatch(/naming a goal/);
    expect(rule).toMatch(/by when/);
  });

  it('forbids the shape that was actually observed, not the question count', () => {
    const rule = library.slice(library.indexOf('ONE QUESTION RULE:'), library.indexOf('TIMEFRAME RULE'));
    expect(rule).toMatch(/First \.\.\. And second/);
    expect(rule).toMatch(/answered as a list/);
  });

  it('and protects the two things a question-mark count would have destroyed', () => {
    const rule = library.slice(library.indexOf('ONE QUESTION RULE:'), library.indexOf('TIMEFRAME RULE'));
    expect(rule).toMatch(/rhetorical tag/);
    expect(rule).toMatch(/fragment that gives examples/);
  });
});
