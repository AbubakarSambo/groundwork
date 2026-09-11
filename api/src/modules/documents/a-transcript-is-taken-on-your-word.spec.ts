import { DocumentsService } from './documents.service';
import { THE_ASSUMPTION_WHEN_UPLOADING } from './a-conversation-belongs-to-the-people-in-it';

/**
 * A RECORD OF A CONVERSATION IS TAKEN ON YOUR WORD, AND THE WORD IS SAID BACK.
 *
 * This used to be a refusal: a transcript was turned away until the uploader pressed a button. The
 * product owner reversed that on 11 September 2026 - nothing is refused, the assumption is stated.
 * What this pins now: a conversation is recognised, kept, stamped with who and when from the upload
 * itself, and the response carries the sentence. The claim stays deliberately small: the person who
 * was in the room uploaded it knowing what that means. Not the customer's consent - we never met
 * them.
 */
const TRANSCRIPT = [
  'Sam: Thanks for making time.',
  'Ngozi: No problem at all.',
  'Sam: I wanted to ask what you use now.',
  'Ngozi: We buy weekly from the market.',
  'Sam: And how is that working?',
  'Ngozi: It is fine, mostly.',
].join('\n');

const svc = (content: string) => {
  const written: any[] = [];
  const s = Object.create(DocumentsService.prototype) as any;
  s.conversation = { anchorRecordToDocuments: async () => ({ backed: 0, of: 0 }) };
  s.logger = { log: () => {}, warn: () => {} };
  s.assertParticipant = async () => ({ id: 'p1' });
  s.extractContent = async () => content;
  s.assessDocument = async () => null;
  s.config = { get: () => false };
  s.prisma = { groundDocument: { create: async (a: any) => { written.push(a.data); return { id: 'd1', ...a.data }; } } };
  return { s, written };
};

const file = (name: string) => ({ originalname: name, mimetype: 'text/plain', size: 100, buffer: Buffer.from('x') }) as any;

describe('a transcript', () => {
  it('is kept without anybody pressing anything first', async () => {
    const { s, written } = svc(TRANSCRIPT);
    await s.upload('g1', 'u1', file('Call notes.txt'), false);
    expect(written).toHaveLength(1);
    expect(written[0].isConversation).toBe(true);
  });

  it('is stamped with who uploaded it and when, from the upload itself', async () => {
    const { s, written } = svc(TRANSCRIPT);
    await s.upload('g1', 'u1', file('Call notes.txt'), false);
    expect(written[0].consentConfirmedById).toBe('u1');
    expect(written[0].consentConfirmedAt).toBeInstanceOf(Date);
  });

  it('and the response says the assumption it was kept under', async () => {
    const { s } = svc(TRANSCRIPT);
    const res = await s.upload('g1', 'u1', file('Gemini transcript.txt'), false);
    expect(res.assumed).toBe(THE_ASSUMPTION_WHEN_UPLOADING);
    expect(res.assumed).toMatch(/on your word/);
    expect(res.assumed).toMatch(/you are the one who was in the room/);
  });

  it('the old flag changes nothing either way', async () => {
    const a = svc(TRANSCRIPT); await a.s.upload('g1', 'u1', file('Call notes.txt'), true);
    const b = svc(TRANSCRIPT); await b.s.upload('g1', 'u1', file('Call notes.txt'), false);
    expect(a.written[0].isConversation).toBe(b.written[0].isConversation);
    expect(!!a.written[0].consentConfirmedAt).toBe(!!b.written[0].consentConfirmedAt);
  });
});

describe('an ordinary document', () => {
  const DECK = 'Our strategy for the year.\n\nWe will grow in three markets.\n\nThe first is Lagos.';

  it('is kept as one, with no assumption said and no record it did not need', async () => {
    const { s, written } = svc(DECK);
    const res = await s.upload('g1', 'u1', file('Strategy 2026.pdf'), false);
    expect(written[0].isConversation).toBe(false);
    expect(written[0].consentConfirmedAt).toBeUndefined();
    expect(res.assumed).toBeUndefined();
  });
});
