import { whoCanReadWhatYouSay } from './who-may-read-this-check-in';

/**
 * THE ONE SENTENCE ABOUT WHO READS WHAT A PARTICIPANT SAYS (Hafsah, 15 November 2026), as each kind of check-in reads it.
 * Where people are named to each other it ends with the team report the lead shares. Where they are not (an evaluation check-in,
 * a cohort, or the lead's switch), a participant gets none of the team's picture, so it says the lead reads their report. A new
 * hire is an evaluation check-in on the server's own list, so a new hire is told their lead reads their report.
 */
describe('whoCanReadWhatYouSay', () => {
  it('an ordinary team check-in: the lead shares a team report when it is ready', () => {
    expect(whoCanReadWhatYouSay({ scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: null }, 'Wairimu'))
      .toBe('You see your own report straight away. Wairimu shares a team report when it is ready. Nobody else reads your conversation.');
  });

  it.each(['NEW_HIRE', 'PIP', 'RECOGNITION', 'CONTRACT_RENEWAL', 'COHORT_CHECK'])('%s: the person who runs it reads their report, and there is no team report to share', (scenario) => {
    expect(whoCanReadWhatYouSay({ scenario, peersVisibleToEachOther: null }, 'Wairimu'))
      .toBe('You see your own report straight away. Wairimu reads it too. Nobody else reads your conversation.');
  });

  it('the lead can switch people on to each other, whatever the kind', () => {
    expect(whoCanReadWhatYouSay({ scenario: 'PIP', peersVisibleToEachOther: true }, 'Wairimu')).toContain('shares a team report');
    expect(whoCanReadWhatYouSay({ scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: false }, 'Wairimu')).toContain('reads it too');
  });

  it('says "the person who runs it" when the lead has no first name, and never names admins, a model or who at Groundwork reads what', () => {
    const said = whoCanReadWhatYouSay({ scenario: 'OKR_ALIGNMENT' }, null);
    expect(said).toContain('The person who runs it shares a team report');
    expect(said).not.toMatch(/admin|train|Groundwork reads|model/i);
  });
});
