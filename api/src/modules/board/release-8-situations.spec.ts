import { theSituationBoard, THE_SITUATIONS, THE_SECTIONS, theRelease8SituationsIsOn } from './release-8-situations';

/* Hand-written boards, as the server would serve them after every wall. */
const anAgreementBeingChecked = {
  startingState: { heading: 'What was agreed at the start', rows: [{ when: 'Day 1', what: 'Juma Logistics delivers to all 14 depots within 48 hours.' }] },
  whoOwnsWhat: [{ participantId: 'p1', text: 'Amani said the penalty clause is too soft.', mark: 'said' }],
  obligations: [{ participantId: 'p1', who: 'Amani', promised: ['Amani will send the redlined contract by Friday.'], othersWaitFor: [] }],
  risks: [{ id: 'r1', says: 'The contract may be signed before legal reads it.', because: 'Legal has not checked in yet.' }],
  leadActions: [{ id: 'a1', says: 'Decide whether the penalty clause goes back to Juma.' }],
  timeline: [{ on: '2026-10-20', says: 'Amani raised the penalty clause.' }],
  checkInGrid: { sessions: [1] },
};

describe('Release 8: each remaining situation shows what it switches on, and nothing that is off', () => {
  it('checks an agreement before signing with its own sections, in order, and leaves the timeline off', () => {
    const b = theSituationBoard('CONTRACT_REVIEW', anAgreementBeingChecked, { runsIt: true })!;
    expect(b.situation).toBe('Check an agreement before signing');
    expect(b.group).toBe('Something is starting');
    /* Changed in F5 (Hafsah's change 4 to the approved journey): what needs the lead, then where people differ and what nobody
       knows yet; what was agreed at the start is the lead's own setup words, so it comes after them, no longer first. */
    expect(b.sections.map((s) => s.key)).toEqual(['lead', 'accounts', 'picture', 'oblig', 'risks', 'start']);
    /* The timeline is held, but this situation does not switch it on. */
    expect(b.sections.some((s) => s.key === 'timeline')).toBe(false);
    expect(b.stillToCome).toBeNull();
    expect(b.empty).toBeNull();
  });

  it('never draws What needs you for a person in the check-in', () => {
    const b = theSituationBoard('CONTRACT_REVIEW', anAgreementBeingChecked, { runsIt: false })!;
    expect(b.sections.map((s) => s.key)).not.toContain('lead');
  });

  it('names, in one sentence, what an agreement being tracked switches on and has not filled yet', () => {
    const b = theSituationBoard('IMPLEMENTATION_TRACKING', { startingState: anAgreementBeingChecked.startingState, obligations: anAgreementBeingChecked.obligations }, { runsIt: true })!;
    expect(b.sections.map((s) => s.key)).toEqual(['oblig', 'start']);
    expect(b.stillToCome).toBe('Change since last check-in, blockers, risks and what needs you appear here once a check-in gives them something to show.');
  });

  it('starts an open read empty, and switches each section on as the record fills it', () => {
    const empty = theSituationBoard('OPEN_READ', {}, { runsIt: true })!;
    expect(empty.sections).toEqual([]);
    expect(empty.empty).toBe('Nothing is clear yet, so this board is empty. Each part appears here as soon as people’s check-ins give it something to show.');
    expect(empty.stillToCome).toBeNull();

    const later = theSituationBoard('OPEN_READ', { timeline: anAgreementBeingChecked.timeline }, { runsIt: true })!;
    expect(later.sections.map((s) => s.key)).toEqual(['timeline']);
    expect(later.empty).toBeNull();
    /* An open read names nothing in advance. */
    expect(later.stillToCome).toBeNull();
  });

  it('an empty board says what will fill it (the approved journey, stage 10)', () => {
    expect(theSituationBoard('PULSE_CHECK', {}, { runsIt: true })!.empty).toBe('Nothing is on this board yet.');
    expect(theSituationBoard('SNAPSHOT', {}, { runsIt: false })!.empty).toBe('Nothing is on this board yet.');
  });

  it('is not built for a situation a kit picture already draws', () => {
    expect(theSituationBoard('NEW_HIRE', anAgreementBeingChecked, { runsIt: true })).toBeNull();
    expect(theSituationBoard('PIP', anAgreementBeingChecked, { runsIt: true })).toBeNull();
  });

  it('covers every situation the release plan names', () => {
    const named = ['CONTRACT_REVIEW', 'IMPLEMENTATION_TRACKING', 'NEW_COFOUNDER', 'NEW_ADVISOR', 'SNAPSHOT', 'DISCOVERY', 'CRISIS_ALIGNMENT', 'TEAM_UPDATES', 'PULSE_CHECK', 'COHORT_CHECK', 'REALIGN_TEAM', 'ACUTE_SHOCK', 'OPEN_READ'];
    for (const n of named) expect(THE_SITUATIONS.map((s) => s.scenario)).toContain(n);
  });

  it('writes every heading and reason as a plain sentence, with no pieces joined by a colon', () => {
    for (const { heading, why } of Object.values(THE_SECTIONS)) {
      expect(heading).not.toMatch(/[:·→]/);
      expect(why).toMatch(/^[A-Z].*\.$/);
      expect(why).not.toMatch(/[:·→]/);
    }
  });

  it('is off unless the organisation has it switched on', async () => {
    const prisma = (on: boolean | null) => ({ organization: { findUnique: async () => (on === null ? null : { release8SituationsOn: on }) } });
    expect(await theRelease8SituationsIsOn(prisma(false), 'org')).toBe(false);
    expect(await theRelease8SituationsIsOn(prisma(null), 'org')).toBe(false);
    expect(await theRelease8SituationsIsOn(prisma(true), null)).toBe(false);
    expect(await theRelease8SituationsIsOn(prisma(true), 'org')).toBe(true);
  });
});
