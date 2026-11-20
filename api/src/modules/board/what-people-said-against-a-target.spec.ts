import { BoardListener } from './board.listener';
import { onlyWhatAPersonReallySaid, theQuestionAboutWhatPeopleSaid } from './what-people-said-against-a-target';

/**
 * A WEEKLY "I SOLD 24" IS THE PERSON'S NUMBER AGAINST THE TEAM'S TARGET (cycle 6, 18 November). It was kept as a new aim of theirs and
 * every target stayed at 0. It is now kept beside the target, said and not proven, and no aim is made.
 */
const TEAM = { id: 'o-team', name: 'The team is aiming to sell 30 solar lanterns a week.', target: 30, ownerParticipantId: null };
const MARYS = { id: 'o-mary', name: 'My own aim is 35 lanterns a week in Nairobi estates', target: 35, ownerParticipantId: 'p-mary' };
const lines = [
  { text: 'I sold 24 lanterns last week to Nairobi shops on Tom Mboya street.', who: 'p-asha', saidByTheLead: false, kind: 'PROGRESS' },
  { text: 'I sold 28 lanterns last week.', who: 'p-mary', saidByTheLead: false, kind: 'PROGRESS' },
];

describe('what people said they had done against a target', () => {
  it('keeps a number a person said against the team target, as theirs', () => {
    const kept = onlyWhatAPersonReallySaid([{ objectiveId: 'o-team', participantId: 'p-asha', count: 24, said: lines[0].text }], [TEAM, MARYS], lines);
    expect(kept).toEqual([{ objectiveId: 'o-team', participantId: 'p-asha', count: 24, said: lines[0].text }]);
  });
  it('never puts one person\'s number on another person\'s own target, and never keeps a number that is not in the line they said', () => {
    expect(onlyWhatAPersonReallySaid([{ objectiveId: 'o-mary', participantId: 'p-asha', count: 24, said: lines[0].text }], [TEAM, MARYS], lines)).toEqual([]);
    expect(onlyWhatAPersonReallySaid([{ objectiveId: 'o-team', participantId: 'p-asha', count: 30, said: lines[0].text }], [TEAM], lines)).toEqual([]);
    expect(onlyWhatAPersonReallySaid([{ objectiveId: 'o-team', participantId: 'p-asha', count: 24, said: 'I sold 24 for Sam.' }], [TEAM], lines)).toEqual([]);
    /* a line somebody else said is not theirs */
    expect(onlyWhatAPersonReallySaid([{ objectiveId: 'o-team', participantId: 'p-mary', count: 24, said: lines[0].text }], [TEAM], lines)).toEqual([]);
  });
  it('does not read the target said again as something done', () => {
    const aim = [{ text: 'I want to sell 30 lanterns a week.', who: 'p-asha', saidByTheLead: false, kind: 'INTENT' }];
    expect(onlyWhatAPersonReallySaid([{ objectiveId: 'o-team', participantId: 'p-asha', count: 30, said: aim[0].text }], [TEAM], aim)).toEqual([]);
  });
  it('keeps the person\'s later number where they said two', () => {
    const two = [{ ...lines[0], text: 'I sold 20 lanterns on Monday.' }, { ...lines[0], text: 'I sold 24 lanterns by Friday.' }];
    const kept = onlyWhatAPersonReallySaid([
      { objectiveId: 'o-team', participantId: 'p-asha', count: 20, said: two[0].text }, { objectiveId: 'o-team', participantId: 'p-asha', count: 24, said: two[1].text },
    ], [TEAM], two);
    expect(kept.map((k) => k.count)).toEqual([24]);
  });
  it('gives the model the targets with whose they are, and each line with who said it', () => {
    const q = theQuestionAboutWhatPeopleSaid([TEAM, MARYS], lines);
    expect(q).toMatch(/the team's/);
    expect(q).toMatch(/held by person p-mary/);
    expect(q).toMatch(/person p-asha: I sold 24 lanterns/);
  });
});

describe('when a round closes, what people said they had done is kept, on the ground the deals count', () => {
  function aGround() {
    const upsert = jest.fn(async () => ({}));
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ kindOfWork: 'sales team', workStages: null, organizationId: 'org', objectives: [] })), update: jest.fn() },
      organization: { findUnique: jest.fn(async () => ({ timeZone: 'Africa/Nairobi', release1SalesBoardOn: true })) },
      groundObjective: { findMany: jest.fn(async () => [TEAM, MARYS]), update: jest.fn() },
      groundObjectiveSnapshot: { updateMany: jest.fn() },
      groundObjectiveSaid: { upsert },
      groundDocument: { findMany: jest.fn(async () => []) },
      workItem: { findMany: jest.fn(async () => []) },
      recordEntry: {
        findMany: jest.fn(async () => lines.map((l) => ({ text: l.text, type: 'PROGRESS', participantId: l.who, standing: null, aboutParticipantId: null }))),
      },
    };
    return { prisma, upsert };
  }
  it('keeps Asha\'s 24 against the team target and Mary\'s 28 against nothing but her own, from the model\'s reading', async () => {
    const { prisma, upsert } = aGround();
    const model: any = { extract: jest.fn(async () => ({ said: [
      { objectiveId: 'o-team', participantId: 'p-asha', count: 24, said: lines[0].text },
      { objectiveId: 'o-mary', participantId: 'p-mary', count: 28, said: lines[1].text },
    ] })) };
    const n = await new BoardListener(prisma, model).keepWhatPeopleSaid('g', 6);
    expect(n).toBe(2);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ objectiveId: 'o-team', participantId: 'p-asha', count: 24, sessionNumber: 6 }) }));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ objectiveId: 'o-mary', participantId: 'p-mary', count: 28 }) }));
    /* no count is changed and no aim is made */
    expect(prisma.groundObjective.update).not.toHaveBeenCalled();
  });
  it('asks only about people who are not the lead and have not left', async () => {
    const { prisma } = aGround();
    await new BoardListener(prisma, { extract: jest.fn(async () => ({ said: [] })) } as any).keepWhatPeopleSaid('g', 6);
    const where = (prisma.recordEntry.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.participant).toEqual({ groundId: 'g', leftAt: null, partyType: { not: 'INITIATOR' } });
  });
});
