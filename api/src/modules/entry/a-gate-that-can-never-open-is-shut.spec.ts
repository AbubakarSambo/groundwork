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

  it('but not on the first, which may be one thread closing before another opens', () => {
    const messages = [person('we are co-founders bringing on Bob James'), bot('Who else is involved in that?')];
    expect(theSetupHasStoppedAsking(messages, closer)).toBe(false);
  });

  it('and never while it is still asking something', () => {
    const messages = [bot('The next screen will ask who is checking in.'), person('ok')];
    expect(theSetupHasStoppedAsking(messages, 'And why now?')).toBe(false);
  });

  it('and not on two assistant turns with nobody between them', () => {
    /* One reply arriving in two parts is not a person who cannot get out. */
    const messages = [person('hello'), bot('The next screen will ask who is checking in.')];
    expect(theSetupHasStoppedAsking(messages, closer)).toBe(false);
  });

  it('and not at the very start, where there is no previous turn to have closed', () => {
    expect(theSetupHasStoppedAsking([person('hello')], closer)).toBe(false);
  });
});

describe('and so the gate opens', () => {
  it('even though extraction never got everything', () => {
    /* The field gate stays exactly as strict as it was. What changed is that it is no longer the
       only way through, because on its own it is not always answerable. */
    expect(onboardingIsReady({ mode: 'something_new', initial: 'a co-founder joining' })).toBe(false);
    expect(SERVICE).toContain('onboardingIsReady(extracted) || stoppedAsking');
  });

  it('and says in the log what it never got, rather than passing silently', () => {
    expect(whatSetupNeverGot({ mode: 'something_new', initial: 'x' })).toEqual(['why now']);
    expect(whatSetupNeverGot({ initial: 'x', decision: 'y', mode: 'z' })).toEqual([]);
    expect(SERVICE).toContain('the assistant had stopped asking');
  });
});
