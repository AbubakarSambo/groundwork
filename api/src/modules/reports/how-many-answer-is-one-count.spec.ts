import { whoAnswersThisCheckIn, whoIsInTheRound } from './how-many-have-answered';

/**
 * PEOPLE ARE COUNTED ONE WAY FOR A CHECK-IN (fix plan, pattern 1; quarter test, 24 December). People and setup said "7 people answer
 * every weekday" and Today "1 of 5 have checked in" for the same check-in: Grace, who runs it and checks in when she chooses, and Samuel,
 * invited and not joined, were counted in one and not the other.
 */
const team = [
  { id: 'grace', partyType: 'INITIATOR', userId: 'u-grace', managingOnly: false },
  { id: 'samuel', partyType: 'PARTICIPANT', userId: null, managingOnly: false },
  ...['kevin', 'joseph', 'mercy', 'peter', 'faith'].map((k) => ({ id: k, partyType: 'PARTICIPANT', userId: `u-${k}`, managingOnly: false })),
];

describe('who answers a check-in is counted once', () => {
  /* CHANGED 1 NOVEMBER 2026: everyone on the check-in is counted, as the prototype does (Hafsah's approval), so Samuel, invited and not
     joined, is counted on every page alike; the lead still counts only in a session she answered (decision 133). */
  it('leaves out the lead, and counts somebody invited who has not joined, as a round does', () => {
    expect(whoAnswersThisCheckIn(team, 'PULSE_CHECK').map((p) => p.id)).toEqual(['samuel', 'kevin', 'joseph', 'mercy', 'peter', 'faith']);
  });

  it('is the number a round with nobody away counts', () => {
    const round = whoIsInTheRound(team.map((p) => ({ ...p, notJoinedYet: !p.userId, checkIns: [] })), 43, 'PULSE_CHECK');
    expect(whoAnswersThisCheckIn(team, 'PULSE_CHECK')).toHaveLength(round.length);
  });
});
