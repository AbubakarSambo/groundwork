import { isHeldByTheAddOn } from './whatsapp-for-an-organisation.service';
import { WHATSAPP_NOT_TURNED_ON, WHATSAPP_NOT_ON_A_PAID_PLAN } from '../billing/whatsapp-add-on.service';

/** B-119: after an auto-close the report was tried on WhatsApp twice for an organisation with WhatsApp off, and logged an ERROR each time. */
describe('a message the add-on holds back', () => {
  it('is known as held, so it is not retried or logged as a failure', () => {
    expect(isHeldByTheAddOn(WHATSAPP_NOT_TURNED_ON)).toBe(true);
    expect(isHeldByTheAddOn(WHATSAPP_NOT_ON_A_PAID_PLAN)).toBe(true);
    expect(isHeldByTheAddOn('Meta refused the message')).toBe(false);
    expect(isHeldByTheAddOn(undefined)).toBe(false);
  });
});

import { BadRequestException } from '@nestjs/common';
import { aFileProblemInWords, THAT_FILE_COULD_NOT_BE_READ } from './whatsapp-for-an-organisation.service';

/** B-104: a file that could not be read got the whole reply 'Invalid PDF structure.' */
describe('a file that could not be read', () => {
  it('is told in a sentence of ours', () => {
    expect(aFileProblemInWords(new Error('Invalid PDF structure.'))).toBe(THAT_FILE_COULD_NOT_BE_READ);
    expect(aFileProblemInWords(new BadRequestException('Invalid PDF structure.'))).toBe(THAT_FILE_COULD_NOT_BE_READ);
    expect(aFileProblemInWords(undefined)).toBe(THAT_FILE_COULD_NOT_BE_READ);
  });
  it('keeps one of our own plain refusals', () => {
    expect(aFileProblemInWords(new BadRequestException('That file is too large. Send one under 20 MB.'))).toBe('That file is too large. Send one under 20 MB.');
  });
});
