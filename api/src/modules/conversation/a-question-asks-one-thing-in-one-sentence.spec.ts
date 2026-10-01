import { withOneQuestionPerSentence } from './a-question-asks-one-thing-in-one-sentence';

/** Each question is copied from api/journey/all-24 (re-a and run-21), as served. */
describe('a question asks one thing in one sentence', () => {
  it.each([
    ['What day did they commit to sending them, and what is your plan if they miss that date?', 'What day did they commit to sending them?'],
    ['What is your personal target within that 40, and does the team know what their individual targets are yet?', 'What is your personal target within that 40?'],
    ['Who arranged that call, or how did that meeting come about?', 'Who arranged that call?'],
    ['Are there no escalations and are the health reports consistently positive?', 'Are there no escalations?'],
  ])('%s', (live, left) => {
    expect(withOneQuestionPerSentence(live).text).toBe(left);
  });

  it('keeps everything around it', () => {
    const r = withOneQuestionPerSentence('Understood. Who arranged that call, or how did that meeting come about?\n\nOne more thing.');
    expect(r.text).toBe('Understood. Who arranged that call?\n\nOne more thing.');
  });

  it.each([
    'Which of the two are you aiming at, the price or the volume?',
    'Is it the price or the volume?',
    'What did you do and who helped?',
    'What would you like to add?',
    'What is the status of the work and the date?',
    'You said "what is next, and who does it?" What did you mean?',
  ])('is left alone: %s', (s) => {
    expect(withOneQuestionPerSentence(s)).toEqual({ text: s, cut: [] });
  });

  it('never edits a question the lead confirmed', () => {
    const q = 'What happened after they received the asset, and what did you do about it?';
    expect(withOneQuestionPerSentence(q, [q]).text).toBe(q);
  });
});
