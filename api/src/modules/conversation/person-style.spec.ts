import { observeStyle, mergeStyle, styleGuidance } from './person-style';

/**
 * WHAT THE PRODUCT IS ALLOWED TO REMEMBER ABOUT A PERSON.
 *
 * An eighteen-ground run found the same colleague met as a stranger five times.
 * The fix is a memory of STYLE - how to talk to them - and the entire risk is
 * that it quietly becomes a memory of SUBSTANCE, at which point a ground stops
 * being a closed container and somebody's account to two colleagues can surface
 * in front of seven.
 *
 * The tests below are mostly about that line, because getting the observation
 * slightly wrong is a small annoyance and crossing that line is the end of the
 * product's central promise.
 */

describe('what a session tells us about how to talk to someone', () => {
  it('notices someone asking what one of our words means', () => {
    expect(observeStyle(['Sorry, when you say "ground" do you mean this conversation?']).needsPlainLanguage).toBe(true);
  });

  it('notices someone asking who reads it before they answer', () => {
    expect(observeStyle(['Before I answer - who reads this? What is it used for?']).asksWhoReadsThis).toBe(true);
  });

  it('notices someone who answers in a line', () => {
    expect(observeStyle(['Fine.', 'All good', 'Nothing to add']).answersBriefly).toBe(true);
  });

  it('does not count the sign-off and the blocker answer, which are short for everyone', () => {
    // These are the four turns the most articulate person in a live org run
    // actually gave. Counting "Not blocked." and "That is it from me." flagged
    // her as terse, and flagged everybody else too, which made the signal
    // useless the first time it ran against real data.
    const articulate = [
      'On the role, what early success looks like, and what he owns: Closed out 2 of the open questions with Tom this week.',
      'Sent the written version to Ada on the 4nd, 10 pages',
      'Not blocked.',
      'That is it from me.',
    ];
    expect(observeStyle(articulate).answersBriefly).toBe(false);
  });

  it('still catches someone who is genuinely terse when they ARE answering', () => {
    const terse = ['Fine.', 'All good', 'Nothing much', 'Not blocked.', 'That is it from me.'];
    expect(observeStyle(terse).answersBriefly).toBe(true);
  });

  it('does not call someone brief on the strength of one short answer', () => {
    const s = observeStyle([
      'Ok',
      'We finished modules four and five this week, and I sat with Priya on Thursday to work through the audit findings before submitting them on the fourteenth.',
    ]);
    expect(s.answersBriefly).toBe(false);
  });

  it('says nothing about a person who just answered normally', () => {
    const s = observeStyle(['Closed out module 4 on the 12th with Priya, and the audit went in on the 14th.']);
    expect(s).toEqual({ needsPlainLanguage: false, answersBriefly: false, asksWhoReadsThis: false });
  });
});

describe('a flag only ever turns on', () => {
  it('keeps help in place when someone stops asking for it', () => {
    // Someone who needed "ground" explained in March has not stopped needing it
    // because they did not ask again in June - they may have given up asking.
    const kept = mergeStyle(
      { needsPlainLanguage: true, answersBriefly: false, asksWhoReadsThis: true },
      { needsPlainLanguage: false, answersBriefly: false, asksWhoReadsThis: false },
    );
    expect(kept.needsPlainLanguage).toBe(true);
    expect(kept.asksWhoReadsThis).toBe(true);
  });

  it('adds something newly seen', () => {
    const merged = mergeStyle(null, { needsPlainLanguage: false, answersBriefly: true, asksWhoReadsThis: false });
    expect(merged.answersBriefly).toBe(true);
  });
});

describe('what reaches the prompt', () => {
  const full = { needsPlainLanguage: true, answersBriefly: true, asksWhoReadsThis: true };

  it('tells the engine they are not new, without claiming to know anything they said', () => {
    const g = styleGuidance(full, 4);
    expect(g).toMatch(/used Groundwork before/i);
    expect(g).toMatch(/those records are separate/i);
    expect(g).toMatch(/never refer to another ground/i);
  });

  it('CANNOT CARRY CONTENT - the line the whole design rests on', () => {
    // Structural, not a word search. styleGuidance is given three booleans and a
    // count and nothing else, so two people with identical style flags get a
    // byte-identical block however different their actual records were. That is
    // the guarantee: there is no channel through which content could travel,
    // rather than a promise that we remembered to strip it.
    const a = styleGuidance({ ...full }, 9);
    const b = styleGuidance({ ...full }, 9);
    expect(a).toBe(b);
    // And it names the boundary out loud, so the model does not fill the gap.
    expect(a).toMatch(/not from anything they said/i);
    expect(a).toMatch(/you know nothing about what they discussed/i);
  });

  it('never references another ground, a session, or a quotation', () => {
    const g = styleGuidance(full, 9);
    // Quotation marks DO appear, showing the engine which words to prefer -
    // "this conversation" rather than "this ground". Those are vocabulary
    // examples of ours, never the person's speech, so the check is on length:
    // a phrase we suggest is short, a sentence they said would not be.
    for (const q of g.match(/"[^"]*"/g) ?? []) {
      // Six covers the longest phrase we suggest ("what you are answerable for").
      // A sentence someone actually said would not fit.
      expect(q.split(/\s+/).length).toBeLessThanOrEqual(6);
    }
    expect(g).not.toMatch(/last time|previously (mentioned|told)/i);
    expect(g).not.toMatch(/session \d|ground \d/i);
  });

  it('gives guidance on manner, never a label for the person', () => {
    // "Prefers plain language" is help. "This user is basic" is a verdict, and a
    // verdict in a prompt becomes a tone the person can hear.
    const g = styleGuidance(full, 2).toLowerCase();
    for (const label of ['basic', 'low ability', 'struggles', 'unsophisticated', 'simple user', 'poor communicator']) {
      expect(g).not.toContain(label);
    }
  });

  it('says nothing at all about someone with no observations and no history', () => {
    expect(styleGuidance({ needsPlainLanguage: false, answersBriefly: false, asksWhoReadsThis: false }, 0)).toBe('');
    expect(styleGuidance(null, 5)).toBe('');
  });
});
