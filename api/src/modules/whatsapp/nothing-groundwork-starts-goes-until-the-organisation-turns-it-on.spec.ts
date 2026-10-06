import { WhatsAppService } from './whatsapp.service';
import { NOT_TURNED_ON_QUIETLY } from './a-message-outside-the-window';
import { theCheckInIsOpen, aRequestIsWaiting, aReviewWasStarted } from './what-goes-to-a-phone';

/**
 * AN ORGANISATION THAT NEVER TURNED WHATSAPP ON IS NOT WRITTEN TO FIRST (decisions 78 and 88).
 *
 * The morning reminders, the reminder before a session and the lead's summary asked first; the
 * opening notice, the approvals, the questions and the reviews did not, and while the paid-add-on switch
 * is off the add-on gate lets everything go. Driving the journeys through the signed webhook, Otto and
 * Nia at Plain Goods, which never turned WhatsApp on, were each told "your check-in ... is open".
 */
const MIRIAM = { firstName: 'Miriam', label: 'the sales team' };

function aSender(opts: { addOn: boolean; own?: boolean }) {
  const rows: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    organization: { findUnique: jest.fn(async () => ({ whatsappAddOnOn: opts.addOn })) },
    whatsAppConnection: { findUnique: jest.fn(async () => (opts.own ? { enabled: true, phoneNumberId: '222', accessToken: 't', approvedTemplates: [], id: 'c-1' } : null)), update: jest.fn(async () => ({})) },
    person: { findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: new Date() })), findMany: jest.fn(async () => []) },
    user: { findMany: jest.fn(async () => []) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
    whatsAppSend: { create: jest.fn(async (q: any) => { rows.push(q.data); return {}; }), findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    notification: { create: jest.fn(async () => ({})) },
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111', 'whatsapp.approvedTemplates': [] } as any)[k] };
  return { wa: new WhatsAppService(config, prisma), rows };
}

describe('what Groundwork starts, for an organisation that has not turned WhatsApp on', () => {
  const realFetch = (global as any).fetch;
  let fetchSpy: jest.Mock;
  beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200 })); (global as any).fetch = fetchSpy; });
  afterEach(() => { (global as any).fetch = realFetch; });
  const opening = theCheckInIsOpen(MIRIAM);

  it('the opening notice is not sent, and nothing is written down', async () => {
    const { wa, rows } = aSender({ addOn: false });
    expect(await wa.sendFor('org-1', '+254712345678', opening.text, { checkInId: 'ci-1', kind: opening.kind, params: opening.params })).toEqual({ sent: false, error: NOT_TURNED_ON_QUIETLY });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(rows).toEqual([]);
  });
  it('nor is an approval waiting, or a review started', async () => {
    const { wa } = aSender({ addOn: false });
    const w = aRequestIsWaiting('Wairimu', 'Amani', 'leave from Tuesday 20 October to Thursday 22 October');
    expect((await wa.sendFor('org-1', '+254712345678', w.text, { kind: w.kind, params: w.params })).sent).toBe(false);
    const r = aReviewWasStarted('Amani', 'Wairimu');
    expect((await wa.sendFor('org-1', '+254712345678', r.text, { kind: r.kind, params: r.params })).sent).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('once the organisation has turned it on, the opening notice goes', async () => {
    const { wa } = aSender({ addOn: true });
    expect((await wa.sendFor('org-1', '+254712345678', opening.text, { checkInId: 'ci-1', kind: opening.kind, params: opening.params })).sent).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
  it('an organisation that already had a number of its own connected keeps what it had', async () => {
    const { wa } = aSender({ addOn: false, own: true });
    const r = await wa.sendFor('org-1', '+254712345678', opening.text, { checkInId: 'ci-1', kind: opening.kind, params: opening.params });
    expect(r.error).not.toBe(NOT_TURNED_ON_QUIETLY);
  });
  it('the report after a session closes went before this release, and still goes', async () => {
    const { wa } = aSender({ addOn: false });
    expect((await wa.sendFor('org-1', '+254712345678', 'Your report for the sales team is ready.', { checkInId: 'ci-1', kind: 'report' })).sent).toBe(true);
  });
  it('a reply to something the person wrote always goes', async () => {
    const { wa } = aSender({ addOn: false });
    expect((await wa.sendFor('org-1', '+254712345678', 'Your check-in is complete and on record.')).sent).toBe(true);
  });
});
