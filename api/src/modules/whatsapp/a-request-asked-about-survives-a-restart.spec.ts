import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * A REQUEST ASKED ABOUT ON WHATSAPP SURVIVES A RESTART (decision 82, item 2).
 *
 * "Shall I treat this as a leave request?" waited for the yes or no in the memory of the copy of the
 * API that asked. After a restart, or on a second copy, the answer found nothing waiting, and the
 * person's "yes" went into the check-in as their answer. It is on the WhatsApp thread now. Each test
 * asks on one copy and answers on a fresh one, which stands in for a restart or another copy.
 */
const SALES = { id: 'ci-1', label: 'Sales team', status: 'IN_PROGRESS' as const };

describe('the yes or no reaches a copy of the API that did not ask', () => {
  it('a yes hands the request to Ask Groundwork, not to the check-in', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('I want leave on 20 October'), 'ours');
    expect(h.said).toEqual(['Shall I treat this as a leave request?']);

    await h.aFreshCopy().handle('org-1', h.message('yes'), 'ours');
    expect(h.assistant.respond).toHaveBeenCalledWith('org-1', 'person-1', 'I want leave on 20 October');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.said[1]).toBe('Ask Groundwork answered.\n\nWrite "back" to return to your check-in.');
    expect(h.thread()?.checkInId).toBe('ask:ci-1');
  });

  it('a no puts the words in the check-in, as they would have gone before', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('I need to spend 12,000 on fuel'), 'ours');
    await h.aFreshCopy().handle('org-1', h.message('no'), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenCalledWith('ci-1', 'u-1', 'I need to spend 12,000 on fuel', { door: 'whatsapp' });
    expect(h.assistant.respond).not.toHaveBeenCalled();
  });

  it('anything else is asked again by the other copy, in the same words', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('log 6 hours on Atlas'), 'ours');
    await h.aFreshCopy().handle('org-1', h.message('hmm'), 'ours');
    expect(h.said[1]).toBe('Please reply yes or no. Shall I treat this as hours?');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
  });

  it('once answered, the words are not kept on the thread', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('I want leave on 20 October'), 'ours');
    expect(h.thread()).toMatchObject({ requestKind: 'leave', requestWords: 'I want leave on 20 October' });
    await h.aFreshCopy().handle('org-1', h.message('no'), 'ours');
    expect(h.thread()).toMatchObject({ requestKind: null, requestWords: null, requestAskedAt: null });
  });
});

describe('after ten minutes, a reply behaves as it did before', () => {
  it('the request is forgotten and a "yes" is the person\'s answer in the check-in', async () => {
    const h = anInboundHarness({
      open: [SALES],
      thread: { checkInId: 'ci-1', requestKind: 'leave', requestWords: 'I want leave on 20 October', requestAskedAt: new Date(Date.now() - 11 * 60 * 1000) },
    });
    await h.aFreshCopy().handle('org-1', h.message('yes'), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenCalledWith('ci-1', 'u-1', 'yes', { door: 'whatsapp' });
    expect(h.assistant.respond).not.toHaveBeenCalled();
    expect(h.thread()).toMatchObject({ requestKind: null, requestWords: null, requestAskedAt: null });
  });

  it('nine minutes on, it is still waiting', async () => {
    const h = anInboundHarness({
      open: [SALES],
      thread: { checkInId: 'ci-1', requestKind: 'spending', requestWords: 'I need to spend 12,000 on fuel', requestAskedAt: new Date(Date.now() - 9 * 60 * 1000) },
    });
    await h.aFreshCopy().handle('org-1', h.message('yes'), 'ours');
    expect(h.assistant.respond).toHaveBeenCalledWith('org-1', 'person-1', 'I need to spend 12,000 on fuel');
  });
});

describe('an approver\'s said-back decision is already kept in the database', () => {
  it('her "yes" on another copy still goes to Ask Groundwork, where the decision is parked as a proposal', async () => {
    const h = anInboundHarness({ open: [SALES], decisionWaiting: true });
    h.assistant.respond.mockResolvedValue({ blocks: [{ type: 'text', body: "You are approving Amina's leave from Monday 5 October to Friday 9 October. Is that right?" }] });
    await h.service.handle('org-1', h.message('approve'), 'ours');
    await h.aFreshCopy().handle('org-1', h.message('yes'), 'ours');
    expect(h.assistant.respond).toHaveBeenLastCalledWith('org-1', 'person-1', 'yes');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
  });
});
