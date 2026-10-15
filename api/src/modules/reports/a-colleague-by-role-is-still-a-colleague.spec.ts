import { makeService, theCohort } from './__fixtures__/a-cohort-for-the-session-report';

/**
 * DECISION 75 ITEM 14, ON EARLIER SESSIONS AND THE ROUNDS (privacy sweep, second review, finding 1).
 *
 * The stored text of an earlier session describes people by their role ("Outbound Hire: ...", "One hire (inbound) is
 * closing deals ...") or quotes them with no name on it. The wall found a person only by name, so Kwame, in a cohort
 * where people do not see each other, read Lola's and Seyi's circumstances in session 1's report and in the rounds.
 * These read both through the real service, as Kwame.
 */
const read = (x: unknown) => JSON.stringify(x);

const PICTURE = [
  '3 of 3 people have given an account.',
  'One hire (inbound) is closing deals, has proactively shared a demo script, and is offering to coach another hire. That hire flagged a process blocker with pricing.',
  'I took a loan for battery cages to raise layers in Kaduna said this was for: I was hoping for 500 layers, 400 eggs a day.',
  'Most people want a later due date.',
].join('\n\n');

const snapshot = () => ({
  sharedPicture: PICTURE,
  agreements: ['Most people agree the quarterly target is eight closed deals.', 'The inbound hire has closed one deal and flagged a delay in pricing sign-off.'],
  divergences: [{
    topic: 'The definition of weekly progress',
    positions: [{ participantLabel: 'Tunde Alabi', view: 'Success is eight closed deals.' }],
    evidence: [
      "Outbound Hire: 'I made forty calls this week and got four conversations.'",
      "Partnerships Hire (3 sessions): 'I have three conversations that are very close.'",
      'Most people want the target written down.',
    ],
    atStake: 'If this holds, the quarter could end with the hires believing activity was enough.',
    settledBy: null,
  }],
  centralQuestion: null, takenAt: new Date('2026-09-23T17:00:00Z'), amendedAt: null, amendedNote: null,
});

const THE_OTHERS = /Outbound Hire|Partnerships Hire|forty calls|three conversations|One hire \(inbound\)|inbound hire|demo script|That hire|battery cages|500 layers|400 eggs/;

describe('a colleague named by role, as Kwame reads an earlier session and the rounds', () => {
  it('the session report holds nothing about one other person, by role or without a name', async () => {
    const served: any = await makeService(theCohort(), { snapshot: snapshot() }).sessionReport('g1', 1, 'user-kwame', 'org-1');
    const text = read(served);
    expect(text).not.toMatch(THE_OTHERS);
    expect(served.writtenPicture).toContain('3 of 3 people have given an account.');
    expect(served.writtenPicture).toContain('Most people want a later due date.');
    expect(read(served.whereThingsStand.restsOn ?? served.whereThingsStand.openWithReasons)).toContain('Most people want the target written down.');
  });

  it('the rounds hold nothing about one other person, by role or without a name', async () => {
    const rounds = [{ sessionNumber: 1, ...snapshot() }];
    const served: any = await makeService(theCohort(), { rounds }).rounds('g1', 'user-kwame', 'org-1');
    const text = read(served);
    expect(text).not.toMatch(THE_OTHERS);
    expect(text).toContain('Most people want a later due date.');
  });

  it('the lead reads the same session and rounds whole', async () => {
    const served: any = await makeService(theCohort(), { snapshot: snapshot(), rounds: [{ sessionNumber: 1, ...snapshot() }] }).sessionReport('g1', 1, 'user-lead', 'org-1');
    expect(read(served)).toContain('One hire (inbound) is closing deals');
    expect(read(served)).toContain('Outbound Hire');
  });
});
