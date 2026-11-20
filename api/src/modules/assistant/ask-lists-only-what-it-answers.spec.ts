import { route } from './the-router-is-deterministic';
import { whatYouCanAskSaid } from './what-you-can-ask-here';

/**
 * B-026: Ask's help told a lead she could ask "what people said, and what to talk about next", and neither worked ("I cannot answer
 * that one yet"). The help lists only what answers, and "what should I talk about next" does.
 */
describe('what Ask says a lead can ask', () => {
  /* The help is now read from the one guide (Batch S, S5), so the lead's sentence changed; what is checked is unchanged: each thing it names answers. */
  const help = whatYouCanAskSaid({ isAGuest: false, takesPartInOne: true, hasOneToUse: true, runsOne: true, leaveIsOn: false, spendingIsOn: false, hoursAreOn: false, contextIsHere: true, waitingForYou: 0 });
  it('names only what answers', () => {
    expect(help).toContain('You can ask how your team is doing. For example, say "How is my team doing?"');
    expect(help).toContain('You can ask who has not checked in yet. For example, say "Who has not checked in?"');
    expect(help).not.toContain('what people said');
    expect(route('How is my team doing?').lane).toBe('how_is_the_team');
    expect(route('Who has not checked in?').lane).toBe('who_has_not_checked_in');
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

import { whatICanDoWith } from './the-router-is-deterministic';
/** B-106: 'hello' after finishing was answered 'I cannot answer that one yet. Here is what I can do with "hello".' */
describe('a greeting', () => {
  it('is greeted, not told it failed', () => {
    expect(whatICanDoWith('hello').line).toBe('Hello. Ask me something, or pick one of these.');
    expect(whatICanDoWith('Good morning!').line).toBe('Hello. Ask me something, or pick one of these.');
    expect(whatICanDoWith('what did people say').line).toMatch(/^I cannot answer that one yet\./);
  });
});
