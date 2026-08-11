import { countsAccounts, tallyInReport } from './counts-accounts';

/**
 * A GAP IS REAL BECAUSE THE RECORD SUPPORTS IT, NOT BECAUSE THREE PEOPLE
 * MENTIONED IT.
 *
 * With two people in a ground, a divergence is plainly a gap between two
 * accounts. Add colleagues and a new failure appears that nobody designed:
 *
 *     "Three of the four described the same delay in handover."
 *
 * That is a finding about a person established by counting. It reads as
 * conclusive, it invites no further look at the work, and it is exactly the
 * assembled verdict this product refuses to produce. The same fact belongs in
 * the report as a gap in the work with the evidence beneath it, where a reader
 * can disagree with it.
 *
 * The synthesis prompt is told not to do this. These pin the check that it held.
 *
 * DETECT, NEVER REWRITE. The courtroom opener is stripped in code because
 * removing "the record shows" cannot change a sentence's meaning. A tally can
 * not be handled that way: cut "two of the three" and what is left says
 * something different, and silently altering a claim inside an accountability
 * record would be far worse than a clumsy one. So this reports and a person
 * decides.
 */

describe('counting who said it', () => {
  it('catches the plain tally', () => {
    expect(countsAccounts('Three of the four described the same delay.')).toBeTruthy();
    expect(countsAccounts('2 of 3 accounts describe the same friction.')).toBeTruthy();
    expect(countsAccounts('Two out of three raised the handover.')).toBeTruthy();
  });

  it('catches the vaguer versions, which read the same way', () => {
    expect(countsAccounts('Most people said the handover was late.')).toBeTruthy();
    expect(countsAccounts('The majority felt the scope had moved.')).toBeTruthy();
    expect(countsAccounts('Several accounts describe the same gap.')).toBeTruthy();
    expect(countsAccounts('Everyone except the delivery lead reported it.')).toBeTruthy();
    expect(countsAccounts('All but one described the same problem.')).toBeTruthy();
  });

  it('names the phrase it found, so nobody has to hunt for it', () => {
    expect(countsAccounts('Three of the four described the same delay.')).toMatch(/three of the four/i);
  });
});

describe('what it must not flag', () => {
  it('leaves a gap stated as a gap alone', () => {
    // The same underlying fact, written the way it should be.
    expect(countsAccounts(
      'Handover is described as complete by the person doing it and as still open by the people receiving it.',
    )).toBeNull();
  });

  it('does not flag ordinary numbers in the work', () => {
    // "22 tickets in three weeks" is evidence, not a tally of who said something.
    expect(countsAccounts('He closed 22 tickets in his first three weeks.')).toBeNull();
    expect(countsAccounts('Two client accounts, run end to end.')).toBeNull();
    expect(countsAccounts('The plan runs for 90 days with weekly check-ins.')).toBeNull();
  });

  it('does not flag a two-party report describing both sides', () => {
    expect(countsAccounts(
      'Both records describe the first six weeks differently, and the gap closed once it was named.',
    )).toBeNull();
  });
});

describe('finding it anywhere in a report', () => {
  it('looks inside the nested parts, not just the summary', () => {
    const report = {
      sharedPicture: 'The work moved from tickets to client ownership.',
      centralQuestion: 'What names the goal in week one?',
      agreements: ['Two accounts are now running end to end.'],
      divergences: [
        {
          topic: 'Handover',
          atStake: 'If this holds, releases keep slipping.',
          evidence: ['Three of the four described the same delay.'],
        },
      ],
    };
    const found = tallyInReport(report);
    expect(found?.field).toMatch(/divergences/);
    expect(found?.phrase).toMatch(/three of the four/i);
  });

  it('passes a clean report', () => {
    expect(tallyInReport({
      sharedPicture: 'The work moved from clearing tickets to owning client accounts.',
      centralQuestion: 'What names the goal in week one?',
      agreements: ['Two client accounts are running end to end.'],
      divergences: [{ topic: 'Handover', atStake: 'Releases keep slipping.', evidence: ['Marked done on the 4th; still open on the 9th.'] }],
    })).toBeNull();
  });
});
