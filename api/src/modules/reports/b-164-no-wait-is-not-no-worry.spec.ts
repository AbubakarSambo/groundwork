import { whatToProbe } from './what-to-probe';

/** B-164: "There is nothing recorded as blocked." was read beside Esther's own worry that three shops were waiting on a credit decision. */
const base: any = {
  who: 'Esther Adeyemi', participantId: 'p1', role: null, answeredThisSession: true, patterns: [], waitingOn: [], holdingUp: [], concrete: [],
  documentsAttached: 0, sessionNumber: 1, totalSessions: 6, scenario: null,
};
describe('what the lead reads about being stuck', () => {
  it('names the worry on record where no wait is recorded', () => {
    expect(whatToProbe({ ...base, worries: 1 }).triedToUnblock).toBe("No wait has been recorded against a named person, but a worry about Esther Adeyemi's work is on record, so the record does not say what was done about it.");
  });
  it('says plainly that nothing holds the work up where there is neither', () => {
    expect(whatToProbe({ ...base, worries: 0 }).triedToUnblock).toBe("Nothing is recorded as holding up Esther Adeyemi's work.");
  });
  it('says "your" to the person themselves', () => {
    expect(whatToProbe({ ...base, whoInASentence: 'you', worries: 2 }).triedToUnblock).toMatch(/2 worries about your work are on record/);
  });
});
