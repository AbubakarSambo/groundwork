import { anInboundHarness } from './a-whatsapp-inbound-harness';
import { theNextOne } from '../public-api/several-check-ins-open';

/**
 * MORE THAN ONE CHECK-IN OPEN ON WHATSAPP, read as Amina reads it. A REPLY BELONGS TO WHAT IT ANSWERS (Hafsah, 29 October 2026): the
 * message she replied to, or else the last thing Groundwork sent her about an open check-in. Only when nothing ties it to one is she
 * asked which. Updated on 29 October from the old rules (the one closing soonest first, a remembered thread, the newest opening only for
 * START): Brian was sent "Litigation team daily is open", replied START, and was put in Fee notes by rules that never read what he answered.
 */
const DAY = 86_400_000;
const SALES = { id: 'ci-sales', label: 'Sales team, Q4', status: 'NOT_STARTED' as const, createdAt: new Date(Date.now() - 5 * DAY) };
const RENEWALS = { id: 'ci-renewals', label: 'Renewals', status: 'NOT_STARTED' as const, createdAt: new Date(Date.now() - 1 * DAY) };

describe('the sentence after one finishes', () => {
  it('names the other one open, and how to begin it', () => {
    expect(theNextOne(RENEWALS)).toBe('You also have "Renewals" open. Reply START when you are ready to begin it.');
  });
});

describe('Amina, with two check-ins open', () => {
  it('writes in cold, with nothing sent about either: she is asked which one', async () => {
    const h = anInboundHarness({ open: [RENEWALS, SALES] });
    await h.service.handle('org-1', h.message('Hi'), 'ours');
    expect(h.said[0]).toMatch(/^You have more than one check-in open\. Which is this for\?/);
    expect(h.conversation.open).not.toHaveBeenCalled();
  });

  it('replies to the Renewals opening notice: it goes straight to Renewals', async () => {
    const h = anInboundHarness({
      open: [RENEWALS, SALES],
      sends: [
        { providerMessageId: 'wamid.renewals-open', checkInId: 'ci-renewals', kind: 'checkin-open:template', createdAt: new Date(Date.now() - DAY) },
        { checkInId: 'ci-sales', kind: 'reply', createdAt: new Date(Date.now() - 60_000) },
      ],
    });
    await h.service.handle('org-1', h.message('START', undefined, undefined, 'wamid.renewals-open'), 'ours');
    expect(h.said[0].startsWith('Renewals, session 1.')).toBe(true);
  });

  it('writes START with no reply context: the check-in of the last message sent to her', async () => {
    const h = anInboundHarness({
      open: [RENEWALS, SALES],
      sends: [
        { checkInId: 'ci-sales', kind: 'checkin-open:template', createdAt: new Date(Date.now() - 5 * DAY) },
        { checkInId: 'ci-renewals', kind: 'checkin-open:template', createdAt: new Date(Date.now() - DAY) },
      ],
    });
    await h.service.handle('org-1', h.message('START'), 'ours');
    expect(h.conversation.open).toHaveBeenCalledWith('ci-renewals', 'u-1');
  });

  it('answering a question of Renewals: her answer goes to Renewals, and the reply is sent as about Renewals', async () => {
    const h = anInboundHarness({
      open: [{ ...RENEWALS, status: 'IN_PROGRESS' }, { ...SALES, status: 'IN_PROGRESS' }],
      sends: [
        { checkInId: 'ci-sales', kind: 'checkin-open:template', createdAt: new Date(Date.now() - DAY) },
        { checkInId: 'ci-renewals', kind: 'reply', createdAt: new Date(Date.now() - 60_000) },
      ],
    });
    await h.service.handle('org-1', h.message('The Naivas renewal is signed.'), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenCalledWith('ci-renewals', 'u-1', 'The Naivas renewal is signed.', { door: 'whatsapp' });
    expect(h.said).toEqual(['Thank you. What happens next?']);
    expect(h.sent[h.sent.length - 1].context).toMatchObject({ checkInId: 'ci-renewals' });
  });

  it('finishing one offers the next, and the offer is about the next, so START answers it', async () => {
    const h = anInboundHarness({ open: [{ ...SALES, status: 'IN_PROGRESS' }, RENEWALS], sends: [{ checkInId: 'ci-sales', kind: 'reply', createdAt: new Date(Date.now() - 60_000) }] });
    await h.service.handle('org-1', h.message('finish'), 'ours');
    expect(h.said).toEqual(['Your check-in is complete and on record.\n\nYou also have "Renewals" open. Reply START when you are ready to begin it.']);
    expect(h.sent[h.sent.length - 1].context).toMatchObject({ checkInId: 'ci-renewals' });
    await h.service.handle('org-1', h.message('START'), 'ours');
    expect(h.conversation.open).toHaveBeenCalledWith('ci-renewals', 'u-1');
  });

  it('"switch" still gives the numbered list', async () => {
    const h = anInboundHarness({ open: [{ ...SALES, status: 'IN_PROGRESS' }, RENEWALS], sends: [{ checkInId: 'ci-sales', kind: 'reply', createdAt: new Date(Date.now() - 60_000) }] });
    await h.service.handle('org-1', h.message('switch'), 'ours');
    expect(h.said[0]).toMatch(/^You have more than one check-in open\. Which is this for\? Reply with the number\.\n1\. Sales team, Q4/);
  });
});
