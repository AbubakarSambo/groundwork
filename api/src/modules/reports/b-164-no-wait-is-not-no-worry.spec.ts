import { whatToProbe } from './what-to-probe';

/** B-164: "There is nothing recorded as blocked." was read beside Esther's own worry that three shops were waiting on a credit decision. */
const base: any = {
  who: 'Esther Adeyemi', participantId: 'p1', role: null, answeredThisSession: true, patterns: [], waitingOn: [], holdingUp: [], concrete: [],
  documentsAttached: 0, sessionNumber: 1, totalSessions: 6, scenario: null,
};
describe('what the lead reads about being stuck', () => {
  /* F2 (Hafsah, 2 November 2026; false-flags.md J1): a worry about an office's delay was said as "a worry about Joseph's work". So a worry is
     not counted here; B-164 is kept by never saying nothing is blocked, only that no wait on a named person is recorded. */
  it('never says nothing is blocked where no wait is recorded, and counts no worry as being about their work', () => {
    const t = whatToProbe({ ...base } as any).triedToUnblock;
    expect(t).toBe("Nothing in the record says Esther Adeyemi's work is waiting on a named person.");
    expect(t).not.toMatch(/nothing (?:is )?recorded as blocked|worry about/i);
  });
  it('says only what the record holds where there is no wait at all', () => {
    expect(whatToProbe({ ...base } as any).triedToUnblock).not.toMatch(/holding up/);
  });
  it('says "your" to the person themselves', () => {
    expect(whatToProbe({ ...base, whoInASentence: 'you' } as any).triedToUnblock).toBe('Nothing in the record says your work is waiting on a named person.');
  });
});
