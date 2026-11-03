import { theStreamedRouteRunsThePlainRoute } from './__fixtures__/the-streamed-route-is-the-plain-route';
import { readFileSync } from 'fs';
import { join } from 'path';
import { oneThingAsked, howManyQuestions, asksMoreThanOneThing, withTheOneMoreLine, wouldLeaveAQuestionOut, asAnExample } from './a-turn-asks-one-thing';
import { THE_LEADS_DECISION } from './the-close-is-held-once';
import { SentenceGate } from './nothing-invented-reaches-them';

/**
 * Every turn here is a real one, read off runs 8, 9, 10 and 12 of the twenty-four scenarios. Of 3,218
 * Groundwork turns, 132 asked more than one question: 58 were two real questions, 37 an example
 * written as a question, 10 alternatives written as a question, 4 a list with a question mark on it,
 * 21 the product's own "One more before this closes." line under a reply that was still asking, and
 * 2 the lead's decision question under that same line.
 *
 * Measured with the checker's own counts over the same turns: keeping the first question lost
 * thirteen "specific detail", four "blocker checked" and three "proof asked for" turns; keeping the
 * question that carries the check loses four, two and none, all of them under the close line, which is kept because in nine of the
 * twenty-five close cases the harness never reached another turn.
 *
 * What is checked is what the person reads: the sentence that comes out, whole.
 */
const marks = (s: string) => (s.match(/\?/g) ?? []).length;

describe('a turn asks one thing', () => {
  it('two real questions: the first stays, the second goes (renewal, run 12)', () => {
    const out = oneThingAsked('What specifically do you expect of one colleague here? What would you want them to be able to point at, at the end of this?');
    expect(out.text).toBe('What specifically do you expect of one colleague here?');
    expect(out.leftOut).toBe(1);
  });

  it('the same question twice in other words (shock, run 12)', () => {
    expect(oneThingAsked('That split is clear. How are you carrying this? What is the worry underneath it?').text)
      .toBe('That split is clear. How are you carrying this?');
  });

  it('an example written as a question is said as an example, and nothing else changes (contract review, run 8)', () => {
    const out = oneThingAsked('Four hours for any issue is a very high bar. What would count as the issue being resolved in those four hours? For instance, is that a fix, or an acknowledgement that it has been escalated?');
    expect(out.text).toBe('Four hours for any issue is a very high bar. What would count as the issue being resolved in those four hours? For instance, a fix, or an acknowledgement that it has been escalated.');
    expect(out.saidAsAnExample).toBe(1);
    expect(marks(out.text)).toBe(1);
  });

  it('alternatives written as a question become the examples they were (contract review, run 12)', () => {
    expect(oneThingAsked('Where does that four-hour promise appear? Is it in the contract, a service level agreement, or somewhere else?').text)
      .toBe('Where does that four-hour promise appear? For instance, in the contract, a service level agreement, or somewhere else.');
    expect(oneThingAsked('What kind of work was that, mostly? Was it design, writing code, coordinating people, or something else entirely?').text)
      .toBe('What kind of work was that, mostly? For instance, design, writing code, coordinating people, or something else entirely.');
  });

  it('a list with a question mark on it (project, run 8), and "even a" (sales, run 10)', () => {
    expect(oneThingAsked('What would have to exist for you to feel those requirements had been received and incorporated? A confirmation email, a specific meeting, a document?').text)
      .toBe('What would have to exist for you to feel those requirements had been received and incorporated? For instance, a confirmation email, a specific meeting, a document.');
    expect(oneThingAsked("That's what you were aiming for. Is there anything written down about what those adjustments are, or how they would speed up approvals? Even an email to the committee, or a note from a prior discussion?").text)
      .toBe("That's what you were aiming for. Is there anything written down about what those adjustments are, or how they would speed up approvals? Even an email to the committee, or a note from a prior discussion.");
  });

  it('an example that is itself a question goes, rather than being left as a question with a full stop (sales, run 10)', () => {
    const out = oneThingAsked('Following up is part of it. What else have you done to get the statements in? For instance, have you given them a specific deadline, or offered to help them retrieve the statements directly from their bank?');
    expect(out.text).toBe('Following up is part of it. What else have you done to get the statements in?');
    /* "For the remaining applications, how many are in the pipeline" is asking, whatever it opens with. */
    expect(asAnExample('For the remaining applications, how many are in the pipeline, and where is each one stuck?')).toBeNull();
    /* And a claim is never made out of a question: "They became less responsive?" is not said as a fact. */
    expect(asAnExample('They became less responsive?')).toBeNull();
  });

  it('the question that carries the check is the one kept: the number and the date (realign, run 10)', () => {
    expect(oneThingAsked('The referral scheme. What does success look like for that? For instance, what is the number of referrals you are aiming for, and by when?').text)
      .toBe('The referral scheme. What is the number of referrals you are aiming for, and by when?');
    /* And proof: "a bank statement" is what makes it checkable (loans, run 9). */
    expect(oneThingAsked('The record states the payments are behind. What would tell us that you have repaid every installment on time? For instance, do you have receipts, payment confirmations, or a bank statement?').text)
      .toBe('The record states the payments are behind. Do you have receipts, payment confirmations, or a bank statement?');
  });

  it('but an example is never the one kept: it stays as an example under the question (workplan, run 8)', () => {
    expect(oneThingAsked('What would you say is the one thing that will tell you these approvals have actually landed? For instance, a signed document, a confirmed budget transfer, an email from a specific person?').text)
      .toBe('What would you say is the one thing that will tell you these approvals have actually landed? For instance, a signed document, a confirmed budget transfer, an email from a specific person.');
  });

  it('"whose records, which system, or who reads it" is joined to the question it finishes (renewal, run 12)', () => {
    expect(oneThingAsked('The consistent lateness has been the biggest frustration. Where would the number for the late deliveries come from? Whose records, which system, or who reads it?').text)
      .toBe('The consistent lateness has been the biggest frustration. Where would the number for the late deliveries come from, whose records, which system, or who reads it?');
  });

  it('the product close line stays, and the question the model had left above it goes (sales, run 8)', () => {
    const ask = 'I have one more question before we finish. How is it actually going?';
    expect(withTheOneMoreLine('What is the single biggest reason for any deals that are currently stalled?', ask)).toBe(ask);
    expect(withTheOneMoreLine('That means the vendor has been on notice for weeks and nothing has moved. What have you done to follow up with them?', 'I have one more question before we finish. What is actually happening, in your account of it?'))
      .toBe('That means the vendor has been on notice for weeks and nothing has moved.\n\nI have one more question before we finish. What is actually happening, in your account of it?');
  });

  it('and a close line with no question mark is still the thing being asked (renewal, run 8)', () => {
    expect(withTheOneMoreLine('Understood. What is actually happening, in your account of it?', 'I have one more question before we finish. Tell me how the relationship has actually worked from your side.'))
      .toBe('Understood.\n\nI have one more question before we finish. Tell me how the relationship has actually worked from your side.');
  });

  it("the lead's decision question under the close line: the close line is the one asked, and no line is broken (pip, run 8)", () => {
    const out = withTheOneMoreLine(`You will be sending Nathan an invite for this meeting. ${THE_LEADS_DECISION}`, 'I have one more question before we finish. What did you understand you were meant to do?');
    expect(out).toBe('You will be sending Nathan an invite for this meeting.\n\nI have one more question before we finish. What did you understand you were meant to do?');
  });

  it("a question the lead confirmed stays, even when the model asked its own first", () => {
    const confirmed = 'Is the new rota working for you?';
    const out = oneThingAsked(`What happened on Thursday? ${confirmed}`, [confirmed]);
    expect(out.text).toBe(confirmed);
  });

  it('the date said back to be checked stays, whatever else was asked', () => {
    const out = oneThingAsked('What is left to do? When you say the end of the year, do you mean 31 December 2026?');
    expect(out.text).toBe('When you say the end of the year, do you mean 31 December 2026?');
  });

  it("a question mark inside somebody's own quoted words is not a second question", () => {
    const text = 'You wrote "why is nobody answering?" last week. What has changed since then?';
    expect(howManyQuestions(text)).toBe(1);
    expect(oneThingAsked(text)).toEqual({ text, changed: false, saidAsAnExample: 0, leftOut: 0 });
  });

  it('leaves a turn that asks once exactly as it was', () => {
    const text = 'Thank you. Which kinds of business do most of your applications come from? For example, shops, restaurants or transport.';
    expect(oneThingAsked(text)).toEqual({ text, changed: false, saidAsAnExample: 0, leftOut: 0 });
    expect(asksMoreThanOneThing(text)).toBe(false);
  });

  it('asks the model again only where a real question would be lost', () => {
    expect(wouldLeaveAQuestionOut('How are you carrying this? What is the worry underneath it?')).toBe(true);
    expect(wouldLeaveAQuestionOut('Where does that promise appear? Is it in the contract, or somewhere else?')).toBe(false);
  });

  it('the stream shows what is saved: an example goes out as an example and a second question does not go out', () => {
    const gate = new SentenceGate([], null);
    const shown = gate.push('Where does that belief come from? Is it something in the contract, a past agreement, or industry standard? How sure are you? ') + gate.flush();
    expect(shown).toBe('Where does that belief come from? For instance, something in the contract, a past agreement, or industry standard. ');
  });
});

describe('and every path a turn is saved by keeps one question', () => {
  const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('the save point trims every turn, with the confirmed questions kept', () => {
    expect(src).toMatch(/const oneThing = oneThingAsked\(asConfirmed\.text, asConfirmed\.confirmed\)/);
  });

  it('no close line is put under the reply any more, on either path', () => {
    /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
    /* Changed 3 November 2026 (no forced close): the product no longer holds a close with a line of its own, so withTheOneMoreLine is not called. */
    expect((src.match(/withTheOneMoreLine\(/g) ?? []).length).toBe(0);
    expect(src).not.toMatch(/close\.ask/);
    expect(theStreamedRouteRunsThePlainRoute(src)).toBe(true);
    expect(src).not.toMatch(/`\$\{stillOpen\}\\n\\n\$\{close\.ask\}`/);
  });

  it('the reply path asks once more, with the rule named, before it trims', () => {
    expect(src).toMatch(/wouldLeaveAQuestionOut\(screened\.text\)/);
    /* Changed 2 November 2026: every check hands its instruction to one re-ask (ask), which carries every failing instruction at once. */
    expect(src).toMatch(/ask\(ASK_ONE_THING\)/);
  });
});
