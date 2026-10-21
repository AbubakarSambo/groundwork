import { askedToFinish } from './close-readiness';

/**
 * A THING SENT LATER IS NOT THE PERSON LEAVING (final real-model check, item 21). Joseph's Wednesday check-in closed after three questions,
 * "Understood. That's all for today.", because "She'll send the M-Pesa later. I don't have it right now." was read as asking to stop. He
 * never got to Juja Hardware. On Tuesday his "I'll send that over later. I don't have it right now." was read the same way.
 */
describe('asking to finish', () => {
  it.each([
    "She'll send the M-Pesa later. I don't have it right now.",
    "I'll send that over later. I don't have it right now.",
    'I will call them later today.',
  ])('"%s" is not asking to finish', (said) => {
    expect(askedToFinish([said])).toBe(false);
  });
  it.each(['Can we talk later?', 'Later.', 'Maybe later', "That's all from my end for today.", "I'm done", 'finish'])('"%s" is', (said) => {
    expect(askedToFinish([said])).toBe(true);
  });
});
