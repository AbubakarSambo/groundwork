import { anInboundHarness } from './a-whatsapp-inbound-harness';

/* A WORKING DAY, WHATEVER DAY THE TESTS RUN (CI after batch 1, 7 November 2026). The morning sweep skips a day the team does not work
   (isAWorkingDay), so on a Saturday or a Sunday it rightly sent nothing and these failed. Only the date is fixed: Wednesday 4 November,
   21:30 UTC, when CI last ran them; timers stay real. */
const ALL_BUT_THE_DATE = ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] as const;
beforeAll(() => { jest.useFakeTimers({ now: new Date('2026-11-04T21:30:00Z'), doNotFake: [...ALL_BUT_THE_DATE] }); });
afterAll(() => { jest.useRealTimers(); });


/**
 * A PHOTO SENT ON WHATSAPP HAS NO NAME, so it was stored under one made from WhatsApp's message number
 * and the person was told "image-wamid.HBgM....png is on your check-in". Found by driving the journeys
 * through the signed webhook. They read "Your photo" now; a document keeps the name its sender gave it.
 * And the sentence about who can see it no longer says "your own account".
 */
const OPEN = { id: 'ci-1', label: 'Sales team, Q4', status: 'IN_PROGRESS' as const };

function aPersonSending(media: any, uploaded: any = {}) {
  const h = anInboundHarness({ open: [OPEN], thread: { checkInId: 'ci-1' } });
  h.whatsapp.fetchMediaOn.mockResolvedValue({ buffer: Buffer.from('x'), mimeType: media.mime_type });
  (h.service as any).documents = { upload: jest.fn(async () => ({ whoCanSeeIt: 'Only you can see this, and nobody else can open it.', ...uploaded })) };
  const type = media.type;
  const body = { entry: [{ changes: [{ value: { messages: [{ id: 'wamid.HBgMMjU0NzAwMDAwMDAxFQIAEhgg', from: '2348012345678', type, [type]: media }] } }] }] };
  return { h, body, upload: (h.service as any).documents.upload };
}

describe('what a person reads when they send a file', () => {
  it('a photo is "Your photo", with their note, never a name made from a message number', async () => {
    const { h, body } = aPersonSending({ type: 'image', id: 'm-1', mime_type: 'image/png', caption: 'The signed order from Green Mart' });
    await h.service.handle('org-1', body, 'ours');
    /* The fact alone since 4 November 2026 (Hafsah: no privacy notes and no explainer lines; batch 1, group 10, 301ec880c). */
    expect(h.said).toEqual(['Your photo is on your check-in, with your note "The signed order from Green Mart".']);
    expect(h.said[0]).not.toMatch(/wamid|image-/);
  });

  it('a document keeps the name its sender gave it', async () => {
    const { h, body } = aPersonSending({ type: 'document', id: 'm-2', mime_type: 'text/plain', filename: 'renewals-notes.txt' });
    await h.service.handle('org-1', body, 'ours');
    expect(h.said).toEqual(['"renewals-notes.txt" is on your check-in.']);
  });

  it('a photo is still stored under a name, so it can be opened later', async () => {
    const { h, body, upload } = aPersonSending({ type: 'image', id: 'm-1', mime_type: 'image/png' });
    await h.service.handle('org-1', body, 'ours');
    expect(upload.mock.calls[0][2].originalname).toMatch(/^image-.*\.png$/);
  });
});
