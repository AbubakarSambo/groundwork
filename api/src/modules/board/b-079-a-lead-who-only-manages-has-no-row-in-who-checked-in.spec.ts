import { PartyType } from '@prisma/client';
import { person, answered, boardAs, AMINA, RUKIA, JUMA, type Setup } from './the-switchboards-sections-harness';

/**
 * B-079. The board's "Who checked in" had a row "You" with an empty square for a lead who only manages an anchor check-in, beside Amani's filled one.
 * She does not check in, so the empty square read as a missed session. She has no row, for any reader.
 */
const lead = { ...person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR), managingOnly: true };
const PEOPLE = [lead, person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'), person('p-baraka', 'u-baraka', 'Baraka', 'Otieno')];

function setup(): Setup {
  return {
    people: PEOPLE,
    checkIns: [answered('p-rukia', 1, '2026-09-09T10:00:00Z'), { id: 'c1-p-baraka', participantId: 'p-baraka', sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, completedAt: null, availableFrom: null }],
    groundRow: { startedFrom: 'anchor' },
  } as any;
}

describe('B-079: who checked in', () => {
  it.each([['the lead who only manages', AMINA], ['an admin who runs it', JUMA], ['a member', RUKIA]])('has no row for the lead who only manages, as %s reads it', async (_w, reader) => {
    const b: any = await boardAs(setup(), ...(reader as [any, any]));
    const rows: any[] = b.checkInGrid?.rows ?? [];
    if (reader !== RUKIA) expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.participantId === 'p-amina' || r.managingOnly === true)).toBe(false);
  });
});
