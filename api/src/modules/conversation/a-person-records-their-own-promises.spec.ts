import { ConversationService } from './conversation.service';
import { PartyType } from '@prisma/client';

/**
 * WHAT THIS PERSON SAID THEY WOULD DO.
 *
 * The half of expectations that was missing. A lead's session recorded what they expect OF people;
 * nothing recorded what somebody promised about their own work, so a new hire's "three proposals by
 * the thirtieth" - the exact thing the next check-in most needs to return to - stayed as loose text
 * in a transcript and no later question could be built from it.
 *
 * Changed 2 November 2026: their own aims come from their conversation's assessment (its `targets`), not from a separate model
 * read, so the input here is the assessment's items. Its targets hold aims only, so a to-do or a commitment never reaches this.
 */
const WED = new Date(Date.UTC(2026, 10, 4)); /* Wednesday 4 November 2026. */

function makeService(aims: any[], participants: any[] = []) {
  const written: any[] = [];
  const prisma: any = {
    personObjective: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async (a: any) => { written.push(a.data); return { id: 'o1' }; }),
      update: jest.fn(async (a: any) => { written.push(a.data); return { id: 'o1' }; }),
    },
  };
  const svc = Object.create(ConversationService.prototype) as any;
  svc.prisma = prisma;
  svc.logger = { log: () => {}, warn: () => {} };
  svc.aims = aims.map((a) => ({ target: null, unit: null, by: null, ...a }));
  return { svc, written, prisma };
}

const run = (svc: any, participants: any[] = []) =>
  svc.keepTheirOwnAims('abu', 'g1', svc.aims, `PERSON: ${svc.aims.map((a: any) => a.words).join(' ')}`, WED, participants);

describe('a promise somebody made about their own work', () => {
  it('is written against them, in their words, authored by them', async () => {
    const { svc, written } = makeService([
      { words: 'Get three proposals out', target: 3, unit: 'proposals', by: 'end of November' },
    ]);
    await run(svc);
    expect(written[0].text).toBe('Get three proposals out');
    expect(written[0].authoredBy).toBe('self');
    expect(written[0].participantId).toBe('abu');
  });

  it('carries the date their words meant, alongside the words', async () => {
    const { svc, written } = makeService([
      { words: 'Get three proposals out', target: 3, unit: 'proposals', by: 'end of November' },
    ]);
    await run(svc);
    expect(written[0].dueSaid).toBe('end of November');
    expect(written[0].dueDate?.toISOString().slice(0, 10)).toBe('2026-11-30');
  });

  it('and leaves the date empty when the words do not carry one', async () => {
    /* "Soon" is a real answer. A guess here becomes a missed deadline they never agreed to. */
    const { svc, written } = makeService([
      { words: 'Sort out the pipeline', by: 'soon' },
    ]);
    await run(svc);
    expect(written[0].dueSaid).toBe('soon');
    expect(written[0].dueDate).toBeNull();
  });

  it('counts as seen, because they said it themselves', async () => {
    /* `seenBySubject` stops somebody being read against an expectation they never saw. That risk
       is real for something a lead wrote about them and a nonsense for their own sentence. */
    const { svc, written } = makeService([{ words: 'Ship three decks', target: 3, unit: 'decks' }]);
    await run(svc);
    expect(written[0].seenBySubject).toBe(true);
  });
});

describe('what it refuses', () => {
  it('writes nothing at all when there is nothing to write', async () => {
    const { svc, written } = makeService([]);
    await run(svc);
    expect(written).toHaveLength(0);
  });

  it('drops a promise with no words in it', async () => {
    const { svc, written } = makeService([{ words: '   ' }]);
    await run(svc);
    expect(written).toHaveLength(0);
  });

  it('restating the same kind revises rather than piling up', async () => {
    /* "Make that four proposals, not three" is one promise, changed - not two promises. */
    const { svc, prisma } = makeService([{ words: 'Four proposals', target: 4, unit: 'proposals' }]);
    prisma.personObjective.findFirst = jest.fn(async () => ({ id: 'existing' }));
    await run(svc);
    expect(prisma.personObjective.update).toHaveBeenCalled();
    expect(prisma.personObjective.create).not.toHaveBeenCalled();
  });
});
