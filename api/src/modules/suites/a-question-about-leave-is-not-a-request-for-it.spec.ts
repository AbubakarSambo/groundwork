import { soundsLikeLeave, plainlyAsksForLeave, readLeaveDates } from './leave-said-in-chat';

/**
 * "What leave have I asked for, and what was decided?" was answered "I could not tell exactly which
 * days you mean, so I have not sent anything", because "decided" holds the letters "dec" and a month
 * was found inside a word. Found by asking Ask Groundwork on WhatsApp, and the same in the app.
 */
describe('a question about leave is not a request for leave', () => {
  it.each([
    'What leave have I asked for, and what was decided?',
    'Has my leave been decided yet? I asked a while ago.',
    'Which of my leave requests are still waiting? I marched through them last week.',
    'I wonder whether my holiday request was considered.',
  ])('"%s" is not read as time off', (said) => {
    expect(soundsLikeLeave(said)).toBe(false);
    expect(plainlyAsksForLeave(said)).toBe(false);
    expect(readLeaveDates(said, new Date('2026-10-04T10:00:00Z'))).toBeNull();
  });

  it.each([
    ['I need leave on 20 Oct', true],
    ['I would like leave from 20 October to 22 October please.', true],
    ['I need leave in dec', true],
    ['I need next Thursday and Friday off', true],
    ['I want leave tomorrow', true],
  ])('"%s" still is', (said, yes) => {
    expect(soundsLikeLeave(said as string)).toBe(yes);
  });
});
