import { aCatchAllQuestion } from './reports.service';

/**
 * "session2Focus: What else should I know?" (run 32, the discovery lead's report).
 *
 * What goes into the next session's focus is the last question Groundwork asked before somebody
 * closed without answering it. That is right when the question was about the work, and useless
 * when it was our own catch-all: carrying "what else should I know" forward tells session two to
 * ask the same empty question again.
 */
describe('a catch-all question is not something to carry forward', () => {
  it('turns down the one the discovery report served', () => {
    expect(aCatchAllQuestion('What else should I know?')).toBe(true);
  });

  it('turns down the rest of our own stock endings', () => {
    for (const q of ['Is there anything else?', 'Anything else?', 'Anything to add?', 'What have I missed?', 'So, is there anything else?']) {
      expect(aCatchAllQuestion(q)).toBe(true);
    }
  });

  it('keeps every question that names something, however short', () => {
    for (const q of [
      'What did the credit committee decide?',
      'Who owns the reconciliation after the 30th?',
      'When is the cut-off now?',
      'What else is on the Kano route?',
    ]) {
      expect(aCatchAllQuestion(q)).toBe(false);
    }
  });

  it('is not fooled by punctuation or capitals', () => {
    expect(aCatchAllQuestion('ANYTHING ELSE')).toBe(true);
    expect(aCatchAllQuestion('what else should i know')).toBe(true);
  });
});
