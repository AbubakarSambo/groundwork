import { theRoomForThisReader } from './the-room-for-this-reader';
import { labelsForParties } from '../reports/party-labels';

/**
 * A PERSON WHO LEFT MOVES NOBODY UP A LETTER (list item "same letter shift for other readers"; the board was fixed on 22 November, this is the room's read).
 * Letters are handed out by position among everybody ever on the check-in. The room is read with the people still in it, so when the
 * person before you left, your letter was somebody else's.
 */
const at = (n: number) => new Date(Date.UTC(2026, 9, n));
const person = (id: string, first: string, day: number, extra: any = {}) => ({ id, userId: `u-${id}`, partyType: 'PARTICIPANT', createdAt: at(day), roleAsDescribed: null, user: { firstName: first, lastName: 'Otieno' }, ...extra });
const lead = { ...person('p-lead', 'Rukia', 1), partyType: 'INITIATOR' };
const mary = person('p-mary', 'Mary', 2, { leftAt: at(9) });
const sam = person('p-sam', 'Sam', 3);

describe('the room, read after somebody left', () => {
  it('gives a person the same letter as before when it is read with everybody', () => {
    const everyone = [lead, mary, sam];
    const before = labelsForParties(everyone as any).get('p-sam');
    const withoutMary = labelsForParties([lead, sam] as any).get('p-sam');
    expect(withoutMary).not.toBe(before);
    const room = { aims: [{ aim: `${before} is trying to reach 35.`, held: ['Sam Otieno'] }] } as any;
    const read = theRoomForThisReader(room, { participants: [lead, sam], everyone, me: { ...lead }, initiatorId: lead.userId, viewerRunsIt: true, wallOffTheOthers: false });
    expect(JSON.stringify(read)).toContain('Sam');
  });
});
