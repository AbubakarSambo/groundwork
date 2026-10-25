import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { attachToASpendRequest, theWordsOfAnAttachment, whatWasAttachedSaid } from './what-was-attached-to-a-spend-request';

/* Polish round 1 dead end (25 October): Brian asks for the court filing fee with a proforma, and the spending form now takes it. */
describe('a receipt or a proforma attached to a request to spend', () => {
  const world = (status = 'waiting') => {
    const row: any = { id: 'sr-1', organizationId: 'org-mu', userId: 'u-brian', status };
    return { row, prisma: { spendRequest: { findUnique: async () => row, update: async ({ data }: any) => Object.assign(row, data) } } };
  };
  const BRIAN = { userId: 'u-brian', organizationId: 'org-mu' };
  const text = (s: string, name = 'proforma.txt') => ({ buffer: Buffer.from(s), mimetype: 'text/plain', originalname: name, size: s.length });

  it('Brian attaches his proforma: its name, which it is and its words are kept, no file', async () => {
    const { row, prisma } = world();
    const r = await attachToASpendRequest(prisma, BRIAN, 'sr-1', 'quote', text('Milimani Law Courts. Filing fee KES 3,500.'));
    expect(r.says).toBe('A proforma or quote is attached to your request.');
    expect(row).toMatchObject({ attachedName: 'proforma.txt', attachedKind: 'quote', attachedText: 'Milimani Law Courts. Filing fee KES 3,500.' });
  });

  it('a photo of a receipt is kept by its name only', async () => {
    expect(await theWordsOfAnAttachment({ buffer: Buffer.from([1, 2, 3]), mimetype: 'image/jpeg', originalname: 'receipt.jpg', size: 3 })).toBeNull();
  });

  it('nobody else attaches to it, and nothing goes on a decided request', async () => {
    await expect(attachToASpendRequest(world().prisma, { userId: 'u-aisha', organizationId: 'org-mu' }, 'sr-1', 'quote', text('x'))).rejects.toThrow(ForbiddenException);
    await expect(attachToASpendRequest(world('approved').prisma, BRIAN, 'sr-1', 'quote', text('x'))).rejects.toThrow(BadRequestException);
  });

  it('the approver and finance read it in a full sentence', () => {
    expect(whatWasAttachedSaid('Brian', { attachedName: 'proforma.pdf', attachedKind: 'quote' })).toBe('Brian attached a proforma or quote, “proforma.pdf”.');
    expect(whatWasAttachedSaid('Brian', { attachedName: null })).toBeNull();
  });
});
