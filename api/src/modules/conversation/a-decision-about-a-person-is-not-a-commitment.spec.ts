import { worthWritingDown, theOnesToKeep, openSince } from './what-they-said-they-would-do-next';

const c = (action: string) => ({ action });

describe('what they said they would do', () => {
  it('keeps an action they said they would take', () => {
    expect(worthWritingDown(c('I will call Mrs Nwosu on Friday'))).toBe(true);
    /* Changed 28 October 2026 (fix plan, pattern 5): work in progress is a promise only with when it will be finished. */
    expect(worthWritingDown({ ...c('I am setting up the meetings with the technical team'), when: 'by Friday' })).toBe(true);
    expect(worthWritingDown(c('I am setting up the meetings with the technical team'))).toBe(false);
  });

  /*
   * HER OWN SENTENCE, from the run this writer was built for: "I need to decide if I'm going to
   * replace him." It became a commitment row with a status somebody was expected to move.
   */
  it('refuses a decision about whether somebody stays', () => {
    expect(worthWritingDown(c("I need to decide if I'm going to replace him"))).toBe(false);
    expect(worthWritingDown(c('I am going to let him go at the end of the month'))).toBe(false);
    expect(worthWritingDown(c('I will not renew his contract'))).toBe(false);
    expect(worthWritingDown(c('I will put him on a performance plan'))).toBe(false);
  });

  it('refuses a decision to decide', () => {
    expect(worthWritingDown(c('I need to decide what the next step is'))).toBe(false);
    expect(worthWritingDown(c('I have to think about the approach'))).toBe(false);
  });

  it('refuses a topic with no action in it', () => {
    expect(worthWritingDown(c('the stakeholder map'))).toBe(false);
  });

  it('takes one item for the same action said twice, and caps a session', () => {
    const kept = theOnesToKeep([
      c('I will send the letter this week'),
      c('I will send the letter this week'),
      ...Array.from({ length: 9 }, (_, i) => c(`I will call contact number ${i + 1} tomorrow`)),
    ]);
    expect(kept.length).toBeLessThanOrEqual(6);
    expect(kept.filter((k) => k.action.includes('send the letter'))).toHaveLength(1);
  });

  /* Sessions they were in, never weeks: somebody on leave has not had a chance to move it. */
  it('counts how long it has been open in sessions', () => {
    expect(openSince({ statedInSession: 1, saidAgainIn: [2, 3, 4] }, 6).say).toBe('open 5 sessions, said again in 3 of them');
    expect(openSince({ statedInSession: 6, saidAgainIn: [] }, 6).say).toBe('said this session');
    expect(openSince({ statedInSession: 4, saidAgainIn: [] }, 6).say).toBe('open 2 sessions, not mentioned again');
  });
});
