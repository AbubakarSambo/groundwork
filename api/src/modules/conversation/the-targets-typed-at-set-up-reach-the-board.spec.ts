import { ConversationService } from './conversation.service';
import { EXPECTATION_PROMPT } from './prompt-library';
import { PartyType } from '@prisma/client';
import { boardAs, person } from '../board/the-switchboards-sections-harness';

/**
 * THE TARGETS A LEAD TYPES AT SET-UP REACH THE BOARD (final browser test, 22 November 2026, bug N7).
 *
 * Pat, signed out at /start, set up a sales org and typed "each team hits its own revenue target, 12m in total", or "4 regions,
 * 5 reps each, 50 new accounts per region". Her set-up's assessment read each as a team target (the targets below are what Gemini
 * returned on that run, from its stored assessment). Since every release switch went on, Release 1's sales board was on for her
 * organisation, so the targets were held as cards waiting for her yes, a card set-up never shows her, and her board said "No targets
 * set yet". Saving her set-up is her yes: the targets go on record, with the team as their owner, and her board shows them.
 *
 * Runs the writers the set-up save runs (keepTheAimsTheySaid with the set-up given, and extractExpectations with the set-up
 * conversation), then serves the board with what they wrote, as Pat, as a rep on the team, and as an admin.
 */
const PEOPLE = [person('p-pat', 'u-pat', 'Pat', 'Lead', PartyType.INITIATOR), person('p-ann', 'u-ann', 'Ann', 'Mwangi'), person('p-ben', 'u-ben', 'Ben', 'Otieno')];

function theSave(releaseOne: boolean, herWords: string[]) {
  const written: any[] = [];
  const held: any[] = [];
  const prisma: any = new Proxy({
    ground: { findUnique: jest.fn(async () => ({ participants: PEOPLE, peopleWorkTogether: true, kindOfWork: 'sales org', organizationId: 'org1', initiatorId: 'u-pat' })) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: releaseOne })) },
    /* Her turns on the check-in: at set-up, her first check-in is written from what she typed (herFirstCheckIn). */
    conversationTurn: { findMany: jest.fn(async () => herWords.map((content) => ({ role: 'PERSON', content }))) },
    groundObjective: { count: jest.fn(async () => written.length), findMany: jest.fn(async () => written.map((w) => ({ ...w }))), createMany: jest.fn(async (a: any) => { written.push(...a.data); return { count: a.data.length }; }), create: jest.fn(async (a: any) => { written.push(a.data); return a.data; }), update: jest.fn(async () => ({})) },
    planProposal: { findMany: jest.fn(async () => held.map((h) => ({ fields: h.fields }))), create: jest.fn(async (a: any) => { held.push(a.data); return { id: `h${held.length}`, ...a.data }; }) },
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
        target[prop] = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), create: jest.fn(async (a: any) => a), update: jest.fn(async (a: any) => a), createMany: jest.fn(async () => ({ count: 0 })), updateMany: jest.fn(async () => ({ count: 0 })) };
      }
      return target[prop];
    },
  });
  /* Nobody on the team is named in what she typed, so the per-person read finds no one's own number. */
  const anthropic: any = { extract: jest.fn(async (prompt: string) => (prompt === EXPECTATION_PROMPT ? { expectations: [] } : { promises: [] })) };
  const svc: any = new ConversationService(prisma, {} as any, anthropic, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const history = herWords.map((content) => ({ role: 'user', content }));
  const save = async (targets: any[]) => {
    const assessed = { about: { isTheLead: true, who: 'Pat Lead', checkInId: 'c1', groundId: 'g1', participantId: 'p-pat' }, targets };
    await svc.keepTheAimsTheySaid({ id: 'c1', participantId: 'p-pat', groundId: 'g1' }, assessed, { words: herWords });
    await svc.extractExpectations('c1', 'p-pat', 'g1', history);
  };
  return { save, svc, written, held };
}

const aTarget = (aim: string, words: string, target: number, unit?: string) => ({ id: `t-${target}`, aim, words, target, unit, whose: 'The team', saidWordForWord: true });

const THE_SENTENCES = [
  {
    said: 'need to set quarterly goals for my 3 teams. each team hits its own revenue target, 12m in total',
    targets: [aTarget('The teams hit a total revenue target of 12 million for the quarter.', 'each team hits its own revenue target, 12m in total', 12_000_000)],
    stored: [['The teams hit a total revenue target of 12 million for the quarter.', 12_000_000]],
  },
  {
    said: 'q1 targets for 20 reps in 4 regions. 4 regions, 5 reps each, 50 new accounts per region',
    targets: [aTarget('The team is aiming for 50 new accounts per region in Q1.', '4 regions, 5 reps each, 50 new accounts per region', 50, 'new accounts per region')],
    stored: [['The team is aiming for 50 new accounts per region in Q1.', 50]],
  },
  {
    said: 'each agent sells 8 freezers and activates 4 points a week',
    targets: [
      aTarget('The team is aiming for each agent to sell 8 freezers a week.', 'each agent sells 8 freezers', 8, 'freezers'),
      aTarget('The team is aiming for each agent to activate 4 points a week.', 'activates 4 points a week', 4, 'points'),
    ],
    stored: [['The team is aiming for each agent to sell 8 freezers a week.', 8], ['The team is aiming for each agent to activate 4 points a week.', 4]],
  },
];

async function theBoardAs(written: any[], userId: string, role = 'MEMBER'): Promise<{ names: string[]; noTargets: boolean }> {
  const objectives = written.map((w, i) => ({ id: `o-${i}`, groundId: 'g-1', name: w.name, target: w.target, count: 0, prevCount: 0, ownerParticipantId: w.ownerParticipantId, setByParticipantId: w.setByParticipantId, sortOrder: i, addedAtSession: null }));
  const b = await boardAs({ people: PEOPLE, initiatorId: 'u-pat', objectives, checkIns: [], kindOfWork: 'sales org' }, userId, role);
  return { names: (b.objectives ?? []).map((o: any) => o.name), noTargets: JSON.stringify(b).includes('No targets set yet') };
}

describe('the targets Pat typed at /start, with Release 1 on (every switch on, 22 November)', () => {
  for (const s of THE_SENTENCES) {
    it(`"${s.said}" is stored with its number, the team as its owner, and nothing waits for a card`, async () => {
      const { save, written, held } = theSave(true, [s.said]);
      await save(s.targets);
      expect(held).toEqual([]);
      expect(written.map((w) => [w.name, w.target])).toEqual(s.stored);
      expect(written.every((w) => w.ownerParticipantId === null && w.setByParticipantId === 'p-pat')).toBe(true);
    });
  }

  it('Pat, a rep and an admin read the targets on the board, and nobody reads "No targets set yet"', async () => {
    const read: Record<string, string[]> = {};
    for (const s of THE_SENTENCES) {
      const { save, written } = theSave(true, [s.said]);
      await save(s.targets);
      for (const [who, userId, role] of [['Pat', 'u-pat', 'MEMBER'], ['Ann', 'u-ann', 'MEMBER'], ['an admin', 'u-admin', 'ADMIN']] as const) {
        const board = await theBoardAs(written, userId, role);
        expect(board.noTargets).toBe(false);
        expect(board.names).toHaveLength(s.stored.length);
        read[`${who}: ${s.said}`] = board.names;
      }
    }
    expect(read['Pat: need to set quarterly goals for my 3 teams. each team hits its own revenue target, 12m in total']).toEqual(['The teams hit a total revenue target of 12 million for the quarter.']);
    expect(read['Pat: q1 targets for 20 reps in 4 regions. 4 regions, 5 reps each, 50 new accounts per region']).toEqual(['The team is aiming for 50 new accounts per region in Q1.']);
    expect(read['Pat: each agent sells 8 freezers and activates 4 points a week']).toEqual(['The team is aiming for each agent to sell 8 freezers a week.', 'The team is aiming for each agent to activate 4 points a week.']);
    expect(read['Ann: each agent sells 8 freezers and activates 4 points a week']).toEqual(read['Pat: each agent sells 8 freezers and activates 4 points a week']);
  });

  it('a target she says later, in a check-in, still waits for her yes, as before', async () => {
    const { svc, written, held } = theSave(true, ['each team hits its own revenue target, 12m in total']);
    const assessed = { about: { isTheLead: true, who: 'Pat Lead', checkInId: 'c2', groundId: 'g1', participantId: 'p-pat' }, targets: THE_SENTENCES[0].targets };
    await svc.keepTheAimsTheySaid({ id: 'c2', participantId: 'p-pat', groundId: 'g1' }, assessed, null);
    expect(written).toEqual([]);
    expect(held.map((h) => h.fields.number)).toEqual([12_000_000]);
  });
});
