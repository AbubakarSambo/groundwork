import { readFileSync } from 'fs';
import { join } from 'path';
import { itAskedNothing, theSetupHasStoppedAsking, whatSetupNeverGot } from './a-gate-that-can-never-open-is-shut';
import { onboardingIsReady } from './entry.service';

/**
 * THE LOOP READ OFF A LIVE DEMO.
 *
 *   assistant  "...The next screen will ask who is checking in, and then you'll go into the
 *               check-in itself to set the context for Bob joining."
 *   person     "its 3 people - 3 names - go ahead to next stage"
 *   assistant  "Of course. The next screen is where you'll add everyone involved and decide who
 *               checks in. After that, you'll go into your own check-in to give your side of it."
 *   person     "ok"
 *   assistant  "Great. The next screen will ask you to confirm who is checking in for this
 *               situation..."
 *   person     "alright. lets go"
 *   assistant  "Perfect. On the next screen, you'll confirm who is checking in..."
 *
 * Nothing was wrong with any one of those replies. The model had what it needed and said so, which
 * is exactly what the prompt asks for. `onboardingIsReady` disagreed, because one of the three
 * fields it waits on had not extracted, and the screen only advances on its answer.
 *
 * The two never reconcile, and the reason is structural rather than probabilistic: a field is only
 * populated from something the person says, a person only says things in answer to being asked, and
 * the assistant has stopped asking. So no turn that could ever open the gate can now occur. The
 * person can type all night.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SERVICE = strip(readFileSync(join(__dirname, 'entry.service.ts'), 'utf8'));

const person = (content: string) => ({ role: 'user', content });
const bot = (content: string) => ({ role: 'assistant', content });

describe('a reply that asks nothing', () => {
  it('is one with no question in it', () => {
    expect(itAskedNothing('Perfect. On the next screen, you will confirm who is checking in.')).toBe(true);
    expect(itAskedNothing('Who else is involved in that?')).toBe(false);
  });

  it('and an empty reply is not one - it is nothing at all', () => {
    expect(itAskedNothing('')).toBe(false);
    expect(itAskedNothing(null)).toBe(false);
  });
});

describe('the setup has stopped asking', () => {
  const closer = 'Great. The next screen will ask you to confirm who is checking in.';

  it('is true on the second closer with the person having spoken between them', () => {
    /* The exact transcript above. This is the turn that used to produce a fourth identical reply. */
    const messages = [
      person('we are co-founders bringing on Bob James'),
      bot('Thank you. The next screen will ask who is checking in.'),
      person('ok'),
    ];
    expect(theSetupHasStoppedAsking(messages, closer)).toBe(true);
  });

  /*
   * REVERSED ON 10 SEP 2026, ON LIVE EVIDENCE. The closer above names the next screen. Driven in a
   * browser, the person read "the next screen will ask..." and sat in front of an input with nothing
   * to say, because this rule wanted a second closer first. A reply that names the hand-off is the
   * hand-off. The two-closer rule still holds for a plain closer that does not.
   */
  it('and on the first when the reply itself names the next screen', () => {
    const messages = [person('we are co-founders bringing on Bob James'), bot('Who else is involved in that?')];
    expect(theSetupHasStoppedAsking(messages, closer)).toBe(true);
    expect(theSetupHasStoppedAsking(messages, 'Thank you, that is noted.')).toBe(false);
  });

  it('and never while it is still asking something', () => {
    const messages = [bot('The next screen will ask who is checking in.'), person('ok')];
    expect(theSetupHasStoppedAsking(messages, 'And why now?')).toBe(false);
  });

  it('a plain closer twice with nobody between them is one reply in two parts, not a close', () => {
    /* One reply arriving in two parts is not a person who cannot get out. */
    const messages = [person('hello'), bot('The next screen will ask who is checking in.')];
    expect(theSetupHasStoppedAsking(messages, 'Thank you, that is noted.')).toBe(false);
  });

  it('and not at the very start, where there is no previous turn to have closed', () => {
    expect(theSetupHasStoppedAsking([person('hello')], 'Thank you, that is noted.')).toBe(false);
  });
});

describe('and so the gate opens', () => {
  it('even though extraction never got everything', () => {
    /* The field gate stays exactly as strict as it was. What changed is that it is no longer the
       only way through, because on its own it is not always answerable. */
    /* Why now no longer holds the gate (31 October 2026), so the thin case is a situation with nothing said about it. */
    expect(onboardingIsReady({ mode: 'something_new' })).toBe(false);
    /* The gate is called through `theGate` now and takes the situation, because three situations
       have no aim by design - see a-check-in-with-no-aim-has-nothing-to-read-against. What this
       file is about is the `|| stoppedAsking`, which is unchanged: a gate that can never open is
       shut, and a thin check-in beats stranding somebody in front of a screen with nothing to
       click. */
    /* Since 26 October 2026 setup is the lead's first check-in: the gate opening tells the model the board is covered, and setup is ready
       once it has ended the way a check-in ends. The `|| stoppedAsking` is unchanged. See setup-is-the-first-check-in. */
    /* Changed 3 November 2026 (Hafsah: no forced close): the product's "Anything else I should know?" and its count of follow-ups are gone.
       Setup is ready when the model finishes, or when it has stopped asking: the `|| stoppedAsking` is back, as this file wants. */
    expect(SERVICE).toContain('const ready = theModelFinished || stoppedAsking;');
    expect(SERVICE).not.toMatch(/askTheLastQuestion|endOfSetup/);
    /* The gate no longer tells the model the board is covered (that went with THE_BOARD_IS_COVERED); it is still read, to log what setup never got. */
    expect(SERVICE).toContain('if (stoppedAsking && !theGate(extracted, forThisSituation)) {');
  });

  it('and says in the log what it never got, rather than passing silently', () => {
    expect(whatSetupNeverGot({ mode: 'something_new', initial: 'x' })).toEqual(['why now']);
    expect(whatSetupNeverGot({ initial: 'x', decision: 'y', mode: 'z' })).toEqual([]);
    expect(SERVICE).toContain('the assistant had stopped asking');
  });
});

import { itHandsOff, theSetupHasStoppedAsking as stopped } from './a-gate-that-can-never-open-is-shut';

describe('a reply that hands off is a close on its own', () => {
  const handOff = 'Great, that gives me what I need. The next screen will ask who should give their account, and then you go into the check-in itself.';
  it('reads the hand-off', () => {
    expect(itHandsOff(handOff)).toBe(true);
    expect(itHandsOff('Great. Is there anything specific you want the questions to focus on?')).toBe(false);
    expect(itHandsOff('Thank you. That is noted.')).toBe(false);
  });
  it('opens the gate even when the previous turn asked a question', () => {
    const messages = [
      { role: 'assistant', content: 'What is the project about?' },
      { role: 'user', content: 'A website.' },
      { role: 'assistant', content: 'Is there anything specific you want the questions to focus on?' },
      { role: 'user', content: 'The timeline.' },
    ];
    expect(stopped(messages, handOff)).toBe(true);
  });
});
