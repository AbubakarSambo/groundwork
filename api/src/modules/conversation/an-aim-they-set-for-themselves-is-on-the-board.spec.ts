import { PartyType, TurnRole } from '@prisma/client';
import { ConversationService, aNumberTheySaid } from './conversation.service';
import { THE_ASSESSMENT_PROMPT } from './the-assessment';
import { anAssessmentHolding } from './an-assessment-for-a-spec';
import { anAimAsASentence } from '../board/an-aim-is-a-sentence-about-somebody';

/**
 * REQUEST 107 (c): AMANI'S OWN AIM IS A TARGET ON THE BOARD, AS HERS.
 *
 * Amani said "I am aiming for 3 shops in Kilimani" in her own check-in and it was not an objective
 * anywhere on the board. Why: a participant's session went to the prompt for their own promises
 * alone, and returned before the only path that puts an owned target on the board, which read the
 * lead's session. This runs her check-in through the real code with the model's answer given, and
 * reads what is written for the board.
 *
 * Changed 2 November 2026: her own aims are read from her conversation's assessment (its `targets`, the items whose holder is
 * her), not by a separate model call, so the model's answer given here is her assessment.
 */
const AMANI_SAID = 'I am aiming for 3 shops in Kilimani.';

function amanisCheckIn(targets: any[]) {
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
  svc.anthropic = { extract: jest.fn(async () => { throw new Error('no model call: her aims are her assessment\'s'); }) };
  svc.logger = { log: () => {}, warn: () => {} };
  const keep = () => svc.keepTheAimsTheySaid({ id: 'c-1', participantId: 'p-amani', groundId: 'g-1' }, anAssessmentHolding({ targets }));
  return { svc, boardTargets, keep };
}

describe('a number somebody sets for themselves is their target on the board', () => {
  it('Amani\'s aim lands as hers, set by her, in her words', async () => {
    const { boardTargets, keep } = amanisCheckIn([
      { words: AMANI_SAID, aim: 'Amani is aiming for 3 shops in Kilimani.', target: 3, unit: 'shops in Kilimani', whose: 'Amani' },
    ]);
    await keep();
    /* Stored whole, as she said it; the short label is worked out when it is read and shown beside it (Hafsah, 12 October). */
    expect(boardTargets).toEqual([expect.objectContaining({ groundId: 'g-1', name: AMANI_SAID, target: 3, ownerParticipantId: 'p-amani', setByParticipantId: 'p-amani' })]);
  });

  it('and is read as a sentence about her: to Rukia by name, to Amani as "you"', () => {
    expect(anAimAsASentence(AMANI_SAID, { speaker: 'Amani Wekesa', holder: 'Amani Wekesa', target: 3 })).toBe('Amani Wekesa is aiming for 3 shops in Kilimani.');
  });

  it("an aim with no number, the team's number or a colleague's is not her target", async () => {
    const { boardTargets, keep } = amanisCheckIn([
      { words: 'I want to do better in Kilimani.', aim: 'Amani wants to do better in Kilimani.', target: null, whose: 'Amani' },
      { words: 'I am aiming for 3 shops in Kilimani.', aim: 'The team is aiming for 3 shops in Kilimani.', target: 3, unit: 'shops', whose: 'The team' },
      { words: 'I am aiming for 3 shops in Kilimani.', aim: 'Rukia is aiming for 3 shops in Kilimani.', target: 3, unit: 'shops', whose: 'Rukia' },
    ]);
    await keep();
    expect(boardTargets).toEqual([]);
  });

  it("a member's own check-in makes no separate model call for her aims", async () => {
    const { svc } = amanisCheckIn([]);
    await svc.extractExpectations('c-1', 'p-amani', 'g-1');
    expect(svc.anthropic.extract).not.toHaveBeenCalled();
  });

  it('the assessment reads every aim by whoever holds it, with its number, unit and holder', () => {
    expect(THE_ASSESSMENT_PROMPT).toContain('each number somebody is aiming at');
    expect(THE_ASSESSMENT_PROMPT).toContain('`whose` the first name of whoever holds it');
  });

  it('reads a number as people say it', () => {
    expect(aNumberTheySaid('3')).toBe(3);
    expect(aNumberTheySaid('150k')).toBe(150000);
    expect(aNumberTheySaid('1.5m')).toBe(1500000);
    expect(aNumberTheySaid('12,000')).toBe(12000);
    expect(aNumberTheySaid('more')).toBeNull();
  });
});
