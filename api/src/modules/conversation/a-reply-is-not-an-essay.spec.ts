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

  it('holds the close to three sentences, which is the shortest turn and not the longest', () => {
    /*
     * This used to assert the opposite: a hundred words passed as a close because a close was
     * allowed a hundred and forty. The prompt had said "the closing turn is the shortest turn of
     * the session" and "three sentences at most" the whole time, and the two rules had been
     * disagreeing for as long as both existed. Put to Hafsah with both arguments on 15 September
     * 2026; she took the three sentences, because the report shows them their whole record the
     * moment the session ends and reading it back first says the same thing twice.
     */
    const close = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ');
    expect(isAnEssay(close, false)).toBe(true);
    expect(isAnEssay(close, true)).toBe(true);
  });

  it('is a number somebody can argue with, not a feeling', () => {
    expect(A_REPLY_IS_ABOUT).toBe(60);
  });

  it('asks for it shorter without asking for it different', () => {
    expect(SAY_IT_SHORTER).toMatch(/Keep the question and whatever you were genuinely giving them/);
    expect(SAY_IT_SHORTER).toMatch(/drop the explaining, the restating and the reasons for asking/);
  });

  /* Changed 4 November 2026 (fix plan, group 5): the setup path no longer reads its replies for length after the fact, so this reads
     only the check-in, which keeps the check. */
  it('reaches the check-in', () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '');
    const checkIn = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(checkIn).toMatch(/isAnEssay\(screened\.text, thisIsTheClosingTurn\)/);
  });
});

/*
 * Decided by Hafsah on 15 September 2026, with both arguments put to her: the close may run to a
 * hundred and forty words, or it is three sentences. She took the three sentences, and the reason
 * that settles it is that the report shows them their whole record the moment the session ends.
 */
describe('and the close is the shortest turn, not the longest', () => {
  const { isAnEssay: essay, A_CLOSE_IS_AT_MOST, A_CLOSE_STILL_FITS_IN, howManySentences, A_CLOSE_IS_THREE_SENTENCES } =
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./a-reply-is-not-an-essay');

  const aRealClose = 'You said you will speak to Rita on Thursday. That is on your board, and the report is yours now. Speak soon.';

  it('three sentences is a close', () => {
    expect(howManySentences(aRealClose)).toBe(A_CLOSE_IS_AT_MOST);
    expect(essay(aRealClose, true)).toBe(false);
  });

  it('four is not, however short they are', () => {
    expect(essay(`${aRealClose} One more thing.`, true)).toBe(true);
  });

  it('and three enormous ones are not either, which is why the word backstop is there', () => {
    const padded = `${'word '.repeat(A_CLOSE_STILL_FITS_IN + 5)}. Two. Three.`;
    expect(essay(padded, true)).toBe(true);
  });

  it('the close that was read live - 72 words, six sentences - would now be asked again', () => {
    const asItLanded =
      "You're looking at procurement as the main risk for the two biggest accounts. You've clearly identified your next steps: speaking to Rita on Thursday to confirm the new numbers, and adjusting Amir's target. Before we close: you said you will speak to Rita on Thursday and confirm the new numbers with Amir. That is on your board. Your report is ready now, and nothing in it needs acting on today. Speak soon.";
    expect(essay(asItLanded, true)).toBe(true);
  });

  it('and the retry asks for what a close is for, not merely for fewer words', () => {
    expect(A_CLOSE_IS_THREE_SENTENCES).toMatch(/Three sentences at most/);
    expect(A_CLOSE_IS_THREE_SENTENCES).toMatch(/in their own words, with its date/);
    expect(A_CLOSE_IS_THREE_SENTENCES).toMatch(/saying the same thing twice/);
  });
});
