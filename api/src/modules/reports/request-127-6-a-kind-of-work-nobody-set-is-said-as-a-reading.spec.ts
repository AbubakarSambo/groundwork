import { whatToWorkOnNext } from './what-to-work-on-next';

/**
 * SCREENS REQUEST 127 (6): "This is session 1 of 4 of founder or CEO work." was read in the lead's own
 * coaching on a drift check-in whose kind of work is not set. The label is the engine's reading of
 * what she said, not a setting, so the note now says so, and the session count stands on its own.
 * The coaching is the reader's own and private, so the person it is written for is the only reader.
 */
const coach = (over: Record<string, any>) => whatToWorkOnNext({
  patterns: [], role: 'Founder', roleToSay: 'Founder', noticedBehaviour: null, sessionNumber: 1, totalSessions: 4, scenario: 'DRIFT',
  waitingOn: [], holdingUp: [], saidSomethingSpecific: true, anythingDocumented: true,
  detectedFunction: 'CEO', functionConfidence: 0.9, ...over,
} as any);

describe('request 127 (6): a kind of work nobody set is said as a reading', () => {
  it('the lead reads the session count on its own, then where the kind of work comes from', () => {
    expect(coach({}).whyItMatters).toBe(
      'This is session 1 of 4. What you have said so far reads as founder or CEO work. Nothing repeats yet, which is normal this early. What decides whether the later sessions are worth anything is what you can point at.',
    );
    expect(coach({}).whyItMatters).not.toMatch(/session 1 of 4 of /);
  });

  it('a role the person gave is still said as theirs', () => {
    expect(coach({ detectedFunction: null, functionConfidence: null, role: 'Poultry farmer', roleToSay: 'Poultry farmer' }).whyItMatters)
      .toMatch(/^This is session 1 of 4 of your work as poultry farmer\./);
  });
});
