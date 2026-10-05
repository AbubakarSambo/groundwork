import { anInboundHarness } from './a-whatsapp-inbound-harness';
import { oneAtATime, closingSoonestFirst, theNextOne } from '../public-api/several-check-ins-open';

/**
 * MORE THAN ONE CHECK-IN OPEN ON WHATSAPP (decision 106 item 1), read as Amina reads it.
 *
 * Sales closes in two days (weekly, opened five days ago); Renewals closes in six (weekly, opened
 * yesterday). Before this, Amina writing in got a numbered list and her words went nowhere.
 */
const DAY = 86_400_000;
const SALES = { id: 'ci-sales', label: 'Sales team, Q4', status: 'NOT_STARTED' as const, createdAt: new Date(Date.now() - 5 * DAY) };
const RENEWALS = { id: 'ci-renewals', label: 'Renewals', status: 'NOT_STARTED' as const, createdAt: new Date(Date.now() - 1 * DAY) };
const PROJECT = { id: 'ci-project', label: 'Cold room', status: 'NOT_STARTED' as const, createdAt: new Date(Date.now() - 3 * DAY) };

describe('the sentences', () => {
  it('two, and three or more, in one plain sentence, the one closing soonest first', () => {
    expect(oneAtATime(closingSoonestFirst([RENEWALS, SALES].map((c) => ({ ...c, dueAt: new Date(c.createdAt.getTime() + 7 * DAY) }))))).toBe('You have two check-ins open: "Sales team, Q4" and "Renewals". Let\'s start with "Sales team, Q4".');
    expect(oneAtATime([SALES, PROJECT, RENEWALS])).toBe('You have three check-ins open: "Sales team, Q4", "Cold room" and "Renewals". Let\'s start with "Sales team, Q4".');
    expect(theNextOne(RENEWALS)).toBe('You also have "Renewals" open. Reply START when you are ready to begin it.');
  });
});

describe('Amina, with two check-ins open', () => {
  it('writes in cold: she is told both, and starts with the one closing soonest, with no list', async () => {
    const h = anInboundHarness({ open: [RENEWALS, SALES] });
    await h.service.handle('org-1', h.message('Hi'), 'ours');
    expect(h.said).toHaveLength(1);
    expect(h.said[0].startsWith('You have two check-ins open: "Sales team, Q4" and "Renewals". Let\'s start with "Sales team, Q4".\n\nSales team, Q4, session 1.')).toBe(true);
    expect(h.said[0]).not.toMatch(/Reply with the number/);
    expect(h.thread()?.checkInId).toBe('ci-sales');
    expect(h.conversation.open).toHaveBeenCalledWith('ci-sales', 'u-1');
  });

  it('replies to the Renewals opening notice: it goes straight to Renewals', async () => {
    const h = anInboundHarness({
      open: [RENEWALS, SALES],
      thread: { checkInId: 'ci-sales' },
      sends: [{ providerMessageId: 'wamid.renewals-open', checkInId: 'ci-renewals', kind: 'checkin-open:template', createdAt: new Date(Date.now() - DAY) }],
    });
    await h.service.handle('org-1', h.message('START', undefined, undefined, 'wamid.renewals-open'), 'ours');
    expect(h.thread()?.checkInId).toBe('ci-renewals');
    expect(h.said[0].startsWith('Renewals, session 1.')).toBe(true);
  });

  it('writes START with no reply context: the check-in of the last opening notice sent to her', async () => {
    const h = anInboundHarness({
      open: [RENEWALS, SALES],
      sends: [
        { checkInId: 'ci-sales', kind: 'checkin-open:template', createdAt: new Date(Date.now() - 5 * DAY) },
        { checkInId: 'ci-renewals', kind: 'checkin-open:template', createdAt: new Date(Date.now() - DAY) },
      ],
    });
    await h.service.handle('org-1', h.message('START'), 'ours');
    expect(h.thread()?.checkInId).toBe('ci-renewals');
  });

  it('once in one, she stays in it: her next message goes to it, with nothing said about the other', async () => {
    const h = anInboundHarness({ open: [{ ...RENEWALS, status: 'IN_PROGRESS' }, { ...SALES, status: 'IN_PROGRESS' }], thread: { checkInId: 'ci-renewals' } });
    await h.service.handle('org-1', h.message('The Naivas renewal is signed.'), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenCalledWith('ci-renewals', 'u-1', 'The Naivas renewal is signed.', { door: 'whatsapp' });
    expect(h.said).toEqual(['Thank you. What happens next?']);
  });

  it('finishing one offers the next, and remembers it', async () => {
    const h = anInboundHarness({ open: [{ ...SALES, status: 'IN_PROGRESS' }, RENEWALS], thread: { checkInId: 'ci-sales' } });
    await h.service.handle('org-1', h.message('finish'), 'ours');
    expect(h.said).toEqual(['Your check-in is complete and on record. Your report follows in a moment.\n\nYou also have "Renewals" open. Reply START when you are ready to begin it.']);
    expect(h.thread()?.checkInId).toBe('ci-renewals');
  });

  it('"switch" still gives the numbered list, the one place Groundwork cannot tell', async () => {
    const h = anInboundHarness({ open: [{ ...SALES, status: 'IN_PROGRESS' }, RENEWALS], thread: { checkInId: 'ci-sales' } });
    await h.service.handle('org-1', h.message('switch'), 'ours');
    expect(h.said[0]).toMatch(/^You have more than one check-in open\. Which is this for\? Reply with the number\.\n1\. Sales team, Q4/);
  });
});
