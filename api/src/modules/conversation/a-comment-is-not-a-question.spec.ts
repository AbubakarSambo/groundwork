import { withoutCommentsOnTheAnswer, isOnlyAComment } from './a-comment-is-not-a-question';

/** Every turn here is copied from api/journey/all-24 (re-a and run-21), as served. */
describe('a comment is not a question', () => {
  it('Ngozi: the stock sentence goes, the question stays', () => {
    const live = 'Thirty-four days for files to sit unreviewed. That is a long time. That is noted, and it is the kind of thing that changes how you go about the conversation. What will you do about this, and by when?';
    const r = withoutCommentsOnTheAnswer(live);
    expect(r.text).toBe('Thirty-four days for files to sit unreviewed. What will you do about this, and by when?');
    expect(r.text).not.toMatch(/is noted|kind of thing/);
  });

  it('Tobi: no reproach to a new hire', () => {
    const r = withoutCommentsOnTheAnswer('That is a very specific thing to not know, given these are our five largest clients. Which of the five has asked you for something this month?');
    expect(r.text).toBe('Which of the five has asked you for something this month?');
  });

  it.each([
    'That is a real answer, as it stands.',
    'That kind of clarity helps the record.',
    "That's the heart of it.",
    'That is a lot.',
    'That sounds like a heavy weight.',
    'That sounds like a recurring pattern.',
    'That is your read of it, rather than something that has been confirmed elsewhere yet.',
    "That Sarah's replacement never took a call is a specific detail.",
    'That is noted, and it is worth being explicit about.',
    'That is what you are saying.',
    'That is how the relationship is described.',
    'That is the thing that makes this a blocker.',
  ])('is only a comment: %s', (s) => {
    expect(isOnlyAComment(s)).toBe(true);
  });

  it.each([
    'That is a lot of work to finish by Friday. What is the first piece?',
    'That is why the second review matters.',
    'That is the 14 you said in session one.',
    'Is that a real answer?',
    'You said that is a long time. How long?',
    'Understood.',
    "That's all for today. Below is what I wrote down from your answers. Is anything wrong?",
  ])('is left alone: %s', (s) => {
    expect(withoutCommentsOnTheAnswer(s).cut).toEqual([]);
  });

  it('never leaves a turn empty', () => {
    expect(withoutCommentsOnTheAnswer('That is a lot.')).toEqual({ text: 'That is a lot.', cut: [] });
  });
});
