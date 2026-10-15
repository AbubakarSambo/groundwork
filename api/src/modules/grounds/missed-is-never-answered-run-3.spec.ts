import { whoHasNotJoinedYet, theNotJoinedYetLine } from './invited-not-joined-yet';
import { whoHasMissedCheckIns, TOLD_THE_LEAD } from './missed-check-ins';
import { thePersonHistory } from '../board/the-switchboards-own-sections';
import { atAGlance } from './what-a-manager-needs-at-a-glance';
import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';

/**
 * NIGHT QUALITY RUN 3, THE MUST-FIX (decision 8 redone). Amina Otieno was invited and never joined; Jared
 * Okoth joined and stayed silent; Hassan Mwenda answered, and is checking in today. The board said "Amina
 * Otieno has answered 6 sessions", Jared was in no count, and the performance-suite line went to people who
 * never joined. These read what each person is actually told.
 */
const NOW = new Date('2026-11-23T08:00:00Z');
const day = (n: number) => new Date(Date.UTC(2026, 9, 12 + 7 * (n - 1)));
const quiet = (n: number) => ({ id: `q${n}`, sessionNumber: n, status: 'COMPLETED', isSetup: false, optional: false, closedReason: CLOSED_BY_THE_CLOCK, turns: [], availableFrom: day(n), createdAt: day(n), completedAt: day(n + 1), missedReason: null });
const said = (n: number) => ({ ...quiet(n), id: `a${n}`, closedReason: null, turns: [{ id: 't' }] });
const open = (n: number) => ({ id: `o${n}`, sessionNumber: n, status: 'NOT_STARTED', isSetup: false, optional: false, closedReason: null, turns: [], availableFrom: day(n), createdAt: day(n), completedAt: null, missedReason: null });

const people = [
  { id: 'p-amina', groundId: 'g1', userId: 'u-amina', acceptedAt: null, partyType: 'PARTICIPANT', managingOnly: false, cameThroughTheLink: false, nameGiven: 'Amina Otieno', user: { firstName: 'Amina', lastName: 'Otieno', awaitingOrgApproval: false }, checkIns: [open(1)] },
  { id: 'p-jared', groundId: 'g1', userId: 'u-jared', acceptedAt: day(1), partyType: 'PARTICIPANT', managingOnly: false, cameThroughTheLink: false, nameGiven: 'Jared Okoth', user: { firstName: 'Jared', lastName: 'Okoth', awaitingOrgApproval: false }, checkIns: [quiet(1), quiet(2), quiet(3), open(4)] },
  { id: 'p-hassan', groundId: 'g1', userId: 'u-hassan', partyType: 'PARTICIPANT', managingOnly: false, cameThroughTheLink: false, nameGiven: 'Hassan Mwenda', user: { firstName: 'Hassan', lastName: 'Mwenda', awaitingOrgApproval: false }, checkIns: [said(1), said(2), said(3), open(4)] },
];

/* Jared accepted his invitation; Hassan opened his check-ins; Amina never accepted (a sign-in made for her is not accepting). */
const prisma: any = {
  groundParticipant: { findMany: jest.fn(async () => people) },
  leaveRequest: { findMany: jest.fn(async () => []) },
  user: { findMany: jest.fn(async (a: any) => [{ id: 'u-jared', passwordHash: 'x', googleId: null, welcomeCardSeenAt: null }, { id: 'u-amina', passwordHash: null, googleId: null, welcomeCardSeenAt: null }, { id: 'u-hassan', passwordHash: null, googleId: null, welcomeCardSeenAt: null }].filter((u) => a.where.id.in.includes(u.id))) },
  emailVerificationToken: { findMany: jest.fn(async () => []) },
  checkIn: { findMany: jest.fn(async (a: any) => (a.where.participant.userId.in.includes('u-hassan') ? [{ participant: { userId: 'u-hassan' } }] : [])) },
};

describe('a session closed with nothing said is missed, never answered; somebody not joined is neither', () => {
  it('Amina, invited and never in, has not joined; Jared and Hassan have', async () => {
    expect([...(await whoHasNotJoinedYet(prisma, people))]).toEqual(['p-amina']);
  });

  it('the notices: Jared (joined, three silent closes) reaches the lead; Amina (never joined) and Hassan (answering) reach nobody', async () => {
    const found = await whoHasMissedCheckIns(prisma, ['g1'], NOW);
    expect(found.map((f) => f.name)).toEqual(['Jared']);
    expect(found[0].stand.stage).toBe(TOLD_THE_LEAD);
  });

  it('the board history says what happened: Jared missed, Hassan answered, Amina is not there', () => {
    const r: any = { mayReadEveryone: true, meId: null, personMayBeRead: () => true };
    const sessions = people.flatMap((p) => p.checkIns.map((c) => ({ ...c, participantId: p.id })));
    const names: Record<string, string> = { 'p-amina': 'Amina Otieno', 'p-jared': 'Jared Okoth', 'p-hassan': 'Hassan Mwenda' };
    const history = thePersonHistory(people as any, [], [], sessions as any, { ...r, nameOf: (id: string) => names[id], aColleague: () => 'A colleague' } as any);
    const text = history.map((h) => [h.says, ...h.sessions.map((s) => s.says)].join('\n')).join('\n\n');
    console.log(`THE LEAD READS, OVER TIME:\n${text}`);
    expect(text).not.toMatch(/Amina/);
    expect(text).not.toMatch(/Jared Okoth has answered/);
    expect(text).toMatch(/In session 2, Jared Okoth did not check in before it closed\./);
    expect(text).toMatch(/Hassan Mwenda has answered 3 sessions/);
  });

  it('the count leaves Amina out and says why, in a full sentence', () => {
    const glance: any = atAGlance({
      sessionNumber: 4, roundsDone: 3, roundsPlanned: 12, scenario: null, dependencies: [],
      people: people.map((p) => ({ ...p, invitedAt: day(1), ...(p.id === 'p-amina' ? { notJoinedYet: true } : {}) })) as any,
      thisRound: people.flatMap((p) => p.checkIns.filter((c) => c.sessionNumber === 4).map((c) => ({ ...c, participantId: p.id }))) as any,
    } as any, NOW);
    console.log(`THE LEAD READS: ${glance.progress.answeredThisRound} of ${glance.progress.ofPeople}. ${glance.progress.notCountedSays}`);
    expect(glance.progress.ofPeople).toBe(2);
    expect(glance.progress.notCountedSays).toBe('One more person is not counted yet, because they were invited and have not joined yet.');
  });

  it('the line beside it names them plainly', () => {
    expect(theNotJoinedYetLine(['Amina Otieno'])).toBe('Amina Otieno was invited and has not joined yet.');
  });
});
