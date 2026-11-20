import { whatToWorkOnNext } from './what-to-work-on-next';

/**
 * Run-26 switched coaching off for a person with no role, to stop a borrower being coached as a "Founder or CEO".
 * Decision 55: coaching is never switched off. A person with no role is coached, and no role is named.
 */
const coach = (over: Record<string, any>) => whatToWorkOnNext({
  patterns: [], role: null, roleToSay: null, noticedBehaviour: null, sessionNumber: 1, totalSessions: 3, scenario: null,
  waitingOn: [], holdingUp: [], saidSomethingSpecific: true, anythingDocumented: true, ...over,
} as any);

const jobNames = /founder|ceo|sales|marketing|finance|engineering|operations|product|management|project/i;

describe('a person with no role is still coached, and told no role', () => {
  it('the asset-loan borrower (detected as a founder, no role given) reads a coaching block that names no job', () => {
    const note = coach({ detectedFunction: 'CEO', functionConfidence: 0.9 });
    expect(note.role).not.toBeNull();
    expect(note.role!.protectAgainst).toBe('A short account is not a weak one. If you said little, little may have happened yet, or nobody may have asked the right question. Nothing here is read against a kind of job.');
    expect(note.role!.onTrack).toContain('has a date, a number or a name on it');
    expect(JSON.stringify(note)).not.toMatch(jobNames);
  });

  it('a sales participant who gave no role reads the same block and is not told they do sales', () => {
    const note = coach({ detectedFunction: 'SALES', functionConfidence: 0.9, sessionNumber: 2 });
    expect(note.role).not.toBeNull();
    expect(note.role!.goingWrong).toContain('hard to check later');
    expect(note.whyItMatters).toBe('This is check-in 2 of 3 of this work. Nothing repeats yet, which is normal this early. What decides whether the later check-ins are worth anything is what you can point at.');
    expect(JSON.stringify(note)).not.toMatch(jobNames);
  });

  it('a person who gave a role is still coached from their role map', () => {
    const note = coach({ role: 'Account executive', roleToSay: 'Account executive', detectedFunction: 'SALES', functionConfidence: 0.9 });
    expect(note.role!.label).not.toBe('What you said');
  });
});
