/**
 * A SHARED SHEET'S NUMBERS ARE THE LEAD'S, AND HER ASSESSMENT READS THEM (one source, part 1's loss; Hafsah, 22 September).
 *
 * The aims are read once now, by the lead's assessment. It read only her words, and setup's words leave out a document she
 * attached, so a targets sheet she shared with the team no longer became the team's aims. Her documents everybody on the
 * check-in may open are read with her words now; one marked "Only you" or "Only the lead" is not, and with CONTEXT_ENABLED off
 * none is, because then every document is its uploader's alone (who-can-see-a-document.ts).
 */
import { PartyType } from '@prisma/client';
import { assessTheConversation } from './assess-the-conversation';
import { ConversationService } from './conversation.service';
import { anAssessmentHolding } from './an-assessment-for-a-spec';

const DOCUMENTS = [
  { fileName: 'Q4 targets.xlsx', visibility: 'OPEN', content: 'Team target: 900 units sold by 31 December.' },
  { fileName: 'My notes on the team.docx', visibility: 'OWN', content: 'Kevin 120, Mercy 100, Joseph 80.' },
  { fileName: 'Pay review.docx', visibility: 'CLOSED', content: 'Bonus pool 450,000.' },
];

function aWorld(partyType: 'INITIATOR' | 'PARTICIPANT', contextEnabled?: boolean) {
  const calls: string[] = [];
  const prisma: any = {
    checkIn: {
      findUnique: jest.fn(async () => ({
        id: 'ci-1', groundId: 'g', participantId: 'p-grace', sessionNumber: 1, startedAt: new Date(), completedAt: new Date(), whatWeHave: null, sessionReport: null,
        turns: [{ id: 't1', role: 'PERSON', content: 'The targets are in the sheet I shared.' }],
        participant: { partyType, nameGiven: null, roleAsDescribed: null, user: { firstName: 'Grace', lastName: 'Achieng', jobTitle: 'Sales lead' } }, ground: { label: 'Sales' },
      })),
      findMany: jest.fn(async () => []),
      update: jest.fn(async () => ({})),
    },
    groundObjective: { findMany: jest.fn(async () => []) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    groundDocument: { findMany: jest.fn(async ({ where }: any) => (where.participantId === 'p-grace' ? DOCUMENTS : [])) },
  };
  const anthropic = { extract: jest.fn(async (_s: string, h: any[]) => { calls.push(h[0].content); return { summary: '', nothingToRecord: [1] }; }) };
  return { deps: { prisma, anthropic: anthropic as any, contextEnabled }, calls };
}

describe('the lead\'s documents in her assessment', () => {
  it('reads the sheet everybody on the check-in may open, and never one only she or only the lead may open', async () => {
    const w = aWorld('INITIATOR');
    await assessTheConversation(w.deps, 'ci-1', { howItEnded: 'finished by the person', closedAt: new Date() });
    expect(w.calls[0]).toContain('WHAT THE LEAD ATTACHED, WHICH EVERYBODY ON THE CHECK-IN MAY OPEN');
    expect(w.calls[0]).toContain('[Document: "Q4 targets.xlsx"]');
    expect(w.calls[0]).toContain('Team target: 900 units sold by 31 December.');
    expect(w.calls[0]).not.toContain('Kevin 120');
    expect(w.calls[0]).not.toContain('Bonus pool');
  });

  it('reads none with CONTEXT_ENABLED off, and none for a person who does not lead', async () => {
    for (const w of [aWorld('INITIATOR', false), aWorld('PARTICIPANT')]) {
      await assessTheConversation(w.deps, 'ci-1', { howItEnded: 'finished by the person', closedAt: new Date() });
      expect(w.calls[0]).not.toContain('[Document:');
      expect(w.calls[0]).not.toContain('900 units');
    }
  });

  it('a target the assessment read from the shared sheet reaches the board with its number, and the private sheet\'s numbers do not', async () => {
    const board: any[] = [];
    const prisma: any = new Proxy({
      ground: { findUnique: jest.fn(async () => ({ peopleWorkTogether: true, participants: [{ id: 'p-grace', partyType: PartyType.INITIATOR }] })) },
      conversationTurn: { findMany: jest.fn(async () => [{ content: 'The targets are in the sheet I shared.' }]) },
      groundDocument: { findMany: jest.fn(async () => DOCUMENTS) },
      groundObjective: { findMany: jest.fn(async () => board), createMany: jest.fn(async (a: any) => { board.push(...a.data); return { count: a.data.length }; }) },
    }, {
      get(target: any, prop: string) {
        if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) {
          target[prop] = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), create: jest.fn(async (a: any) => a), update: jest.fn(async (a: any) => a), createMany: jest.fn(async () => ({ count: 0 })) };
        }
        return target[prop];
      },
    });
    const svc = new ConversationService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any) as any;
    await svc.keepTheAimsTheLeadSaid({ id: 'ci-1', participantId: 'p-grace', groundId: 'g' }, anAssessmentHolding({
      isTheLead: true,
      targets: [
        { words: 'Team target: 900 units sold by 31 December.', aim: 'The team is aiming to sell 900 units by 31 December.', target: 900, whose: 'The team' },
        { words: 'Kevin 120', aim: 'Kevin is aiming to sell 120 units.', target: 120, whose: 'Kevin' },
      ],
    }), null);
    expect(board.map((b) => [b.name, b.target])).toEqual([['The team is aiming to sell 900 units by 31 December.', 900]]);
  });
});
