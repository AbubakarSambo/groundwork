import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE CONVERSATION EVERY LEAD MEETS FIRST HAD ONE GUARD.
 *
 * Five shape guards were built in one evening, every one of them from a fault a lead hit on a real
 * screen, and every one of them wired into conversation.service and nowhere else. The entry chat -
 * the setup conversation, the first thing anybody sees, the one a new customer meets tomorrow - ran
 * the invention screen and nothing else.
 *
 * Run through it, and it asked her the same question three turns running:
 *
 *   "How does that objective of 500 contracts by year-end connect to the company direction?"
 *   "How does that overall objective of 500 contracts by year-end connect to the company direction?"
 *   "How does this objective connect to the company's overall direction?"
 *
 * She never objected. She answered something adjacent each time, which is what a polite person does.
 *
 * THIRD TIME IN ONE EVENING that a fix sat on a path nobody takes: the start-a-check-in flag no
 * button passed, the target extraction the entry commit never called, and this.
 */
describe('the first conversation has the same guards', () => {
  const src = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const guarded = src.slice(src.indexOf('private async guardedReplyWithClose'));

  it.each([
    ['a reply that asks nothing', /isADeadEnd\(text/],
    ['a reply that opens by repeating them', /opensByRepeatingThem\(theirLast, text\)/],
    ['a question asked again after they said no', /theyPushedBackOnTheQuestions\(theirLast\)/],
    ['the same question a third time', /alreadyAskedTwice\(text, asksBefore\)/],
  ])('checks for %s', (_name, pattern) => {
    expect(guarded).toMatch(pattern as RegExp);
  });

  it('names the fault in the log, so it is findable without a lead reporting it', () => {
    expect(guarded).toMatch(/this\.logger\.warn\(`entry chat: \$\{wrong\.fault\}/);
  });

  /**
   * AND IT NOTES THE FAULT RATHER THAN ASKING AGAIN, WHICH REVERSES WHAT THIS FILE USED TO SAY.
   *
   * The reversal is deliberate and it is worth keeping the old argument visible, because it was a
   * good one: a log nobody reads while somebody is on the screen is a note about a guard, not a
   * guard. That is why the retry was built.
   *
   * WHAT DECIDED IT THE OTHER WAY, on 17 September 2026, was measuring the retry instead of
   * reasoning about it. Four fired in one live conversation and all four logged "the second try was
   * no better; the first stands" - a full model call of latency, on the turn somebody is waiting
   * for, buying nothing. Every one of the retries in the check-in went at the same time, and the
   * invention gate stopped deleting on the same day and for the same reason. See
   * DELETES_WHAT_IT_FINDS.
   *
   * WHAT STAYS IS THE DETECTION, asserted above, because the count is what decides whether any of
   * this earns its place. If the log fills with real faults, the retry comes back aimed with
   * evidence rather than built on a hunch.
   */
  it('notes the fault rather than spending a second model call on it', () => {
    /* Reads the model's reply as restored (14 October: the shape fixes made in code come after it, with no second call). */
    expect(guarded).toMatch(/const wrong = whatIsWrong\(restored\)/);
    expect(guarded).not.toMatch(/this\.anthropic\s*\.respond\(`\$\{system\}\\n\\n\$\{wrong\.instruction\}/);
  });

  it('names a different instruction for each fault, not one scolding for all of them', () => {
    /*
     * DO_NOT_SAY_IT_BACK became doNotSayItBack(theirLast, text): the instruction now quotes the
     * offending sentence back, because asking for "no restatement" in the abstract lost 58 times
     * out of 75 across nineteen live check-ins. Still one named instruction per fault, which is
     * what this spec is for - it is a function rather than a constant now.
     */
    for (const named of ['ASK_SOMETHING_OR_CLOSE', 'THEY_ALREADY_SAID_NO', 'ASKED_IT_TWICE_ALREADY', 'HERS_TO_DRAW', 'doNotSayItBack(']) {
      expect(guarded).toContain(named);
    }
  });

  it('and reads the reply exactly once, because there is no second one to read', () => {
    /* One call now, where there were two: the reply and the retry's. If this ever counts two again,
       a retry has crept back in without the evidence that would justify one. */
    expect(guarded.match(/whatIsWrong\(/g)?.length).toBe(1);
    expect(guarded).not.toMatch(/the first stands/);
  });
});
