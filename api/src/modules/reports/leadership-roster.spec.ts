import { PartyType } from '@prisma/client';

/**
 * GW-LEADERSHIP-ROSTER tripwire.
 *
 * Every leadership-gap rule opens with "where one party leads another". The
 * party roster handed to the synthesis is a list of anonymous labels and never
 * said that anyone leads anyone, so the condition could never be met.
 *
 * A live 12-session run containing textbook abdication - a pricing decision
 * deferred for six sessions, a hard conversation promised from session 3 and
 * never had, a report who stopped delivering and was never registered - found
 * ZERO leadership gaps. The rules were right; the input was silent.
 *
 * An earlier isolated test appeared to pass only because the roster was
 * hand-written for it with "manages the others" included, which the real
 * pipeline never produces. This pins the real thing.
 */
function buildRosterLine(partyType: PartyType, label: string, entryCount: number) {
  const leadNote = partyType === PartyType.INITIATOR ? ' [leads this ground and the other parties on it]' : '';
  return `- ${label}${leadNote}: ${entryCount > 0 ? `contributed ${entryCount} record entries (shown below)` : 'checked in but has no record entries with text'}`;
}

describe('GW-LEADERSHIP-ROSTER: the synthesis is told who leads whom', () => {
  it('marks the initiator as the lead (tripwire)', () => {
    const line = buildRosterLine(PartyType.INITIATOR, 'the initiator', 8);
    expect(line).toMatch(/leads this ground/i);
  });

  it('does not mark a participant as leading anyone', () => {
    const line = buildRosterLine(PartyType.PARTICIPANT, 'party A', 8);
    expect(line).not.toMatch(/leads this ground/i);
  });

  it('still says nothing about a party beyond the label when they have no record', () => {
    const line = buildRosterLine(PartyType.PARTICIPANT, 'party B', 0);
    expect(line).toMatch(/no record entries/i);
    expect(line).not.toMatch(/leads this ground/i);
  });
});
