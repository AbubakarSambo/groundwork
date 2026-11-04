import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE CONVERSATION EVERY LEAD MEETS FIRST KEEPS ITS SAFETY CHECKS, AND HAS NO WORD MATCHERS AFTER THE FACT.
 *
 * REWRITTEN 4 November 2026 (fix plan, release batch 1, group 5). This spec pinned five shape checks on the setup path (a reply that
 * asks nothing, opens by repeating them, asks again after a no, asks a third time, an essay) and the rewrites that cut a repeated
 * question out of a reply. They only logged or cut sentences after the reply was written, and round 39's eight leads still said setup
 * asked the same things again and again. The fix plan removes them: setup is told what it knows (what-setup-knows) and the model reads
 * what the person means. What stays is safety: nothing invented reaches a person, no internal name, and their own finish ends it.
 * The behaviour is proved on the real served text in setup-as-the-lead-gets-it.spec.ts; this pins the shape of the one exit.
 */
describe('the first conversation has its safety checks and no word matchers', () => {
  const src = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const guarded = src.slice(src.indexOf('private async guardedReplyWithClose'), src.indexOf('private async spokenAsItComes'));

  it('reads the close from what the model wrote before anything cleans the text', () => {
    expect(guarded).toMatch(/const \{ text: reply, hadMarker: closed \} = stripCloseMarker\(raw\)/);
    expect(guarded.indexOf('stripCloseMarker(raw)')).toBeLessThan(guarded.indexOf('aPersonNeverReadsAnInternalName('));
  });

  it('still drops a sentence that invents somebody, and never lets an internal name through', () => {
    expect(guarded).toMatch(/screen\(reply, personSaid\)/);
    expect(guarded).toMatch(/aPersonNeverReadsAnInternalName\(/);
  });

  it.each([
    'isADeadEnd', 'opensByRepeatingThem', 'theyPushedBackOnTheQuestions', 'alreadyAskedTwice', 'asksTheSameThingAgain',
    'isAVerdictAboutSomebodyElse', 'wordsWeDoNotUse', 'isAnEssay', 'withoutTheirWordsHandedBack', 'withoutAnAnswerToItsOwnQuestion',
    'asksAboutTheirJobAgain', 'withoutTheQuestionAskedAgain',
  ])('has no %s on the setup path', (matcher) => {
    expect(src).not.toContain(`${matcher}(`);
  });
});
