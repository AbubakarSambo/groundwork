import { namesVisibleTo } from './party-labels';
import { PartyType } from '@prisma/client';

/**
 * "PARTICIPANT A SHOULD NOT EXIST ON THIS PAGE. NAMES ARE VISIBLE TO EVERYONE."
 *
 * Read off a rendered report: "Hafsah", "Participant A", "Tunde Okafor (you)" in one list, with
 * the roster three inches above naming all three. The middle one reads as a placeholder that
 * failed to resolve, and it was not - it was this read applying a rule the rest of the product had
 * already replaced.
 *
 * The rule is a setting, `Ground.peersVisibleToEachOther`, whose own copy on the Setup tab says
 * "each person sees the others by name". It defaults by scenario: hidden on EVALUATION and COHORT,
 * where a roster tells people exactly who they are being measured against, shown everywhere else.
 * The board reads it and the check-in page reads it. The report did not.
 *
 * SO THIS IS NOT "NAMES ARE ALWAYS ON". A cohort of thirteen strangers stays thirteen strangers,
 * which is the case the old rule existed to protect and the only case it was ever right about.
 */
const party = (id: string, first: string, type: PartyType) => ({
  id, partyType: type, roleAsDescribed: null,
  user: { firstName: first, lastName: '' },
}) as any;

const lead = party('p-lead', 'Hafsah', PartyType.INITIATOR);
const a = party('p-a', 'Zainab', PartyType.PARTICIPANT);
const b = party('p-b', 'Tunde', PartyType.PARTICIPANT);
const parties = [lead, a, b];

describe('where the check-in names people to each other', () => {
  const visible = namesVisibleTo('p-b', parties, true);

  it('a participant reads a colleague by name, like the roster does', () => {
    expect([...visible.values()]).toContain('Zainab');
  });

  it('and the lead, and themselves', () => {
    expect([...visible.values()]).toContain('Hafsah');
    expect([...visible.values()]).toContain('Tunde');
  });
});

describe('where it does not', () => {
  const visible = namesVisibleTo('p-b', parties, false);

  it('a colleague stays a label, which is what a cohort of strangers needs', () => {
    expect([...visible.values()]).not.toContain('Zainab');
  });

  it('and the lead and themselves are still named, because running it is the job', () => {
    expect([...visible.values()]).toContain('Hafsah');
    expect([...visible.values()]).toContain('Tunde');
  });
});

describe('a caller with no ground to hand', () => {
  it('keeps the old behaviour rather than guessing', () => {
    const visible = namesVisibleTo('p-b', parties);
    expect([...visible.values()]).not.toContain('Zainab');
  });
});
