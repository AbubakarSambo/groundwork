import { mayChange, mayHandOver, ONLY_THEY_CAN, NOT_YOURS_TO_GIVE, MUST_BE_AN_ADMIN } from './the-person-who-set-this-up';

/**
 * THE PERSON WHO SET THE ORGANISATION UP.
 *
 * "It's fine if they have full admin setup, as long as they cannot remove the person that set it
 * up, but the person that set it up can remove them. The person that set it up can choose to make
 * super admin next if they have to leave."
 *
 * Without this, admin was flat: an assistant promoted this morning could deactivate the founder
 * this afternoon, using powers the founder handed them.
 */
const owner = { id: 'owner', role: 'ADMIN' };
const assistant = { id: 'assistant', role: 'ADMIN' };
const member = { id: 'member', role: 'MEMBER' };
const OWNER = 'owner';

describe('who can touch the owner', () => {
  it('another admin cannot', () => {
    expect(mayChange(assistant, owner, OWNER).may).toBe(false);
  });

  it('and is told why, and what the way round is', () => {
    expect(ONLY_THEY_CAN).toContain('hand that over');
    /*
     * Named for a position that can move rather than for having signed up. "The person who set
     * this organisation up" is false the moment it is handed on, and driving the hand-over
     * produced exactly that sentence about somebody who had not set anything up.
     */
    expect(ONLY_THEY_CAN).not.toContain('set up this organisation');
    /* Names the position, not the person: "you cannot do this to X" reads as a personal ranking. */
    expect(ONLY_THEY_CAN).not.toMatch(/\bsenior|superior|above you\b/i);
  });

  it('the owner can change their own account', () => {
    expect(mayChange(owner, owner, OWNER).may).toBe(true);
  });

  it('the owner can remove the admin they let in', () => {
    expect(mayChange(owner, assistant, OWNER).may).toBe(true);
  });

  it('and admins can still manage each other, which is the normal case', () => {
    expect(mayChange(assistant, member, OWNER).may).toBe(true);
    expect(mayChange(assistant, { id: 'other-admin', role: 'ADMIN' }, OWNER).may).toBe(true);
  });

  it('an organisation from before this existed protects nobody, rather than everybody', () => {
    /* Null has to read as "no owner recorded", which is what was true a minute ago. Reading it as
       "protect everyone" would freeze every existing account's admin list. */
    expect(mayChange(assistant, owner, null).may).toBe(true);
  });
});

describe('handing it on', () => {
  it('only the owner may', () => {
    expect(mayHandOver(assistant, { id: 'x', role: 'ADMIN' }, OWNER)).toEqual({ may: false, because: NOT_YOURS_TO_GIVE });
  });

  it('and only to an admin', () => {
    /* Otherwise the protected person cannot manage the organisation, and the fix would be the
       former owner promoting them - which they can no longer do. */
    expect(mayHandOver(owner, member, OWNER)).toEqual({ may: false, because: MUST_BE_AN_ADMIN });
  });

  it('to another admin, yes', () => {
    expect(mayHandOver(owner, assistant, OWNER).may).toBe(true);
  });

  it('and not to themselves, which would read as having done something', () => {
    expect(mayHandOver(owner, owner, OWNER).may).toBe(false);
  });
});
