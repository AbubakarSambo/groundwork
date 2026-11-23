import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * THAT A CHECK-IN IS STILL OPEN IS SAID ONCE, NOT ON EVERY REPLY (Hafsah's own WhatsApp, 23 November 2026).
 *
 * She set up a check-in by talking to Ask while "New project" was open and not started. Every one of Ask's five replies ended with "Your
 * check-in for New project is still open. Reply START when you are ready." Now it is said with the first of Ask's replies that day, and
 * not again, read as she reads it on her phone.
 */
const NEW_PROJECT = { id: 'ci-new', label: 'New project', status: 'NOT_STARTED' as const };

describe('Hafsah talks to Ask on WhatsApp while a check-in is open', () => {
  it('is told once that it is still open, and Ask answers every message', async () => {
    const h = anInboundHarness({ open: [NEW_PROJECT], sends: [{ checkInId: 'ci-new', kind: 'checkin-open:template', createdAt: new Date(Date.now() - 3_600_000) }] });
    h.assistant.whoIsItFor = jest.fn(async () => 'ask');
    const said = ['I want updates from Abubakar on specifics on the Ai project', 'I said Abubakar', 'He is under my team', 'This is a fucking mess', 'Can I setup a checkin from here'];
    for (const m of said) await h.service.handle('org-1', h.message(m), 'ours');
    expect(h.assistant.respond).toHaveBeenCalledTimes(5);
    expect(h.said).toEqual([
      'Ask Groundwork answered.\n\nYour check-in for New project is still open. Reply START when you are ready.',
      'Ask Groundwork answered.',
      'Ask Groundwork answered.',
      'Ask Groundwork answered.',
      'Ask Groundwork answered.',
    ]);
    expect(h.conversation.open).not.toHaveBeenCalled();
  });

  it('a check-in already begun is said the same way once: reply here to carry on', async () => {
    const h = anInboundHarness({ open: [{ ...NEW_PROJECT, status: 'IN_PROGRESS' }], sends: [{ checkInId: 'ci-new', kind: 'reply', createdAt: new Date(Date.now() - 60_000) }] });
    h.assistant.whoIsItFor = jest.fn(async () => 'ask');
    await h.service.handle('org-1', h.message('what can you do'), 'ours');
    await h.service.handle('org-1', h.message('who is off this week'), 'ours');
    expect(h.said).toEqual(['Ask Groundwork answered.\n\nYour check-in for New project is still open. Reply here to carry on with it.', 'Ask Groundwork answered.']);
  });
});
