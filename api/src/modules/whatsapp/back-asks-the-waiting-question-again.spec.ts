import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * B-146: after "ask" and then "back", Neema was told "You are back in your check-in. Sales team, Q4,
 * session 2. Carry on where you left off." without being asked again the question she was in the
 * middle of. The question that was waiting is asked again.
 */
const SALES = { id: 'ci-1', label: 'Sales team, Q4', status: 'IN_PROGRESS' as const, sessionNumber: 2 };

describe('"back" in a check-in that was begun', () => {
  it('asks the question that was waiting', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ask:ci-1' } });
    h.conversation.getTranscript = jest.fn(async () => ({ turns: [{ role: 'PERSON', content: 'The update went on Friday.' }, { role: 'AI', content: 'Has that decision come through?' }] }));
    await h.service.handle('org-1', h.message('back'), 'ours');
    expect(h.said).toEqual(['You are back in your check-in. Sales team, Q4, session 2. Carry on where you left off.\n\nHas that decision come through?']);
    expect(h.conversation.getTranscript).toHaveBeenCalledWith('ci-1', 'u-1');
  });

  it('says only the old sentence when her own words were the last, or nothing can be read', async () => {
    const h = anInboundHarness({ open: [SALES], thread: { checkInId: 'ask:ci-1' } });
    h.conversation.getTranscript = jest.fn(async () => ({ turns: [{ role: 'AI', content: 'Has that decision come through?' }, { role: 'PERSON', content: 'Yes.' }] }));
    await h.service.handle('org-1', h.message('back'), 'ours');
    expect(h.said).toEqual(['You are back in your check-in. Sales team, Q4, session 2. Carry on where you left off.']);
    const g = anInboundHarness({ open: [SALES], thread: { checkInId: 'ask:ci-1' } });
    g.conversation.getTranscript = jest.fn(async () => { throw new Error('no'); });
    await g.service.handle('org-1', g.message('back'), 'ours');
    expect(g.said).toEqual(['You are back in your check-in. Sales team, Q4, session 2. Carry on where you left off.']);
  });
});
