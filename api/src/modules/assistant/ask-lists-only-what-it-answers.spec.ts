import { route } from './the-router-is-deterministic';
import { whatYouCanAskSaid } from './what-you-can-ask-here';

/**
 * B-026: Ask's help told a lead she could ask "what people said, and what to talk about next", and neither worked ("I cannot answer
 * that one yet"). The help lists only what answers, and "what should I talk about next" does.
 */
describe('what Ask says a lead can ask', () => {
  const help = whatYouCanAskSaid({ checkInsYouAreIn: 2, checkInsYouRun: 2, leaveIsOn: false, spendingIsOn: false, hoursAreOn: false, waitingForYou: 0 });
  it('names only what answers', () => {
    expect(help).toContain('You run 2 check-ins, so you can also ask who needs you this week, what is stuck, and what to talk about next.');
    expect(help).not.toContain('what people said');
  });
  it('answers each one it names', () => {
    expect(route('what should I talk about next').lane).toBe('what_should_we_talk_about');
    expect(route('What should we talk about next?').lane).toBe('what_should_we_talk_about');
    expect(route('who needs me this week').lane).not.toBe('unplaced');
    expect(route('what is stuck').lane).toBe('what_is_stuck');
  });
});

/** B-135: 'Who is blocked right now?' was answered 'You do not have anyone called "blocked right now"'. */
describe('who is blocked', () => {
  it.each(['Who is blocked right now?', "who's stuck", 'Who is waiting on me'])('%s is a question about handoffs', (t) => {
    expect(route(t).lane).toBe('what_is_stuck');
  });
  it('a real name is still a person', () => {
    expect(route('who is Amani').lane).toBe('who_is');
  });
});
