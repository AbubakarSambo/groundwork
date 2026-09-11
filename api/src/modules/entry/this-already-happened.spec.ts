/**
 * SOMEBODY ARRIVING TO LOOK BACK WAS ASKED HOW OFTEN THEY WANTED TO CHECK IN.
 *
 * The setup conversation is built for something starting. A RECALL SESSION PROTOCOL - a five-step
 * reconstruct-from-memory interview - has been in prompt-library since the spring and has never run
 * once, because the only thing that could turn it on was a session mode nothing ever set.
 *
 * The owner's rule: when what somebody describes has already happened, bring recall, and cancel the
 * forward-looking half. Not both.
 *
 * The risk runs one way. A false positive costs a person the questions they came for, so looking
 * back has to be both present AND the stronger reading.
 */
import { thisAlreadyHappened, LOOK_BACK_INSTEAD } from './this-already-happened';

describe('somebody reconstructing something that is over', () => {
  it.each([
    'The handover went badly and nobody will say why.',
    'She has left and the client work never got picked up.',
    'Looking back, the project fell apart around the time the brief changed.',
    'Last quarter was a mess and I want to understand what happened.',
  ])('%s', (text) => {
    expect(thisAlreadyHappened(text)).toBe(true);
  });
});

describe('somebody setting something up', () => {
  it.each([
    'I want to set my okrs for the quarter',
    'I want to set it so my team checks in against it for the quarter',
    'A new sales lead starts Monday and I want to get it right from the start',
    'We are planning the handover, it starts next week',
    'I just want to make sure my team is on track',
  ])('%s', (text) => {
    expect(thisAlreadyHappened(text)).toBe(false);
  });
});

describe('the sentence that carries both tenses', () => {
  it('is somebody planning, and gets the ordinary path', () => {
    /* THE CASE THAT DECIDES THE RULE. "It went badly, so now I want to..." is the commonest way
       anybody explains why they are here, and it is a set-up, not a look back. Tipping it into
       recall would take the cadence questions away from the person who came for them. */
    expect(thisAlreadyHappened(
      'The last quarter went badly so I want to set clear targets for the next one and track them',
    )).toBe(false);
  });
});

describe('what it refuses to guess from', () => {
  it('says nothing on an empty or barely-started answer', () => {
    expect(thisAlreadyHappened('')).toBe(false);
    expect(thisAlreadyHappened(null)).toBe(false);
    expect(thisAlreadyHappened('it went')).toBe(false);
  });

  it('and does not fire on a situation merely being difficult', () => {
    /* It reads tense, not mood. A hard quarter that is still running is still running. */
    expect(thisAlreadyHappened('Things are tense and the team is under a lot of pressure this quarter')).toBe(false);
  });
});

describe('what the prompt is told when it fires', () => {
  it('runs the recall shape', () => {
    expect(LOOK_BACK_INSTEAD).toMatch(/RUN THE RECALL SHAPE/);
    expect(LOOK_BACK_INSTEAD).toMatch(/reconstructed from memory/);
  });

  it('and cancels the forward-looking questions, which is the half that was missing', () => {
    expect(LOOK_BACK_INSTEAD).toMatch(/CANCEL THE FORWARD-LOOKING QUESTIONS/);
    expect(LOOK_BACK_INSTEAD).toMatch(/Do not ask how often they want to check in/);
  });

  it('but follows the person if they raise the future themselves', () => {
    expect(LOOK_BACK_INSTEAD).toMatch(/follow them there - but never take them there/);
  });
});

describe('the wiring', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const SRC = strip(require('fs').readFileSync(require('path').join(__dirname, 'entry.service.ts'), 'utf8'));

  it('reads what the person typed, not the card they clicked', () => {
    expect(SRC).toMatch(/filter\(\(m\) => m\.role === 'user'\)/);
    expect(SRC).toMatch(/thisAlreadyHappened\(theirWords\)/);
  });

  it('and appends the instruction only when it fires', () => {
    expect(SRC).toMatch(/lookingBack \? `[^`]*\$\{LOOK_BACK_INSTEAD\}` : ''/);
  });
});
