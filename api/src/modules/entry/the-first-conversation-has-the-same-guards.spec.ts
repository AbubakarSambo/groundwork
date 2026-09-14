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
    ['a reply that asks nothing', /isADeadEnd\(restored/],
    ['a reply that opens by repeating them', /opensByRepeatingThem\(theirLast, restored\)/],
    ['a question asked again after they said no', /theyPushedBackOnTheQuestions\(theirLast\)/],
    ['the same question a third time', /alreadyAskedTwice\(restored, asksBefore\)/],
  ])('checks for %s', (_name, pattern) => {
    expect(guarded).toMatch(pattern as RegExp);
  });

  it('names the fault and the reply in the log, so it is findable without a lead reporting it', () => {
    expect(guarded).toMatch(/this\.logger\.warn\(`entry chat: \$\{faults\.join/);
  });

  it('and changes not one word of what she reads', () => {
    /* There is no second attempt to make on this path: the stream has usually already left. The
       value is that the fault is visible with the reply that caused it. */
    const from = guarded.indexOf('const theirLast');
    const block = guarded.slice(from, guarded.indexOf('return { reply: forHumans(restored)', from));
    /* Nothing in the checking block assigns to what she is about to read. */
    expect(block).not.toMatch(/\brestored\s*=/);
    expect(block).not.toMatch(/screened\s*=/);
    expect(guarded).toMatch(/return \{ reply: forHumans\(restored\)/);
  });
});
