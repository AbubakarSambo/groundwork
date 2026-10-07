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
