import { ConversationService } from './conversation.service';
import { howCheckableIsYoursAlone } from '../grounds/how-checkable-is-yours-alone';
import { whatWasSaidOnce, atLeastMet } from './how-checkable-a-session-was';

/**
 * REQUEST 45: "HOW CHECKABLE TODAY'S CHECK-IN WAS" MISSED WHAT A PERSON ACTUALLY SAID.
 *
 * The Done page shows five lines, each met or not, and the screen counts a line as met when its
 * level is `specific` or `directional` (TheFiveThingsThatMakeItCheckable.wasItThere). Two of them:
 * "One date, number or document" (evidence) and "What you were waiting on, and from whom"
 * (enablement). Walked on a real check-in where the person gave dates, a number, a document and
 * said "waiting on Rukia", both came back not met.
 *
 * Checked here as the person reads it: the row served back to them from the check-in they did.
 */

const MET = ['specific', 'directional'];

/* The shape of the answers from the session the request was found on. */
const THEIR_TURNS = [
  'Good, mostly.',
  'I went to see the shops on Ngong Road and two of them are keen.',
  'The quote went to Mama Fresh on 24 September, I attached it here.',
  'We are at 2 signed so far.',
  'I am waiting on Rukia for the price list before I can send the other quotes.',
  'I will call Mama Fresh on Thursday.',
];

function serviceWith(turns: string[], documents = 0) {
  const prisma: any = {
    conversationTurn: { findMany: jest.fn(async () => turns.map((content) => ({ content }))) },
    checkIn: { findUnique: jest.fn(async () => ({ groundId: 'g1', participantId: 'p1', startedAt: new Date('2026-09-27T09:00:00Z') })) },
    groundDocument: { count: jest.fn(async () => documents) },
  };
  const service = new ConversationService(prisma, {} as any, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any, { emit: jest.fn() } as any, {} as any);
  return service;
}

describe('Said once is there (request 45)', () => {
  it('a date, a number, a document and a person waited on all show as there, to the person', async () => {
    const read = await (serviceWith(THEIR_TURNS, 1) as any).scoreSessionSpecificity('ci-1');
    const served = howCheckableIsYoursAlone(
      [{ participantId: 'p1', specificityLevel: read.level, specificityDimensions: read.dimensions }],
      [{ id: 'p1', userId: 'u-person' }, { id: 'p-lead', userId: 'u-lead' }],
      'u-person',
    )[0];
    const dims = served.specificityDimensions as Record<string, string>;
    expect(MET).toContain(dims.evidence);
    expect(MET).toContain(dims.enablement);

    /* And the lead still never reads it. */
    const toTheLead = howCheckableIsYoursAlone(
      [{ participantId: 'p1', specificityLevel: read.level, specificityDimensions: read.dimensions }],
      [{ id: 'p1', userId: 'u-person' }, { id: 'p-lead', userId: 'u-lead' }],
      'u-lead',
    )[0];
    expect(toTheLead.specificityDimensions).toBeNull();
  });

  it('a session that said none of it still reads as not there', async () => {
    const read = await (serviceWith(['Things are fine.', 'We are working on it and aligning with the team.', 'Nothing else really.']) as any).scoreSessionSpecificity('ci-2');
    expect(MET).not.toContain(read.dimensions.evidence);
    expect(MET).not.toContain(read.dimensions.enablement);
  });

  it('met is directional, never specific, so nothing that asks for proof is loosened', () => {
    expect(atLeastMet('managed', true)).toBe('directional');
    expect(atLeastMet('specific', true)).toBe('specific');
    expect(atLeastMet('vague', false)).toBe('vague');
  });

  it('reads the ways people say what they are waiting on, and not a bare "waiting"', () => {
    for (const t of ['waiting on Rukia', 'We are blocked by finance on the budget', 'I need the signed LPO from Baraka', 'held up by the warehouse team', 'nothing moves until Amani signs it']) {
      expect(whatWasSaidOnce([t]).whatTheyWereWaitingOn).toBe(true);
    }
    expect(whatWasSaidOnce(['I am waiting.']).whatTheyWereWaitingOn).toBe(false);
  });
});
