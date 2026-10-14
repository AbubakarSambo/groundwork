import { PartyType } from '@prisma/client';
import { boardAs, person, answered, JUMA, type Setup } from './the-switchboards-sections-harness';

/**
 * PILOTS, 13 OCTOBER 2026, PROBLEM 11. Wanjiru, the admin, read on day 5: "Njeri Kamau has not checked in for this
 * session yet. Ask Njeri Kamau to check in. Has not answered". Njeri runs the check-in and answers it too. The lead
 * checks in when she chooses, so no reader's board lists her as not answered or asks anybody to chase her.
 */
const NJERI = { ...person('p-njeri', 'u-njeri', 'Njeri', 'Kamau', PartyType.INITIATOR), managingOnly: false };
const BRIAN = person('p-brian', 'u-brian', 'Brian', 'Kiptoo');
const AISHA = person('p-aisha', 'u-aisha', 'Aisha', 'Hassan');
const RUN: Setup = {
  people: [NJERI, BRIAN, AISHA],
  initiatorId: 'u-njeri',
  label: 'Litigation team daily',
  checkIns: [answered('p-brian', 1, '2026-10-19T08:00:00Z'), answered('p-aisha', 1, '2026-10-19T09:00:00Z')],
} as any;

describe('the lead is never chased on the board', () => {
  it('the admin reads a row for Brian and Aisha, and none for Njeri', async () => {
    const b = await boardAs(RUN, JUMA[0], JUMA[1]);
    const rows = (b.eachPerson ?? []) as any[];
    expect(rows.map((r) => r.participantId).sort()).toEqual(['p-aisha', 'p-brian']);
    expect(JSON.stringify(rows)).not.toMatch(/Njeri Kamau has not checked in|Ask Njeri Kamau to check in/);
  });
});
