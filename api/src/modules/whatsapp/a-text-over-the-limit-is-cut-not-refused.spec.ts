import { withinWhatsAppsLimit } from './whatsapp.service';

/** B-144: WhatsApp refuses a text over 4,096 characters, so a long answer never arrived. */
describe('a long text', () => {
  it('is cut at a sentence under the limit and says where the rest is', () => {
    const long = Array.from({ length: 400 }, (_, i) => `Person ${i} has a request waiting.`).join(' ');
    const out = withinWhatsAppsLimit(long);
    expect(out.length).toBeLessThanOrEqual(4096);
    expect(out.endsWith('waiting. The rest is in Groundwork.')).toBe(true);
  });
  it('leaves a short text exactly as it was', () => {
    expect(withinWhatsAppsLimit('Hello.')).toBe('Hello.');
  });
});
