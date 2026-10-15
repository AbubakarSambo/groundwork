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

/*
 * CHANGED 25 SEPTEMBER 2026, AND THE THREE TESTS THAT WENT ARE WORTH NAMING.
 *
 * This file used to hold "labels that were already correct do not move": an unshared role kept its
 * exact label, same-role people kept A/B suffixes, and a role could collide with another's suffix.
 * All three described a world in which a person's ROLE is their label.
 *
 * `roleAsDescribed` is free text a lead types when adding somebody, and leads type sentences. The
 * twenty-four-scenario run printed, mid-paragraph: "Apply the checklist from the Relationship
 * officer, Surulere. Target 14 approved facilities this quarter. to the work of the other officers."
 * Two full stops inside a label, so the sentence ends twice and resumes in lower case. It also could
 * never be swapped for a name, because the substitution is a string match and the label was a
 * sentence - so those people were never named even to readers entitled to their names.
 *
 * Labels are now positional and nothing else. The collision the old disambiguation existed to
 * prevent is now impossible by construction, which is why the case that constructed one is gone.
 * The guard itself stays, because a guard that cannot fire is cheap and the next naming branch
 * somebody adds might make it fire again.
 */
describe('a label is positional, never a role description', () => {
  it('the initiator is "the initiator", whatever their remit says', () => {
    expect(labelsForParties([initiator('Chief executive'), party('p1', 'Board chair')]).get('lead'))
      .toBe('the initiator');
    expect(labelsForParties([initiator(null), party('p1', 'Board chair')]).get('lead')).toBe('the initiator');
  });

  it('participants are Participant A, B, C, whatever their roles say', () => {
    const m = labelsForParties([initiator('Chief executive'), party('p1', 'Field officer'), party('p2', 'Field officer')]);
    expect([...m.values()].sort()).toEqual(['Participant A', 'Participant B', 'the initiator']);
  });

  it('a party with no role at all is still "Participant A"', () => {
    expect(labelsForParties([initiator('Chief executive'), party('p1', null)]).get('p1')).toBe('Participant A');
  });

  it('and no label contains a full stop, so none of them can end a sentence', () => {
    const m = labelsForParties([
      initiator('Relationship officer, Surulere. Target 14 approved facilities this quarter.'),
      party('p1', 'Relationship officer, Ikeja. Target 14 approved facilities this quarter.'),
    ]);
    for (const label of m.values()) expect(label).not.toContain('.');
  });
});

describe('and if a collision ever returns, it fails closed', () => {
  /*
   * The case that used to live here built a collision out of roles: one party's role was literally
   * another's suffixed label. Roles are no longer labels, so that collision cannot be built. The
   * guard below is kept because `own-reads-only` filters per-person rows on the raw label, and a
   * shared label hands one person another's private read - a failure worth a dead check.
   */
  it('cannot be reached through roles any more, however they are written', () => {
    expect(() => labelsForParties([
      party('p1', 'Field officer'),
      party('p2', 'Field officer'),
      party('p3', 'Participant A'),
    ])).not.toThrow();
    expect(new Set([...labelsForParties([
      party('p1', 'Field officer'),
      party('p2', 'Field officer'),
      party('p3', 'Participant A'),
    ]).values()]).size).toBe(3);
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
