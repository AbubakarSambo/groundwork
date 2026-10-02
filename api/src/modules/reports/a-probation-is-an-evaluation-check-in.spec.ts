import { GroundScenario, PartyType } from '@prisma/client';
import { isEvaluationCheckIn, EVALUATION_SCENARIOS } from './is-this-an-evaluation-check-in';
import { peersAreNamedOn, peersAreNamedByDefaultOn, whyThePersonReviewedIsNotTold } from './peers-are-named';
import { aVerdictIsReachedOn, SuggestionsService } from '../suggestions/suggestions.service';
import { familyFor, BoardFamily } from '../board/board-families';

/**
 * DECISION 75, ITEM 25: A PROBATION OR A FIRST 90 DAYS IS AN EVALUATION CHECK-IN.
 *
 * "Kwame, first 90 days" (prototype B6, ending-and-probation-review.txt): "Groundwork suggests keeping Kwame on".
 * A probation and a first 90 days are NEW_HIRE. Each consequence, as each reader meets it:
 *   - a verdict can be reached there (decision 6), and the engine may write one;
 *   - the person reviewed is never named a colleague who gave a view (decision 17), whatever the lead switched;
 *   - the lead's page carries the sentence saying so;
 *   - an admin who was not given access reads nothing (proved in grounds/an-admin-does-not-read-an-evaluation...);
 *   - its board keeps the onboarding shape: nothing else about it changes.
 */
const party = (id: string, type: PartyType, n: number) => ({ id, partyType: type, managingOnly: false, createdAt: new Date(`2026-09-0${n}`) });
const KWAME_FIRST_90_DAYS = {
  scenario: GroundScenario.NEW_HIRE,
  peersVisibleToEachOther: true,
  participants: [party('p-wairimu', PartyType.INITIATOR, 1), party('p-kwame', PartyType.PARTICIPANT, 2), party('p-aisha', PartyType.PARTICIPANT, 3)],
};

describe('a probation or first 90 days is an evaluation check-in', () => {
  it('is on the one list, and a new manager or a new advisor is not', () => {
    expect(isEvaluationCheckIn(GroundScenario.NEW_HIRE)).toBe(true);
    expect(EVALUATION_SCENARIOS).toContain(GroundScenario.NEW_HIRE);
    expect(isEvaluationCheckIn(GroundScenario.NEW_MANAGER)).toBe(false);
    expect(isEvaluationCheckIn(GroundScenario.NEW_ADVISOR)).toBe(false);
  });

  it('keeps the board of a new person starting, not a review board', () => {
    expect(familyFor(GroundScenario.NEW_HIRE)).toBe(BoardFamily.ONBOARDING);
  });

  it('reaches a verdict there, as the prototype does for Kwame', () => {
    expect(aVerdictIsReachedOn({ scenario: GroundScenario.NEW_HIRE })).toBe(true);
    expect(aVerdictIsReachedOn({ scenario: GroundScenario.NEW_MANAGER })).toBe(false);
  });

  it('lets the engine write a suggestion there, and refuses it on a new manager\'s check-in with a plain sentence', async () => {
    const created: any[] = [];
    const prisma: any = {
      ground: { findUnique: jest.fn(async ({ where }: any) => ({ id: where.id, organizationId: 'org1', scenario: where.id === 'g-probation' ? 'NEW_HIRE' : 'NEW_MANAGER' })) },
      groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p-kwame' })) },
      suggestion: { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => { created.push(data); return { id: 's1' }; }) },
    };
    const svc = new SuggestionsService(prisma);
    const input = { aboutParticipantId: 'p-kwame', verdict: 'keep', headline: 'Groundwork suggests keeping Kwame on', why: 'He brought in five new accounts.', factsForThem: 'You brought in five new accounts.' };
    await expect(svc.record({ ...input, groundId: 'g-probation' })).resolves.toEqual({ id: 's1' });
    await expect(svc.record({ ...input, groundId: 'g-new-manager' }))
      .rejects.toThrow('A suggestion is only reached on a performance plan, a recognition, a contract renewal or a probation.');
    expect(created).toHaveLength(1);
  });
});

describe('names on a probation (decision 17), for each reader, with the lead\'s "people see each other" switched on', () => {
  it('Kwame, the person reviewed, is never named a colleague', () => {
    expect(peersAreNamedOn(KWAME_FIRST_90_DAYS, { participantId: 'p-kwame' })).toBe(false);
  });

  it('Aisha, a colleague giving a view, is still named to the others, as the lead chose', () => {
    expect(peersAreNamedOn(KWAME_FIRST_90_DAYS, { participantId: 'p-aisha' })).toBe(true);
  });

  it('a reader nobody said is given the private answer, and nobody is named by default', () => {
    expect(peersAreNamedOn(KWAME_FIRST_90_DAYS)).toBe(false);
    expect(peersAreNamedOn({ ...KWAME_FIRST_90_DAYS, peersVisibleToEachOther: null }, { participantId: 'p-aisha' })).toBe(false);
    expect(peersAreNamedByDefaultOn(KWAME_FIRST_90_DAYS)).toBe(false);
  });

  it('the lead is told why, in one plain sentence', () => {
    expect(whyThePersonReviewedIsNotTold(KWAME_FIRST_90_DAYS)).toBe('On a check-in about one person, that person is never told who else gave a view.');
    expect(whyThePersonReviewedIsNotTold({ scenario: GroundScenario.NEW_MANAGER })).toBeNull();
  });
});
