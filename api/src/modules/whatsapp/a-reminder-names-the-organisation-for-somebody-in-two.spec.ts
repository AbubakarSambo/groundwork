import { WhatsAppService } from './whatsapp.service';
import { itIsOverdue } from './what-goes-to-a-phone';

/**
 * B-123: Neema Kamau is on two organisations' rosters. Her overdue reminder, inside the 24 hours, went as
 * plain words, without "This is Groundwork, writing for Msingi Foods." and "Not you? Reply STOP.", which
 * the reminders to everybody else carried. She is the person who most needs the organisation named.
 */
const NEEMA = { firstName: 'Neema', label: 'Sales team, Q4' };
const MSINGI = { id: 'org-msingi', name: 'Msingi Foods' };
const LAKEVIEW = { id: 'org-lakeview', name: 'Lakeview Clinic' };

function aSender(rosters: { id: string; name: string }[]) {
  const person = { whatsappStoppedAt: null, whatsappLastInboundAt: new Date() };
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    person: { findFirst: jest.fn(async () => person), findMany: jest.fn(async () => rosters.map((organization) => ({ phone: '+254700100008', organization }))) },
    user: { findMany: jest.fn(async () => []) },
    organization: { findUnique: jest.fn(async ({ where }: any) => { const o = [MSINGI, LAKEVIEW].find((x) => x.id === where.id); return o ? { ...o, whatsappAddOnOn: true } : null; }) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
    whatsAppSend: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) },
    notification: { create: jest.fn(async () => ({})) },
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111', 'whatsapp.approvedTemplates': [] } as any)[k] };
  return new WhatsAppService(config, prisma);
}

describe('a reminder to somebody on two organisations names the one it is for', () => {
  const realFetch = (global as any).fetch;
  let posted: string[];
  beforeEach(() => { posted = []; (global as any).fetch = jest.fn(async (_u: string, init: any) => { posted.push(JSON.parse(init.body)?.text?.body); return { ok: true, status: 200, json: async () => ({}) }; }); });
  afterEach(() => { (global as any).fetch = realFetch; });
  const n = itIsOverdue(NEEMA);

  it('says who is writing, for which organisation, and how to stop it', async () => {
    const wa = aSender([MSINGI, LAKEVIEW]);
    expect((await wa.sendFor(MSINGI.id, '+254700100008', n.text, { checkInId: 'ci-1', kind: n.kind, params: n.params })).sent).toBe(true);
    expect(posted).toEqual([`This is Groundwork, writing for Msingi Foods. ${n.text} Not you? Reply STOP.`]);
  });

  it('leaves it as it was for somebody on one organisation', async () => {
    const wa = aSender([MSINGI]);
    await wa.sendFor(MSINGI.id, '+254700100008', n.text, { checkInId: 'ci-1', kind: n.kind, params: n.params });
    expect(posted).toEqual([n.text]);
  });

  it('leaves a reply to what the person wrote alone', async () => {
    const wa = aSender([MSINGI, LAKEVIEW]);
    await wa.sendFor(MSINGI.id, '+254700100008', 'Thank you. What happens next?', { kind: 'reply' });
    expect(posted).toEqual(['Thank you. What happens next?']);
  });
});
