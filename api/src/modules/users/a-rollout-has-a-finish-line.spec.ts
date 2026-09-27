import { theRollout, howFarAlong, RolloutFacts } from './where-a-rollout-has-got-to';

/**
 * THE SCREEN AN ORG ADMIN LANDS ON.
 *
 * It listed four links to pages that are already in the rail and had no idea which of them had been
 * done. An admin putting 160 people on is running a rollout, and a rollout has a finish line.
 */
const nothing: RolloutFacts = { people: 1, admins: 1, checkIns: 0, paying: false, connected: false };
const facts = (over: Partial<RolloutFacts> = {}): RolloutFacts => ({ ...nothing, ...over });
const step = (f: RolloutFacts, key: string) => theRollout(f).find(s => s.key === key)!;

describe('what counts as done', () => {
  it('is the thing happening, never a page being visited', () => {
    /* A checklist that ticks on arrival teaches people to click through steps. */
    expect(theRollout(nothing).every(s => !s.done)).toBe(true);
  });

  it('does not count the admin alone as having people', () => {
    expect(step(facts({ people: 1 }), 'people').done).toBe(false);
    expect(step(facts({ people: 2 }), 'people').done).toBe(true);
  });

  it('does not count the admin alone as having a second admin', () => {
    /* One admin means every approval waits on one person being at their desk. */
    expect(step(facts({ admins: 1 }), 'second-admin').done).toBe(false);
    expect(step(facts({ admins: 2 }), 'second-admin').done).toBe(true);
  });

  it('counts one check-in as the pilot done', () => {
    expect(step(facts({ checkIns: 1 }), 'pilot').done).toBe(true);
  });
});

describe('the finish line', () => {
  it('does not include the optional step, so connecting is never a nag', () => {
    const all = theRollout(facts({ people: 2, admins: 2, checkIns: 1, paying: true }));
    const { done, of, finished } = howFarAlong(all)
    expect(of).toBe(4);
    expect(done).toBe(4);
    /* Finished with no API key at all - most organisations will never connect anything. */
    expect(finished).toBe(true);
  });

  it('still shows the optional step', () => {
    expect(theRollout(nothing).some(s => s.optional)).toBe(true);
  });

  it('counts partway honestly', () => {
    expect(howFarAlong(theRollout(facts({ people: 2, checkIns: 1 })))).toEqual({ done: 2, of: 4, finished: false });
  });
});

describe('the order', () => {
  it('puts people before the pilot, because a check-in with nobody in it is a form', () => {
    const keys = theRollout(nothing).map(s => s.key);
    expect(keys.indexOf('people')).toBeLessThan(keys.indexOf('pilot'));
  });

  it('sends each step somewhere that exists', () => {
    for (const s of theRollout(nothing)) expect(s.to.startsWith('/')).toBe(true);
  });
});

describe('where each step goes', () => {
  it('sends "Connect your systems" to the Connect page’s own address, not the old one that only redirects (U.18)', () => {
    expect(step(nothing, 'connect').to).toBe('/settings/tools');
  });
});
