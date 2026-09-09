import { PartyType } from '@prisma/client';
import { labelsForParties, type LabelParty } from './party-labels';

/**
 * TWO PARTIES SHARING A LABEL HANDS ONE OF THEM THE OTHER'S PRIVATE READ.
 *
 * `own-reads-only.ts` keeps per-person rows with `row.label === viewerLabel`. Same-role
 * NON-initiators were already disambiguated into "Field officer A/B". The initiator was not: their
 * label was taken raw from their own remit, and the role counting that drives disambiguation
 * excluded initiators entirely. So an initiator whose remit matched a participant's role - both
 * "Managing the contract", which is an ordinary thing to happen - produced one label for two people,
 * and the filter then served the initiator that participant's private quality read.
 *
 * The asymmetry that hid it: a label that DRIFTS fails safe, because an allow-list filter stops
 * matching and the viewer merely loses their own row. A label that COLLIDES fails open. Only the
 * second is a disclosure, which is why the invariant checks uniqueness rather than checking for names
 * - a label legitimately contains user-written role text, so a name-based check would be both wrong
 * and easy to bypass.
 */
const initiator = (role?: string | null): LabelParty => ({ id: 'lead', partyType: PartyType.INITIATOR, roleAsDescribed: role ?? null });
const party = (id: string, role?: string | null): LabelParty => ({ id, partyType: PartyType.PARTICIPANT, roleAsDescribed: role ?? null });

describe('the collision that leaked', () => {
  it('an initiator sharing a role with a participant no longer shares their label', () => {
    const m = labelsForParties([initiator('Managing the contract'), party('p1', 'Managing the contract')]);
    expect(m.get('lead')).not.toBe(m.get('p1'));
    expect(new Set([...m.values()]).size).toBe(2);
  });

  it('and three-way sharing still yields three distinct labels', () => {
    const m = labelsForParties([initiator('Field officer'), party('p1', 'Field officer'), party('p2', 'Field officer')]);
    expect(new Set([...m.values()]).size).toBe(3);
  });
});

describe('labels that were already correct do not move', () => {
  it('an unshared initiator remit keeps its exact former label, so stored reports do not drift', () => {
    /**
     * The control that matters most. Changing a label that was fine would make every stored report's
     * rows stop resolving - which fails safe, but silently loses people their own reads.
     */
    expect(labelsForParties([initiator('Chief executive'), party('p1', 'Board chair')]).get('lead'))
      .toBe('Chief executive');
  });

  it('an initiator with no remit is still "the initiator"', () => {
    expect(labelsForParties([initiator(null), party('p1', 'Board chair')]).get('lead')).toBe('the initiator');
  });

  it('same-role participants keep their A/B suffixes', () => {
    const m = labelsForParties([initiator('Chief executive'), party('p1', 'Field officer'), party('p2', 'Field officer')]);
    expect([...m.values()].filter(v => v.startsWith('Field officer')).sort()).toEqual(['Field officer A', 'Field officer B']);
  });

  it('a party with no role at all is still "participant A"', () => {
    expect(labelsForParties([initiator('Chief executive'), party('p1', null)]).get('p1')).toBe('participant A');
  });
});

describe('and if a collision ever returns, it fails closed', () => {
  it('throws rather than returning a duplicated label', () => {
    /**
     * Deliberately constructed to defeat the disambiguation: one party's role is literally another's
     * suffixed label. Losing the report for this ground is the cheaper failure.
     */
    expect(() => labelsForParties([
      party('p1', 'Field officer'),
      party('p2', 'Field officer'),
      party('p3', 'Field officer A'),
    ])).toThrow(/label collision/i);
  });

  it('the error names both parties, so it is diagnosable', () => {
    try {
      labelsForParties([party('p1', 'Field officer'), party('p2', 'Field officer'), party('p3', 'Field officer A')]);
    } catch (e: any) {
      expect(e.message).toMatch(/p1|p2|p3/);
      expect(e.message).toMatch(/private read/);
    }
  });
});
