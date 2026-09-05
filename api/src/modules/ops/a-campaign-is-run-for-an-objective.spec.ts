import {
  whyThisCampaignCannotRunYet,
  whatThisCampaignIsActuallyServing,
} from './a-campaign-is-run-for-an-objective';

const good = {
  title: 'October newsletter',
  objectiveId: 'o1',
  objective: 'The objective needs ten qualified companies and the list is where they come from.',
};

describe('planning a campaign', () => {
  it('is refused with no objective behind it', () => {
    expect(whyThisCampaignCannotRunYet({ ...good, objectiveId: null })).toContain('Name the objective');
  });

  it('and refused when the link has no reason behind it', () => {
    expect(whyThisCampaignCannotRunYet({ ...good, objective: 'Sales' })).toContain('dropdown');
  });

  it('and refused when the reason is the campaign name said back', () => {
    /* Long enough to clear the length check, which is exactly why the length
       check alone is not the guard: a title is usually long enough. */
    const title = 'The October founder newsletter series';
    expect(whyThisCampaignCannotRunYet({ title, objectiveId: 'o1', objective: `${title}.` })).toContain(
      'name again',
    );
  });

  it('and allowed once both are there', () => {
    expect(whyThisCampaignCannotRunYet(good)).toBeNull();
  });
});

describe('what a campaign is serving', () => {
  it('says nothing when it is aimed at sales', () => {
    expect(whatThisCampaignIsActuallyServing('SALES')).toBeNull();
    expect(whatThisCampaignIsActuallyServing('UNLOCKS_A_CUSTOMER')).toBeNull();
  });

  it('and says, rather than refuses, when it is aimed at the moat', () => {
    /* A campaign about what the product is has always been the moat's work.
       Refusing it would force somebody to pick a sales objective they do not
       believe in, which is worse than the mismatch. */
    const said = whatThisCampaignIsActuallyServing('MOAT');
    expect(said).toContain('can be right');
  });

  it('and names an objective that says nothing about what it serves', () => {
    expect(whatThisCampaignIsActuallyServing(null)).toContain('does not say what it serves');
  });
});
