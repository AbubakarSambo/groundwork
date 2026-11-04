import { anInboundHarness } from './a-whatsapp-inbound-harness';
import { THE_CLOSE_ON } from '../conversation/the-close-says-what-comes-next';

/**
 * REVIEWER, 14 OCTOBER 2026. In the app "I am done", "Done for today" and "I have to go" close the check-in; on WhatsApp they
 * were answered 'Reply "finish" to close this check-in'. Their own words are their "finish" on both channels.
 */
describe('saying you are done on WhatsApp closes the check-in', () => {
  it.each(['I am done.', 'Done for today.', 'I have to go now.'])('"%s" closes it, and nothing asks them to write "finish"', async (word) => {
    const h = anInboundHarness({ open: [{ id: 'ci-kevin', status: 'IN_PROGRESS', label: 'Sales daily' }], thread: { checkInId: 'ci-kevin' } });
    h.conversation.sendMessage = jest.fn(async () => ({ reply: `Thanks, Kevin.\n\n${THE_CLOSE_ON.whatsapp}`, sessionComplete: true }));
    await h.service.handle('org-1', h.message(word), 'ours');
    /* Updated 29 October (one state for a session): the engine's close already finishes it on the server, so there is no second close. */
    expect(h.conversation.complete).not.toHaveBeenCalled();
    const said = h.said.join('\n');
    expect(said).not.toContain('Reply "finish"');
    expect(said).toContain('Thanks, Kevin.');
    expect(said).toContain('Your check-in is complete and on record.');
  });

  // Changed 26 October 2026 (Hafsah: item 3): a check-in Groundwork closes now ends on its own; the server finishes it, so the phone is told it is complete and never asked to reply "finish".
  it('an ordinary answer that ends a check-in says it is complete, and never asks for "finish"', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-kevin', status: 'IN_PROGRESS', label: 'Sales daily' }], thread: { checkInId: 'ci-kevin' } });
    h.conversation.sendMessage = jest.fn(async () => ({ reply: `Thanks.\n\n${THE_CLOSE_ON.whatsapp}`, sessionComplete: true }));
    await h.service.handle('org-1', h.message('Bahari paid for 10 units.'), 'ours');
    expect(h.conversation.complete).not.toHaveBeenCalled();
    const said = h.said.join('\n');
    expect(said).not.toContain('Reply "finish"');
    expect(said).toContain('Thanks.');
    expect(said).toContain('Your check-in is complete and on record.');
  });
});
