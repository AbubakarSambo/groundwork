import { AssistantService } from './assistant.service';
import { isAQuestion, answerFromTheDocuments, everyFigureIsInTheDocumentsOrSums, NOT_IN_THE_DOCUMENTS, NO_DOCUMENTS_TO_READ } from './a-question-is-answered-from-the-documents';
import { askedOnceAndNeverTwiceInOneReply } from '../grounds/the-context-chat';

/**
 * PILOTS, 13 OCTOBER 2026, PROBLEM 1 AND E3. Grace asked "What's the price of 40 units?" and read "Shall I add 'What's
 * the price of 40 units?' to this check-in's context as a note? Everybody in this check-in will read it." A question
 * is answered, from the documents she may open, to her alone, with each figure as the document wrote it.
 */
const PRICE_LIST = 'DropPure dispenser price list, October 2026\nUnits 1 to 9: KES 14,000 a unit\nUnits 10 to 29: KES 13,200 a unit\nUnits 30 to 99: KES 12,400 a unit\nInstallation: KES 1,500 a unit';
const FEE_NOTE = 'FEE NOTE No. MC/2026/118\nItem \tAmount (KES)\nVAT at 16% on fees (KES 395,000.00) \t63,200.00\nTotal due \t466,450.00';

function prismaWith(docs: { fileName: string; content: string; visibility: string; participantId: string }[], reader: { participantId: string; lead: boolean }) {
  const asked: any[] = [];
  return {
    asked,
    prisma: {
      ground: { findMany: jest.fn(async () => [{ id: 'g-1', initiatorId: reader.lead ? 'u-me' : 'u-lead', participants: [{ id: reader.participantId }] }]) },
      groundDocument: {
        findMany: jest.fn(async (a: any) => {
          asked.push(a.where);
          const ors = a.where.OR ?? [];
          return docs.filter((d) => ors.some((o: any) => (o.visibility && o.visibility === d.visibility) || (o.participantId && o.participantId === d.participantId)));
        }),
      },
      assistantProposal: { create: jest.fn(async () => ({ id: 'x' })) },
    },
  };
}

describe('a question is a question', () => {
  it.each([
    "What's the price of 40 units?",
    'When is the Kamau defence due?',
    'According to the fee note, what is the VAT rate and the total due',
    'How much do 40 DropPure dispensers cost',
  ])('"%s" is read as a question', (q) => expect(isAQuestion(q)).toBe(true));

  it.each([
    'The Kamau defence is due on Tuesday.',
    'We drop the pilot in November.',
    'Ask Brian when he files the defence?',
  ])('"%s" is not a question for Groundwork', (q) => expect(isAQuestion(q)).toBe(false));
});

describe('the answer comes from the documents, with every figure as written', () => {
  const engine = (answer: any) => ({ extract: jest.fn(async () => answer) });

  it("Grace's question is answered from the price list, privately, with its currency", async () => {
    const { prisma } = prismaWith([{ fileName: 'drop-access-price-list-oct-2026.pdf', content: PRICE_LIST, visibility: 'OPEN', participantId: 'p-grace' }], { participantId: 'p-grace', lead: true });
    const said = await answerFromTheDocuments({ prisma, engine: engine({ found: true, answer: 'The price list drop-access-price-list-oct-2026.pdf puts 40 units in the 30 to 99 band, at KES 12,400 a unit, so 40 units cost KES 496,000. Installation is KES 1,500 a unit.' }) }, { organizationId: 'o', userId: 'u-me', groundId: 'g-1', question: "What's the price of 40 units?" });
    expect(said).toContain('KES 12,400 a unit');
    expect(said).toContain('KES 496,000');
    expect(said).not.toMatch(/Shall I add|Everybody in this check-in/);
  });

  it('the fee note figures are said as written: 16%, KES 63,200.00 and KES 466,450.00', () => {
    expect(everyFigureIsInTheDocumentsOrSums('The fee note charges VAT at 16%, which is KES 63,200.00, and the total due is KES 466,450.00.', [{ content: FEE_NOTE }])).toBe(true);
  });

  it('an answer with a figure no document holds is not said', async () => {
    const { prisma } = prismaWith([{ fileName: 'fee-note.pdf', content: FEE_NOTE, visibility: 'OWN', participantId: 'p-njeri' }], { participantId: 'p-njeri', lead: true });
    const said = await answerFromTheDocuments({ prisma, engine: engine({ found: true, answer: 'The total due is KES 470,000.' }) }, { organizationId: 'o', userId: 'u-me', groundId: 'g-1', question: 'What is the total due?' });
    expect(said).toBe(NOT_IN_THE_DOCUMENTS);
  });

  it("a colleague's private document is never read for the answer", async () => {
    const { prisma } = prismaWith([{ fileName: 'fee-note.pdf', content: FEE_NOTE, visibility: 'OWN', participantId: 'p-njeri' }], { participantId: 'p-brian', lead: false });
    const e = engine({ found: true, answer: 'The total due is KES 466,450.00.' });
    const said = await answerFromTheDocuments({ prisma, engine: e }, { organizationId: 'o', userId: 'u-brian', groundId: 'g-1', question: 'What is the total due on the fee note?' });
    expect(said).toBe(NO_DOCUMENTS_TO_READ);
    expect(e.extract).not.toHaveBeenCalled();
  });
});

describe('in the Add context chat, a question goes to the answer, never to a line', () => {
  it(`"What's the price of 40 units?" is answered and nothing is proposed for everybody`, async () => {
    const svc = Object.create(AssistantService.prototype) as any;
    const { prisma } = prismaWith([{ fileName: 'drop-access-price-list-oct-2026.pdf', content: PRICE_LIST, visibility: 'OPEN', participantId: 'p-grace' }], { participantId: 'p-grace', lead: true });
    svc.prisma = { ...prisma, person: { findFirst: jest.fn(async () => ({ id: 'person-grace' })) } };
    svc.engine = { extract: jest.fn(async () => ({ found: true, answer: '40 units are in the 30 to 99 band, at KES 12,400 a unit, so 40 units cost KES 496,000.' })) };
    svc.proposeContextLine = jest.fn();
    const reply = await svc.setUpTurn('o', 'grace', 'u-me', 'g-1', "What's the price of 40 units?");
    expect(svc.proposeContextLine).not.toHaveBeenCalled();
    expect(reply.lane).toBe('answer_from_documents');
    expect(reply.blocks[0].body).toBe('40 units are in the 30 to 99 band, at KES 12,400 a unit, so 40 units cost KES 496,000.');
  });

  it('after a No, the person is told only that nothing was added, once', async () => {
    const svc = Object.create(AssistantService.prototype) as any;
    svc.prisma = { assistantProposal: { create: jest.fn(async () => ({})), update: jest.fn(async () => ({})) } };
    const ask = 'What does doing well look like here? I do not mean a target for one person. What would make you say, at the end, that this went the way it should have?';
    const reply = await svc.resolveParkedContextLine('o', 'njeri', { id: 'p1', payload: { groundId: 'g-1', carried: { history: [{ role: 'assistant', content: ask }], openQuestion: ask } } }, 'decline');
    expect(reply.blocks.map((b: any) => b.body).join(' ')).toBe('I have not added the line. Nothing was changed.');
  });
});

describe('the setup question is asked once, and nothing twice in one reply', () => {
  const ASK = 'What does doing well look like here? I do not mean a target for one person. What would make you say, at the end, that this went the way it should have?';
  it('is taken out once it was asked before', () => {
    const out = askedOnceAndNeverTwiceInOneReply(`Noted, the Kamau defence is due Tuesday. ${ASK}`, [{ role: 'assistant', content: ASK }, { role: 'user', content: 'No' }], [{ ask: ASK }]);
    expect(out).toBe('Noted, the Kamau defence is due Tuesday.');
  });
  it('a sentence said twice in one reply is said once', () => {
    expect(askedOnceAndNeverTwiceInOneReply('I have not added the line. Nothing was changed. I have not added the line. Nothing was changed.', [], [])).toBe('I have not added the line. Nothing was changed.');
  });
});

describe('a file name is not split into two sentences', () => {
  it('"matter-list-october-2026.pdf" stays whole', () => {
    expect(askedOnceAndNeverTwiceInOneReply('The documents are matter-list-october-2026.pdf and fee-note-MC-2026-118.pdf. They are on this check-in.', [], []))
      .toBe('The documents are matter-list-october-2026.pdf and fee-note-MC-2026-118.pdf. They are on this check-in.');
  });
});

describe('a request to add a document goes straight to Choose a file', () => {
  const { asksToAddADocument } = require('./what-kind-of-thing-was-said');
  it.each(['I want to add our matter list and a fee note', 'I want to upload our price list and our targets sheet', 'I want to upload a document'])('"%s" is a file to add', (m) => {
    expect(asksToAddADocument(m)).toBe('wants');
  });
  it('a line about the work is not', () => {
    expect(asksToAddADocument('I want to add that Kilele pays on delivery')).toBeNull();
  });
});

describe('"I want to do my own check-in" in the setup conversation opens her own check-in', () => {
  it('Grace is given her own check-in, not the rhythm question', async () => {
    const svc = Object.create(AssistantService.prototype) as any;
    svc.prisma = {
      person: { findFirst: jest.fn(async () => ({ id: 'person-grace' })) },
      ground: { findUnique: jest.fn(async () => ({ id: 'g-1', status: 'ACTIVE', initiatorId: 'u-me', organizationId: 'o' })) },
      groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p-grace' })) },
      checkIn: { findFirst: jest.fn(async () => null), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 3 } })), create: jest.fn(async () => ({ id: 'ci-own', sessionNumber: 4 })) },
    };
    svc.runContextChat = jest.fn();
    const reply = await svc.setUpTurn('o', 'grace', 'u-me', 'g-1', 'I want to do my own check-in');
    expect(svc.runContextChat).not.toHaveBeenCalled();
    expect(reply.blocks[0].body).toBe('Your own check-in is open. Open it to answer.');
    expect(reply.blocks[1]).toMatchObject({ type: 'next_step', label: 'Open my check-in', href: '/checkin/ci-own', kind: 'open_a_check_in' });
  });
});
