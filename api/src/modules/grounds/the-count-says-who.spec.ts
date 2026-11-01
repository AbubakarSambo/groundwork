import { theSessionAndItsCount, whoSaid } from './this-sessions-count';
import { whatToProbe } from '../reports/what-to-probe';

/**
 * THE ONE COUNT SAYS WHO (round 6, 1 November 2026). The family business lead read "1 of 2 answered" with nobody named; the mobile
 * cinema lead's board said Aisha was "partway through session 1" beside "Aisha has not answered this session". The one count
 * (this-sessions-count.ts) now names each person counted, once, in one state, from the same rows and people it counts, for the reader
 * it is served to; and the probe list says "started and not finished" in the grid's own state.
 */
const p = (id: string, userId: string | null, firstName: string, partyType = 'PARTICIPANT') => ({ id, userId, partyType, user: { firstName, lastName: null }, managingOnly: false });
const PEOPLE = [p('p-juma', 'u-juma', 'Juma', 'INITIATOR'), p('p-aisha', 'u-aisha', 'Aisha'), p('p-david', 'u-david', 'David'), p('p-neema', 'u-neema', 'Neema')];
const ROWS = [
  { participantId: 'p-juma', sessionNumber: 1, status: 'COMPLETED', completedAt: new Date('2026-11-01T09:00:00Z'), availableFrom: new Date('2026-11-01T06:00:00Z') },
  { participantId: 'p-aisha', sessionNumber: 1, status: 'COMPLETED', completedAt: new Date('2026-11-01T10:00:00Z'), availableFrom: new Date('2026-11-01T06:00:00Z') },
  { participantId: 'p-david', sessionNumber: 1, status: 'IN_PROGRESS', availableFrom: new Date('2026-11-01T06:00:00Z') },
  { participantId: 'p-neema', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: new Date('2026-11-01T06:00:00Z') },
];

describe('the one count, by name', () => {
  it('names each person once, in one state, with the reader as you', () => {
    const said = whoSaid(PEOPLE, ROWS, 1, ['p-juma', 'p-aisha', 'p-david', 'p-neema'], ['p-david', 'p-neema'], 'u-juma');
    expect(said).toBe('You and Aisha have checked in. David has started and not finished yet. Neema has not started yet.');
  });

  it('is in the served sentence beside the number, and agrees with it', () => {
    const { count } = theSessionAndItsCount(
      { participants: PEOPLE, checkIns: ROWS, scenario: 'NEW_PROJECT', cadence: 'DAILY', runsUntilEnded: true },
      { now: new Date('2026-11-01T12:00:00Z'), names: { readerUserId: 'u-juma' } },
    );
    expect(count.whoSays).not.toBeNull();
    expect(count.says).toContain(count.whoSays!);
    const named = (count.whoSays!.match(/\b(You|Aisha|David|Neema)\b/g) ?? []).length;
    expect(named).toBe(count.ofPeople);
    /* Aisha has answered, so there is somebody else's account to read in this session. */
    expect(count.othersHaveAnswered).toBe(true);
  });

  it('with only the reader in, there is nobody else to read yet', () => {
    const onlyJuma = ROWS.map((r) => (r.participantId === 'p-aisha' ? { ...r, status: 'IN_PROGRESS', completedAt: undefined } : r));
    const { count } = theSessionAndItsCount(
      { participants: PEOPLE, checkIns: onlyJuma, scenario: 'NEW_PROJECT', cadence: 'DAILY', runsUntilEnded: true },
      { now: new Date('2026-11-01T12:00:00Z'), names: { readerUserId: 'u-juma' } },
    );
    expect(count.othersHaveAnswered).toBe(false);
  });

  it('names nobody where names were not asked for', () => {
    const { count } = theSessionAndItsCount({ participants: PEOPLE, checkIns: ROWS, scenario: 'NEW_PROJECT', cadence: 'DAILY', runsUntilEnded: true }, { now: new Date('2026-11-01T12:00:00Z') });
    expect(count.whoSays).toBeNull();
    expect(count.says).not.toMatch(/Aisha|David|Neema/);
  });
});

describe('the probe list, in the grid’s own state', () => {
  const base = { who: 'David', whoInASentence: 'David', participantId: 'p-david', role: null, answeredThisSession: false, patterns: [], waitingOn: [], holdingUp: [], concrete: [], documentsAttached: 0, sessionNumber: 1, totalSessions: null, scenario: null } as any;
  it('says David started and has not finished, never that he has not answered', () => {
    expect(whatToProbe({ ...base, startedThisSession: true }).probe[0]).toBe('David has started this session and not finished it yet, so nothing below is from this round.');
  });
  it('and somebody who has not started is said as before', () => {
    expect(whatToProbe(base).probe[0]).toBe('David has not answered this session, so nothing below is from this round.');
  });
});

/* Round 7, the law firm lead: after the save she read "Four more were invited and have not joined yet", did not know her team had
   been invited, and invited them again. Who was invited is said by name, and her own name is not said twice. */
describe('right after the save, who was invited, by name', () => {
  it('names the four invited and not joined, and says the lead once', () => {
    const lead = p('p-akinyi', 'u-akinyi', 'Akinyi', 'INITIATOR');
    const invited = ['Kwame', 'Fatuma', 'David', 'Grace'].map((n) => ({ ...p(`p-${n.toLowerCase()}`, null as any, n), notJoinedYet: true }));
    const rows = [{ participantId: 'p-akinyi', sessionNumber: 1, status: 'COMPLETED', completedAt: new Date('2026-11-01T09:00:00Z'), availableFrom: new Date('2026-11-01T06:00:00Z') }];
    const { count } = theSessionAndItsCount(
      { participants: [lead, ...invited], checkIns: rows, scenario: 'NEW_PROJECT', cadence: 'WEEKLY', runsUntilEnded: true },
      { now: new Date('2026-11-01T12:00:00Z'), names: { readerUserId: 'u-akinyi' } },
    );
    expect(count.says).toContain('Kwame, Fatuma, David and Grace were invited and have not joined yet.');
    expect(count.says).not.toContain('You have checked in.');
  });
});
