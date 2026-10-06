import { theObjectiveSaid, howTheNumbersSit } from './do-the-parts-add-up-to-the-whole';

/** Requests 127, 129, 135, 136: "The objective is 100 All 100 tasks for the release are deployed to production." */
describe('the objective, as the report writer is given it', () => {
  it('does not put the number in front of a name that holds it', () => {
    expect(theObjectiveSaid(100, 'All 100 tasks for the release are deployed to production.')).toBe(
      'the objective, in the lead\'s own words, is "All 100 tasks for the release are deployed to production"');
    expect(theObjectiveSaid(6000, 'The plan is to have reached 6,000 farmers by now.')).toBe(
      'the objective, in the lead\'s own words, is "The plan is to have reached 6,000 farmers by now"');
  });
  it('still puts the number in front of a name that is only the thing counted', () => {
    expect(theObjectiveSaid(40, 'approved facilities')).toBe('the objective is 40 approved facilities');
  });
  it('is what the line says', () => {
    const t: any = { id: 'o', name: 'All 100 tasks for the release are deployed to production.', target: 100, count: 96, ownerParticipantId: null };
    const says = howTheNumbersSit([t], 3).says!;
    expect(says).not.toMatch(/is 100 All/);
    expect(says).toMatch(/is "All 100 tasks for the release are deployed to production", and nobody/);
  });
});
