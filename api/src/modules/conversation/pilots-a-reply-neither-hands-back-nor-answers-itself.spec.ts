import { withoutTheirWordsHandedBack, withoutAnAnswerToItsOwnQuestion } from './a-reply-neither-hands-back-their-words-nor-answers-itself';
import { readFileSync } from 'fs';
import { join } from 'path';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy a check (a-guard-that-a-comment-satisfies-is-not-a-guard). */
const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');


/** PILOTS, 13 OCTOBER 2026, E7. Read as Aisha and as Brian. */
describe('a reply does not hand their own words back', () => {
  it('Aisha’s "I have to go to court now." is not said back to her, nor her earlier answer', () => {
    const out = withoutTheirWordsHandedBack('Getting filings in on time. You have to go to court now. Thank you, Aisha.', ['Getting filings in on time.', 'I have to go to court now.']);
    expect(out).toBe('Thank you, Aisha.');
  });
  it('a reply that only says something new is left as it is', () => {
    expect(withoutTheirWordsHandedBack('Good luck in court. What is left on the probate filing?', ['I have to go to court now.'])).toBe('Good luck in court. What is left on the probate filing?');
  });
});

describe('a reply does not ask and answer itself', () => {
  it('Brian’s opener keeps its question and loses the answer it gave for him', () => {
    expect(withoutAnAnswerToItsOwnQuestion("Last time you were about half done with the reply to the plaintiff's letter. Is that now filed? Understood. What is the expected outcome of that letter, and for whom?"))
      .toBe("Last time you were about half done with the reply to the plaintiff's letter. Is that now filed?");
  });
  it('a question with nothing after it is left alone', () => {
    expect(withoutAnAnswerToItsOwnQuestion('Is that now filed?')).toBe('Is that now filed?');
  });
  it('both the opener and every reply are read this way', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    /* Changed 26 October 2026: the opener first puts any "last time you said" in their own words (a-last-time-is-their-own-words.ts). */
    expect(src).toContain('withoutAnAnswerToItsOwnQuestion(theirOwn.text)');
    expect(src).toContain('withoutAnAnswerToItsOwnQuestion(withoutTheirWordsHandedBack(screened.text, theirTurnsHere))');
  });
});
