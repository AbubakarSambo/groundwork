import { GroundsService } from './grounds.service';

/**
 * WHAT THE LEAD SAID IN SETUP IS KEPT WHERE EACH PART LIVES (round 7, the sales lead; Hafsah's blocker, "nothing anyone says in setup is
 * ever lost").
 *
 * He said in setup what a good week looks like and that the target is revenue; after saving, the check-in read "What doing well looks
 * like: Nothing stated yet" and "Where this stood at the start: Nothing recorded yet". The save writes what setup gave through the
 * context page's writer, leaving the numbers to the save's own targets reading, and his first session's lines become where this
 * stood at the start through the page's own writer.
 *
 * CHANGED 3 NOVEMBER 2026 (F1 part 2): setup was read twice, by its assessment and again by the paste reader (whatAPasteGives), a
 * second model call on the same words. It is read once now: what is written is the setup's assessment (its setup part, with the
 * strategy and the notes it now holds, and its decisions still waiting), and the paste reader is never called here. What the lead
 * says about a person, and her risks, stay hers: only what the assessment lets the people in the check-in see becomes a line they read.
 */
const item = (id: string, field: string, words: string, whoMaySee = 'the people in this check-in', extra: any = {}) =>
  ({ id, words, from: [1], whoMaySee, saidWordForWord: true, [field]: words, ...extra });
const THE_SETUP = {
  objective: [item('s1', 'objective', 'Sell more water filters this quarter.')],
  success: [item('s2', 'success', 'A good week is two new customers signed and every lead followed up within a day.')],
  team: [], timing: [],
  rules: [item('s3', 'rule', 'We sell one product, water filters.')],
  risks: [item('s4', 'risk', 'Kwame may leave in December.', 'the lead only')],
  strategy: [item('s5', 'strategy', 'Schools first, then clinics.')],
  notes: [item('s6', 'note', 'The van is shared with the Thika team on Fridays.')],
  privateNotes: [item('s7', 'note', 'Kwame needs pushing on follow-ups.', 'the lead only', { about: 'Kwame' })],
};
const THE_ASSESSMENT = {
  kind: 'assessment', version: 1, setup: THE_SETUP,
  decisions: [item('d1', 'decision', 'Whether we offer a second colour.', undefined, { state: 'waiting' }), item('d2', 'decision', 'We use the new price list.', undefined, { state: 'made' })],
  dates: [item('t1', 'what', 'the stock count', undefined, { when: 'Friday 14 November' })],
};

function aService(assessment: any = THE_ASSESSMENT) {
  const service = Object.create(GroundsService.prototype) as any;
  service.prisma = {
    checkIn: { findUnique: jest.fn(async () => ({ sessionReport: assessment })) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p-kwame', userId: 'u-kwame', email: 'kwame@x.test', nameGiven: null, managingOnly: false, user: { firstName: 'Kwame', lastName: 'Mensah' } }]) },
  };
  service.whatAPasteGives = jest.fn(async () => null);
  service.writeWhatThePasteGave = jest.fn(async () => true);
  service.baselineEntryCandidates = jest.fn(async () => ({ candidates: [{ text: 'We closed nine customers last month and want twelve.', type: 'CLAIM' }], alreadyRecorded: [] }));
  service.recordBaselineEntries = jest.fn(async () => []);
  return service;
}

describe('when a setup becomes a check-in', () => {
  it('what the setup\'s assessment read is written through the context writer, the numbers left to the targets reading, with no second read', async () => {
    const service = aService();
    await service.keepWhatSetupGave('g1', 'u-jamal', 'ci-setup');
    expect(service.prisma.checkIn.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ci-setup' } }));
    expect(service.whatAPasteGives).not.toHaveBeenCalled();
    const written = service.writeWhatThePasteGave.mock.calls[0][1];
    /* What the team reads on the context page, in the lead's own words. */
    expect(written.success).toBe('A good week is two new customers signed and every lead followed up within a day.');
    expect(written.waysOfWorking).toEqual(['We sell one product, water filters.']);
    expect(written.strategy).toEqual(['Schools first, then clinics.']);
    expect(written.notes).toEqual(['The van is shared with the Thika team on Fridays.']);
    expect(written.openDecisions).toEqual(['Whether we offer a second colour.']);
    expect(written.dates).toEqual([{ what: 'the stock count', when: 'Friday 14 November' }]);
    /* The lead's note on Kwame is kept as hers, about him (the writer files it where only she reads it); her risk is never a shared line. */
    expect(written.aboutPeople).toEqual([{ who: 'Kwame Mensah', participantId: 'p-kwame', observation: 'Kwame needs pushing on follow-ups.' }]);
    expect(JSON.stringify({ ...written, aboutPeople: [] })).not.toMatch(/Kwame may leave|needs pushing/);
    expect(written.teamTargets).toEqual([]);
    expect(written.forPeople).toEqual([]);
    expect(written.commitments).toEqual([]);
    expect(written.questionsForPeople).toEqual([]);
    expect(written.toldToParticipants).toBeNull();
  });

  it('with no assessment of the setup yet, nothing is written from it, and the starting point is still kept', async () => {
    const service = aService(null);
    await service.keepWhatSetupGave('g1', 'u-jamal', 'ci-setup');
    expect(service.writeWhatThePasteGave).not.toHaveBeenCalled();
    expect(service.whatAPasteGives).not.toHaveBeenCalled();
    expect(service.recordBaselineEntries).toHaveBeenCalledWith('g1', 'u-jamal', ['We closed nine customers last month and want twelve.']);
  });

  it('his first session’s own lines become where this stood at the start', async () => {
    const service = aService();
    await service.keepWhatSetupGave('g1', 'u-jamal', 'ci-setup');
    expect(service.recordBaselineEntries).toHaveBeenCalledWith('g1', 'u-jamal', ['We closed nine customers last month and want twelve.']);
  });

  it('a starting point already recorded is never added to from setup', async () => {
    const service = aService();
    service.baselineEntryCandidates = jest.fn(async () => ({ candidates: [{ text: 'Something else said in session one.', type: 'CLAIM' }], alreadyRecorded: [{ text: 'Already there.' }] }));
    await service.keepWhatSetupGave('g1', 'u-jamal', 'ci-setup');
    expect(service.recordBaselineEntries).not.toHaveBeenCalled();
  });
});
