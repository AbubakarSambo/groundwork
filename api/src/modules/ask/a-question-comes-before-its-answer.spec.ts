import { AskService } from './ask.service';

/**
 * "EACH ANSWER COMES BEFORE ITS QUESTION, BECAUSE BOTH SHARE ONE TIMESTAMP" (request 154, item 2).
 *
 * A question and the answer to it are written in the same moment, so `created_at` is equal on both
 * rows. The history was read newest-first and reversed, and within one timestamp the database may
 * return rows in either order - so the pair came back the wrong way round about as often as the
 * right way, and somebody's history read backwards.
 *
 * There is no sequence column to fall back on: the id is a uuid and sorts randomly. The tie is
 * broken on what the rows mean instead - inside one instant, the person asked and Groundwork
 * answered.
 *
 * The fixture hands back the two rows in the WRONG order on purpose, which is what a database with
 * no tiebreak is free to do.
 */
const oneMoment = new Date('2026-10-05T09:00:00.000Z');
const later = new Date('2026-10-05T09:05:00.000Z');

function serviceReading(rows: { role: string; content: string; createdAt: Date }[]) {
  const prisma: any = { assistantTurn: { findMany: jest.fn(async () => rows) } };
  const svc = new AskService(prisma, {} as any, {} as any, {} as any);
  return (svc as any).turnsKeptUnder('org-1', 'person-1') as Promise<{ from: string; says: string }[]>;
}

describe('a question comes before its answer', () => {
  it('puts the question first even when the database hands back the answer first', async () => {
    const turns = await serviceReading([
      { role: 'assistant', content: 'You have three open commitments.', createdAt: oneMoment },
      { role: 'person', content: 'What did I say I would do?', createdAt: oneMoment },
    ]);
    expect(turns.map((t) => t.from)).toEqual(['you', 'groundwork']);
    expect(turns[0].says).toBe('What did I say I would do?');
  });

  it('keeps real time in front of the tiebreak, so an older answer still precedes a newer question', async () => {
    const turns = await serviceReading([
      { role: 'person', content: 'And the next one?', createdAt: later },
      { role: 'assistant', content: 'You have three open commitments.', createdAt: oneMoment },
      { role: 'person', content: 'What did I say I would do?', createdAt: oneMoment },
    ]);
    expect(turns.map((t) => t.says)).toEqual([
      'What did I say I would do?',
      'You have three open commitments.',
      'And the next one?',
    ]);
  });

  it('still leaves out a turn with nothing in it', async () => {
    const turns = await serviceReading([
      { role: 'person', content: '   ', createdAt: oneMoment },
      { role: 'person', content: 'What did I say I would do?', createdAt: oneMoment },
      { role: 'assistant', content: 'You have three open commitments.', createdAt: oneMoment },
    ]);
    expect(turns).toHaveLength(2);
    expect(turns.map((t) => t.from)).toEqual(['you', 'groundwork']);
  });

  it('reads oldest first, which is the order a person reads a conversation in', async () => {
    const turns = await serviceReading([
      { role: 'person', content: 'Second question', createdAt: later },
      { role: 'person', content: 'First question', createdAt: oneMoment },
    ]);
    expect(turns.map((t) => t.says)).toEqual(['First question', 'Second question']);
  });
});
