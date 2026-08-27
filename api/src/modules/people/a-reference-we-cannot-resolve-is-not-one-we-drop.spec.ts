import { resolveReferences, departedOwners } from './an-unresolved-reference-is-a-fact';

/**
 * DURING A CUSTOMER'S FIRST SYNC THIS IS THE NORMAL CASE.
 *
 * Objectives and people arrive from different systems on different schedules, so an objective
 * naming `u-8842` routinely lands before `u-8842` does. Some never resolve at all, because the
 * owner sits outside whatever scope their IdP was configured to send.
 *
 * Dropping the reference would be a silent data-loss bug of exactly the shape that has bitten this
 * work twice already: the import succeeds, the owner becomes nobody, and the customer finds out
 * weeks later that half their objectives are unowned - and it looks like their integration's fault.
 */
const person = (userName: string, active = true) => ({ userName, displayName: userName, email: null, active });

describe('a reference we cannot resolve is not one we drop', () => {
  it('keeps the id we were given, whether or not it resolves', () => {
    const r = resolveReferences({ ownerExternalId: 'u-999', contributorExternalIds: [] }, new Map());
    expect(r.owner).toEqual({ externalId: 'u-999', person: null });
    expect(r.unresolved).toEqual(['u-999']);
  });

  it('resolves what it can and names what it cannot, in the same answer', () => {
    const found = new Map([['u-1', person('naomi')]]);
    const r = resolveReferences({ ownerExternalId: 'u-1', contributorExternalIds: ['u-2', 'u-1'] }, found as any);
    expect(r.owner!.person!.userName).toBe('naomi');
    expect(r.contributors.map((c) => [c.externalId, !!c.person])).toEqual([['u-2', false], ['u-1', true]]);
    expect(r.unresolved).toEqual(['u-2']);
  });

  it('reports a missing id once, even when it is both owner and contributor', () => {
    /* Otherwise one broken reference reads as two problems. */
    const r = resolveReferences({ ownerExternalId: 'u-9', contributorExternalIds: ['u-9'] }, new Map());
    expect(r.unresolved).toEqual(['u-9']);
  });

  it('reports an empty list rather than omitting the field when everything resolved', () => {
    /* One shape either way, so a consumer checking `unresolved.length` need not know whether the
       field exists. */
    const found = new Map([['u-1', person('naomi')]]);
    const r = resolveReferences({ ownerExternalId: 'u-1', contributorExternalIds: [] }, found as any);
    expect(r.unresolved).toEqual([]);
  });

  it('survives a contributor list that is not a list', () => {
    /* It arrives as JSON from somebody else's system. */
    for (const junk of [null, undefined, 'u-1', 42, { a: 1 }]) {
      expect(() => resolveReferences({ ownerExternalId: null, contributorExternalIds: junk as any }, new Map())).not.toThrow();
    }
    expect(resolveReferences({ contributorExternalIds: ['u-1', '', null] as any }, new Map()).unresolved).toEqual(['u-1']);
  });

  it('a departed person RESOLVES - they are not missing', () => {
    /*
     * Two different facts leading two different places: one is a handover, the other is a broken
     * reference. Collapsing them hides every departure inside a list of import problems.
     */
    const found = new Map([['u-1', person('naomi', false)]]);
    const r = resolveReferences({ ownerExternalId: 'u-1', contributorExternalIds: [] }, found as any);
    expect(r.unresolved).toEqual([]);
    expect(r.owner!.person!.active).toBe(false);
    expect(departedOwners(r)).toEqual(['u-1']);
  });

  it('and someone we have never seen is not reported as departed', () => {
    const r = resolveReferences({ ownerExternalId: 'u-nobody', contributorExternalIds: [] }, new Map());
    expect(departedOwners(r)).toEqual([]);
    expect(r.unresolved).toEqual(['u-nobody']);
  });
});
