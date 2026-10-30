import { theTeamsTargetsSaid, aFigureWithItsUnit } from './release-4-teams';
import { theTargetLines } from '../engagement/the-direct-morning';

/* Hand-written: Kijani Helpdesk (test), the support desk's three targets as support.jpg has them. */
const SUPPORT = {
  releaseFourTeams: true,
  kindOfWork: 'support desk',
  headline: { question: 'Are we keeping our promise to customers this month?' },
  objectives: [
    { id: 'o1', name: 'Tickets resolved within a day', count: 91, target: 90, unit: '%', stands: { word: 'Met' } },
    { id: 'o2', name: 'Tickets reopened', count: 4.1, target: 3, unit: '%', journey: { direction: 'down' }, stands: { word: 'Over limit' } },
    { id: 'o3', name: 'Time to first answer', count: null, target: 6, unit: 'h', journey: { direction: 'down' } },
    { id: 'o4', name: 'Tickets resolved within a day', count: 88, target: 90, unit: '%', ownerParticipantId: 'p-amina' },
  ],
};

describe('Release 4: the lead\'s morning says each team target with its unit', () => {
  it('writes a figure with its unit', () => {
    expect(aFigureWithItsUnit(91, '%')).toBe('91%');
    expect(aFigureWithItsUnit(9.5, 'h')).toBe('9.5h');
    expect(aFigureWithItsUnit(7000000, 'KES')).toBe('KES 7,000,000');
    expect(aFigureWithItsUnit(40, 'units')).toBe('40 units');
    expect(aFigureWithItsUnit(12, null)).toBe('12');
  });

  it('says each team target in a full sentence, never a person\'s own, with "at most" for a limit', () => {
    expect(theTeamsTargetsSaid(SUPPORT)).toEqual([
      'Tickets resolved within a day is at 91% against 90%, and it is met.',
      'Tickets reopened is at 4.1% against at most 3%, and it is over limit.',
      'Time to first answer has no figure on record yet, against at most 6h.',
    ]);
  });

  it('is what the morning\'s Target lines say for a team that is not a sales team', () => {
    const t = theTargetLines(SUPPORT, new Date('2026-10-24T05:00:00Z'), 'Africa/Nairobi');
    expect(t.lines.map((l) => l.text)).toEqual(theTeamsTargetsSaid(SUPPORT));
    expect(t.heading).toBe('Are we keeping our promise to customers this month?');
    expect(t.lines.some((l) => /sold/.test(l.text))).toBe(false);
  });

  it('leaves a sales team, and any board with Release 4 off, as before', () => {
    const off = theTargetLines({ ...SUPPORT, releaseFourTeams: false }, new Date('2026-10-24T05:00:00Z'), 'Africa/Nairobi');
    expect(off.lines.some((l) => /is at 91% against 90%/.test(l.text))).toBe(false);
    const sales = theTargetLines({ ...SUPPORT, kindOfWork: 'sales team' }, new Date('2026-10-24T05:00:00Z'), 'Africa/Nairobi');
    expect(sales.lines.some((l) => /is at 91% against 90%/.test(l.text))).toBe(false);
  });
});
