import { whoHasNotJoinedYet } from './invited-not-joined-yet';
import { whoHasMissedCheckIns } from './missed-check-ins';
import { howManyHaveAnswered, whoIsInTheRound, whoHasAnswered } from '../reports/how-many-have-answered';
import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';

/**
 * JOURNEY ROUND 4 (Hafsah, 13 October 2026): "count someone as missed only if they joined the check-in
 * (accepted the invitation) and then never opened a session. Someone who never accepted the invitation must
 * show as 'invited, not joined yet': not missed, not counted, no missed messages."
 *
 * The journey's own five: Pia (A) answers every session, Ben (B) answers late, Cara (C) answered session 1 and
 * then went silent, Dara (D) accepted and never opened a session, Eli (E) never accepted. Lena runs it.
 * Eli was "4 of 6 people checked in" and "Eli Epsilon has not checked in yet" in every session; Dara was left
 * out of the missed count, because she had not set a password yet.
 */
const NOW = new Date('2026-11-02T08:00:00Z');
const day = (n: number) => new Date(Date.UTC(2026, 9, 12 + 7 * (n - 1)));
const quiet = (n: number) => ({ id: `q${n}`, sessionNumber: n, status: 'COMPLETED', isSetup: false, optional: false, closedReason: CLOSED_BY_THE_CLOCK, turns: [], startedAt: null, availableFrom: day(n), createdAt: day(n), completedAt: day(n + 1), missedReason: null });
const said = (n: number) => ({ ...quiet(n), id: `a${n}`, closedReason: null, turns: [{ id: 't' }], startedAt: day(n) });
const open = (n: number) => ({ id: `o${n}`, sessionNumber: n, status: 'NOT_STARTED', isSetup: false, optional: false, closedReason: null, turns: [], startedAt: null, availableFrom: day(n), createdAt: day(n), completedAt: null, missedReason: null });
const accepted = day(1);

const person = (id: string, name: string, extra: any, checkIns: any[]) => ({
  id, groundId: 'g1', partyType: 'PARTICIPANT', managingOnly: false, cameThroughTheLink: false, nameGiven: name,
  user: { firstName: name.split(' ')[0], lastName: name.split(' ')[1], awaitingOrgApproval: false }, checkIns, ...extra,
});
const people = [
  person('p-lena', 'Lena Lead', { userId: 'u-lena', partyType: 'INITIATOR', acceptedAt: null }, [said(1)]),
  person('p-pia', 'Pia Alpha', { userId: 'u-pia', acceptedAt: accepted }, [said(1), said(2), said(3), open(4)]),
  person('p-ben', 'Ben Beta', { userId: 'u-ben', acceptedAt: accepted }, [said(1), said(2), said(3), open(4)]),
  person('p-cara', 'Cara Gamma', { userId: 'u-cara', acceptedAt: accepted }, [said(1), quiet(2), quiet(3), open(4)]),
  /* Dara accepted (no password set yet, never opened a session). */
  person('p-dara', 'Dara Delta', { userId: 'u-dara', acceptedAt: accepted }, [quiet(1), quiet(2), quiet(3), open(4)]),
  /* Eli never accepted: no sign-in on the row at all. */
  person('p-eli', 'Eli Epsilon', { userId: null, acceptedAt: null }, [open(1)]),
];

/* Every user can sign in, Eli's twin included: being able to sign in is not accepting. */
const prisma: any = {
  groundParticipant: { findMany: jest.fn(async () => people) },
  leaveRequest: { findMany: jest.fn(async () => []) },
  ground: { findUnique: jest.fn(async () => ({ scenario: 'TEAM_UPDATES_NOT', organizationId: 'o1' })) },
  user: { findMany: jest.fn(async () => people.map((p) => ({ id: p.userId, passwordHash: 'x', googleId: null, welcomeCardSeenAt: new Date(), awaitingOrgApproval: false }))) },
  emailVerificationToken: { findMany: jest.fn(async () => []) },
  checkIn: { findMany: jest.fn(async () => []) },
  organizationMembership: { findMany: jest.fn(async () => []) },
  membershipRequest: { findMany: jest.fn(async () => []) },
};

describe('joined means accepted the invitation (journey round 4)', () => {
  it('Eli, who never accepted, has not joined; Dara, who accepted and never opened a session, has', async () => {
    expect([...(await whoHasNotJoinedYet(prisma, people as any))]).toEqual(['p-eli']);
  });

  it('a sign-in made for somebody before they accept (a password, the welcome seen) is not joining', async () => {
    const madeAtSetup = { ...people[5], id: 'p-eli2', userId: 'u-eli2', acceptedAt: null };
    const db = { ...prisma, groundParticipant: { findMany: jest.fn(async () => [madeAtSetup]) } };
    expect([...(await whoHasNotJoinedYet(db, [madeAtSetup] as any))]).toEqual(['p-eli2']);
  });

  it('missed is said of Cara and Dara, who joined, and never of Eli', async () => {
    const found = await whoHasMissedCheckIns(prisma, ['g1'], NOW);
    const names = found.map((f) => f.name).sort();
    console.log(`MISSED, AS THE NOTICES READ IT: ${names.join(', ')}`);
    expect(names).toContain('Dara');
    expect(names).toContain('Cara');
    expect(names).not.toContain('Eli');
  });

  /*
   * CHANGED 1 NOVEMBER 2026 (Hafsah approved counting everyone on the check-in, as the prototype does: "5 of 6 have checked in today;
   * Omar hasn't yet"). Eli, invited and not joined, was left out of every count (13 October); he is counted now, in every session alike,
   * and named apart as not joined, so a page says that of him and never that he missed a check-in.
   */
  it('the session count counts Eli, names him as not joined, and is the same number in sessions 1, 2 and 3', () => {
    const flagged = people.map((p) => ({ ...p, notJoinedYet: p.id === 'p-eli' }));
    const counts = [1, 2, 3].map((n) => whoIsInTheRound(flagged as any, n, null).filter((p) => p.partyType !== 'INITIATOR').length);
    expect(counts).toEqual([5, 5, 5]);
    for (const n of [1, 2, 3]) expect(whoHasAnswered(flagged as any, n, null).notJoined).toEqual(['p-eli']);
  });

  it('howManyHaveAnswered, the board and the session report read: Eli is counted, and named as not joined', async () => {
    const rows = people.map((p) => ({ ...p, checkIns: p.checkIns.filter((c: any) => c.sessionNumber === 2 && ['COMPLETED', 'DECLINED'].includes(c.status)) }));
    const db = { ...prisma, groundParticipant: { findMany: jest.fn(async (a: any) => (a?.where?.groundId ? rows.filter((p) => p.partyType !== 'INITIATOR') : people)) } };
    const counted = await howManyHaveAnswered(db, 'g1', 2);
    console.log(`SESSION 2: ${counted.answered} of ${counted.expected} people checked in.`);
    expect(counted.expectedIds).toContain('p-eli');
    expect(counted.notJoinedIds).toEqual(['p-eli']);
    expect(counted.expected).toBe(5);
    expect(counted.answered).toBe(2);
  });
});
