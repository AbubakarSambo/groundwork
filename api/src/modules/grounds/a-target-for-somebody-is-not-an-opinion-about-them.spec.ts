import { readFileSync } from 'fs';
import { join } from 'path';
import { contextChatPrompt } from './the-context-chat';

/**
 * THE LOOP THAT HAD NO END, READ LIVE.
 *
 * Her own first session told her the thing to do before the next check-in: give Sahar and Amina
 * numbers of their own. She opened the one conversation she has for steering the check-in and said
 * "give her 3,000 units by December", and it said:
 *
 *   "This setup conversation isn't the right place to set individual targets, but once the check-in
 *    is set up, you can add that target to Amina's check-in."
 *
 * Three things wrong. It is what this conversation records - `proposalFrom` has had an
 * `expectation` branch since it was written. The check-in was already set up and in session 2. And
 * a participant's check-in is their own account of their own work, which is the one place a lead's
 * target for them must never be typed.
 *
 * TWO CAUSES, BOTH FIXED HERE. The rule the model was following could not tell a judgement about
 * somebody from a number for them, and only `gaps[0]` was ever extracted - so a sentence about a
 * person, said while the open question was about how long the check-in runs, was read by the
 * timeline extractor and came back as "I will set this to run for 90 days".
 */
const src = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('a target for somebody is not an opinion about them', () => {
  const prompt = contextChatPrompt('Tea sales in Abuja', 'OKR_ALIGNMENT' as any, [
    { key: 'timeline', ask: 'How long should this run?' },
  ] as any);

  it('the rule says a judgement goes to the note and a target is taken here', () => {
    /* Reworded on 23 September 2026 when rule 2 started coaching instead of refusing. The line
       being pinned is the same one: an opinion is not a fact and is never stored as one. */
    expect(prompt).toMatch(/A judgement is not a fact about somebody and is never recorded as one/);
    expect(prompt).toMatch(/they EXPECT of a named person/);
    expect(prompt).toMatch(/marked unseen until that person reads it/);
  });

  it('and forbids the two sentences that were actually said', () => {
    expect(prompt).toMatch(/Never tell them individual targets cannot be set here/);
    expect(prompt).toMatch(/never send them to somebody else's check-in to set one/);
  });

  /*
   * THE PRIVATE NOTE BOX IS GONE, AND SO IS THE SENDING-AWAY.
   *
   * This pinned that an opinion about somebody was sent to a note box on the Context page. That box
   * was removed on 23 September 2026 (the lead's read of a person lives in the conversation now),
   * and rule 2 was rewritten the same day to coach rather than refuse - see the-context-chat.spec.
   * What this test is really for survives in the assertions below: wherever the read is kept, it is
   * kept as the lead's read and it never reaches the person it is about as a finding.
   */
  it('and a read of somebody is kept as the lead\'s, never as a finding about them', () => {
    expect(prompt).toMatch(/Record it as THEIR READ of that person/);
    expect(prompt).toMatch(/never quoted to that person as a finding/);
  });

  it('what recording it means is attached wherever there is somebody to expect it of', () => {
    /* It used to be attached only while the objectives gap was open, so on a check-in whose people
       already had objectives the rule was absent and the model filled the space by refusing. */
    expect(src).toMatch(/const expectationRule = ground\.participants\.filter\(\(p\) => !p\.managingOnly\)\.length > 1/);
  });

  it('a target for a named person is heard whatever question was open', () => {
    expect((src.match(/proposalFrom\('objectives', \w+, /g) ?? []).length).toBeGreaterThanOrEqual(2);
    /*
     * FIX 4, 30 September 2026: this now also wins the turn for a `lead_read` proposal - a judgement
     * about a named person, heard whatever question was open, the same as a checkable expectation
     * always has been. See what-the-context-chat-heard.ts's objectives branch.
     */
    expect(src).toMatch(/if \(forSomebody\.kind === 'expectation' \|\| forSomebody\.kind === 'lead_read'\) proposal = forSomebody;/);
  });

  it('and both halves read the sentence the same way, so a yes lands', () => {
    /*
     * The chat proposes and `applyContextProposal` re-derives from the same words. A second reading
     * in only one of them shows the lead a proposal that the confirm step then cannot find.
     *
     * FOUND LIVE, 30 September 2026: confirm's copy of the guard was renamed to
     * `triedTheSecondReading`, so it could give an HONEST refusal - "I could not find that in what
     * you said" - rather than leaking the open gap's own unrelated reason ("No length in that
     * answer") when the second reading disagreed between the two calls. Both conditions are still on
     * `openGap !== 'objectives'`, still one in each half.
     */
    const chat = src.indexOf("if (openGap !== 'objectives') {");
    const confirm = src.indexOf("const triedTheSecondReading = openGap !== 'objectives';");
    expect(chat).toBeGreaterThan(-1);
    expect(confirm).toBeGreaterThan(chat);
  });
});

/*
 * AND WHAT THE FIRST FIX LET THROUGH, WHICH WAS WORSE THAN THE PROBLEM.
 *
 * With the chat allowed to hear a target whatever question was open, the lead's opening sentence -
 * "Amina is struggling with the wholesale accounts and I have not told her a number yet" - came
 * back as a proposal: 'I will record that as what you expect of Amina Yusuf: "is struggling with
 * the wholesale accounts".' A judgement about somebody, one confirmation away from being the
 * standard she is then measured against.
 */
describe('what somebody IS is never what they are held to', () => {
  const { worthRecording, readsAsAJudgement } = require('./what-setup-agreed');

  it('refuses the sentence that was actually proposed', () => {
    expect(readsAsAJudgement('is struggling with the wholesale accounts')).toBe(true);
    expect(worthRecording('is struggling with the wholesale accounts')).toBe(false);
  });

  it('and the rest of that family, praise included', () => {
    for (const judgement of [
      'Amina is underperforming on the wholesale side',
      'he has been slipping since August',
      'she is doing well with the shops',
      'I am worried about Amina',
      'the problem with Sahar is the follow up',
    ]) {
      expect(readsAsAJudgement(judgement)).toBe(true);
    }
  });

  it('while a real expectation still goes through', () => {
    for (const real of [
      '3,000 units by December',
      'owns the supermarket chain relationship end to end',
      'reaches 150 bags a month from the wholesale accounts',
      'sends the September numbers every Monday',
    ]) {
      expect(readsAsAJudgement(real)).toBe(false);
      expect(worthRecording(real)).toBe(true);
    }
  });
});
