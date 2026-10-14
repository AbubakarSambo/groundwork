import { readFileSync } from 'fs';
import { join } from 'path';
import { howManyHaveAnswered } from './how-many-have-answered';
import { whoASessionCounts } from '../grounds/the-lead-checks-in-when-they-choose';
import { AN_ANSWER } from '../grounds/an-answer-includes-a-refusal';

/* CHANGED 11 OCTOBER (decision 133): these asserted `where.managingOnly` (false after session one,
   absent in session one). Every lead now checks in when they choose, so in EVERY session the count
   is the people who owe it, plus the lead only when they answered: `whoASessionCounts`. */

/**
 * "N OF M ANSWERED" IS COMPUTED ONCE. It was computed in eight places over four denominators, so the
 * same session read "3 of 4" on one screen and "3 of 5" on the next.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('how many have answered', () => {
  it('a decline is an answer; somebody with a live invitation is expected; a manager is not waited on after session one', async () => {
    const prisma = {
      ground: { findUnique: jest.fn(async () => ({ scenario: 'GOAL_ALIGNMENT' })) },
      groundParticipant: {
        findMany: jest.fn(async ({ where }: any) => {
          expect(where.AND).toEqual([whoASessionCounts(2, AN_ANSWER)]);
          return [
            { id: 'a', checkIns: [{ status: 'COMPLETED' }] },
            { id: 'b', checkIns: [{ status: 'DECLINED' }] },
            { id: 'c', checkIns: [] },
          ];
        }),
      },
    } as any;
    const r = await howManyHaveAnswered(prisma, 'g', 2);
    /* `expectedIds` and `declinedIds` joined the shape when getSessionProgress stopped keeping its own
       copy of the population clause - see how-many-have-answered. */
    expect(r).toEqual({ answered: 2, expected: 3, expectedIds: ['a', 'b', 'c'], waitingOn: ['c'], completed: 1, declinedIds: ['b'], awayUntil: {}, notLetInIds: [], notJoinedIds: [] });
  });

  it('in session one too, the lead is counted only when they answered it (decision 133)', async () => {
    const prisma = {
      ground: { findUnique: jest.fn(async () => ({ scenario: 'GOAL_ALIGNMENT' })) },
      groundParticipant: { findMany: jest.fn(async ({ where }: any) => { expect(where.AND).toEqual([whoASessionCounts(1, AN_ANSWER)]); return []; }) },
    } as any;
    await howManyHaveAnswered(prisma, 'g', 1);
    expect(prisma.groundParticipant.findMany).toHaveBeenCalled();
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
    const prisma = {
      ground: { findUnique: jest.fn(async () => ({ scenario: 'TEAM_UPDATES' })) },
      groundParticipant: { findMany: jest.fn(async ({ where }: any) => { expect(where.AND).toEqual([whoASessionCounts(1, AN_ANSWER)]); return []; }) },
    } as any;
    await howManyHaveAnswered(prisma, 'g', 1);
    expect(prisma.groundParticipant.findMany).toHaveBeenCalled();
  });
});
