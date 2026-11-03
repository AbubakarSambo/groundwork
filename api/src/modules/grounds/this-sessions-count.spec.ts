import { theSessionAndItsCount, theCountSaid, theCountOfASession } from './this-sessions-count';
import { theCountAsServed } from './the-count-as-served';
import { howACheckInIsGoing } from './how-a-check-in-is-going';
import { theOpenSession, whereOneStands } from '../engagement/heres-what-is-new';

/**
 * ONE COUNT FOR A SESSION, READ BY THE BOARD, THE CHECK-IN'S PAGE AND ASK (Hafsah, 30 October 2026, first-experience round 1).
 *
 * Akua, a field lead, read "all three people have checked in" from Ask and "3 of 5 people have answered this session" on her board, and
 * a third count on the check-in's own page. Here is her check-in: she answered, Kwame and Ama answered, Adwoa and Kofi joined and have
 * not answered, and Yaw was invited and has not joined. Each reader is built from the same rows, the way each one is served, and every
 * one of them says the same session and the same "N of M", with Yaw said beside it, never dropped.
 */
const NOW = new Date('2027-02-08T18:00:00Z');
const person = (id: string, over: any = {}) => ({
  id, userId: `u-${id}`, partyType: 'PARTICIPANT', managingOnly: false, cameThroughTheLink: false, acceptedAt: new Date('2027-02-01'),
  invitedAt: new Date('2027-02-01'), inviteTokenExpiresAt: null, nameGiven: null, email: `${id}@field.test`,
  user: { firstName: id.charAt(0).toUpperCase() + id.slice(1), lastName: null, awaitingOrgApproval: false }, ...over,
});
const PEOPLE = [
  person('akua', { partyType: 'INITIATOR' }),
  person('kwame'), person('ama'), person('adwoa'), person('kofi'),
  person('yaw', { userId: null, acceptedAt: null, user: null }),
];
const row = (participantId: string, status: string) => ({
  participantId, sessionNumber: 1, status, isSetup: false, availableFrom: new Date('2027-02-08T08:00:00Z'), startedAt: status === 'COMPLETED' ? new Date('2027-02-08T09:00:00Z') : null,
  completedAt: status === 'COMPLETED' ? new Date('2027-02-08T09:30:00Z') : null, closedReason: null, turns: status === 'COMPLETED' ? [{ id: `t-${participantId}` }] : [],
});
const ROWS = [row('akua', 'COMPLETED'), row('kwame', 'COMPLETED'), row('ama', 'COMPLETED'), row('adwoa', 'NOT_STARTED'), row('kofi', 'NOT_STARTED'), row('yaw', 'NOT_STARTED')];
const GROUND = { scenario: 'PULSE_CHECK', timelineDays: 84, cadence: 'WEEKLY', runsUntilEnded: false };

/* As every reader is given the people: Yaw marked as not joined, by the one joined rule (withWhoHasNotJoinedMarked). */
const MARKED = PEOPLE.map((p) => (p.id === 'yaw' ? { ...p, notJoinedYet: true } : p));

function aPrismaFor() {
  return {
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org', ...GROUND })) },
    /* As Ask reads them: each session's rows with the person on each. */
    checkIn: { findMany: jest.fn(async () => ROWS.map(({ participantId, ...r }) => ({ ...r, participant: { ...PEOPLE.find((p) => p.id === participantId), checkIns: [] } }))) },
    user: { findMany: jest.fn(async () => []) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: true })) },
  } as any;
}

describe('one session, one count, whoever reads it', () => {
  const { clock, count } = theSessionAndItsCount({ participants: MARKED, checkIns: ROWS, ...GROUND }, { now: NOW });

  /* Changed on wip/plan: the person who has not joined is counted now, named as not joined (wip/assessment's one count, Hafsah,
     1 November 2026: "everybody on the check-in is counted"), so the five who joined and the one invited make six. */
  it('is the session the clock names, counting the person who has not joined, who is said beside it', () => {
    expect(clock.currentSession).toBe(1);
    expect(count).toMatchObject({ session: 1, answered: 3, ofPeople: 6, everyoneIn: false });
    expect(count.waitingOn.sort()).toEqual(['adwoa', 'kofi', 'yaw']);
    expect(count.says).toBe('3 of 6 have checked in. One of them was invited and has not joined yet.' /* F5: the approved journey's words */);
  });

  it('the board reads the same numbers for the same session', () => {
    const board = howACheckInIsGoing({ ...GROUND, checkIns: ROWS as any, participants: MARKED, dependencies: [], sharedPicture: null, round: clock.currentSession }, NOW).glance.progress;
    expect([board.answeredThisRound, board.ofPeople]).toEqual([count.answered, count.ofPeople]);
  });

  it('Ask reads the same numbers for the same session, and says who is not counted', async () => {
    const asked = await theOpenSession(aPrismaFor(), 'g', 'u-akua');
    expect(asked).toMatchObject({ answered: count.answered, ofHowMany: count.ofPeople, round: count.session, notCountedSays: count.notCountedSays });
    const said = whereOneStands({ ...asked!, label: 'Farmer Training' });
    expect(said).toContain('three of six people have checked in');
    expect(said).toContain('One of them was invited and has not joined yet.');
    expect(said).not.toMatch(/all three people/);
  });

  it('says everybody only when everybody counted has answered', () => {
    /* Changed in F5: the approved journey's words, "2 of 4 have checked in", with no session number. */
    expect(theCountSaid(0, 4)).toBe('Nobody has checked in yet');
    expect(theCountSaid(4, 4)).toBe('All 4 have checked in');
    expect(theCountSaid(1, 1)).toBe('The one person in it has checked in');
    expect(theCountSaid(2, 4)).toBe('2 of 4 have checked in');
  });
});

/*
 * THE RULES THE SCREENS USED TO COUNT FOR THEMSELVES, NOW PINNED HERE, WHERE THE ONE COUNT IS (the client's who-the-count-counts,
 * the-lead-who-only-manages-is-not-counted-waiting and the-anchor-leads-first-screen specs pinned them on the screen before).
 */
describe('who the one count counts', () => {
  const anchor = (over: any[] = []) => [
    person('baraka', { partyType: 'INITIATOR', managingOnly: true }), person('kito'), person('lerato'), ...over,
  ];
  it('an anchor lead who only manages, and her set-up conversation, are not counted: none of the two has answered', () => {
    const rows = [{ ...row('baraka', 'COMPLETED'), isSetup: true }, row('kito', 'NOT_STARTED'), row('lerato', 'NOT_STARTED')];
    const { count } = theSessionAndItsCount({ participants: anchor(), checkIns: rows, ...GROUND, scenario: 'HELP_TEAM_UNDERSTAND' }, { now: NOW });
    expect([count.answered, count.ofPeople]).toEqual([0, 2]);
    expect(count.says).toBe('Nobody has checked in yet.');
  });

  it('an anchor lead alone has no count to say, never "one of zero"', () => {
    const { count } = theSessionAndItsCount({ participants: [person('baraka', { partyType: 'INITIATOR', managingOnly: true })], checkIns: [{ ...row('baraka', 'COMPLETED'), isSetup: true }], ...GROUND, scenario: 'HELP_TEAM_UNDERSTAND' }, { now: NOW });
    expect(count.ofPeople).toBe(0);
    expect(count.says).toBe('');
  });

  it("the team's session, not the lead's own extra one, with who is held at the door said beside it", () => {
    const people = [
      person('lena', { partyType: 'INITIATOR' }),
      person('pia', { notLetIn: true }), person('ben', { notLetIn: true }), person('cara', { notLetIn: true }),
      person('chidi'), person('dan'),
    ];
    const rows = [
      row('lena', 'COMPLETED'), { ...row('lena', 'COMPLETED'), sessionNumber: 2 },
      row('pia', 'NOT_STARTED'), row('ben', 'NOT_STARTED'), row('cara', 'NOT_STARTED'), row('chidi', 'NOT_STARTED'), row('dan', 'NOT_STARTED'),
    ];
    const { clock, count } = theSessionAndItsCount({ participants: people, checkIns: rows, ...GROUND, scenario: 'NEW_PROJECT' }, { now: NOW });
    expect(clock.currentSession).toBe(1);
    expect([count.answered, count.ofPeople]).toEqual([1, 3]);
    expect(count.says).toBe('1 of 3 has checked in. Three more people are not counted yet, because an admin has not let them in.');
  });
});

/*
 * THE SERVER'S OTHER READERS OF THE SAME COUNT (Hafsah, 30 October 2026, first-experience round 3): Today's line, the board's
 * at-a-glance line, and The team today's row for somebody who has not joined. A sales lead read "1 of 3" on Today, "Today: 1 of 3
 * checked in" on the board, and Fatuma and James, who never joined, as "has not checked in for this session yet".
 */
import { whatNeedsYou, type ListedCheckIn } from './what-needs-you';
import { theBoardAtAGlance } from '../board/the-board-at-a-glance';
import { whyThisRow, whatHappened } from '../board/where-each-person-is-against-their-number';

describe('the one count, as Today and the board say it', () => {
  const { count } = theSessionAndItsCount({ participants: MARKED, checkIns: ROWS, ...GROUND }, { now: NOW });
  /* Changed 3 November (F1 part 2): the list and the board serve one shape, theCount, in place of `thisSession` beside `answeredBySession`. */
  const one = theCountOfASession(MARKED, ROWS, count.session, (GROUND as any).scenario ?? null, undefined, NOW);
  const theCount = theCountAsServed({ session: count.session, said: count }, {
    [count.session]: { sessionNumber: count.session, onTheCheckIn: one.counted, answered: one.counted.filter((id) => !one.notAnswered.includes(id)), notYet: count.waitingOn, notJoined: [], declined: [], notLetIn: [] },
  } as any, { onlyThese: null });

  it("Today's line is the count's own sentence, with who it waits on by name", () => {
    const listed = {
      id: 'g', label: 'the Weekly Sales Check-in', status: 'ACTIVE', organizationId: 'org', initiatorId: 'u-akua', cadence: 'WEEKLY', timelineDays: 84,
      participants: MARKED, checkIns: ROWS.map((r, i) => ({ ...r, id: `c${i}` })), theCount,
      glance: { progress: { roundsDone: 0, roundsPlanned: 12, answeredThisRound: count.answered, ofPeople: count.ofPeople, waitingOn: count.waitingOn } },
    } as unknown as ListedCheckIn;
    const t = whatNeedsYou([listed], { userId: 'u-akua', role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(t.line).toBe(`In the Weekly Sales Check-in, ${count.says.charAt(0).toLowerCase()}${count.says.slice(1)} Adwoa and Kofi have not checked in yet.`);
  });

  it("the board's at-a-glance line is the same sentence", () => {
    expect(theBoardAtAGlance({ theCount, howItIsGoing: { glance: { progress: { answeredThisRound: 3, ofPeople: 5 } } } }, { readerCheckedInThisRound: true, readerIsTheLead: true }).lines.whoCheckedIn).toBe(count.says);
  });

  it('The team today says somebody who has not joined was invited and has not joined, never that they have not checked in', () => {
    const row: any = { participantId: 'yaw', who: 'Yaw', notJoinedYet: true, answeredThisRound: false, inTheWay: [], target: null, count: 0 };
    const reason = whyThisRow(row, 12);
    expect(reason).toBe('not joined');
    expect(whatHappened(row, reason, 12)).toMatch(/was invited and has not joined yet\.$/);
  });
});
