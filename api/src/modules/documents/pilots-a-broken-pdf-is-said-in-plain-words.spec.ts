import { BadRequestException } from '@nestjs/common';
import { DocumentsService, A_PDF_WE_CANNOT_OPEN } from './documents.service';

/**
 * PILOTS, 13 OCTOBER 2026, PROBLEM 12. A .pdf whose body was random bytes, uploaded through Ask's Choose a file, gave
 * "Something went wrong on our side" and a 500 ("Invalid PDF structure"). It is now refused in plain words, as a 400
 * the screen shows as it is.
 */
describe('a PDF that cannot be opened', () => {
  it('is refused with a plain sentence, not a server error', async () => {
    const svc = Object.create(DocumentsService.prototype) as any;
    const file = { mimetype: 'application/pdf', originalname: 'fee-note.pdf', buffer: Buffer.from('this is not a pdf at all, just some bytes \u0000\u0001\u0002') } as any;
    const err = await svc.readTheText(file).catch((e: any) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toBe(A_PDF_WE_CANNOT_OPEN);
    expect(A_PDF_WE_CANNOT_OPEN).toBe('This PDF could not be opened, so nothing in it was read and nothing was kept. It may be damaged, or it may not really be a PDF. Save it again as a PDF and add it once more.');
  });
});
