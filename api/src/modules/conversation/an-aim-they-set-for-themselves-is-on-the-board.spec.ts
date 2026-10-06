import { PartyType, TurnRole } from '@prisma/client';
import { ConversationService, aNumberTheySaid } from './conversation.service';
import { OWN_PROMISE_PROMPT } from './prompt-library';
import { anAimAsASentence } from '../board/an-aim-is-a-sentence-about-somebody';

/**
 * REQUEST 107 (c): AMANI'S OWN AIM IS A TARGET ON THE BOARD, AS HERS.
 *
 * Amani said "I am aiming for 3 shops in Kilimani" in her own check-in and it was not an objective
 * anywhere on the board. Why: a participant's session went to the prompt for their own promises
 * alone, and returned before the only path that puts an owned target on the board, which read the
 * lead's session. This runs her check-in through the real code with the model's answer given, and
 * reads what is written for the board.
 */
const AMANI_SAID = 'I am aiming for 3 shops in Kilimani.';

function amanisCheckIn(promises: any[]) {
  const boardTargets: any[] = [];
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({
      peopleWorkTogether: true,
      participants: [
        { id: 'p-rukia', partyType: PartyType.INITIATOR, createdAt: new Date(), managingOnly: true, email: 'rukia@sales.test', roleAsDescribed: null, user: { firstName: 'Rukia', lastName: 'Otieno' } },
        { id: 'p-amani', partyType: PartyType.PARTICIPANT, createdAt: new Date(), managingOnly: false, email: 'amani@sales.test', roleAsDescribed: null, user: { firstName: 'Amani', lastName: 'Wekesa' } },
      ],
    })) },
    conversationTurn: { findMany: jest.fn(async () => [{ role: TurnRole.PERSON, content: AMANI_SAID }]) },
    groundDocument: { findMany: jest.fn(async () => []) },
    personObjective: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({ id: 'po-1' })), update: jest.fn(async () => ({ id: 'po-1' })) },
    groundObjective: {
      findMany: jest.fn(async () => boardTargets.map((t) => ({ name: t.name, ownerParticipantId: t.ownerParticipantId }))),
      createMany: jest.fn(async (a: any) => { boardTargets.push(...a.data); return { count: a.data.length }; }),
    },
  };
  const svc = Object.create(ConversationService.prototype) as any;
  svc.prisma = prisma;
  svc.anthropic = { extract: jest.fn(async () => ({ promises })) };
  svc.logger = { log: () => {}, warn: () => {} };
  return { svc, boardTargets };
}

describe('a number somebody sets for themselves is their target on the board', () => {
  it('Amani\'s aim lands as hers, set by her, in her words', async () => {
    const { svc, boardTargets } = amanisCheckIn([
      { promise: AMANI_SAID, kind: 'TARGET', check: 'A_NUMBER', dueKind: 'NOT_SAID', target: '3', measure: 'shops in Kilimani' },
    ]);
    await svc.extractExpectations('c-1', 'p-amani', 'g-1');
    expect(boardTargets).toEqual([expect.objectContaining({ groundId: 'g-1', name: AMANI_SAID, target: 3, ownerParticipantId: 'p-amani', setByParticipantId: 'p-amani' })]);
  });

  it('and is read as a sentence about her: to Rukia by name, to Amani as "you"', () => {
    expect(anAimAsASentence(AMANI_SAID, { speaker: 'Amani Wekesa', holder: 'Amani Wekesa', target: 3 })).toBe('Amani Wekesa is aiming for 3 shops in Kilimani.');
  });

  it('a promise with no number, or a to-do, is not a target', async () => {
    const { svc, boardTargets } = amanisCheckIn([
      { promise: 'I will visit the shops in Kilimani.', kind: 'TODO', check: 'DONE_OR_NOT', dueKind: 'NOT_SAID' },
      { promise: 'I want to do better in Kilimani.', kind: 'TARGET', check: 'A_JUDGEMENT', dueKind: 'NOT_SAID', target: 'more', measure: 'shops' },
    ]);
    await svc.extractExpectations('c-1', 'p-amani', 'g-1');
    expect(boardTargets).toEqual([]);
  });

  it('the prompt that reads her check-in counts an aim for her own number as a target', () => {
    expect(OWN_PROMISE_PROMPT).toContain('"I am aiming for 3 shops in Kilimani" is target 3, measure "shops in Kilimani"');
  });

  it('reads a number as people say it', () => {
    expect(aNumberTheySaid('3')).toBe(3);
    expect(aNumberTheySaid('150k')).toBe(150000);
    expect(aNumberTheySaid('1.5m')).toBe(1500000);
    expect(aNumberTheySaid('12,000')).toBe(12000);
    expect(aNumberTheySaid('more')).toBeNull();
  });
});
