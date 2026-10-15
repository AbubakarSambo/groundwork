import { theTeamsOpenRound, whichRoundIsOpen } from './which-round-is-open';
import { atAGlance } from '../grounds/what-a-manager-needs-at-a-glance';

/**
 * ONE RULE FOR THE PAGE AND THE SERVER (journey test, 12 October 2026; client: who-the-count-counts.spec.ts).
 * The lead's own extra check-in never sets the team's round, and people waiting for an admin to let them
 * in are said beside the count, not silently dropped.
 */
const people = [
  { id: 'lena', partyType: 'INITIATOR', userId: 'u-lena' },
  { id: 'pia', partyType: 'PARTICIPANT', userId: 'u-pia', user: { awaitingOrgApproval: true } },
  { id: 'ben', partyType: 'PARTICIPANT', userId: 'u-ben', user: { awaitingOrgApproval: true } },
  { id: 'cara', partyType: 'PARTICIPANT', userId: 'u-cara', user: { awaitingOrgApproval: true } },
  { id: 'chidi', partyType: 'PARTICIPANT', userId: 'u-chidi' },
  { id: 'dan', partyType: 'PARTICIPANT', userId: 'u-dan' },
];

describe("the team's round", () => {
  it('is not moved by the lead checking in herself ahead of the team', () => {
    /* The team finished session 1; Lena opened her own session 2 with "Check in yourself"; the team's
       session 2 rows are written ahead and untouched. */
    const rows = [
      ...people.map((p) => ({ participantId: p.id, sessionNumber: 1, status: 'COMPLETED' })),
      { participantId: 'lena', sessionNumber: 2, status: 'IN_PROGRESS' },
      ...people.filter((p) => p.id !== 'lena').map((p) => ({ participantId: p.id, sessionNumber: 2, status: 'NOT_STARTED' })),
    ];
    expect(whichRoundIsOpen(rows)).toBe(2);
    expect(theTeamsOpenRound(rows, people)).toBe(1);
  });
  it('is read from the lead\'s rows only when nobody else has one', () => {
    expect(theTeamsOpenRound([{ participantId: 'lena', sessionNumber: 1, status: 'IN_PROGRESS' }], people)).toBe(1);
  });
});

describe('the count, and who it leaves out', () => {
  it('says the three waiting at the door beside "1 of 3"', () => {
    const g = atAGlance({
      roundsDone: 0, roundsPlanned: 261, people: people as any, sessionNumber: 1, scenario: 'NEW_PROJECT', dependencies: [],
      thisRound: [
        { participantId: 'lena', status: 'COMPLETED' },
        ...['pia', 'ben', 'cara', 'chidi', 'dan'].map((id) => ({ participantId: id, status: 'NOT_STARTED' })),
      ],
    });
    expect([g.progress.answeredThisRound, g.progress.ofPeople]).toEqual([1, 3]);
    expect(g.progress.notLetIn).toBe(3);
    expect(g.progress.notCountedSays).toBe('Three more people are not counted yet, because an admin has not let them in.');
  });
});
