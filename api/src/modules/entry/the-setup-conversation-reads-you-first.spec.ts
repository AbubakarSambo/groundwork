import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * WHAT THE SETUP CONVERSATION DID TO HER IN FOUR TURNS.
 *
 * She opened with: "We are setting goals for the next quarter. I want 40 shops in Kano stocking our
 * tea by the end of Q4, and Sahar and Amina each need their own number under that."
 *
 *   It: "What is the overall goal you want Sahar and Amina to help achieve for the quarter?"
 *   She: "I just said it. 40 shops in Kano by the end of Q4."
 *   It: "I also need to know what Sahar's individual target is, and what Amina's individual target
 *        is, so that their check-ins can track against their own numbers."
 *
 * Four faults in three lines: it asked for what she had already written, it did not acknowledge
 * being told so, it asked two things at once, and it made a demand. None of them is caught by a
 * check on the output, because every sentence is well formed. They are all about what the prompt
 * asks for, so that is where they are fixed.
 */
const SRC = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8');

describe('the setup conversation reads you first', () => {
  it('reads what they typed before it asks anything', () => {
    expect(SRC).toContain('READ WHAT THEY HAVE ALREADY TYPED BEFORE YOU ASK ANYTHING');
    expect(SRC).toMatch(/whatever is already in their message is ANSWERED/);
  });

  it('and knows what to do when it is told it already asked', () => {
    expect(SRC).toMatch(/IF THEY TELL YOU THEY ALREADY SAID IT, THEY ARE RIGHT/);
    expect(SRC).toMatch(/Do not defend the question and do not\n   apologise/);
  });

  it('asks one thing, and never announces what it needs', () => {
    expect(SRC).toMatch(/ONE QUESTION, AND SAY WHY IT HELPS/);
    expect(SRC).toMatch(/Never "I need to know"/);
  });

  it('gives the reason the question is worth answering', () => {
    /* Her own example of what this sounds like. */
    expect(SRC).toContain('It helps to keep a definition of what clear');
  });

  it('and shows what an answer could look like, from their world', () => {
    expect(SRC).toMatch(/AND SHOW WHAT AN ANSWER COULD LOOK LIKE/);
    expect(SRC).toMatch(/A distributor list, a photo from a shop\n     visit, an invoice/);
    expect(SRC).toMatch(/pipeline, conversion and sign-ups are somebody else's/);
  });

  it('never builds a sentence by joining two of their phrases', () => {
    /* "So what Sahar and Amina see on the check-in is the check on the distributor's list." */
    expect(SRC).toMatch(/NEVER BUILD A SENTENCE OUT OF THEIR PHRASES/);
    expect(SRC).toMatch(/say nothing and ask your question/);
  });

  it('and a reason is not a restatement of what this is about', () => {
    expect(SRC).toMatch(/NOT A RESTATEMENT OF WHAT THIS IS ABOUT/);
    expect(SRC).toMatch(/LEAVE IT OUT/);
  });
});
