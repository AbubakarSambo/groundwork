import { readFileSync } from 'fs';
import { join } from 'path';
import { TurnRole } from '@prisma/client';
import { theEndCard, theCardStillStanding, theLinesLeftOut, HOW, WHAT_WOULD_MAKE_IT_PROVEN, AT_MOST } from './the-end-card';
import { ConversationService } from './conversation.service';

/**
 * THE END CARD (task 2.7, screens request 7b). What a person reads before they finish: each line now
 * in their record, how it is known, and what would change it. See the-end-card.ts.
 */

describe('each line, and how it is known', () => {
  it('a line a document backs is proven, from the photo or the document', () => {
    const card = theEndCard([
      { type: 'OUTCOME', text: 'Green Mart has a quote', recallBased: false, anchoredDocumentId: 'd1', anchoredOrigin: null, backedByAPhoto: true },
      { type: 'OUTCOME', text: 'The budget sheet is signed', recallBased: false, anchoredDocumentId: 'd2', anchoredOrigin: null },
    ])!;
    expect(card.inYourRecord).toEqual([
      { says: 'Green Mart has a quote.', how: HOW.photo, mark: 'proven' },
      { says: 'The budget sheet is signed.', how: HOW.document, mark: 'proven' },
    ]);
    expect(card.next).toBeUndefined();
  });

  it('a line backed by somebody else\'s document is not proven', () => {
    const card = theEndCard([{ type: 'PROGRESS', text: 'The build is on track for the 14th', recallBased: false, anchoredDocumentId: 'plan', anchoredOrigin: 'typed', documentIsTheirOwn: false }])!;
    expect(card.inYourRecord![0].mark).toBe('said');
  });

  it('a line backed only by notes we generated is not proven', () => {
    const card = theEndCard([{ type: 'OUTCOME', text: 'Green Mart has a quote', recallBased: false, anchoredDocumentId: 'd1', anchoredOrigin: 'generated' }])!;
    expect(card.inYourRecord![0].mark).not.toBe('proven');
  });

  it('a commitment is their word, and says it will be asked about', () => {
    const card = theEndCard([{ type: 'COMMITMENT', text: "I'll visit Westgate Deli on Friday", recallBased: true }])!;
    expect(card.inYourRecord).toEqual([{ says: "I'll visit Westgate Deli on Friday.", how: 'You said you will do this. I will ask you how it went.', mark: 'said' }]);
    /* A commitment is not proven by a document today; it is asked about next time. */
    expect(card.next).toBeUndefined();
  });

  it('a firm figure about what happened, with nothing attached, is from memory', () => {
    const card = theEndCard([{ type: 'PROGRESS', text: 'I have 31 applications that I have taken from businesses.', recallBased: true }])!;
    expect(card.inYourRecord![0]).toEqual({ says: 'I have 31 applications that I have taken from businesses.', how: HOW.memory, mark: 'memory' });
  });

  /* Read on the local corpus: "My part is to contribute 12 approved facilities to the team target"
     came out "You gave this from memory". A target is not remembered. */
  it('a target, a plan or a definition with a number in it is their word, not memory', () => {
    const card = theEndCard([
      { type: 'INTENT', text: 'My part is to contribute 12 approved facilities to the team target.', recallBased: true },
      { type: 'SUCCESS_DEFINITION', text: 'Two proposals by 90 days', recallBased: true },
    ])!;
    expect(card.inYourRecord!.map((l) => l.mark)).toEqual(['said', 'said']);
  });

  it('anything else is their word, and says what would prove it', () => {
    const card = theEndCard([{ type: 'OUTCOME', text: 'Green Mart will buy in January', recallBased: true }])!;
    expect(card.inYourRecord).toEqual([{ says: 'Green Mart will buy in January.', how: 'You said this.', mark: 'said' }]);
    expect(card.next).toEqual([WHAT_WOULD_MAKE_IT_PROVEN]);
  });

  /* Changed with the reviewer's read (task 2.7): a line now ends as a sentence, so the one change to
     their words is the full stop at the end. */
  it('keeps their words exactly as recorded, ending as a sentence', () => {
    const text = 'Harbor Foods paid on the 3rd, "finally", after two reminders';
    expect(theEndCard([{ type: 'OUTCOME', text, recallBased: true }])!.inYourRecord![0].says).toBe(`${text}.`);
    expect(theEndCard([{ type: 'OUTCOME', text: `${text}.`, recallBased: true }])!.inYourRecord![0].says).toBe(`${text}.`);
  });

  it("never carries the engine's own notes, and starts with a capital letter (the reviewer's strings)", () => {
    const card = theEndCard([
      { type: 'TENSION', text: "I haven't had that conversation with Tobi yet. [INFERRED: about him taking over the scheduling]", recallBased: true },
      { type: 'OUTCOME', text: 'six facilities approved', recallBased: true },
      { type: 'OUTCOME', text: 'Nobody has said [what I am supposed to have learned by when]', recallBased: true },
      /* A line that is only a note is not a line at all. */
      { type: 'OUTCOME', text: '[INFERRED: only a note]', recallBased: true },
    ])!;
    const says = card.inYourRecord!.map((l) => l.says);
    expect(says).toEqual([
      "I haven't had that conversation with Tobi yet.",
      'Six facilities approved.',
      'Nobody has said.',
    ]);
    for (const s of says) expect(s).not.toMatch(/\[INFERRED/);
    for (const s of says) expect(s).toMatch(/^[A-Z].*[.!?]$/);
  });
});

describe('what is left out', () => {
  it('a line they said is not theirs', () => {
    expect(theEndCard([{ type: 'OUTCOME', text: 'Green Mart will buy in January', disputedAt: new Date() }])).toBeNull();
  });
  it('an empty line, and nothing at all', () => {
    expect(theEndCard([{ type: 'OUTCOME', text: '   ' }])).toBeNull();
    expect(theEndCard([])).toBeNull();
  });
  it(`no more than ${AT_MOST} lines, and it says how many more there are`, () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ type: 'OUTCOME', text: `Line number ${i} about the work` }));
    const card = theEndCard(many)!;
    expect(card.inYourRecord).toHaveLength(AT_MOST);
    expect(card.next![0]).toBe('There are 3 more lines in your record. You can read them all in your record after you finish.');
  });

  it('never drops the commitment: commitments come first', () => {
    const many = [
      ...Array.from({ length: 7 }, (_, i) => ({ type: 'PROGRESS', text: `Line number ${i} about the work` })),
      { type: 'COMMITMENT', text: 'I will call Tobi on Monday about the scheduling' },
    ];
    const card = theEndCard(many)!;
    expect(card.inYourRecord![0]).toEqual({ says: 'I will call Tobi on Monday about the scheduling.', how: HOW.commitment, mark: 'said' });
    expect(card.inYourRecord).toHaveLength(AT_MOST);
    expect(card.next![0]).toBe('There are 2 more lines in your record. You can read them all in your record after you finish.');
  });

  it('says nothing about lines left out when none are', () => {
    const card = theEndCard([{ type: 'COMMITMENT', text: 'I will call Tobi on Monday' }])!;
    expect(card.next).toBeUndefined();
  });
});

describe('the words a person reads', () => {
  it('are whole sentences, and say nothing about the person or how they were rated', () => {
    const all = [...Object.values(HOW), WHAT_WOULD_MAKE_IT_PROVEN, theLinesLeftOut(1)!, theLinesLeftOut(3)!];
    for (const s of all) {
      expect(s).toMatch(/^[A-Z].*\.$/);
      expect(s).not.toMatch(/rating|score|verifiab|specific|weak|strong|reliable/i);
    }
  });
});

/* ---------------------------------------------------------------- the service around it */

const ROWS = [
  { participantId: 'p1', checkInId: 'ci1', type: 'OUTCOME', verifiability: 'LOW', text: 'Green Mart will buy in January', saidWordForWord: true },
  { participantId: 'p1', checkInId: 'ci1', type: 'COMMITMENT', verifiability: 'MEDIUM', text: "I'll visit Westgate Deli on Friday", saidWordForWord: true },
];

function aService(prisma: any, anthropic: any = { extract: jest.fn(async () => null) }) {
  const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
  return new ConversationService(prisma, {} as any, anthropic, {} as any, nothing, nothing, nothing, nothing, nothing, nothing) as any;
}

describe('at the closing reply', () => {
  it('keeps the card and its lines on the closing turn, and writes nothing to the record', async () => {
    const prisma: any = {
      conversationTurn: { update: jest.fn(async () => ({})) },
      recordEntry: { createMany: jest.fn(), create: jest.fn() },
      groundDocument: { findMany: jest.fn(async () => []) },
    };
    const service = aService(prisma);
    service.readTheRecord = jest.fn(async () => ROWS.map((r) => ({ ...r })));
    const card = await service.theEndCardFor({ id: 'ci1', participantId: 'p1', groundId: 'g1' }, 'turn-9');
    expect(card.inYourRecord.map((l: any) => l.mark)).toEqual(['said', 'said']);
    expect(prisma.recordEntry.createMany).not.toHaveBeenCalled();
    expect(prisma.recordEntry.create).not.toHaveBeenCalled();
    const kept = prisma.conversationTurn.update.mock.calls[0][0];
    expect(kept.where).toEqual({ id: 'turn-9' });
    expect(kept.data.endCard).toEqual(card);
    expect(kept.data.recordDraft).toHaveLength(2);
  });

  it('a line a document the person added backs is proven, and the kept line says so too', async () => {
    const prisma: any = {
      conversationTurn: { update: jest.fn(async () => ({})) },
      recordEntry: { createMany: jest.fn() },
      groundDocument: { findMany: jest.fn(async () => [{ id: 'doc-1', fileName: 'quote.jpg', content: 'Quote for Green Mart, January delivery', origin: null, descriptionCheck: null, mimeType: 'image/jpeg', participantId: 'p1' }]) },
    };
    const anthropic = { extract: jest.fn(async () => ({ backed: [{ line: 0, document: 0, where: 'January delivery' }] })) };
    const service = aService(prisma, anthropic);
    service.readTheRecord = jest.fn(async () => ROWS.map((r) => ({ ...r })));
    const card = await service.theEndCardFor({ id: 'ci1', participantId: 'p1', groundId: 'g1' }, 'turn-9');
    /* Commitments come first, so the Green Mart line is second. */
    expect(card.inYourRecord[1]).toEqual({ says: 'Green Mart will buy in January.', how: HOW.photo, mark: 'proven' });
    const kept = prisma.conversationTurn.update.mock.calls[0][0].data.recordDraft;
    expect(kept[0]).toMatchObject({ recallBased: false, anchoredDocumentId: 'doc-1' });
  });

  it('a read that fails leaves no card and nothing kept', async () => {
    const prisma: any = { conversationTurn: { update: jest.fn() }, recordEntry: { createMany: jest.fn() } };
    const service = aService(prisma);
    service.readTheRecord = jest.fn(async () => { throw new Error('model down'); });
    expect(await service.theEndCardFor({ id: 'ci1', participantId: 'p1', groundId: 'g1' }, 'turn-9')).toBeNull();
    expect(prisma.conversationTurn.update).not.toHaveBeenCalled();
  });

  it('is built after the goodbye, only when the conversation closed, and never holds the reply up', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    // Changed 26 October 2026 (Hafsah: item 3): the same start is now the first thing in a block that also finishes the session on its own.
    expect(src).toMatch(/if \(sessionComplete\) \{\s*this\.startTheEndCard\(checkIn as any, aiTurn\.id\);/);
    expect(src).not.toMatch(/await this\.(theEndCardFor|startTheEndCard)\(/);
    /* Nothing waits on it, so it must never be started bare, with nothing to catch what fails. */
    expect(src).not.toMatch(/void this\.theEndCardFor\(/);
  });
});

describe('when the end card fails', () => {
  /* Nothing waits on the end card, so a failure in it has nobody to catch it unless it is caught where
     it starts. Uncaught, a database blip or a model error becomes an unhandled rejection, which can take
     the whole API down. */
  async function unhandledWhile(work: () => unknown): Promise<unknown[]> {
    const seen: unknown[] = [];
    const listener = (reason: unknown) => { seen.push(reason); };
    process.on('unhandledRejection', listener);
    try {
      work();
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      process.off('unhandledRejection', listener);
    }
    return seen;
  }

  it('is caught and logged, leaves no card, and holds nothing up', async () => {
    const prisma: any = { conversationTurn: { update: jest.fn() } };
    const service = aService(prisma);
    service.theEndCardFor = jest.fn(() => Promise.reject(new Error('the database blinked')));
    const warn = jest.spyOn(service.logger, 'warn').mockImplementation(() => undefined);
    let returned: unknown = 'not yet';
    const unhandled = await unhandledWhile(() => { returned = service.startTheEndCard({ id: 'ci1', participantId: 'p1', groundId: 'g1' }, 'turn-9'); });
    expect(returned).toBeUndefined();
    expect(unhandled).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Check-in ci1: no end card (the database blinked)'));
    expect(prisma.conversationTurn.update).not.toHaveBeenCalled();
  });

  it('a database with no documents table still leaves no unhandled failure', async () => {
    const prisma: any = { conversationTurn: { update: jest.fn() } };
    const service = aService(prisma);
    service.readTheRecord = jest.fn(async () => ROWS.map((r) => ({ ...r })));
    jest.spyOn(service.logger, 'warn').mockImplementation(() => undefined);
    const unhandled = await unhandledWhile(() => service.startTheEndCard({ id: 'ci1', participantId: 'p1', groundId: 'g1' }, 'turn-9'));
    expect(unhandled).toEqual([]);
    expect(prisma.conversationTurn.update).not.toHaveBeenCalled();
  });
});

describe('when anchoring the record to documents fails at the close', () => {
  /* Found by the coaching spec: the record read threw before it returned a promise, which left the
     documents read, already started, with nothing waiting on it. Its failure crashed Node. */
  it('both failures reach the caller, and neither is left unhandled', async () => {
    const prisma: any = { groundDocument: { findMany: jest.fn(() => Promise.reject(new Error('documents unreachable'))) } };
    const service = aService(prisma);
    const seen: unknown[] = [];
    const listener = (reason: unknown) => { seen.push(reason); };
    process.on('unhandledRejection', listener);
    try {
      await expect(service.anchorRecordToDocuments('p1', 'g1')).rejects.toBeTruthy();
      await new Promise((resolve) => setTimeout(resolve, 20));
    } finally {
      process.off('unhandledRejection', listener);
    }
    expect(seen).toEqual([]);
  });
});

describe('when they finish', () => {
  const closing = { id: 'turn-9', createdAt: new Date('2026-09-29T10:00:00Z'), recordDraft: ROWS };

  it('writes exactly the lines the card showed, with no second read', async () => {
    const prisma: any = {
      conversationTurn: { findFirst: jest.fn(async () => closing), count: jest.fn(async () => 0) },
      recordEntry: { createMany: jest.fn(async () => ({ count: 2 })) },
    };
    const service = aService(prisma);
    service.extractRecordEntries = jest.fn();
    await service.writeTheRecordAtTheEnd({ id: 'ci1', participantId: 'p1' });
    expect(prisma.recordEntry.createMany).toHaveBeenCalledWith({ data: ROWS.map((r) => ({ ...r, createdAt: expect.any(Date) })) });
    expect(service.extractRecordEntries).not.toHaveBeenCalled();
    expect(prisma.conversationTurn.count.mock.calls[0][0].where).toMatchObject({ checkInId: 'ci1', role: TurnRole.PERSON });
  });

  /* Changed with the reviewer's read (task 2.7): the second read is now the same read and write that
     extractRecordEntries did, done here so the card can be replaced with what was written. */
  /* Night quality run 2: every deal read "On 12 October", the day the rows were written, for sessions held from 19 October. */
  it('dates every line it writes as the session it was said in, not the moment it is written', async () => {
    const finished = new Date('2026-10-19T15:00:00Z');
    for (const saidMore of [0, 1]) {
      const prisma: any = {
        conversationTurn: { findFirst: jest.fn(async () => closing), count: jest.fn(async () => saidMore), update: jest.fn(async () => ({})) },
        checkIn: { findUnique: jest.fn(async () => ({ completedAt: finished })) },
        recordEntry: { createMany: jest.fn(async () => ({ count: 2 })) },
      };
      const service = aService(prisma);
      service.readTheRecord = jest.fn(async () => ROWS.map((r) => ({ ...r })));
      await service.writeTheRecordAtTheEnd({ id: 'ci1', participantId: 'p1' });
      const written = prisma.recordEntry.createMany.mock.calls[0][0].data;
      expect(written.map((r: any) => r.createdAt.toISOString())).toEqual([finished.toISOString(), finished.toISOString()]);
    }
  });

  it('reads the record again when they said more after the card, and the card then says what was written', async () => {
    const prisma: any = {
      conversationTurn: { findFirst: jest.fn(async () => closing), count: jest.fn(async () => 1), update: jest.fn(async () => ({})) },
      recordEntry: { createMany: jest.fn() },
    };
    const service = aService(prisma);
    const reread = [{ ...ROWS[1] }];
    service.readTheRecord = jest.fn(async () => reread);
    const card = await service.writeTheRecordAtTheEnd({ id: 'ci1', participantId: 'p1' });
    expect(service.readTheRecord).toHaveBeenCalledWith('ci1', 'p1');
    expect(prisma.recordEntry.createMany).toHaveBeenCalledWith({ data: reread.map((r) => ({ ...r, createdAt: expect.any(Date) })) });
    const replaced = prisma.conversationTurn.update.mock.calls[0][0];
    expect(replaced.where).toEqual({ id: 'turn-9' });
    expect(replaced.data.endCard.inYourRecord.map((l: any) => l.says)).toEqual(["I'll visit Westgate Deli on Friday."]);
    expect(card).toEqual(replaced.data.endCard);
  });

  it('reads the record as before when there was no card, and stores the card of what was written', async () => {
    const prisma: any = {
      conversationTurn: { findFirst: jest.fn(async () => ({ ...closing, recordDraft: null })), count: jest.fn(), update: jest.fn(async () => ({})) },
      recordEntry: { createMany: jest.fn() },
    };
    const service = aService(prisma);
    service.readTheRecord = jest.fn(async () => ROWS.map((r) => ({ ...r })));
    const card = await service.writeTheRecordAtTheEnd({ id: 'ci1', participantId: 'p1' });
    expect(prisma.recordEntry.createMany).toHaveBeenCalledTimes(1);
    expect(card.inYourRecord).toHaveLength(2);
    expect(prisma.conversationTurn.update.mock.calls[0][0].data.endCard).toEqual(card);
  });
});

describe('the transcript', () => {
  it('serves the card to the person on the closing turn, and never the unwritten lines', async () => {
    const prisma: any = {
      checkIn: { findUnique: jest.fn(async () => ({ id: 'ci1', groundId: 'g1', participantId: 'p1', sessionNumber: 1, isSelfCorrection: false, status: 'IN_PROGRESS', participant: { userId: 'u1', user: { awaitingOrgApproval: false } } })) },
      conversationTurn: { findMany: jest.fn(async () => [{ id: 'turn-9', role: TurnRole.AI, content: 'Thank you. That is all for today.', endCard: { inYourRecord: [{ says: 'Green Mart will buy in January', how: 'You said this.', mark: 'said' }] }, recordDraft: ROWS, createdAt: new Date() }]) },
      ground: { findUnique: jest.fn(async () => ({ id: 'g1', label: 'Sales', scenario: 'OKR_ALIGNMENT' })) },
    };
    const service = aService(prisma);
    service.loadOwnedCheckIn = jest.fn(async () => (await prisma.checkIn.findUnique()));
    service.briefFor = () => null;
    service.whoIsReadingIt = () => 'participant';
    const out = await service.getTranscript('ci1', 'u1');
    expect(out.endCard.inYourRecord[0].says).toBe('Green Mart will buy in January');
    expect('recordDraft' in out.turns[0]).toBe(false);
    expect(JSON.stringify(out)).not.toContain('saidWordForWord');
  });

  it('is read only by the person whose check-in it is', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    const body = src.slice(src.indexOf('  async getTranscript('), src.indexOf('  async getDownload('));
    expect(body).toContain('await this.loadOwnedCheckIn(checkInId, requestingUserId)');
  });
});

describe('the read and the write are the same as before', () => {
  it('extractRecordEntries is the read and then one write of what it read', async () => {
    const prisma: any = { recordEntry: { createMany: jest.fn(async () => ({ count: 2 })) } };
    const service = aService(prisma);
    service.readTheRecord = jest.fn(async () => ROWS);
    await service.extractRecordEntries('ci1', 'p1');
    expect(prisma.recordEntry.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.recordEntry.createMany).toHaveBeenCalledWith({ data: ROWS.map((r) => ({ ...r, createdAt: expect.any(Date) })) });
  });
  it('and writes nothing when the read finds nothing', async () => {
    const prisma: any = { recordEntry: { createMany: jest.fn() } };
    const service = aService(prisma);
    service.readTheRecord = jest.fn(async () => []);
    await service.extractRecordEntries('ci1', 'p1');
    expect(prisma.recordEntry.createMany).not.toHaveBeenCalled();
  });
});

describe('the card the transcript serves', () => {
  const card = { inYourRecord: [{ says: 'Green Mart will buy in January', how: 'You said this.', mark: 'said' as const }] };
  it('is the one on the closing turn', () => {
    expect(theCardStillStanding([{ role: 'PERSON' }, { role: 'AI', endCard: card }])).toEqual(card);
  });
  it('is gone once they carry on after it', () => {
    expect(theCardStillStanding([{ role: 'AI', endCard: card }, { role: 'PERSON' }])).toBeNull();
    expect(theCardStillStanding([{ role: 'AI', endCard: card }, { role: 'PERSON' }, { role: 'AI' }])).toBeNull();
  });
  it('is nothing before any close', () => {
    expect(theCardStillStanding([])).toBeNull();
    expect(theCardStillStanding([{ role: 'AI' }])).toBeNull();
  });
});

/*
 * WEEK 15: A PHOTO COUNTS AS PROOF, AND THE PERSON IS TOLD IT WAS THE PHOTO. Read as the words on
 * the card, from the stored origin alone: the card rebuilt from the written record knows only
 * anchoredOrigin, not the file type, and it said "From the document you added." for a photo.
 */
describe('a photo that backs a line, as the person reads it', () => {
  it('reads "From the photo you added." from the stored origin alone', () => {
    const card = theEndCard([{ type: 'OUTCOME', text: 'Green Mart has a quote', recallBased: false, anchoredDocumentId: 'd1', anchoredOrigin: 'photo' }])!;
    expect(card.inYourRecord).toEqual([{ says: 'Green Mart has a quote.', how: 'From the photo you added.', mark: 'proven' }]);
  });

  it('a screenshot reads as a screenshot, and a typed document as a document', () => {
    const card = theEndCard([
      { type: 'OUTCOME', text: 'The client approved it', recallBased: false, anchoredDocumentId: 'd1', anchoredOrigin: 'screenshot' },
      { type: 'OUTCOME', text: 'The budget sheet is signed', recallBased: false, anchoredDocumentId: 'd2', anchoredOrigin: 'typed' },
    ])!;
    expect(card.inYourRecord!.map((l) => l.how)).toEqual(['From the screenshot you added.', 'From the document you added.']);
  });

  it('somebody else\'s photo proves nothing of theirs', () => {
    const card = theEndCard([{ type: 'OUTCOME', text: 'Green Mart has a quote', recallBased: false, anchoredDocumentId: 'd1', anchoredOrigin: 'photo', documentIsTheirOwn: false }])!;
    expect(card.inYourRecord![0]).toEqual({ says: 'Green Mart has a quote.', how: 'You said this.', mark: 'said' });
  });

  it('the card rebuilt from the written record asks who added each backing document', () => {
    const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    const rewrite = SRC.slice(SRC.indexOf('private async writeTheRecordAtTheEnd('), SRC.indexOf('private async readTheRecord('));
    expect(rewrite).toContain('whoAddedEachBackingDocument(this.prisma, rows');
    expect(rewrite).toContain('documentIsTheirOwn: whoAdded.get(doc) === checkIn.participantId');
  });
});
