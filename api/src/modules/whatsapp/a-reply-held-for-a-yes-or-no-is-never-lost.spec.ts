import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * A REPLY HELD FOR A YES OR A NO IS NEVER LOST.
 *
 * During a check-in on WhatsApp, Groundwork holds a person's words while it asks "Shall I treat this as
 * a leave request?" or "Is this your answer to Wairimu's question about your leave?". When the person
 * said neither yes nor no within ten minutes, the words were wiped by the next message anybody sent,
 * and they went nowhere. Now, at the person's next message after the ten minutes, the words go where
 * they would have gone without the question, which is the check-in they were held from, as a "no"
 * puts them. Each test holds on one copy of the API and answers on a fresh one after the ten minutes.
 */
const SALES = { id: 'ci-1', label: 'Sales team', status: 'IN_PROGRESS' as const };
const Q = { id: 'q-1', suite: 'leave' as const, ref: 'r-aisha', askedBy: 'Wairimu', about: 'your leave' };
const ELEVEN_MINUTES_AGO = () => new Date(Date.now() - 11 * 60 * 1000);

describe('Aisha did not answer "Shall I treat this as a leave request?" within ten minutes', () => {
  it('her words go into the check-in at her next message, then the new message is handled as always', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('I want leave on 20 October'), 'ours');
    expect(h.said).toEqual(['Shall I treat this as a leave request?']);
    h.thread()!.requestAskedAt = ELEVEN_MINUTES_AGO();

    await h.aFreshCopy().handle('org-1', h.message('Sales were slow this week because of the rain.'), 'ours');
    expect(h.conversation.sendMessage.mock.calls).toEqual([
      ['ci-1', 'u-1', 'I want leave on 20 October', { door: 'whatsapp' }],
      ['ci-1', 'u-1', 'Sales were slow this week because of the rain.', { door: 'whatsapp' }],
    ]);
    expect(h.said.slice(1)).toEqual([
      'You did not answer my question within ten minutes, so I have added what you wrote earlier to your check-in: "I want leave on 20 October"\n\nThank you. What happens next?',
      'Thank you. What happens next?',
    ]);
    expect(h.assistant.respond).not.toHaveBeenCalled();
    expect(h.thread()).toMatchObject({ requestKind: null, requestWords: null, requestAskedAt: null });
  });

  it('a late "yes" still goes into the check-in as before, after her held words', async () => {
    const h = anInboundHarness({
      open: [SALES],
      thread: { checkInId: 'ci-1', requestKind: 'leave', requestWords: 'I want leave on 20 October', requestAskedAt: ELEVEN_MINUTES_AGO() },
    });
    await h.aFreshCopy().handle('org-1', h.message('yes'), 'ours');
    expect(h.conversation.sendMessage.mock.calls.map((c: any[]) => c[2])).toEqual(['I want leave on 20 October', 'yes']);
  });

  it('her words are put in only once', async () => {
    const h = anInboundHarness({
      open: [SALES],
      thread: { checkInId: 'ci-1', requestKind: 'hours', requestWords: 'log 6 hours on Atlas', requestAskedAt: ELEVEN_MINUTES_AGO() },
    });
    await h.aFreshCopy().handle('org-1', h.message('The Atlas visit went well.'), 'ours');
    await h.aFreshCopy().handle('org-1', h.message('They want a second order.'), 'ours');
    expect(h.conversation.sendMessage.mock.calls.map((c: any[]) => c[2])).toEqual(['log 6 hours on Atlas', 'The Atlas visit went well.', 'They want a second order.']);
  });

  it('nine minutes on, nothing goes into the check-in yet', async () => {
    const h = anInboundHarness({
      open: [SALES],
      thread: { checkInId: 'ci-1', requestKind: 'leave', requestWords: 'I want leave on 20 October', requestAskedAt: new Date(Date.now() - 9 * 60 * 1000) },
    });
    await h.aFreshCopy().handle('org-1', h.message('hmm'), 'ours');
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
    expect(h.said).toEqual(['Please reply yes or no. Shall I treat this as a leave request?']);
  });
});

describe('Aisha did not answer "Is this your answer to Wairimu\'s question about your leave?" within ten minutes', () => {
  it('her words go into the check-in, as her "no" would have put them, and she is not asked again', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' }, questionWaiting: Q });
    await h.service.handle('org-1', h.message('Brian will cover it.'), 'ours');
    expect(h.said).toEqual(["Is this your answer to Wairimu's question about your leave?"]);
    h.thread()!.requestAskedAt = ELEVEN_MINUTES_AGO();

    await h.aFreshCopy().handle('org-1', h.message('We closed two new shops.'), 'ours');
    expect(h.conversation.sendMessage.mock.calls.map((c: any[]) => c[2])).toEqual(['Brian will cover it.', 'We closed two new shops.']);
    expect(h.said[1]).toBe('You did not answer my question within ten minutes, so I have added what you wrote earlier to your check-in: "Brian will cover it."\n\nThank you. What happens next?');
    expect(h.assistant.answerAQuestionOnWhatsApp).not.toHaveBeenCalled();
    expect(h.thread()?.questionAskedAbout).toBe('q-1');
  });
});

describe('the check-in the words were held from has closed since', () => {
  it('Aisha is given her words back, with where she can send them', async () => {
    const h = anInboundHarness({
      open: [],
      thread: { checkInId: 'ci-1', requestKind: 'leave', requestWords: 'I want leave on 20 October', requestAskedAt: ELEVEN_MINUTES_AGO() },
    });
    await h.aFreshCopy().handle('org-1', h.message('hello'), 'ours');
    expect(h.said[0]).toBe('What you wrote earlier was not added to a check-in, because that check-in is no longer open. You wrote: "I want leave on 20 October". You can send it again in your next check-in, or write "ask" to send it to Ask Groundwork.');
    expect(h.thread()).toMatchObject({ requestKind: null, requestWords: null });
  });
});
