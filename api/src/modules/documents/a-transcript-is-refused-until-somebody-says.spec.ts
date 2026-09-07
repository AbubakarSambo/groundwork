import { DocumentsService } from './documents.service';
import { BadRequestException } from '@nestjs/common';

/**
 * A RECORD OF A CONVERSATION IS REFUSED UNTIL SOMEBODY CONFIRMS THE PEOPLE IN IT KNOW.
 *
 * Refused, not warned and not kept pending - a transcript sitting in a database waiting for
 * permission is the thing this exists to prevent.
 *
 * The claim it records is deliberately small: the person who was in the room says they told the
 * others. It is not the customer's consent, because we never met the customer.
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
  s.logger = { log: () => {}, warn: () => {} };
  s.assertParticipant = async () => ({ id: 'p1' });
  s.extractContent = async () => content;
  s.assessDocument = async () => null;
  /* The upload response now says who can see the file, and that answer depends on the
     CONTEXT_ENABLED flag — with it off, every document is private to its uploader whatever the
     column says, and a sentence contradicting the read path would be worse than none. */
  s.config = { get: () => false };
  s.prisma = { groundDocument: { create: async (a: any) => { written.push(a.data); return { id: 'd1', ...a.data }; } } };
  return { s, written };
};

const file = (name: string) => ({
  originalname: name, mimetype: 'text/plain', size: 100, buffer: Buffer.from('x'),
}) as any;

describe('a transcript', () => {
  it('is refused when nobody has confirmed', async () => {
    const { s, written } = svc(TRANSCRIPT);
    await expect(s.upload('g1', 'u1', file('Call notes.txt'), false)).rejects.toBeInstanceOf(BadRequestException);
    expect(written).toHaveLength(0);
  });

  it('and the refusal says why it cannot be anybody else', async () => {
    const { s } = svc(TRANSCRIPT);
    await expect(s.upload('g1', 'u1', file('Call notes.txt'), false)).rejects.toThrow(/you are the one who was in the room/);
  });

  it('is stored once they confirm, with who said it and when', async () => {
    const { s, written } = svc(TRANSCRIPT);
    await s.upload('g1', 'u1', file('Call notes.txt'), true);
    expect(written[0].isConversation).toBe(true);
    expect(written[0].consentConfirmedById).toBe('u1');
    expect(written[0].consentConfirmedAt).toBeInstanceOf(Date);
  });

  it('and nothing is written while it is refused', async () => {
    /* Read to recognise the shape, then dropped with the request. */
    const { s, written } = svc(TRANSCRIPT);
    await s.upload('g1', 'u1', file('Gemini transcript.txt'), false).catch(() => undefined);
    expect(written).toHaveLength(0);
  });
});

describe('an ordinary document', () => {
  const DECK = 'Our strategy for the year.\n\nWe will grow in three markets.\n\nThe first is Lagos.';

  it('is not asked about, because there is nobody else in it', async () => {
    const { s, written } = svc(DECK);
    await s.upload('g1', 'u1', file('Strategy 2026.pdf'), false);
    expect(written).toHaveLength(1);
    expect(written[0].isConversation).toBe(false);
  });

  it('and carries no consent record it did not need', async () => {
    const { s, written } = svc(DECK);
    await s.upload('g1', 'u1', file('Strategy 2026.pdf'), false);
    expect(written[0].consentConfirmedAt).toBeUndefined();
    expect(written[0].consentConfirmedById).toBeUndefined();
  });
});
