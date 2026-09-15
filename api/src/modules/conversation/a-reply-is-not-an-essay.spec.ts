import { readFileSync } from 'fs';
import { join } from 'path';
import { isAnEssay, howManyWords, A_REPLY_IS_ABOUT, SAY_IT_SHORTER } from './a-reply-is-not-an-essay';

/**
 * "THE RESPONSES ARE SOO LONG ITS INSANE. THIS SOUNDS ZERO LIKE A HUMAN."
 *
 * Both replies below are off the real transcript. Nothing in the product constrained length: a
 * hundred and thirty-six rules about what to ask and not one about how much to say.
 */
describe('a reply is not an essay', () => {
  const theLecture = "This is a recall session. We're reconstructing a record from memory rather than building one in real time. That means it's less reliable - memory is reconstructed, not recorded. What you share here is what you said. What people said will be in the report. Neither is treated as definitive. You've asked me to set targets for your team and track them. The purpose of this check-in is for you to define those targets and describe how they connect to the company's direction, so that we can clearly record your contribution. This approach helps create a shared picture, which is more useful than a memory contest. So, to return to the last question: how does this objective of 500 contracts connect to the wider company direction as you understand it?";

  it('catches the one she actually got', () => {
    expect(howManyWords(theLecture)).toBeGreaterThan(120);
    expect(isAnEssay(theLecture, false)).toBe(true);
  });

  it('leaves a reply that gives something back and then asks', () => {
    const good = 'Sixty of the hundred and fifty. Rita is a concern. What are you seeing, specifically?';
    expect(howManyWords(good)).toBeLessThan(20);
    expect(isAnEssay(good, false)).toBe(false);
  });

  it('leaves an ordinary question alone', () => {
    expect(isAnEssay('Who owns each of those, and by when?', false)).toBe(false);
    expect(isAnEssay('Got it. Five hundred contracts by the end of the year. What would tell you it was met?', false)).toBe(false);
  });

  it('lets the close run longer, because naming what now exists is worth the words', () => {
    const close = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ');
    expect(isAnEssay(close, false)).toBe(true);
    expect(isAnEssay(close, true)).toBe(false);
  });

  it('is a number somebody can argue with, not a feeling', () => {
    expect(A_REPLY_IS_ABOUT).toBe(60);
  });

  it('asks for it shorter without asking for it different', () => {
    expect(SAY_IT_SHORTER).toMatch(/Keep the question and whatever you were genuinely giving them/);
    expect(SAY_IT_SHORTER).toMatch(/drop the explaining, the restating and the reasons for asking/);
  });

  it('and reaches both conversations', () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '');
    const checkIn = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    const entry = strip(readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8'));
    expect(checkIn).toMatch(/isAnEssay\(screened\.text, closingNow\)/);
    expect(entry).toMatch(/isAnEssay\(text, hadCloseMarker\(text\)\)/);
  });

  it('is checked last on the entry path, so a real fault is fixed for the fault not the length', () => {
    const entry = readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8');
    const fn = entry.slice(entry.indexOf('const whatIsWrong'));
    expect(fn.indexOf('isAnEssay')).toBeGreaterThan(fn.indexOf('opensByRepeatingThem'));
  });
});
