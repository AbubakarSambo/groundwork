import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * PILOTS ON WHATSAPP, 14 OCTOBER: Amani started his check-in in the app, then wrote "Hi" on WhatsApp. With no WhatsApp thread
 * yet, the open session is the one that carries on: "Hi" gets the question waiting in it, and his next message is handed in
 * to that same session. (Checked live on the test bed with the signed webhook: Amani's turns landed on the app's session.)
 */
describe('a session started in the app carries on in WhatsApp', () => {
  it('"Hi" with no thread yet gets the waiting question from the app session, and the answer goes to that session', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-amani', status: 'IN_PROGRESS', label: 'Sales team, Q4' }] });
    h.conversation.getTranscript = jest.fn(async () => ({ turns: [{ role: 'AI', content: 'Is the decision from the other team still holding you up?' }] }));
    await h.service.handle('org-1', h.message('Hi'), 'ours');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.said.join('\n')).toContain('Is the decision from the other team still holding you up?');

    await h.service.handle('org-1', h.message('The price list came on Tuesday, so I signed Duka Bora.'), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenCalledWith('ci-amani', expect.anything(), 'The price list came on Tuesday, so I signed Duka Bora.', expect.anything());
  });
});
