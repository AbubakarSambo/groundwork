import { whichDecision } from './a-request-in-words';
import { route } from '../assistant/the-router-is-deterministic';

/** B-144: 'approve' to a daily summary with 229 requests waiting sent one 14,773-character text, which WhatsApp refuses (limit 4,096). */
const many = (n: number) => Array.from({ length: n }, (_, i) => ({ ref: `r${i}`, kind: 'leave' as const, firstName: `Person${i}`, thing: `Person${i}'s leave from Thursday 15 October to Monday 19 October` })) as any[];

describe('which request do you mean', () => {
  it('names the first five and counts the rest, however many wait', () => {
    const said = whichDecision(many(229));
    expect(said.length).toBeLessThan(4096);
    expect(said).toContain('229 requests are waiting for you.');
    expect(said).toContain("Person0's leave");
    expect(said).toContain('and 224 more are waiting in Groundwork.');
    expect(said).not.toContain('Person6');
  });
  it('lists a few as before', () => {
    expect(whichDecision(many(2))).toBe("Two requests are waiting for you. One is Person0's leave from Thursday 15 October to Monday 19 October, and the other is Person1's leave from Thursday 15 October to Monday 19 October. Which one do you mean? You can write, for example, \"approve Person0's leave\".");
  });
  it('"What is waiting?" is answered', () => {
    expect(route('What is waiting?').lane).toBe('your_requests');
    expect(route('what is waiting for me').lane).toBe('your_requests');
  });
});
