/**
 * A GROUND CAN BE SAVED BEFORE ANYONE IS READY TO NAME THE OTHER PEOPLE.
 *
 * Adding contributors has always been optional in the entry flow - commit
 * defaults them to an empty list, and the ground page has its own "+ Add
 * someone" for later. But nothing on the screen said so. The invite panel read
 * "Add them here now", and someone who added nobody got silence on the
 * confirmation screen, which reads as an unfinished job rather than a fine place
 * to stop.
 *
 * That silence fell hardest on exactly the people most likely to want a night to
 * think about it. Someone opening a performance improvement plan, or a
 * co-founder dispute, is being asked to name the other party at the moment they
 * are least certain - and the flow implied it was now or never.
 *
 * The screen now promises a later. This pins the behaviour that promise depends
 * on: a commit with nobody named must produce a real ground, not an error and
 * not a half-made thing.
 */

import { overlayDraftOntoBody } from './entry.service';

/**
 * The REAL merge commit runs on every payload before it builds anything.
 *
 * An earlier version of this file reimplemented the one-line rule and asserted
 * against its own copy. That passes with the product's copy deleted, which makes
 * it decoration - the same mistake caught in a-ground-must-end.spec.ts. This
 * calls the exported function the commit path actually uses.
 */
const normaliseContributors = (body: Record<string, unknown>) =>
  overlayDraftOntoBody({ payload: {}, history: [] }, body as any) as any;

describe('saving a ground with nobody added yet', () => {
  it('treats a missing contributor list as an empty one, not as an error', () => {
    // THE PROMISE: "You can add people any time from the ground itself."
    expect(normaliseContributors({ groundLabel: 'New hire' }).contributors).toEqual([]);
  });

  it('treats an explicitly empty list the same way', () => {
    expect(normaliseContributors({ groundLabel: 'New hire', contributors: [] }).contributors).toEqual([]);
  });

  it('leaves a real list alone', () => {
    const withPeople = normaliseContributors({
      groundLabel: 'New hire',
      contributors: [{ email: 'abubakar@x.test' }],
    });
    expect(withPeople.contributors).toHaveLength(1);
  });

  it('does not mistake a non-list for a list', () => {
    // Anything that is not an array becomes an empty one rather than being
    // passed on to code that will iterate it.
    for (const bad of [null, undefined, 'abubakar@x.test', 3, {}]) {
      expect(normaliseContributors({ contributors: bad as any }).contributors).toEqual([]);
    }
  });
});
