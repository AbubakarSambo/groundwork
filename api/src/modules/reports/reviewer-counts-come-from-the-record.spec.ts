import { CheckInStatus } from '@prisma/client';
import { theSessionReport } from './the-session-report';
import { digestBody } from '../email/nothing-lands-at-3am';
import { recordRoundCompletion } from '../grounds/round-completion';

/**
 * REVIEWER, 14 OCTOBER: WHAT THE LEAD IS TOLD ABOUT WHO HAS ANSWERED COMES FROM THE RECORD.
 *
 * Grace (Kilima Water) read on WhatsApp "Your report for Sales daily is ready. Everybody has answered
 * and this has not yet named anything they agree or differ on." before her reps had even been
 * contacted. Then an email said "Everyone has checked in for session 2 of Sales daily. 3 people took
 * part." when only Grace had: the others' sessions were closed by the clock with nothing said.
 */
const base: any = {
  sessionNumber: 1, closed: true, agreements: [], divergences: [], entries: [], previousEntries: [], baselineSuccess: null, startingPoint: null,
  previousSharedPicture: null, evidence: [], specificityLevel: null, centralQuestion: null, movedOnTargets: null, blocked: 0,
};
const graceAlone = [{ who: 'Grace Wanjiru', isYou: true }];
const theDifferencesRead = (out: any) => out.atAGlance.find((r: any) => r.label === 'Differences')?.sub as string;

describe('the report never says everybody has answered while the team has not joined', () => {
  it('says who has joined and how many have not, in the standing sentence and on the tile', () => {
    const out = theSessionReport({ ...base, peopleInAll: 1, notJoinedYet: 2, answeredThisSession: graceAlone });
    expect(out.whereThingsStand.saying).toBe('Everybody who has joined has answered. Two people have not joined yet.');
    expect(theDifferencesRead(out)).toBe('Everybody who has joined has answered. Two people have not joined yet.');
    expect(JSON.stringify(out)).not.toMatch(/Everybody has answered/);
  });

  it('one person still to join is said as one person', () => {
    const out = theSessionReport({ ...base, peopleInAll: 1, notJoinedYet: 1, answeredThisSession: graceAlone });
    expect(out.whereThingsStand.saying).toBe('Everybody who has joined has answered. One person has not joined yet.');
  });

  it('with everybody joined and answered, the sentence is as before', () => {
    const out = theSessionReport({ ...base, peopleInAll: 1, notJoinedYet: 0, answeredThisSession: graceAlone });
    expect(out.whereThingsStand.saying).toBe('Everybody has answered. The report has not yet found anything they agree or differ on.');
  });
});

describe('the session digest email counts accounts given, not sessions closed', () => {
  const facts = { groundLabel: 'Sales daily', sessionNumber: 2, participantCount: 3, needsAttention: 0, permalink: 'http://x/grounds/g' };

  it('says how many of how many checked in when only the lead did', () => {
    const body = digestBody({ ...facts, accountsGiven: 1 }, 'http://x/u');
    expect(body).toContain('Session 2 of Sales daily has closed.');
    expect(body).toContain('1 of 3 people checked in. Nothing is flagged for attention.');
    expect(body).not.toMatch(/Everyone has checked in|took part/);
  });

  it('says everyone has checked in only when everyone gave an account', () => {
    const body = digestBody({ ...facts, accountsGiven: 3 }, 'http://x/u');
    expect(body).toContain('Everyone has checked in for session 2 of Sales daily.');
    expect(body).toContain('3 people took part.');
  });

  it('the closed round tells the digest how many gave an account, from the record', async () => {
    const emit = jest.fn();
    const prisma: any = {
      groundParticipant: { findMany: jest.fn(async () => [{ id: 'p-grace', userId: 'u-g' }, { id: 'p-kevin', userId: 'u-k' }, { id: 'p-mercy', userId: 'u-m' }]) },
      checkIn: {
        /* All three sessions are closed; only Grace's has anything said in it. */
        count: jest.fn(async (a: any) => (a.where.status === CheckInStatus.COMPLETED && a.where.AND ? 1 : 3)),
        findMany: jest.fn(async () => []),
      },
      roundCompletion: { create: jest.fn(async (a: any) => a.data) },
      groundObjective: { findMany: jest.fn(async () => []) },
      leaveRequest: { findMany: jest.fn(async () => []) },
      user: { findMany: jest.fn(async () => []) },
    };
    await recordRoundCompletion(prisma, { emit } as any, 'g1', 2);
    expect(emit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ participantCount: 3, waitedOn: 3, accountsGiven: 1 }));
  });
});
