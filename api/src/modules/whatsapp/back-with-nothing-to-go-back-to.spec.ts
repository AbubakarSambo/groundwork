import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * A person with no check-in open who wrote "back" was handed to Ask Groundwork, which answered "I cannot
 * answer that one yet. Here is what I can do with "back"." followed by a list. Found by driving the
 * journeys through the signed webhook. They are told there is nothing to go back to.
 */
describe('"back" with no check-in open', () => {
  it('says there is nothing to go back to, and does not ask the assistant', async () => {
    const h = anInboundHarness({ open: [] });
    await h.service.handle('org-1', h.message('back'), 'ours');
    expect(h.said).toEqual(['You have no check-in open right now, so there is nothing to go back to. Ask Groundwork is still here.']);
    expect(h.assistant.respond).not.toHaveBeenCalled();
  });
  it('a real question still goes to Ask Groundwork', async () => {
    const h = anInboundHarness({ open: [] });
    await h.service.handle('org-1', h.message('What is on my list?'), 'ours');
    expect(h.assistant.respond).toHaveBeenCalled();
  });
});
