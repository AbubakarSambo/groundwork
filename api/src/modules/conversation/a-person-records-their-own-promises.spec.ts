import { ConversationService } from './conversation.service';
import { PartyType } from '@prisma/client';

/**
 * WHAT THIS PERSON SAID THEY WOULD DO.
 *
 * The half of expectations that was missing. A lead's session recorded what they expect OF people;
 * nothing recorded what somebody promised about their own work, so a new hire's "three proposals by
 * the thirtieth" - the exact thing the next check-in most needs to return to - stayed as loose text
 * in a transcript and no later question could be built from it.
 */
const WED = new Date(Date.UTC(2026, 10, 4)); /* Wednesday 4 November 2026. */

function makeService(promises: any[], participants: any[] = []) {
  const written: any[] = [];
  const prisma: any = {
    personObjective: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async (a: any) => { written.push(a.data); return { id: 'o1' }; }),
      update: jest.fn(async (a: any) => { written.push(a.data); return { id: 'o1' }; }),
    },
  };
  const anthropic: any = { extract: jest.fn(async () => ({ promises })) };
  const svc = Object.create(ConversationService.prototype) as any;
  svc.prisma = prisma;
  svc.anthropic = anthropic;
  svc.logger = { log: () => {}, warn: () => {} };
  return { svc, written, prisma };
}

const run = (svc: any, participants: any[] = []) =>
  svc.writeTheirOwnPromises('abu', 'g1', 'PERSON: ...', WED, participants);

describe('a promise somebody made about their own work', () => {
  it('is written against them, in their words, authored by them', async () => {
    const { svc, written } = makeService([
      { promise: 'Get three proposals out', kind: 'TARGET', check: 'A_NUMBER', dueKind: 'A_DATE', dueSaid: 'end of November' },
    ]);
    await run(svc);
    expect(written[0].text).toBe('Get three proposals out');
    expect(written[0].authoredBy).toBe('self');
    expect(written[0].participantId).toBe('abu');
  });

  it('carries the date their words meant, alongside the words', async () => {
    const { svc, written } = makeService([
      { promise: 'Get three proposals out', kind: 'TARGET', check: 'A_NUMBER', dueKind: 'A_DATE', dueSaid: 'end of November' },
    ]);
    await run(svc);
    expect(written[0].dueSaid).toBe('end of November');
    expect(written[0].dueDate?.toISOString().slice(0, 10)).toBe('2026-11-30');
  });

  it('and leaves the date empty when the words do not carry one', async () => {
    /* "Soon" is a real answer. A guess here becomes a missed deadline they never agreed to. */
    const { svc, written } = makeService([
      { promise: 'Sort out the pipeline', kind: 'GOAL', check: 'A_JUDGEMENT', dueKind: 'NOT_SAID', dueSaid: 'soon' },
    ]);
    await run(svc);
    expect(written[0].dueSaid).toBe('soon');
    expect(written[0].dueDate).toBeNull();
  });

  it('counts as seen, because they said it themselves', async () => {
    /* `seenBySubject` stops somebody being read against an expectation they never saw. That risk
       is real for something a lead wrote about them and a nonsense for their own sentence. */
    const { svc, written } = makeService([{ promise: 'Ship three decks', kind: 'TARGET', check: 'A_NUMBER', dueKind: 'NOT_SAID' }]);
    await run(svc);
    expect(written[0].seenBySubject).toBe(true);
  });
});

describe('what it refuses', () => {
  /* One promise, one owner (Hafsah, 1 November 2026): a to-do or a commitment of their own is kept once, as a GroundCommitment read
     from the conversation's assessment. This writer kept a second copy with a day of its own (9 November 2027 against "Monday 9
     November"), so it now keeps only their own aims. */
  it('keeps no copy of a to-do or a commitment of their own: the assessment owns those', async () => {
    const { svc, written } = makeService([
      { promise: 'Send the pricing', kind: 'COMMITMENT', check: 'DONE_OR_NOT', dueKind: 'A_DATE', dueSaid: 'Friday', owedTo: 'Hafsah' },
      { promise: 'Ship the deck', kind: 'TODO', check: 'DONE_OR_NOT', dueKind: 'NOT_SAID' },
    ]);
    await run(svc, [{ id: 'ceo', managingOnly: false, email: 'h@x.test', roleAsDescribed: null, user: { firstName: 'Hafsah', lastName: null } }]);
    expect(written).toHaveLength(0);
  });

  it('writes nothing at all when there is nothing to write', async () => {
    const { svc, written } = makeService([]);
    await run(svc);
    expect(written).toHaveLength(0);
  });

  it('drops a promise with no words in it', async () => {
    const { svc, written } = makeService([{ promise: '   ', kind: 'TODO', check: 'DONE_OR_NOT', dueKind: 'NOT_SAID' }]);
    await run(svc);
    expect(written).toHaveLength(0);
  });

  it('restating the same kind revises rather than piling up', async () => {
    /* "Make that four proposals, not three" is one promise, changed - not two promises. */
    const { svc, prisma } = makeService([{ promise: 'Four proposals', kind: 'TARGET', check: 'A_NUMBER', dueKind: 'NOT_SAID' }]);
    prisma.personObjective.findFirst = jest.fn(async () => ({ id: 'existing' }));
    await run(svc);
    expect(prisma.personObjective.update).toHaveBeenCalled();
    expect(prisma.personObjective.create).not.toHaveBeenCalled();
  });
});
