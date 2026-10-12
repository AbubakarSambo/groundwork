import { toDocShape } from './documents.service';

/**
 * NIGHT QUALITY RUN 1, PROBLEM 7. The list said whose a file was only as `mine`, so the Context tab could not list
 * Amina's WhatsApp photo and pin under her. Whose it is is now served for the reader's own files and for files shared
 * with everyone in the check-in, never for anybody else's private file.
 */
describe('a file says whose it is to the people who may read it', () => {
  const pin = { id: 'd2', fileName: 'Location pin shared at 11:30 on Monday 19 October', mimeType: 'text/plain', createdAt: new Date(), participantId: 'p-amina' };

  it("tells Esther a shared pin is Amina's", () => {
    expect((toDocShape({ ...pin, visibility: 'OPEN' }, 'p-esther') as any).participantId).toBe('p-amina');
  });

  it('tells Amina her own private file is hers', () => {
    expect((toDocShape({ ...pin, visibility: 'OWN' }, 'p-amina') as any).participantId).toBe('p-amina');
  });

  it("never names the owner of somebody else's private file", () => {
    expect((toDocShape({ ...pin, visibility: 'OWN' }, 'p-esther') as any).participantId).toBeUndefined();
    expect((toDocShape({ ...pin, visibility: 'CLOSED' }, 'p-collins') as any).participantId).toBeUndefined();
  });
});
