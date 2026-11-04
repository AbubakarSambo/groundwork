import { safeToUse, composePrompt, STYLE } from './the-model-words-it-and-nothing-more';

/**
 * A WRONG NUMBER READS EXACTLY LIKE A RIGHT ONE.
 *
 * That is the whole reason the model rewords a finished answer rather than being handed the data
 * and asked to answer. A target of fourteen where the record says eleven is invisible to the person
 * reading it, invisible in review, and wrong in the one way that matters - it is about their work
 * and they will act on it.
 *
 * So every digit in what comes back has to appear in what went out. Blunt, and it is the check that
 * counts: reorder and reword freely, invent a number and we ship the record's own words instead.
 */
const DRAFT = 'You own 2:\n- Reduce onboarding to under 11 days (target: 11), due Wed Sep 30 2026';

describe('the model words it and nothing more', () => {
  it('accepts a genuine rewording', () => {
    expect(safeToUse(DRAFT, 'You own 2 objectives. Reduce onboarding to under 11 days, target 11, due Wed Sep 30 2026.')).toBe(true);
  });

  it('REFUSES an invented number, however plausible', () => {
    expect(safeToUse(DRAFT, 'You own 2 objectives. Reduce onboarding to under 14 days.')).toBe(false);
  });

  it('refuses a changed count even when everything else is right', () => {
    expect(safeToUse(DRAFT, 'You own 3:\n- Reduce onboarding to under 11 days (target: 11), due Wed Sep 30 2026')).toBe(false);
  });

  it('allows numbers to be reordered or repeated, because that is not invention', () => {
    expect(safeToUse(DRAFT, 'Due Wed Sep 30 2026: reduce onboarding to under 11 days. Target 11. You own 2.')).toBe(true);
  });

  it('refuses an empty or missing reply', () => {
    expect(safeToUse(DRAFT, '')).toBe(false);
    expect(safeToUse(DRAFT, null)).toBe(false);
    expect(safeToUse(DRAFT, undefined)).toBe(false);
  });

  it('refuses a model that has started explaining itself', () => {
    expect(safeToUse(DRAFT, "Sure! Here's a clearer version: you own 2.")).toBe(false);
    expect(safeToUse(DRAFT, "Certainly. You own 2.")).toBe(false);
  });

  it('refuses an answer far longer than the draft', () => {
    /* Longer than the thing it was asked to shorten means it has started adding. */
    expect(safeToUse(DRAFT, DRAFT + ' '.repeat(10) + 'and here is a great deal more context '.repeat(20))).toBe(false);
  });

  it('accepts a draft with no numbers at all', () => {
    const plain = 'Nothing your organisation has sent me lists you as an owner.';
    expect(safeToUse(plain, 'Nothing sent to us lists you as an owner.')).toBe(true);
  });
});

describe('the draft reaches the model as data', () => {
  it('is fenced and labelled rather than interleaved with the instructions', () => {
    /* Everything in a draft came from a customer's own systems, and an objective titled like an
       instruction is exactly the carrier an injection needs. */
    expect(composePrompt('hello')).toBe('<draft>\nhello\n</draft>');
  });

  it('the style forbids adding facts, in the prompt as well as in the check', () => {
    /* Belt and braces: the instruction asks, and safeToUse enforces. Only one of them is load
       bearing and it is not the instruction. */
    expect(STYLE).toMatch(/Do not add facts/i);
    expect(STYLE).toMatch(/Change nothing factual/i);
  });
});

describe("the product's reasoning is never put in the reader's mouth", () => {
  const { safeToUse } = require('./the-model-words-it-and-nothing-more');
  it('a wording that introduces "you described" where the draft had none is refused', () => {
    const draft = 'Where this kind of work gets misread: a sales rep can feel like a failure. Their internal clock is out of sync with the buyer\'s process. That process takes weeks and is invisible to them.';
    expect(safeToUse(draft, 'You described how a sales representative feels like a failure because of an internal clock that is out of sync with the buyer\'s process.')).toBe(false);
    expect(safeToUse(draft, 'Sales work gets misread when the buyer\'s process takes weeks and stays invisible; silence is usually a stage, not a no.')).toBe(true);
  });
  it('but a draft that already carries the attribution keeps it', () => {
    expect(safeToUse('You said you would send the proposal by Wednesday.', 'You said the proposal goes out by Wednesday.')).toBe(true);
  });
});
