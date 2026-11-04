import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * "finish" before there was enough to close the check-in was answered with the app's wording: "A few
 * more exchanges are needed before this check-in can close - the record is still thin. Answer one or two
 * more questions, then complete." Found by driving a full check-in through the signed webhook. On
 * WhatsApp the word is "finish", and the sentence has no dash and no "record".
 */
/* Changed 3 November 2026 (Hafsah: no question limits and no forced close): there is no floor of answers, so WhatsApp no longer swaps in
   "Please answer one or two more questions". It says the server's own reason, which is only ever the empty record now. */
describe('"finish" too early, on WhatsApp', () => {
  it('says the server\'s own reason, and never asks for a count of answers', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-1', label: 'Sales team, Q4' }], thread: { checkInId: 'ci-1' } });
    h.conversation.complete.mockRejectedValue({ response: { message: 'Nothing has been said yet, so there is nothing to save. Your check-in stays open for when you come back.', canContinue: true } });
    await h.service.handle('org-1', h.message('finish'), 'ours');
    expect(h.said).toEqual(['Nothing has been said yet, so there is nothing to save. Your check-in stays open for when you come back.']);
    expect(h.said.join(' ')).not.toMatch(/one or two more questions|I need a little more from you/);
  });
  it('another refusal is still said in its own words', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-1', label: 'Sales team, Q4' }], thread: { checkInId: 'ci-1' } });
    h.conversation.complete.mockRejectedValue({ response: { message: 'This check-in has already been completed.' } });
    await h.service.handle('org-1', h.message('finish'), 'ours');
    expect(h.said).toEqual(['This check-in has already been completed.']);
  });
});
