import { PartyType, TurnRole } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { EXPECTATION_PROMPT } from './prompt-library';

/**
 * PILOTS, 13 OCTOBER 2026, PROBLEM 3: Grace's "Only you" Q4 targets sheet became three aims every rep
 * read, one per colleague. This runs Grace's check-in through the real reading with the model's answer
 * given, and reads what is written for the board and what the model was shown.
 */
const SHEET = 'Rep,Q4 target (units)\nKevin Omondi,120\nMercy Wairimu,100\nJoseph Kariuki,80\nTeam,300';
const GRACE_SAID = 'Kevin sent the Kilele M-Pesa. The team is aiming to sell 40 units to Kilele Hotel this week.';
/* What the model handed back in the pilot: the sheet's rows as the team's aims. Read by her assessment now (one source, 2 November
   2026) and kept by the one writer of the team's aims, with the same rules. */
const THE_AIMS_READ = [
  { name: 'Kevin Omondi is aiming for 120 units sold', target: 120 },
  { name: 'The team is aiming to sell 40 units to Kilele Hotel this week', target: 40 },
];

function gracesCheckIn(visibility: 'OWN' | 'OPEN') {
  const board: any[] = [];
  const expectations: any[] = [];
  const shown: string[] = [];
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({
      peopleWorkTogether: true,
      participants: [
        { id: 'p-grace', partyType: PartyType.INITIATOR, createdAt: new Date(), managingOnly: false, email: 'grace@drop.test', roleAsDescribed: null, user: { firstName: 'Grace', lastName: 'Wanjiku' } },
        { id: 'p-kevin', partyType: PartyType.PARTICIPANT, createdAt: new Date(), managingOnly: false, email: 'kevin@drop.test', roleAsDescribed: null, user: { firstName: 'Kevin', lastName: 'Omondi' } },
      ],
    })) },
    conversationTurn: { findMany: jest.fn(async () => [{ role: TurnRole.PERSON, content: GRACE_SAID }]) },
    groundDocument: { findMany: jest.fn(async () => [{ fileName: 'q4-sales-targets.xlsx', content: SHEET, visibility }]) },
    personObjective: {
      findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []),
      create: jest.fn(async (a: any) => { expectations.push(a.data); return { id: `po-${expectations.length}` }; }),
      update: jest.fn(async () => ({ id: 'po-1' })),
    },
    groundObjective: {
      findMany: jest.fn(async () => board.map((t) => ({ name: t.name, target: t.target, ownerParticipantId: t.ownerParticipantId }))),
      createMany: jest.fn(async (a: any) => { board.push(...a.data); return { count: a.data.length }; }),
      update: jest.fn(async () => ({})),
    },
  };
  const svc = Object.create(ConversationService.prototype) as any;
  svc.prisma = prisma;
  svc.anthropic = {
    extract: jest.fn(async (prompt: string, messages: any[]) => {
      shown.push(messages.map((m) => m.content).join('\n'));
      if (prompt !== EXPECTATION_PROMPT) return { promises: [] };
      return {
        expectations: [{ personName: 'Kevin', targetNumber: 120, expectation: 'Kevin sells 120 units this quarter', awareness: 'NOT_ASKED', kind: 'TARGET', check: 'A_NUMBER', dueKind: 'NOT_SAID' }],
      };
    }),
  };
  svc.logger = { log: () => {}, warn: () => {} };
  svc.copyToTheOrganisationsCommitments = jest.fn(async () => undefined);
  return { svc, board, expectations, shown };
}

describe('what is read from a private document keeps its audience', () => {
  it('an "Only you" sheet gives the team no aim and no colleague a line, and the reading of others never sees it', async () => {
    const { svc, board, expectations, shown } = gracesCheckIn('OWN');
    await svc.extractExpectations('c-1', 'p-grace', 'g-1');
    await svc.keepTheTeamsAims('g-1', 'p-grace', THE_AIMS_READ, [GRACE_SAID]);
    expect(board.map((b) => b.name)).toEqual(['The team is aiming to sell 40 units to Kilele Hotel this week']);
    expect(board.map((b) => b.name).join(' ')).not.toContain('120');
    expect(expectations.filter((e) => e.participantId === 'p-kevin')).toEqual([]);
    /* The reading of what she expects of others was never shown the private sheet. */
    const forOthers = shown[shown.length - 1];
    expect(forOthers).not.toContain('Kevin Omondi,120');
  });

  it('the same sheet shared with everybody is still read and written, as before', async () => {
    const { svc, board, shown } = gracesCheckIn('OPEN');
    await svc.extractExpectations('c-1', 'p-grace', 'g-1');
    await svc.keepTheTeamsAims('g-1', 'p-grace', THE_AIMS_READ, [GRACE_SAID]);
    expect(board.map((b) => b.name)).toContain('Kevin Omondi is aiming for 120 units sold');
    expect(shown[shown.length - 1]).toContain('Kevin Omondi,120');
  });
});
