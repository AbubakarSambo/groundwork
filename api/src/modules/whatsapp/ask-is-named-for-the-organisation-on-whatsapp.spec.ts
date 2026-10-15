import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * ASK IS NAMED FOR THE ORGANISATION ON WHATSAPP (decision 100, 5 October).
 *
 * A person at Coamana reads "Ask Coamana" in every message the engine writes about Ask. A number with
 * no organisation name yet reads "Ask Groundwork". The words the person writes to reach it are
 * "ask", "Ask Groundwork" or the organisation's own name for it.
 */
const SALES = { id: 'ci-1', label: 'Sales team', status: 'IN_PROGRESS' as const };

describe('on WhatsApp, a person at Coamana reads Ask Coamana', () => {
  it('"ask" moves them to Ask Coamana and says how to come back', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' }, organisationName: 'Coamana' });
    await h.service.handle('org-1', h.message('ask'), 'ours');
    expect(h.said).toEqual(['You are now talking to Ask Coamana. Ask me anything about the company, your work or your check-ins. Write "back" to return to your check-in.']);
  });

  it('"Ask Coamana" works as the word to reach it', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' }, organisationName: 'Coamana' });
    await h.service.handle('org-1', h.message('Ask Coamana'), 'ours');
    expect(h.thread()?.checkInId).toBe('ask:ci-1');
  });

  it('"switch" with one check-in open names it', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' }, organisationName: 'Coamana' });
    await h.service.handle('org-1', h.message('switch'), 'ours');
    expect(h.said).toEqual(['You have one check-in open, "Sales team". Carry on here, or write "ask" to talk to Ask Coamana.']);
  });

  it('"back" with nothing open says Ask Coamana is still there', async () => {
    const h = anInboundHarness({ open: [], organisationName: 'Coamana' });
    await h.service.handle('org-1', h.message('back'), 'ours');
    expect(h.said).toEqual(['You have no check-in open right now, so there is nothing to go back to. Ask Coamana is still here.']);
  });
});

describe('with no organisation name yet, the person reads Ask Groundwork', () => {
  it('"ask" moves them to Ask Groundwork', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ci-1' } });
    await h.service.handle('org-1', h.message('ask'), 'ours');
    expect(h.said).toEqual(['You are now talking to Ask Groundwork. Ask me anything about the company, your work or your check-ins. Write "back" to return to your check-in.']);
  });
});
