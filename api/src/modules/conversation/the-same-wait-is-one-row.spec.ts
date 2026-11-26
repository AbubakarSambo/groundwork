import { ConversationService } from './conversation.service';

/**
 * THE SAME WAIT IS ONE ROW, WHATEVER THE WORDS (evaluation, 24 November 2026). Nafiu said three weeks running that the Kano state
 * ministry had not signed the data-sharing MoU. Each week's assessment linked the wait to last week's (previousItem), but the rows
 * were matched on words, so "the Kano state ministry" and "Kano state ministry" made two open rows, then a third, and Today said the
 * same wait three times. A wait the model links to last time's item now carries that row on, with its newest words.
 */
function world(rows: any[], assessments: Record<string, any>) {
  const created: any[] = [];
  const updated: any[] = [];
  const prisma: any = {
    ground: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => ({ mode: 'SHARED', scenario: 'PULSE_CHECK', organizationId: 'o', participants: [{ id: 'nafiu', email: 'n@x.test', user: { firstName: 'Nafiu', lastName: 'Bello' } }] })) },
    conversationTurn: { findMany: jest.fn(async () => [{ role: 'PERSON', content: 'Kano MoU still not signed, three weeks now.' }]) },
    checkIn: {
      findUnique: jest.fn(async ({ where, select }: any) => (select?.sessionReport ? { sessionReport: assessments[where.id] ?? null } : { sessionNumber: where.id === 'ci-3' ? 3 : 2, completedAt: new Date('2026-12-08T10:00:00Z'), createdAt: new Date('2026-12-08T10:00:00Z') })),
      findMany: jest.fn(async () => [{ id: 'ci-2' }, { id: 'ci-1' }]),
    },
    groundDependency: {
      findMany: jest.fn(async () => rows),
      update: jest.fn(async (a: any) => { updated.push(a); return a; }),
      create: jest.fn(async (a: any) => { created.push(a); return { id: 'new', ...a.data }; }),
    },
    recordEntry: { findMany: jest.fn(async () => []) },
  };
  const service = new ConversationService(prisma, {} as any, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any, { emit: jest.fn(() => Promise.resolve()) } as any, {} as any);
  return { service, created, updated };
}

const anAssessment = (blockers: any[]) => ({ kind: 'assessment', version: 1, about: { checkInId: 'x', participantId: 'nafiu' }, blockers, messages: [] });

describe('the same wait is one row', () => {
  it('a wait the model links to last time carries that row on, with its newest words and party', async () => {
    const rows = [{ id: 'dep-1', what: 'A new data-sharing MoU', onParticipantId: null, onLabel: 'Kano state ministry', status: 'BLOCKING', sourceCheckInId: 'ci-2' }];
    const { service, created, updated } = world(rows, {
      'ci-2': anAssessment([{ id: 'r1.blockers.0', what: 'A new data-sharing MoU', onLabel: 'Kano state ministry', status: 'BLOCKING' }]),
      'ci-3': anAssessment([{ id: 'r1.blockers.0', what: 'Kano data-sharing MoU to be signed', onLabel: 'the Kano state ministry', status: 'BLOCKING', previousItem: 'r1.blockers.0' }]),
    });
    await (service as any).extractDependencies('ci-3', 'nafiu', 'g');
    expect(created).toHaveLength(0);
    expect(updated[0]).toMatchObject({ where: { id: 'dep-1' }, data: { what: 'Kano data-sharing MoU to be signed', onLabel: 'the Kano state ministry', status: 'BLOCKING' } });
  });

  it('a new wait the model does not link is still a new row', async () => {
    const { service, created } = world([], { 'ci-3': anAssessment([{ id: 'r1.blockers.0', what: 'The Abuja venue booking', onLabel: 'the hotel', status: 'WAITING' }]) });
    await (service as any).extractDependencies('ci-3', 'nafiu', 'g');
    expect(created).toHaveLength(1);
  });
});
