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
    expect(guarded).toMatch(/this\.logger\.warn\(`entry chat: \$\{wrong\.fault\} - asking again\.`\)/);
  });

  /**
   * AND IT ASKS AGAIN, RATHER THAN NOTING THAT IT WENT WRONG.
   *
   * The first version of this only logged: a streamed reply has already left, so there is no second
   * attempt to make. Watched in a browser, that was wrong in the way that matters. Four of five turns
   * of a real setup conversation tripped a guard and the person saw every one of them, including a
   * lecture about recall sessions that ended in the same question she had just declined.
   *
   * A log nobody is reading while she is on the screen is not a guard. It is a note about a guard.
   */
  it('asks again with the fault named, rather than only logging it', () => {
    expect(guarded).toMatch(/const wrong = whatIsWrong\(best\)/);
    expect(guarded).toMatch(/this\.anthropic\s*\.respond\(`\$\{system\}/);
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

  it('keeps the second only when it is genuinely better, and never loops', () => {
    expect(guarded).toMatch(/if \(second && !whatIsWrong\(second\)\)/);
    /*
     * ONE RETRY. The definition is called once on the first reply and once on the second, and never
     * again: a flawed reply beats no reply, and a loop here would strand the person it is helping.
     * Two calls is the whole of it, and a third would be a loop creeping in.
     */
    expect(guarded.match(/whatIsWrong\(/g)?.length).toBe(2);
    expect(guarded).toMatch(/the first stands/);
  });
});
