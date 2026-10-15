import { CheckInStatus, PartyType } from '@prisma/client';
import { checksInOnlyWhenTheyChoose, whoASessionCounts } from './the-lead-checks-in-when-they-choose';
import { whoIsExpected, whoIsInTheRound, howManyOfThemAnswered } from '../reports/how-many-have-answered';
import { whoIsLeftToCheckIn } from '../email/who-has-not-checked-in-yet';
import { whoIsStillExpected } from '../conversation/the-last-one-we-are-waiting-for';
import { whyNotNudge } from '../conversation/who-is-worth-nudging';
import { recordRoundCompletion } from './round-completion';
import { AN_ANSWER } from './an-answer-includes-a-refusal';

/**
 * DECISION 133 (change 5): AFTER THEIR FIRST CHECK-IN THE LEAD CHECKS IN WHEN THEY CHOOSE.
 *
 * The lead (Wairimu) is never waited on, never left "to check in", never sent a participant
 * reminder, and counts in a session's numbers only when she checked in that session. Brian is a
 * participant and is counted exactly as before. A lead who chose "only the team" (managingOnly) is
 * treated the same way.
 */
const answered = (n: number) => [{ status: CheckInStatus.COMPLETED, sessionNumber: n }];
const wairimu = (checkIns: any[] = []) => ({ id: 'p-wairimu', partyType: PartyType.INITIATOR, managingOnly: false, userId: 'u-w', checkIns, user: { firstName: 'Wairimu', email: 'w@x.test' } });
const brian = (checkIns: any[] = []) => ({ id: 'p-brian', partyType: PartyType.PARTICIPANT, managingOnly: false, userId: 'u-b', checkIns, user: { firstName: 'Brian', email: 'b@x.test' } });

describe('the lead checks in when they choose', () => {
  it('is never waited on in a session she skipped, in the first round or any later one', () => {
    for (const n of [1, 2, 5]) {
      expect(whoIsExpected([wairimu(), brian()] as any, n).map((p: any) => p.id)).toEqual(['p-brian']);
      expect(whoIsInTheRound([wairimu(), brian()] as any, n).map((p: any) => p.id)).toEqual(['p-brian']);
    }
    expect(howManyOfThemAnswered([wairimu(), brian(answered(2))] as any, 2)).toMatchObject({ answered: 1, expected: 1, waitingOn: [] });
  });

  it('counts in a session\'s numbers when she checked in that session', () => {
    expect(howManyOfThemAnswered([wairimu(answered(3)), brian()] as any, 3)).toMatchObject({ answered: 1, expected: 2, waitingOn: ['p-brian'] });
    expect(whoIsInTheRound([wairimu(answered(3)), brian()] as any, 3).map((p: any) => p.id)).toEqual(['p-wairimu', 'p-brian']);
  });

  it('is never named as somebody who has not checked in yet, or as the one everybody waits for', () => {
    expect(whoIsLeftToCheckIn([wairimu(), brian()] as any, { justCheckedIn: 'p-x', readerEmail: 'someone@x.test' })).toEqual({ names: ['Brian'], count: 1 });
    expect(whoIsStillExpected('p-brian', [wairimu(), brian()] as any).map((p: any) => p.id)).toEqual([]);
  });

  it('is never sent a participant reminder, and the reason says why in a full sentence', () => {
    const base = { hasAccepted: true, session: { id: 'ci', status: 'NOT_STARTED' }, stillHere: true, emailNotifications: true, hoursSinceLastNudge: null };
    expect(whyNotNudge({ ...base, id: 'p-wairimu', partyType: PartyType.INITIATOR } as any)).toBe('they lead this check-in and check in only when they choose');
    expect(whyNotNudge({ ...base, id: 'p-brian', partyType: PartyType.PARTICIPANT } as any)).toBeNull();
  });

  it('treats a lead who chose "only the team" before as optional too', () => {
    expect(checksInOnlyWhenTheyChoose({ partyType: PartyType.INITIATOR, managingOnly: true })).toBe(true);
    expect(checksInOnlyWhenTheyChoose({ partyType: PartyType.INITIATOR, managingOnly: false })).toBe(true);
    expect(checksInOnlyWhenTheyChoose({ partyType: PartyType.PARTICIPANT, managingOnly: false })).toBe(false);
  });

  it('closes a round without her: the round reads only the people who owe it, and the lead only if she answered', async () => {
    const findMany = jest.fn(async () => [{ id: 'p-brian', userId: 'u-b' }]);
    const prisma: any = {
      groundParticipant: { findMany },
      checkIn: { count: jest.fn(async () => 1), findMany: jest.fn(async () => []) },
      roundCompletion: { create: jest.fn(async (a: any) => a.data) },
      leaveRequest: { findMany: jest.fn(async () => []) },
      user: { findMany: jest.fn(async () => []) },
    };
    await recordRoundCompletion(prisma, { emit: jest.fn() } as any, 'g1', 2).catch(() => undefined);
    expect((findMany.mock.calls[0] as any[])[0].where).toEqual({ groundId: 'g1', ...whoASessionCounts(2, AN_ANSWER) });
    expect(whoASessionCounts(2, AN_ANSWER).OR[0]).toEqual({ managingOnly: false, partyType: PartyType.PARTICIPANT });
  });
});
