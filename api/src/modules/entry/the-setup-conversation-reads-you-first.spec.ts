import { SETUP_IS_DONE } from './setup-is-the-first-check-in';
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

  /*
   * CHANGED 4 November 2026 (fix plan, release batch 1, group 5). These pinned "ONE QUESTION, AND SAY WHY IT HELPS", her example "It helps
   * to keep a definition of what clear success looks like" and two or three example answers for every abstract question. Copied word for
   * word into every setup, they are what round 39's leads called a chatbot ("It helps to know what else you would look for, like feedback
   * from schools"), and the law firm got sales examples. The rule is gone; one question at a time, plainly, stays.
   */
  it('asks one thing, plainly, and never announces what it needs', () => {
    expect(SRC).toMatch(/ASK FOR ONE THING, PLAINLY, THE WAY A COLLEAGUE WOULD/);
    expect(SRC).toMatch(/Never "I need to know"/);
  });

  it('gives no reason for the question and no list of example answers', () => {
    expect(SRC).not.toContain('It helps to keep a definition of what clear');
    expect(SRC).not.toMatch(/AND SHOW WHAT AN ANSWER COULD LOOK LIKE|ONE QUESTION, AND SAY WHY IT HELPS/);
    expect(SRC).not.toMatch(/# A question carries its reason/);
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

/*
 * AND THE FOUR THINGS SHE READ BACK OFF THE NEXT RUN.
 */
describe('the first question fits the situation, and the context tab exists', () => {
  it('works out the situation before asking, when they described their own', () => {
    /* Every one of the twenty-two has its own first question and they only ever reached somebody
       who clicked a card. Describe your own and the generic opener asked for what she had written. */
    expect(SRC).toMatch(/WORK OUT WHICH SITUATION THIS IS BEFORE ASKING THE FIRST QUESTION/);
    expect(SRC).toMatch(/const scenarioForTheQuestion = scenarioInput/);
    expect(SRC).toMatch(/buildSetupPrompt\(ONBOARD_SYSTEM, scenarioForTheQuestion, momentInput\)/);
  });

  /* Changed 22 November 2026: it ran on the first turn only, so an unsure first read was never read again and the check-in was saved as a
     new project. It now reads on every turn until a situation is known, and not once the screen sends one back. */
  it('and on every turn until a situation is known, never once one is', () => {
    expect(SRC).not.toMatch(/const firstTurn =/);
    /* And while the kind of work is not read yet, with the situation already read kept (22 November 2026, the kind's one reading). */
    expect(SRC).toMatch(/const reading = \(!scenarioInput \|\| !soFar\?\.kindOfWork\) && theirWords\.trim\(\)\.length > 12/);
    expect(SRC).toMatch(/const scenarioForTheQuestion = scenarioInput \? scenarioInput : reading\?\.scenario/);
  });

  /*
   * The last line of setup has one owner, the product (SETUP_IS_DONE), and it says where documents and further context go. The prompt
   * used to tell the model to write its own closer too; in round 6 of the first experience (1 November 2026) the model said "You can
   * add David, Sarah, John, and Emily below" while the conversation was still on screen, and the lead found nothing below.
   */
  /* Changed in F5: the last line no longer points at the Context tab or anything below; it says the invitations go when she sends them. */
  it('the product writes the last line', () => {
    expect(SETUP_IS_DONE).toMatch(/Send the invitations when you are ready\./);
    expect(SRC).toMatch(/THE END OF SETUP IS THE PRODUCT'S, NOT YOURS/);
    expect(SRC).not.toMatch(/their\s+board is ready and they can add their team below/);
  });
});

/*
 * AND THE CHECK-IN AFTER IT, WHICH IS A DIFFERENT PROMPT AND HAD THE SAME FAULTS.
 */
describe('the check-in after setup does not start again', () => {
  it('treats everything setup settled as answered', () => {
    expect(SRC).toMatch(/# Setup is finished, and everything in it is answered/);
    expect(SRC).toMatch(/Not\s+one of those may be asked for again/);
  });

  it('and stops asking after two I-do-not-knows', () => {
    /* Read live: three versions of the same unanswerable question in a row. */
    expect(SRC).toMatch(/# Twice is enough/);
    expect(SRC).toMatch(/Never ask a third version of the same question/);
  });
});
