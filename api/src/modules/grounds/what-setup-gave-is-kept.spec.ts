import { GroundsService } from './grounds.service';

/**
 * WHAT THE LEAD SAID IN SETUP IS KEPT WHERE EACH PART LIVES (round 7, the sales lead; Hafsah's blocker, "nothing anyone says in setup is
 * ever lost").
 *
 * He said in setup what a good week looks like and that the target is revenue; after saving, the check-in read "What doing well looks
 * like: Nothing stated yet" and "Where this stood at the start: Nothing recorded yet". The save now reads his setup words the way the
 * context conversation reads a paste and writes them through the same writer, leaving the numbers to the save's own targets reading,
 * and his first session's lines become where this stood at the start through the page's own writer.
 */
function aService() {
  const service = Object.create(GroundsService.prototype) as any;
  const read = {
    success: 'A good week is two new customers signed and every lead followed up within a day.',
    teamTargets: [{ name: 'Revenue', target: 900000, notToExceed: false }],
    forPeople: [{ who: 'Kwame', participantId: 'p-kwame', expectation: 'Two customers', targets: [] }],
    dates: [], unmatched: [], waysOfWorking: ['We sell one product, water filters.'], strategy: [], notes: [], openDecisions: [], notSettled: [],
    aboutPeople: [], commitments: [{ who: null, participantId: null, action: 'Call back', outcome: null, when: null, theySaidIt: true }],
    questionsForPeople: [{ who: 'Kwame', participantId: 'p-kwame', question: 'q' }], betweenPeople: [], toldToParticipants: 'x',
  };
  service.whatAPasteGives = jest.fn(async () => read);
  service.writeWhatThePasteGave = jest.fn(async () => true);
  service.baselineEntryCandidates = jest.fn(async () => ({ candidates: [{ text: 'We closed nine customers last month and want twelve.', type: 'CLAIM' }], alreadyRecorded: [] }));
  service.recordBaselineEntries = jest.fn(async () => []);
  return { service, read };
}

describe('when a setup becomes a check-in', () => {
  it('what doing well looks like and the ways of working are written through the context writer, and the numbers are left to the targets reading', async () => {
    const { service, read } = aService();
    await service.keepWhatSetupGave('g1', 'u-jamal', ['We sell water filters.', 'A good week is two new customers signed.']);
    expect(service.whatAPasteGives).toHaveBeenCalledWith('g1', 'We sell water filters.\n\nA good week is two new customers signed.');
    const written = service.writeWhatThePasteGave.mock.calls[0][1];
    expect(written.success).toBe(read.success);
    expect(written.waysOfWorking).toEqual(read.waysOfWorking);
    expect(written.teamTargets).toEqual([]);
    expect(written.forPeople).toEqual([]);
    expect(written.commitments).toEqual([]);
    expect(written.questionsForPeople).toEqual([]);
    expect(written.toldToParticipants).toBeNull();
  });

  it('his first session’s own lines become where this stood at the start', async () => {
    const { service } = aService();
    await service.keepWhatSetupGave('g1', 'u-jamal', ['We closed nine customers last month.']);
    expect(service.recordBaselineEntries).toHaveBeenCalledWith('g1', 'u-jamal', ['We closed nine customers last month and want twelve.']);
  });

  it('a starting point already recorded is never added to from setup', async () => {
    const { service } = aService();
    service.baselineEntryCandidates = jest.fn(async () => ({ candidates: [{ text: 'Something else said in session one.', type: 'CLAIM' }], alreadyRecorded: [{ text: 'Already there.' }] }));
    await service.keepWhatSetupGave('g1', 'u-jamal', ['words']);
    expect(service.recordBaselineEntries).not.toHaveBeenCalled();
  });
});
