import { anOrganisationToSetUp, theOpening, theSaidBack } from './an-organisation-to-set-up-for-specs';
import { asksToSetUpASuite } from './a-suite-set-up-by-talking';

/**
 * DECISION 85, PERFORMANCE REVIEWS: AN ADMIN SETS UP REVIEWS BY TALKING TO ASK GROUNDWORK. How often,
 * and who writes each review with the person, read through the real AssistantService and the real
 * SuitesService. Nothing is set until Grace, the admin, says yes. Groundwork never makes the decision
 * in a review; this only says how often and who writes it.
 */

const THE_RULES_SAID = (every: string) => [
  `Each person is reviewed ${every}.`,
  'The person’s manager writes each review with them.',
  'If the person has no manager in Groundwork, an admin writes it instead.',
].join(' ');

/* Changed 20 November 2026: the opening offers to work from a written policy, and the say-back lists one rule a line (Hafsah's screenshots). */
const SAID_BACK = (every: string) => theSaidBack('Here is how performance reviews will work. Performance reviews will be switched on.', [
  `Each person is reviewed ${every}.`,
  'The person’s manager writes each review with them. If the person has no manager in Groundwork, an admin writes it instead.',
]);

describe('Grace, an admin, sets up performance reviews by talking', () => {
  it('is asked only what is missing, and a job the suite cannot use is asked again plainly', async () => {
    const o = anOrganisationToSetUp();
    expect(await o.talk('u-grace', ['Set up performance reviews', 'Twice a year', 'HR', 'Their manager'])).toEqual([
      theOpening('performance reviews', 'How often is each person reviewed, every 6 months or every 12 months?'),
      'Who writes each review with the person, their manager or an admin?',
      'A review can be written with the person by their manager or by an admin. Which should it be?',
      SAID_BACK('every 6 months'),
    ]);
    expect(o.writes).toEqual([]);
  });

  it('what the opening already says is not asked again', async () => {
    const o = anOrganisationToSetUp();
    expect(await o.says('u-grace', 'Set up our review process')).toContain('How often is each person reviewed');
    const p = anOrganisationToSetUp();
    expect(await p.says('u-grace', 'Set up annual performance reviews')).toBe(theOpening('performance reviews', 'Who writes each review with the person, their manager or an admin?'));
  });

  it('a change before the yes is said back again; on the yes it is written through the Suites service and read back the same', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', ['Set up performance reviews', 'Twice a year', 'Their manager']);
    expect(await o.says('u-grace', 'make it once a year')).toBe(`I have changed that. ${SAID_BACK('every 12 months')}`);
    expect(o.writes).toEqual([]);
    expect(await o.says('u-grace', 'yes')).toBe(`I have set it up, and performance reviews are switched on. ${THE_RULES_SAID('every 12 months')} You can change any of it by telling me, or on the Suites page.`);
    const grace = o.as('u-grace');
    const page: any = await o.suites.forReader(grace);
    expect(page.groups.flatMap((g: any) => g.suites).find((s: any) => s.key === 'reviews')).toMatchObject({ on: true, answers: { every: 'Every 12 months', writer: 'Their manager' } });
    expect((await o.assistant.theSetUpAsStored(grace, 'reviews')).join(' ')).toBe(THE_RULES_SAID('every 12 months'));
    expect((await o.suites.rulesHistory(grace)).changes.map((c) => c.said)).toEqual(['Grace switched on performance reviews on 3 October.']);
  });

  it('a no before the yes changes nothing', async () => {
    const o = anOrganisationToSetUp();
    await o.talk('u-grace', ['Set up performance reviews', 'Every 12 months', 'An admin']);
    expect(await o.says('u-grace', 'no')).toBe('I have not set up performance reviews. Nothing has changed.');
    expect(o.writes).toEqual([]);
  });
});

describe('somebody who is not an admin asks to set up performance reviews', () => {
  it.each([['Wairimu, a lead', 'u-wairimu'], ['Miriam, a member', 'u-miriam']])('%s is told plainly that an admin sets it up, and nothing is changed', async (_who, userId) => {
    const o = anOrganisationToSetUp();
    expect(await o.says(userId, 'Set up performance reviews')).toBe(
      /* Decision 85: an admin or whoever looks after HR sets this up, and nobody is named for HR here. */
      'Only an admin or whoever looks after HR can set up how performance reviews work in your organisation, so I have not changed anything. If you would like it set up or changed, you could ask Grace, who is an admin here.',
    );
    expect(o.proposals).toEqual([]);
    expect(o.writes).toEqual([]);
  });
});

describe('one review is not the review process', () => {
  it.each(['set up a review', 'set up a review for Aisha', 'set up a check-in for the review'])('"%s" is not taken', (m) => {
    expect(asksToSetUpASuite(m)).toBeNull();
  });
});
