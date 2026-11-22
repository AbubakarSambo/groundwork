import { DocumentsService } from './documents.service';
import { ConversationService } from '../conversation/conversation.service';
import {
  ONE_READ, inParts, readTheWholeOfIt, whatADocumentSays, theDocumentsInOneRead, whileItIsRead,
} from './what-a-document-says';
import { theItemTheDocumentIsAbout } from './proof-filed-on-its-item';
import { theDocumentsTheyMayOpen } from '../assistant/a-question-is-answered-from-the-documents';
import { whatFitsInTheRoom } from '../conversation/a-prompt-that-ran-out-of-room-says-so';
import { aPlainRefusal } from '../../common/filters/a-refusal-is-plain';

/**
 * A LONG DOCUMENT IS READ WHOLE, AND EVERY READER READS ALL OF IT (Hafsah, 22 November 2026, before the Dangote demo).
 *
 * She added a long document to a check-in and the reply spoke about its first two pages: every reader took only the start of the text,
 * each with its own number, and none said the rest was missing. Here a document of 300,000 characters has one fact at its start, one in
 * its middle and one at its end. The reading of the whole of it holds all three, and so does what each reader is given.
 */
const START = 'FACT: Outlet 101 at Naivas Westlands ordered 40 cartons at 1,200 shillings.';
const MIDDLE = 'FACT: Outlet 3207 at Carrefour Junction returned 12 cartons on 14 November.';
const END = 'FACT: Outlet 5719 at Quickmart Ruaka owes 96,000 shillings, due 30 November.';
const THREE = [START, MIDDLE, END];

function aLongDocument(): string {
  const lines: string[] = [];
  let n = 0;
  while (lines.join('\n').length < 300_000) lines.push(`Page ${Math.floor(n / 30) + 1} line ${(n++ % 30) + 1}: Kericho Gold tea, 40 cartons, delivered Friday.`);
  lines.splice(10, 0, START);
  lines.splice(Math.floor(lines.length / 2), 0, MIDDLE);
  lines.splice(lines.length - 5, 0, END);
  return lines.join('\n');
}
const LONG = aLongDocument();

/** A stand-in for the model: a part's reading keeps the facts in it, and every other read is recorded by its tool's name. */
function aModel() {
  const seen: Record<string, string[]> = {};
  const extract = jest.fn(async (_system: string, history: { content: string }[], tool: { name: string }) => {
    const said = history.map((h) => h.content).join('\n');
    (seen[tool.name] ??= []).push(said);
    if (tool.name === 'what_this_part_says') return { says: said.split('\n').filter((l) => l.includes('FACT:')).join(' ') || 'Rows of tea deliveries.' };
    if (tool.name === 'emit_document_assessment') return { suggests: ['This is a tea delivery plan.'], willDo: ['It is kept on record.'] };
    return null;
  });
  return { extract, seen };
}

const hasAllThree = (text: string) => THREE.every((f) => text.includes(f));

describe('a long document is read whole, once', () => {
  it('is 300,000 characters, so it is longer than one read and goes in several parts', () => {
    expect(LONG.length).toBeGreaterThan(300_000);
    expect(hasAllThree(LONG)).toBe(true);
    expect(inParts(LONG).length).toBeGreaterThanOrEqual(5);
    expect(inParts(LONG).join('')).toBe(LONG);
    /* What the old readers took: the first 6,000 characters hold the start and nothing else. */
    expect(LONG.slice(0, 6000)).toContain(START);
    expect(LONG.slice(0, 6000)).not.toContain(MIDDLE);
  });

  it('the reading of the whole of it keeps the facts from its start, its middle and its end, and fits one read', async () => {
    const model = aModel();
    const reading = await readTheWholeOfIt(model as any, LONG, 'tea-plan.pdf');
    expect(hasAllThree(String(reading))).toBe(true);
    expect(String(reading).length).toBeLessThanOrEqual(ONE_READ);
    expect(reading).toMatch(/^Part 1 of \d+:/);
    expect(model.seen.what_this_part_says.length).toBe(inParts(LONG).length);
  });

  it('a document that fits one read is not read in parts and is given as it is', async () => {
    const model = aModel();
    expect(await readTheWholeOfIt(model as any, `A short note.\n${START}`, 'note.txt')).toBeNull();
    expect(model.extract).not.toHaveBeenCalled();
    expect(whatADocumentSays({ content: `A short note.\n${START}` })).toBe(`A short note.\n${START}`);
  });

  it('before the reading exists, a reader is given the start and told plainly that the rest has not been read yet', () => {
    const said = whatADocumentSays({ content: LONG });
    expect(said).toContain(START);
    expect(said).not.toContain(END);
    expect(said).toContain('This is only the first part of it');
    expect(said).toContain('The rest of it has not been read yet, so say nothing about what the rest holds.');
  });
});

describe('and every reader is given all of it', () => {
  let reading: string;
  beforeAll(async () => { reading = String(await readTheWholeOfIt(aModel() as any, LONG, 'tea-plan.pdf')); });
  const doc = () => ({ id: 'doc-long', fileName: 'tea-plan.pdf', content: LONG, synthesis: reading });

  it('the upload keeps the reading on the document, and the card and what it holds are read from it', async () => {
    const model = aModel();
    const s: any = Object.create(DocumentsService.prototype);
    const updates: any[] = [];
    s.anthropic = model;
    s.logger = { warn: () => undefined, log: () => undefined };
    s.prisma = {
      groundDocument: { update: jest.fn(async (a: any) => { updates.push(a.data); return {}; }) },
      ground: { findUnique: async () => ({ initiatorId: 'u-lead', scenario: null, organizationId: 'o-1', label: 'Tea', participants: [{ id: 'p-1', userId: 'u-lead', managingOnly: false }], objectives: [] }) },
    };
    s.agreements = { fromADocument: jest.fn() };
    await s.readTheRestOfIt('doc-long', 'g-1', 'p-1', LONG, 'tea-plan.pdf');
    const kept = updates.find((u) => typeof u.synthesis === 'string');
    expect(hasAllThree(kept.synthesis)).toBe(true);
    expect(hasAllThree(model.seen.emit_document_assessment[0])).toBe(true);
    expect(hasAllThree(model.seen.emit_what_the_document_holds[0])).toBe(true);
    expect(updates.find((u) => u.assessment)?.assessment.suggests).toEqual(['This is a tea delivery plan.']);
  });

  it('the check-in\'s reply to the upload says what is in the whole document', async () => {
    const said = await theReplyToTheUpload({ ...doc() });
    expect(hasAllThree(said.given)).toBe(true);
    expect(said.system).toContain('from the whole of it and not only its start');
  });

  it('the check-in\'s reply waits for a reading under way, and uses it when it lands', async () => {
    const lands = new Promise<string | null>((resolve) => setTimeout(() => resolve(reading), 20));
    void whileItIsRead('doc-long', lands);
    const said = await theReplyToTheUpload({ ...doc(), synthesis: null });
    expect(hasAllThree(said.given)).toBe(true);
  });

  it('when the reading is not done in time, the reply reads the start and says plainly it is still reading the rest', async () => {
    jest.useFakeTimers();
    try {
      void whileItIsRead('doc-long', new Promise<string | null>(() => undefined));
      const replying = theReplyToTheUpload({ ...doc(), synthesis: null });
      await jest.advanceTimersByTimeAsync(91_000);
      const said = await replying;
      expect(said.given).toContain(START);
      expect(said.given).not.toContain(END);
      expect(said.given).toContain('Groundwork is still reading the rest of it. Say plainly that you have read the start and are still reading the rest');
    } finally {
      jest.useRealTimers();
    }
  });

  it('the record lines it backs are read against all of it', async () => {
    const svc: any = Object.create(ConversationService.prototype);
    const model = aModel();
    svc.anthropic = model;
    await svc.whatTheDocumentsBack([doc()], ['Outlet 5719 owes us 96,000 shillings.']);
    expect(hasAllThree(model.seen[Object.keys(model.seen)[0]][0])).toBe(true);
  });

  it('the proof it is filed as is read from all of it', async () => {
    const model = aModel();
    await theItemTheDocumentIsAbout(model as any, doc(), [{ id: 'w-1', kind: 'deal', name: 'Some shop', ownerParticipantId: 'p-1', fields: null } as any], 'p-1');
    expect(hasAllThree(model.seen[Object.keys(model.seen)[0]][0])).toBe(true);
  });

  it('Ask reads all of it, for the person who may open it', async () => {
    const prisma = {
      ground: { findMany: async () => [{ id: 'g-1', initiatorId: 'u-lead', participants: [{ id: 'p-1' }] }] },
      groundDocument: { findMany: async () => [{ fileName: 'tea-plan.pdf', content: LONG, synthesis: reading, isConversation: false }] },
    };
    const docs = await theDocumentsTheyMayOpen(prisma, { organizationId: 'o-1', userId: 'u-lead', contextEnabled: true });
    expect(docs).toHaveLength(1);
    expect(hasAllThree(docs[0].content)).toBe(true);
    /* A quotation from the reading is checked against the document's own words, not the reading's. */
    expect(docs[0].mayBeQuoted).toEqual([LONG]);
  });

  it('the check-in session, the context chat and the assessment are each given all of it', () => {
    expect(hasAllThree(whatFitsInTheRoom([{ fileName: 'tea-plan.pdf', content: LONG, synthesis: reading }]).block)).toBe(true);
    expect(hasAllThree(theDocumentsInOneRead([doc()])[0].says)).toBe(true);
  });

  it('several documents share one read, and one that does not fit is said to be left out rather than cut silently', () => {
    const big = { fileName: 'big.txt', content: 'x'.repeat(ONE_READ) };
    const out = theDocumentsInOneRead([big, doc()]);
    expect(out[0].says).toBe(big.content);
    expect(out[1].says).toBe('[tea-plan.pdf did not fit in this read, so nothing of it is here. Say nothing about what it holds.]');
  });
});

describe('a scan is read in page batches, so no page is lost', () => {
  it('a 20 page scan is read eight pages at a time, in order, and every batch is kept', async () => {
    const s: any = Object.create(DocumentsService.prototype);
    s.logger = { warn: () => undefined };
    const asked: string[] = [];
    s.anthropic = { respondWithMedia: jest.fn(async (_sys: string, prompt: string) => { asked.push(prompt); const m = prompt.match(/pages (\d+) to (\d+) only/); return `-- Page ${m?.[1]} -- text up to page ${m?.[2]}`; }) };
    const text = await s.mediaToText(Buffer.from('%PDF'), 'application/pdf', 'scan.pdf', 20);
    expect(asked.map((p) => p.match(/pages (\d+ to \d+) only/)?.[1])).toEqual(['1 to 8', '9 to 16', '17 to 20']);
    expect(text).toContain('text up to page 8');
    expect(text).toContain('text up to page 20');
  });

  it('a batch that could not be read is named, not dropped', async () => {
    const s: any = Object.create(DocumentsService.prototype);
    s.logger = { warn: () => undefined };
    s.anthropic = { respondWithMedia: jest.fn(async (_sys: string, prompt: string) => { if (prompt.includes('pages 9 to 16')) throw new Error('busy'); return 'read'; }) };
    const text = await s.mediaToText(Buffer.from('%PDF'), 'application/pdf', 'scan.pdf', 20);
    expect(text).toContain('-- Pages 9 to 16 could not be read, so what they say is not here. --');
  });
});

describe('a file that is too large says the limit', () => {
  it('the upload library\'s "File too large" is said with the limit, in a full sentence', () => {
    expect(aPlainRefusal(413, 'File too large')).toBe('That file is larger than 25 MB, which is the most one file can be, so nothing was added. Choose a smaller file, or split it into parts and add each one.');
  });
});

/** The check-in's reply to an upload, with what the model was given. */
async function theReplyToTheUpload(theDoc: any): Promise<{ given: string; system: string }> {
  const svc: any = Object.create(ConversationService.prototype);
  let given = '';
  let system = '';
  svc.loadOwnedOpenCheckIn = async () => ({ id: 'c-1', groundId: 'g-1', participantId: 'p-1' });
  svc.theContextNotYetSaid = async () => null;
  svc.logger = { warn: () => undefined, log: () => undefined };
  svc.anthropic = { respond: async (s: string, h: { content: string }[]) => { system = s; given = h[0].content; return 'It is a tea delivery plan. What does it confirm?'; } };
  svc.prisma = {
    groundDocument: { findFirst: async () => ({ ...theDoc, groundId: 'g-1', participantId: 'p-1', mimeType: 'application/pdf', uploaderNote: null }) },
    itemEvidence: { findFirst: async () => ({ id: 'e-1' }) },
    conversationTurn: { create: async ({ data }: any) => data },
  };
  await svc.documentReceived('c-1', 'u-1');
  return { given, system };
}
