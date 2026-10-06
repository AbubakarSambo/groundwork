import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * AN ANSWER TO A QUESTION ABOUT YOUR OWN REQUEST, SENT ON WHATSAPP DURING A CHECK-IN (decision 85,
 * build step 7).
 *
 * Wairimu, who decides Aisha's leave, asked her "Who will cover the Project X milestone?". Aisha has a
 * check-in open on WhatsApp. Her reply "Brian will cover it" used to go into the check-in as an answer
 * there. Now she is asked once, "Is this your answer to Wairimu's question about your leave?", and the
 * reply is held on her WhatsApp thread (as a request waiting for a yes or no already is) until she says.
 */
const SALES = { id: 'ci-1', label: 'Sales team', status: 'IN_PROGRESS' as const };
const Q = { id: 'q-1', suite: 'leave' as const, ref: 'r-aisha', askedBy: 'Wairimu', about: 'your leave' };
const ANSWER = 'Brian will cover it, and I will brief him on Friday.';

describe('Aisha, with a check-in open and a question from Wairimu waiting', () => {
  it('is asked once whether her reply is her answer, and nothing goes into the check-in yet', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' }, questionWaiting: Q });
    await h.service.handle('org-1', h.message(ANSWER), 'ours');
    expect(h.said).toEqual(["Is this your answer to Wairimu's question about your leave?"]);
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.thread()).toMatchObject({ requestKind: 'answer', requestWords: ANSWER, questionAskedAbout: 'q-1' });
  });

  it('her yes sends her words as the answer, and she stays in her check-in', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' }, questionWaiting: Q });
    await h.service.handle('org-1', h.message(ANSWER), 'ours');
    await h.aFreshCopy().handle('org-1', h.message('yes'), 'ours');
    expect(h.assistant.answerAQuestionOnWhatsApp).toHaveBeenCalledWith('org-1', 'person-1', 'q-1', ANSWER);
    expect(h.said[1]).toBe('I have sent your answer to Wairimu. Your leave request is still waiting for Wairimu to decide. Your check-in is still open, so carry on with it whenever you are ready.');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.thread()?.checkInId).toBe('ci-1');
    expect(h.thread()).toMatchObject({ requestKind: null, requestWords: null });
  });

  it('her no puts her words in the check-in, as they would have gone before', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' }, questionWaiting: Q });
    await h.service.handle('org-1', h.message(ANSWER), 'ours');
    await h.service.handle('org-1', h.message('no'), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenCalledWith('ci-1', 'u-1', ANSWER, { door: 'whatsapp' });
    expect(h.assistant.answerAQuestionOnWhatsApp).not.toHaveBeenCalled();
  });

  it('after a no, the same question is not asked about again: her next reply goes into the check-in', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' }, questionWaiting: Q });
    await h.service.handle('org-1', h.message(ANSWER), 'ours');
    await h.service.handle('org-1', h.message('no'), 'ours');
    await h.service.handle('org-1', h.message('We closed two shops this week.'), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenLastCalledWith('ci-1', 'u-1', 'We closed two shops this week.', { door: 'whatsapp' });
    expect(h.said.filter((s) => s.startsWith('Is this your answer'))).toHaveLength(1);
  });

  it('anything but yes or no asks again, in the same words', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' }, questionWaiting: Q });
    await h.service.handle('org-1', h.message(ANSWER), 'ours');
    await h.service.handle('org-1', h.message('hmm'), 'ours');
    expect(h.said[1]).toBe("Please reply yes or no. Is this your answer to Wairimu's question about your leave?");
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
  });

  it('a greeting, "finish" or a new request is never taken for an answer', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' }, questionWaiting: Q });
    await h.service.handle('org-1', h.message('hi'), 'ours');
    expect(h.said.some((s) => s.startsWith('Is this your answer'))).toBe(false);
    await h.service.handle('org-1', h.message('I want leave on 20 October'), 'ours');
    expect(h.said[h.said.length - 1]).toBe('Shall I treat this as a leave request?');
  });
});

describe('with no question waiting, nothing changes', () => {
  it('her reply is her answer in the check-in, as before', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message(ANSWER), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenCalledWith('ci-1', 'u-1', ANSWER, { door: 'whatsapp' });
    expect(h.said.some((s) => s.startsWith('Is this your answer'))).toBe(false);
  });
});

describe('with no check-in open, the question is answered in Ask Groundwork as before', () => {
  it('her reply goes to Ask Groundwork, which says it back as her answer, and nothing asks here', async () => {
    const h = anInboundHarness({ open: [], questionWaiting: Q });
    await h.service.handle('org-1', h.message(ANSWER), 'ours');
    expect(h.assistant.respond).toHaveBeenCalledWith('org-1', 'person-1', ANSWER);
    expect(h.said.some((s) => s.startsWith('Is this your answer'))).toBe(false);
  });
});
