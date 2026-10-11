import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * B-105: Zawadi's answer was sent twice a second apart, under two message ids. The transcript kept it once
 * and the reply to it was sent to her twice, word for word, in the same second. The same words from the
 * same number a moment apart are one answer, and get one reply.
 */
function aPerson() {
  const h = anInboundHarness({ open: [{ id: 'ci-1', label: 'Sales team, Q4', status: 'IN_PROGRESS' }], thread: { checkInId: 'ci-1' } });
  const claimed = new Set<string>();
  h.prisma.whatsAppInboundMessage.create.mockImplementation(async ({ data }: any) => {
    const k = `${data.organizationId}:${data.messageId}`;
    if (claimed.has(k)) throw Object.assign(new Error('unique'), { code: 'P2002' });
    claimed.add(k);
    return {};
  });
  h.prisma.whatsAppInboundMessage.findFirst.mockImplementation(async ({ where }: any) => (claimed.has(`${where.organizationId}:${where.messageId}`) ? { messageId: where.messageId } : null));
  return h;
}

describe('the same words twice in a moment', () => {
  it('under two message ids are answered once', async () => {
    const h = aPerson();
    await h.service.handle('org-1', h.message('I sent the update on Friday.', '2348012345678', 'wamid.one'), 'ours');
    await h.service.handle('org-1', h.message('I sent the update on Friday.', '2348012345678', 'wamid.two'), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenCalledTimes(1);
    expect(h.said).toHaveLength(1);
  });

  it('are not mistaken for other words, or for another person', async () => {
    const h = aPerson();
    await h.service.handle('org-1', h.message('I sent the update on Friday.', '2348012345678', 'wamid.one'), 'ours');
    await h.service.handle('org-1', h.message('And the price list on Monday.', '2348012345678', 'wamid.two'), 'ours');
    await h.service.handle('org-1', h.message('I sent the update on Friday.', '2348099999999', 'wamid.three'), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenCalledTimes(3);
  });

  it('are an answer again a little later', async () => {
    const h = aPerson();
    const real = Date.now;
    try {
      await h.service.handle('org-1', h.message('yes', '2348012345678', 'wamid.one'), 'ours');
      Date.now = () => real() + 20_000;
      await h.service.handle('org-1', h.message('yes', '2348012345678', 'wamid.two'), 'ours');
    } finally { Date.now = real; }
    expect(h.conversation.sendMessage).toHaveBeenCalledTimes(2);
  });
});
