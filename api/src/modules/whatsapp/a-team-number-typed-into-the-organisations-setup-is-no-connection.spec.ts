import * as crypto from 'crypto';
import { WhatsAppService } from './whatsapp.service';
import { TEMPLATES, fill, THE_NAMES_TO_SUBMIT } from './a-message-outside-the-window';
import { itSendsFromTheirNumber, NOTHING_WAS_SAVED_BECAUSE, THAT_IS_A_TEAM_MEMBERS_NUMBER, A_PHONE_NUMBER_IS_NOT_ITS_ID, THIS_IS_FOR_YOUR_OWN_NUMBER } from './a-connection-that-works';

/**
 * A TEAM MEMBER'S NUMBER TYPED INTO THE ORGANISATION'S OWN-NUMBER SETUP IS NO CONNECTION (Drop Access, 21 October 2026).
 *
 * Drop Access has no WhatsApp Business number of its own. Grace, its lead, typed Kevin's number where the organisation's own number
 * goes. From then on a switched-on row with no real keys sent everything Groundwork starts from "Kevin's number", with an empty list of
 * approved templates, and nothing reached anybody. Now:
 *  - the server saves nothing there unless every key is given, and says why, and where a team member's number goes instead;
 *  - a row already half set up, as production may hold, is read exactly like no connection: Groundwork's own number sends, with its
 *    approved first-contact template.
 */
const KEY = crypto.randomBytes(32).toString('base64');

function anOrganisation(row: any = null) {
  const rows: any[] = row ? [row] : [];
  const sends: any[] = [];
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    whatsAppConnection: {
      findUnique: jest.fn(async (q: any) => {
        const r = rows.find((x) => x.organizationId === q.where.organizationId) ?? null;
        return r && q?.select ? Object.fromEntries(Object.keys(q.select).map((k) => [k, r[k]])) : r;
      }),
      upsert: jest.fn(async ({ create }: any) => { rows.push({ id: 'c-1', ...create }); return rows[0]; }),
      update: jest.fn(async () => ({})),
    },
    organization: { findUnique: jest.fn(async () => ({ name: 'Drop Access', whatsappAddOnOn: true, timeZone: 'Africa/Nairobi' })), findMany: jest.fn(async () => []) },
    person: {
      findFirst: jest.fn(async (q: any) => {
        const forms: string[] = q?.where?.phone?.in ?? [];
        if (forms.includes('+254712345678')) return { givenName: 'Kevin', familyName: 'Omondi', displayName: 'Kevin Omondi', whatsappStoppedAt: null, whatsappLastInboundAt: null };
        return null;
      }),
      findMany: jest.fn(async () => [{ phone: '+254712345678' }]),
    },
    user: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
    whatsAppSend: { create: jest.fn(async (q: any) => { sends.push(q.data); return {}; }), findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    notification: { create: jest.fn(async () => ({})) },
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'groundworks-token', 'whatsapp.phoneNumberId': '111111111', 'whatsapp.approvedTemplates': THE_NAMES_TO_SUBMIT } as any)[k] };
  return { wa: new WhatsAppService(config, prisma), rows, sends, prisma };
}

describe("a team member's number typed into the organisation's own-number setup", () => {
  const was = process.env.SETTINGS_ENCRYPTION_KEY;
  beforeEach(() => { process.env.SETTINGS_ENCRYPTION_KEY = KEY; });
  afterEach(() => { if (was === undefined) delete process.env.SETTINGS_ENCRYPTION_KEY; else process.env.SETTINGS_ENCRYPTION_KEY = was; });

  it('Kevin\'s number alone, typed as the phone number ID: nothing is saved, and Grace reads why and where it goes', async () => {
    const { wa, rows } = anOrganisation();
    await expect(wa.connect('org-drop', { phoneNumberId: '0712345678' })).rejects.toThrow(
      "Nothing was saved, because the WhatsApp Business account ID, the number as people will see it, the access token and the app secret are missing. This is for connecting your organisation's own WhatsApp Business number. To let a team member check in on WhatsApp, add their number on People and setup.",
    );
    expect(rows).toEqual([]);
  });

  it('typed as +254 712 345 678 in every box: nothing is saved, and it is said to be Kevin\'s number', async () => {
    const { wa, rows } = anOrganisation();
    const all = { phoneNumberId: '254712345678', businessAccountId: '254712345678', displayNumber: '+254 712 345 678', accessToken: '+254 712 345 678', appSecret: '+254 712 345 678' };
    await expect(wa.connect('org-drop', all)).rejects.toThrow(THAT_IS_A_TEAM_MEMBERS_NUMBER('Kevin Omondi'));
    expect(THAT_IS_A_TEAM_MEMBERS_NUMBER('Kevin Omondi')).toBe(
      "Nothing was saved, because that is Kevin Omondi's number, not a WhatsApp Business number. This is for connecting your organisation's own WhatsApp Business number. To let a team member check in on WhatsApp, add their number on People and setup.",
    );
    expect(rows).toEqual([]);
  });

  it('a phone number with spaces or dashes in the ID box is not an ID', async () => {
    const { wa, rows } = anOrganisation();
    await expect(wa.connect('org-drop', { phoneNumberId: '0712-345-678', businessAccountId: '204455667788', displayNumber: '+254 799 000 111', accessToken: 'EAAG-a-real-looking-token', appSecret: 'a-real-looking-secret' })).rejects.toThrow(A_PHONE_NUMBER_IS_NOT_ITS_ID);
    expect(rows).toEqual([]);
  });

  it('every key given, for the organisation\'s own Business number: it is saved', async () => {
    const { wa, rows } = anOrganisation();
    await wa.connect('org-drop', { phoneNumberId: '109822345561', businessAccountId: '204455667788', displayNumber: '+254 799 000 111', accessToken: 'EAAG-drop-access-token-0001', appSecret: 'drop-access-app-secret-9f8e' });
    expect(rows).toHaveLength(1);
    expect(rows[0].verifyToken).toMatch(/^gwv_/);
    /* Saved, but nothing proved it yet: Groundwork's own number is still the one in use until Meta checks the address or a test goes. */
    expect(itSendsFromTheirNumber(rows[0])).toBe(false);
    expect(itSendsFromTheirNumber({ ...rows[0], webhookVerifiedAt: new Date() })).toBe(true);
  });

  it('the refusal is the same sentence every time, and never joined with a colon', () => {
    const s = NOTHING_WAS_SAVED_BECAUSE(['the access token']);
    expect(s).toBe(`Nothing was saved, because the access token is missing. ${THIS_IS_FOR_YOUR_OWN_NUMBER}`);
    expect(s).not.toMatch(/:/);
  });
});

describe('a row already half set up, as production may hold', () => {
  const realFetch = (global as any).fetch;
  let fetchSpy: jest.Mock;
  beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200, text: async () => '{"messages":[{"id":"wamid.1"}]}' })); (global as any).fetch = fetchSpy; });
  afterEach(() => { (global as any).fetch = realFetch; });
  const OPEN = ['Kevin', 'Sales team, Q4'];
  const OPEN_TEXT = fill(TEMPLATES['checkin-open'].body, OPEN);

  const HALF = [
    ['switched on, with Kevin\'s number as its ID and no keys', { phoneNumberId: '0712345678', accessToken: '', appSecret: '', verifyToken: 'gwv_x' }],
    ['switched on, with keys typed in and nothing ever proving it', { phoneNumberId: '254712345678', accessToken: '254712345678', appSecret: '254712345678', verifyToken: 'gwv_x' }],
  ] as const;

  it.each(HALF)('%s: Kevin\'s first message goes from Groundwork\'s number, as the approved first contact', async (_name, keys) => {
    const { wa } = anOrganisation({ id: 'c-1', organizationId: 'org-drop', enabled: true, approvedTemplates: [], displayNumber: '+254 712 345 678', webhookVerifiedAt: null, lastInboundAt: null, lastOutboundAt: null, ...keys });
    const r = await wa.sendFor('org-drop', '+254712345678', OPEN_TEXT, { checkInId: 'ci-kevin', kind: 'checkin-open', params: OPEN });
    expect(r.sent).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('/111111111/messages');
    expect(init.headers.Authorization).toBe('Bearer groundworks-token');
    const body = JSON.parse(init.body);
    expect(body.template.name).toBe('groundwork_first_contact');
    /* What Kevin reads: who it is for, and how to stop it. */
    const words = fill(TEMPLATES['first-contact'].body, body.template.components[0].parameters.map((p: any) => p.text));
    expect(words).toContain('Drop Access');
    expect(words).toContain('Sales team, Q4');
  });
});
