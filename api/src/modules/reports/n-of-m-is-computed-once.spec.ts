import { readFileSync } from 'fs';
import { join } from 'path';
import { howManyHaveAnswered } from './how-many-have-answered';

/* CHANGED 11 OCTOBER (decision 133): every lead checks in when they choose, so in EVERY session the count is the people who owe it,
   plus the lead only when they answered.
   CHANGED 1 NOVEMBER 2026: the rule is one pure function, whoHasAnswered, and the query only reads every person on the check-in; these
   asserted the query's where clause, and now assert what is counted. */

/**
 * "N OF M ANSWERED" IS COMPUTED ONCE. It was computed in eight places over four denominators, so the
 * same session read "3 of 4" on one screen and "3 of 5" on the next.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('how many have answered', () => {
  const rowsOf = (rows: any[]) => ({
    ground: { findUnique: jest.fn(async () => ({ scenario: rows[0]?.scenario ?? 'GOAL_ALIGNMENT' })) },
    groundParticipant: { findMany: jest.fn(async () => rows) },
  }) as any;

  it('a decline is an answer; everybody on the check-in is counted, as the prototype does', async () => {
    const r = await howManyHaveAnswered(rowsOf([
      { id: 'a', userId: 'ua', partyType: 'PARTICIPANT', checkIns: [{ status: 'COMPLETED' }] },
      { id: 'b', userId: 'ub', partyType: 'PARTICIPANT', checkIns: [{ status: 'DECLINED' }] },
      { id: 'c', userId: 'uc', partyType: 'PARTICIPANT', checkIns: [] },
    ]), 'g', 2);
    expect(r).toEqual({ answered: 2, expected: 3, expectedIds: ['a', 'b', 'c'], waitingOn: ['c'], completed: 1, declinedIds: ['b'], awayUntil: {}, notLetInIds: [], notJoinedIds: [] });
  });

  it('in session one too, the lead is counted only when they answered it (decision 133)', async () => {
    const lead = { id: 'lead', userId: 'ul', partyType: 'INITIATOR', checkIns: [] as any[] };
    const team = { id: 'a', userId: 'ua', partyType: 'PARTICIPANT', checkIns: [] as any[] };
    expect((await howManyHaveAnswered(rowsOf([lead, team]), 'g', 1)).expectedIds).toEqual(['a']);
    expect((await howManyHaveAnswered(rowsOf([{ ...lead, checkIns: [{ status: 'COMPLETED' }] }, team]), 'g', 1)).expectedIds).toEqual(['lead', 'a']);
  });

  it('the report service and the board take their head count from it', () => {
    for (const rel of ['./reports.service.ts', '../board/board.service.ts']) {
      const src = strip(readFileSync(join(__dirname, rel), 'utf8'));
      expect(src).toMatch(/howManyHaveAnswered\(this\.prisma, groundId/);
      expect(src).not.toMatch(/ofPeople: ground\.participants\.filter/);
      expect(src).not.toMatch(/peopleInAll: ground\.participants\.filter/);
    }
  });

  /*
   * AND THE SITUATION WHERE THE LEAD ONLY ASKS. "Get updates from your team": the lead writes the
   * question and the team answers it, so session one is not waiting for them either. Read live
   * before this: "4 of 5 answered - waiting on Hafsah Lead", about the person it was for.
   */
  it('and in a team update, not even in session one', async () => {
    const r = await howManyHaveAnswered(rowsOf([
      { id: 'lead', userId: 'ul', partyType: 'INITIATOR', managingOnly: true, scenario: 'TEAM_UPDATES', checkIns: [{ status: 'COMPLETED' }] },
      { id: 'a', userId: 'ua', partyType: 'PARTICIPANT', checkIns: [] },
    ]), 'g', 1);
    expect(r.expectedIds).toEqual(['a']);
  });
});
