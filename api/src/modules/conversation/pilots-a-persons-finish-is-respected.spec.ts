import { ConversationService } from './conversation.service';
import { tooFewAnswersToFinish, NOT_ENOUGH_YET_TO_FINISH_HERE } from './close-readiness';
import { theFloorFor } from './how-short-a-check-in-may-be';

/**
 * PILOTS, 13 OCTOBER 2026, PROBLEM 4. Kevin answered four questions on WhatsApp, wrote "Nothing else today.", then
 * "finish", and was told three times in a row "I need a little more from you before this check-in can close."
 * The plan wants three to five short messages. A person's own finish is honoured once they have answered three
 * times; Groundwork still asks its questions up to its own close at five.
 */
const KEVIN = [
  'Visited both shops, Wema Mini Mart and Baraka Stores.',
  'Wema wants 8, quote sent today.',
  'I will call Baraka on Monday myself.',
  'Nothing else today.',
];

function kevinsCheckIn(answers: string[]) {
  const finished: any[] = [];
  const svc = Object.create(ConversationService.prototype) as any;
  svc.openTheDoor = jest.fn(async () => ({ id: 'c-4', groundId: 'g-1', participantId: 'p-kevin', isSelfCorrection: false, sessionNumber: 3 }));
  svc.prisma = {
    conversationTurn: { findMany: jest.fn(async () => answers.map((content) => ({ content }))) },
    ground: { findUnique: jest.fn(async () => ({ scenario: 'TEAM_DAILY' })) },
  };
  svc.finishTheSession = jest.fn(async (c: any) => { finished.push(c.id); return { status: 'completed' }; });
  return { svc, finished };
}

describe("a person's finish is respected after three answers", () => {
  it('Kevin, four answers and "finish": the check-in completes, and nothing asks him for more', async () => {
    const { svc, finished } = kevinsCheckIn(KEVIN);
    await expect(svc.complete('c-4', 'u-kevin', { waitForTheCard: false })).resolves.toEqual({ status: 'completed' });
    expect(finished).toEqual(['c-4']);
  });

  it('the word "finish" in the app is no longer refused at four answers', () => {
    expect(tooFewAnswersToFinish(4, false, null)).toBe(false);
    expect(tooFewAnswersToFinish(3, false, null)).toBe(false);
  });

  it('with two answers it still asks for one more, which the person can give', async () => {
    const { svc } = kevinsCheckIn(KEVIN.slice(0, 2));
    await expect(svc.complete('c-4', 'u-kevin', {})).rejects.toMatchObject({ response: { canContinue: true } });
    expect(tooFewAnswersToFinish(2, false, null)).toBe(true);
    expect(NOT_ENOUGH_YET_TO_FINISH_HERE).toMatch(/^I need a little more from you/);
  });

  it('Groundwork still asks its own questions up to five before it closes on its own', () => {
    expect(theFloorFor(false, null)).toBe(5);
  });
});

import { readFileSync } from 'fs';
import { join } from 'path';
import { askedToFinish } from './close-readiness';
import { alreadyAskedTwice, anAnsweredQuestionAskedAgain, withoutTheQuestionAskedAgain } from './asked-twice-and-told-no-twice';
import { endingOnTheClose } from './the-close-says-what-comes-next';

describe('a person saying they are done closes the check-in, whatever the model wrote', () => {
  it('David\'s "I told you ... I am done." and Kevin\'s "Done for today." are both read as finishing', () => {
    expect(askedToFinish(['I told you, the title search came back yesterday. It is not blocked. I am done.'])).toBe(true);
    expect(askedToFinish(['The Wema quote. Done for today.'])).toBe(true);
    expect(askedToFinish(['I have to go to court now.'])).toBe(true);
  });

  it('the reply David got loses its question and ends on the close, so he is asked nothing more', () => {
    const closed = endingOnTheClose('Understood. What is the date you will have an answer by?', 'whatsapp');
    expect(closed).toBe('Understood.\n\nThat’s all for today. Reply "finish" to close this check-in, and your report will come here.');
    expect(closed).not.toContain('?');
  });

  it('the product closes on their word once three answers are in, not only when the model stops asking', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    /* Since the reviewer's 14 October pass, leaving before three answers closes too (leavingEarly). */
    expect(src).toContain("const theyAreLeaving = (!answeringAnOffer && askedToFinish([message]) && !tooFewAnswersToFinish(personTurnCount + 1");
    expect(src).toContain('|| leavingEarly;');
    expect(src).toContain('(hadCloseMarker || theyAreLeaving || this.closesInOtherWords(reply, message))');
    expect(src).toContain("const sessionComplete = close.ready && (theyAreLeaving || !stillAsking(aiTurn.content ?? ''));");
  });
});

describe('a question already answered is not asked again', () => {
  const ASKED = 'Last time you said delivery for Kilele Hotel was happening on Wednesday. Did that happen?';
  const AGAIN = 'You said delivery for Kilele Hotel was happening on Wednesday. Did that happen?';
  const KEVIN_SESSION = [
    { role: 'AI' as const, content: ASKED },
    { role: 'PERSON' as const, content: 'Delivered Kilele today. Also visited both shops, Wema Mini Mart and Baraka Stores.' },
    { role: 'AI' as const, content: 'What is the specific next action for Wema Mini Mart or Baraka Stores, and by when?' },
    { role: 'PERSON' as const, content: 'Wema wants a quote for 8 units by Friday. Baraka will call me next week.' },
  ];

  it('Kevin\'s Kilele question, asked again after "Delivered Kilele today", is caught', () => {
    expect(anAnsweredQuestionAskedAgain(KEVIN_SESSION, AGAIN, () => true)).toEqual({ ask: ASKED, answer: KEVIN_SESSION[1].content });
  });

  it('and when it cannot be moved on, the question and the sentence it rests on come out together', () => {
    expect(withoutTheQuestionAskedAgain(`Thanks. ${AGAIN}`, [ASKED])).toBe('Thanks.');
  });

  it('a third ask with a short question is caught too', () => {
    expect(alreadyAskedTwice(AGAIN, [ASKED, 'Something else entirely, is it?', ASKED])).toBe(true);
  });

  it('a different question with the same short ending is not', () => {
    expect(anAnsweredQuestionAskedAgain(KEVIN_SESSION, 'You said Wema wants a quote for 8 units by Friday. Did that happen?', () => true)).toBeNull();
  });
});

import { theyCorrectedUs, asksAboutWhatTheyCorrected } from './asked-twice-and-told-no-twice';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy a check (a-guard-that-a-comment-satisfies-is-not-a-guard). */
const withoutComments = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');


describe('a correction in the chat is taken, and the corrected thing is not asked again (Hafsah’s principle)', () => {
  const LAST = 'For the title search you mentioned, what have you done to unblock it so far?';
  const DAVID = 'I told you, the title search came back yesterday. It is not blocked.';
  it('David’s words are read as a correction, as are the others people use', () => {
    expect(theyCorrectedUs(DAVID)).toBe(true);
    expect(theyCorrectedUs('It was David, not Otieno.')).toBe(true);
    expect(theyCorrectedUs('That is wrong, the filing went in on the 19th.')).toBe(true);
    expect(theyCorrectedUs('The title search came back yesterday.')).toBe(false);
  });
  it('the unblock question, and its follow-up for a date, are caught; a question about something else is not', () => {
    expect(asksAboutWhatTheyCorrected(DAVID, 'Thanks. What have you done to unblock the title search?', LAST)).toBe(true);
    expect(asksAboutWhatTheyCorrected(DAVID, 'Understood. What is the date you will have an answer by?', LAST)).toBe(true);
    expect(asksAboutWhatTheyCorrected(DAVID, 'Good. What is left on the Lakeview lease documents?', LAST)).toBe(false);
  });
  it('the conversation takes the correction before anything else is checked', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(src).toContain('if (theyCorrectedUs(message) && asksAboutWhatTheyCorrected(message, screened.text, theAskTheyCorrected)) {');
  });
});

describe('once they say it is not blocked, nothing asks what is holding it up', () => {
  it('Chidi’s "What specifically is the hold-up with Kasarani?" is caught (local run, 14 October)', () => {
    expect(asksAboutWhatTheyCorrected('I told you, the title search came back yesterday. It is not blocked.', 'My mistake. So the title search is back and it is not blocked. What specifically is the hold-up with Kasarani?', 'What specific input do you need from that other team?')).toBe(true);
  });
});

describe('a correction pointing at proof already sent is accepted (reviewer, 14 October)', () => {
  it('Grace is not asked to describe the screenshot Kevin sent', () => {
    const grace = 'I told you, Kevin already sent the M-Pesa screenshot.';
    expect(theyCorrectedUs(grace)).toBe(true);
    expect(asksAboutWhatTheyCorrected(grace, 'Thanks. Can you describe what the screenshot shows, the amount and the date?', 'What shows the Kilele payment came in?')).toBe(true);
    expect(asksAboutWhatTheyCorrected(grace, 'Good. What is next for Bahari Cafe this week?', 'What shows the Kilele payment came in?')).toBe(false);
  });
});

describe('the question just asked is never the next one (reviewer, 14 October)', () => {
  const { repeatsTheLastAskWordForWord, withoutTheQuestionAskedAgain } = require('./asked-twice-and-told-no-twice');
  it('Mercy is not asked the same question twice in a row', () => {
    const last = 'What is the next step for Greenfield, and by when?';
    const again = 'Understood. What is the next step for Greenfield, and by when?';
    expect(repeatsTheLastAskWordForWord(again, last)).toBe(true);
    expect(withoutTheQuestionAskedAgain(again, [last])).toBe('Understood.');
  });
  it('and the conversation takes it out whether or not it was answered', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(src).toContain('if (lastAskHere && (repeatsTheLastAskWordForWord(screened.text, lastAskHere) || asksItAgainAfterTheAnswer(lastAskHere, screened.text))) {');
  });
});

import { WHAT_YOU_SAID_IS_KEPT, NOTHING_KEPT_YET_COME_BACK } from './a-finish-too-soon-is-said-plainly';
import { askedToFinish as leaving, isTheWordFinish as theWord } from './close-readiness';

/* REVIEWER, 14 OCTOBER: "I am done" and "I have to go" before three answers close the check-in, and nothing more is asked. */
describe('leaving before three answers is honoured', () => {
  it('"I am done" and "I have to go" are leaving; the bare word "finish" still asks for the rest', () => {
    for (const m of ['I am done', 'I have to go']) { expect(leaving([m])).toBe(true); expect(theWord(m)).toBe(false); }
    expect(theWord('finish')).toBe(true);
  });
  it('what they read is one plain sentence with no question', () => {
    expect(WHAT_YOU_SAID_IS_KEPT('DAILY')).toBe('Thanks. I have what you said so far, and you can add more later today.');
    expect(WHAT_YOU_SAID_IS_KEPT('WEEKLY')).toBe('Thanks. I have what you said so far, and you can add more in your next check-in.');
    expect(`${WHAT_YOU_SAID_IS_KEPT('DAILY')} ${NOTHING_KEPT_YET_COME_BACK}`).not.toMatch(/\?/);
  });
  it('the conversation closes on it and puts that sentence in place of the model\'s question', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(src).toMatch(/const leavingEarly = !answeringAnOffer && askedToFinish\(\[message\]\) && !isTheWordFinish\(message\)/);
    expect(src).toMatch(/if \(leavingEarly\) \{[\s\S]{0,1200}content: close\.ready \? WHAT_YOU_SAID_IS_KEPT\(theirCadence\) : NOTHING_KEPT_YET_COME_BACK/);
  });
});

import { nothingRealWasSaid } from './a-finish-too-soon-is-said-plainly';
import { almostNothingHereYet as theRecordsGate } from './how-short-a-check-in-may-be';

/*
 * PILOT RE-RUN, 14 OCTOBER: full answers ending "That's all." were told "That is not quite enough to keep this check-in yet".
 * That sentence is only for a check-in where nothing was said at all.
 */
describe('"That\'s all." after a real answer is never told it is not enough', () => {
  const MERCY = ['Mama Pima wants 12 units of the 50kg bags at 12,000 each, and I visit her again on Thursday.', "Greenfield has gone quiet since last week. That's all."];
  const KEVIN = ["Kilele Hotel paid for 40 units today, and the M-Pesa confirmation QJK7Y2LM is in my last message. That's all."];
  it('a full answer and an M-Pesa proof are something said; "I am done" alone is not', () => {
    expect(nothingRealWasSaid(MERCY)).toBe(false);
    expect(nothingRealWasSaid(KEVIN)).toBe(false);
    expect(nothingRealWasSaid(['I am done'])).toBe(true);
    expect(nothingRealWasSaid(["That's all.", 'ok'])).toBe(true);
  });
  it('Mercy\'s two full answers pass the record\'s own gate, so "That\'s all." closes with what she said', () => {
    expect(theRecordsGate(MERCY, false)).toBe(false);
  });
  it('the "not enough" sentence is used only when nothing was said, and otherwise the conversation carries on as before', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
    expect(src).toMatch(/const saidNothing = nothingRealWasSaid\(/);
    expect(src).toMatch(/if \(close\.ready \|\| saidNothing\) \{[\s\S]{0,400}content: close\.ready \? WHAT_YOU_SAID_IS_KEPT\(theirCadence\) : NOTHING_KEPT_YET_COME_BACK/);
    expect(src).toMatch(/if \(!sessionComplete && !leavingEarlyHandled && isADeadEnd\(/);
  });
});
