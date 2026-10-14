import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * REVIEWER, 14 OCTOBER 2026. Mercy accepted in the app, where her first question was written; her first "Hi" on WhatsApp was
 * taken as the answer to it ("Understood. For those deals..."). The question waiting is sent first.
 */
describe('a greeting on WhatsApp is never the answer to a question they have not seen', () => {
  it('"Hi" gets the first question, and nothing is handed in', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-mercy', status: 'IN_PROGRESS', label: 'Sales daily' }], thread: { checkInId: 'ci-mercy' } });
    h.conversation.getTranscript = jest.fn(async () => ({ turns: [{ role: 'AI', content: 'What moved on Greenfield since yesterday?' }] }));
    await h.service.handle('org-1', h.message('Hi'), 'ours');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.said.join('\n')).toContain('What moved on Greenfield since yesterday?');
  });

  it('a real answer is still an answer', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-mercy', status: 'IN_PROGRESS', label: 'Sales daily' }], thread: { checkInId: 'ci-mercy' } });
    h.conversation.getTranscript = jest.fn(async () => ({ turns: [{ role: 'AI', content: 'What moved on Greenfield since yesterday?' }] }));
    await h.service.handle('org-1', h.message('Greenfield signed the order.'), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenCalled();
  });
});
