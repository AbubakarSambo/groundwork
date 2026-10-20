import { WhatsAppService } from './whatsapp.service';
import { TEMPLATES, fill, THE_NAMES_TO_SUBMIT } from './a-message-outside-the-window';
import { aCompanyLikeDropAccess, DROP, SALES, PEOPLE, pid, sessionOf, type Who, type Db } from './a-company-like-drop-access';
import { theLeadAddsAWhatsAppNumber, whereEachPersonIsOnWhatsApp, theOpeningsGoToANumberJustSaved } from '../grounds/the-lead-adds-a-whatsapp-number';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { ScimService } from '../people/scim.service';
import { WebhooksListener } from '../webhooks/webhooks.listener';
import { THAT_IS_A_TEAM_MEMBERS_NUMBER, NOTHING_WAS_SAVED_BECAUSE } from './a-connection-that-works';

/**
 * DROP ACCESS: THE TEAM'S NUMBERS, TYPED BY THE LEAD THE WAY DROP ACCESS TYPED THEM (Hafsah, 21 October 2026).
 *
 * Drop Access, a real client in production, has no WhatsApp number of its own. Its lead added the team's phone numbers in Groundwork
 * so the team could check in on WhatsApp. The numbers could not be found on screen, the team got no openings or nudges, and the lead
 * got no summary. This is the same thing done to a company like Drop Access (a-company-like-drop-access.ts, written by hand), on
 * every place a number can be typed, read back as each person who uses it reads it:
 *
 *  - Grace adds Kevin's number on the check-in's people list, as "+254 712 345 678";
 *  - Grace adds Mercy's number on People, as "0712 345 679";
 *  - Joseph adds his own in Settings, as "0712-345-680";
 *  - Grace adds Peter's on People and setup, as "0712345681";
 *  - the HR roster import carries Grace's own, as "0712 345 600";
 *  - and Grace types a team number into the organisation's own WhatsApp setup, which saves nothing and says why.
 *
 * The production branch's version (main): the email fallbacks and the Release 1 board are tested where main has them.
 *
 * Ten thirty in the morning in Nairobi, so quiet hours hold nothing. No model is called; WhatsApp is recorded, not sent.
 */
const NOW = new Date('2026-10-21T07:30:00Z');
const GROUNDWORKS_NUMBER_ID = '111111111';
const REPS: Who[] = ['kevin', 'mercy', 'joseph', 'peter'];
const NUMBER: Record<Who, string> = { grace: '+254712345600', kevin: '+254712345678', mercy: '+254712345679', joseph: '+254712345680', peter: '+254712345681' };

function theDoors(db: Db, o: { approved?: string[] } = {}) {
  const prisma = db.client();
  const config: any = {
    get: (k: string) => ({
      'whatsapp.enabled': true, 'whatsapp.accessToken': 'groundworks-token', 'whatsapp.phoneNumberId': GROUNDWORKS_NUMBER_ID,
      'whatsapp.approvedTemplates': o.approved ?? THE_NAMES_TO_SUBMIT, 'whatsapp.displayNumber': '+254 700 000 000', 'resend.frontendUrl': 'https://app.test', 'app.frontendUrl': 'https://app.test',
    } as any)[k],
  };
  const wa = new WhatsAppService(config, prisma, undefined);
  const users = new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any, wa);
  const auth = new AuthService(prisma, {} as any, config, {} as any, wa, {} as any, { emit: () => undefined } as any);
  (auth as any).getProfile = async (id: string) => db.rows.user.find((u) => u.id === id);
  const scim = new ScimService(prisma);
  const listener = new WebhooksListener(prisma, { emit: async () => undefined } as any, config, { tell: async () => undefined } as any, wa);
  return { prisma, wa, users, auth, scim, listener };
}

let fetchSpy: jest.Mock;
const realFetch = (global as any).fetch;
beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  fetchSpy = jest.fn(async (_url: string, init: any): Promise<any> => {
    const body = JSON.parse(init.body);
    return { ok: true, status: 200, text: async (): Promise<string> => '{"messages":[{"id":"wamid.x"}]}', json: async (): Promise<any> => ({ messages: [{ id: 'wamid.x' }] }) };
  });
  (global as any).fetch = fetchSpy;
});
afterEach(() => { (global as any).fetch = realFetch; jest.useRealTimers(); });

/** What went to each phone, as Meta was asked to send it: the number it went from, the template, and the words the person reads. */
const whatWentTo = (who: Who) => fetchSpy.mock.calls
  .map(([url, init]: any[]) => ({ from: String(url).split('/').slice(-2)[0], body: JSON.parse(init.body) }))
  .filter((c) => c.body.to === NUMBER[who].slice(1) && c.body.type !== undefined && c.body.status !== 'read')
  .map((c) => {
    const t = c.body.type === 'template' ? Object.values(TEMPLATES).find((x) => x.name === c.body.template.name) : null;
    return { from: c.from, template: c.body.template?.name ?? null, words: t ? fill(t.body, c.body.template.components[0].parameters.map((p: any) => p.text)) : c.body.text?.body };
  });

/** Grace, as the lead types them, on every place a number is typed. */
async function graceTypesTheTeamsNumbers(d: ReturnType<typeof theDoors>) {
  const said: Record<string, string> = {};
  /* The check-in's people list ("WhatsApp numbers", the old roster): Kevin. */
  const kevin = await theLeadAddsAWhatsAppNumber(d.prisma, { groundId: SALES, participantId: pid('kevin'), organizationId: DROP, userId: PEOPLE.grace.id, role: 'ADMIN', phone: '+254 712 345 678' });
  said.kevin = kevin.said;
  await theOpeningsGoToANumberJustSaved(d.prisma, d.wa as any, { organizationId: DROP, phone: kevin.phone!, userId: PEOPLE.kevin.id, participantIds: [pid('kevin')] });
  /* People, one person's page: Mercy, written the local way. */
  await d.users.update(PEOPLE.mercy.id, DROP, { phoneNumber: '0712 345 679' } as any, PEOPLE.grace.id);
  /* Settings, by Joseph himself, with dashes. */
  await d.auth.updateProfile(PEOPLE.joseph.id, { phoneNumber: '0712-345-680' } as any);
  /* People and setup, as pictured (Release 1B): Peter, with no spaces. The same route as the people list. */
  const peter = await theLeadAddsAWhatsAppNumber(d.prisma, { groundId: SALES, participantId: pid('peter'), organizationId: DROP, userId: PEOPLE.grace.id, role: 'ADMIN', phone: '0712345681' });
  said.peter = peter.said;
  await theOpeningsGoToANumberJustSaved(d.prisma, d.wa as any, { organizationId: DROP, phone: peter.phone!, userId: PEOPLE.peter.id, participantIds: [pid('peter')] });
  /* The roster import from the HR system: Grace's own. */
  await d.scim.upsert(DROP, 'hr', { externalId: 'emp-grace', userName: PEOPLE.grace.email, phoneNumbers: [{ value: '0712 345 600', primary: true }] } as any);
  return said;
}

describe('Drop Access: Grace types the team\'s numbers, on every place a number can be typed', () => {
  let db: Db; let d: ReturnType<typeof theDoors>; let said: Record<string, string>;
  beforeEach(async () => {
    db = aCompanyLikeDropAccess({ now: NOW });
    d = theDoors(db);
    said = await graceTypesTheTeamsNumbers(d);
  });

  it('every number is kept in one form, on the person\'s sign-in and on the roster, whichever way it was typed', () => {
    for (const w of [...REPS, 'grace'] as Who[]) {
      expect(db.rows.user.find((u) => u.id === PEOPLE[w].id)?.phoneNumber).toBe(NUMBER[w]);
      /* Every roster entry that is them carries the same number. Mercy and Joseph have none yet: their sign-in holds it, and every sender reads it there. */
      const entries = db.rows.person.filter((p) => p.linkedUserId === PEOPLE[w].id || p.email?.toLowerCase() === PEOPLE[w].email);
      for (const e of entries) expect(e.phone).toBe(NUMBER[w]);
      if (['kevin', 'peter', 'grace'].includes(w)) expect(entries.length).toBeGreaterThan(0);
    }
    expect(said.kevin).toBe("Kevin's WhatsApp number is kept. Groundwork will write to them there as well as by email.");
    expect(said.peter).toBe("Peter's WhatsApp number is kept. Groundwork will write to them there as well as by email.");
  });

  it('People and setup shows each number in its row, as Grace reads it', async () => {
    const rows = await whereEachPersonIsOnWhatsApp(d.prisma, { groundId: SALES, organizationId: DROP, userId: PEOPLE.grace.id, role: 'ADMIN' });
    const row = (w: Who) => rows.find((r) => r.participantId === pid(w))!;
    for (const w of REPS) expect(row(w).phone).toBe(NUMBER[w]);
    expect(row('grace').phone).toBe(NUMBER.grace);
    /* Kevin and Peter were sent their first message the moment their number was added; Mercy and Joseph too. */
    for (const w of REPS) expect(row(w).says).toBe('Waiting for their first message on WhatsApp.');
  });

  it('People shows each number in their row, in the words the page says', async () => {
    const page: any = await d.users.findAll(DROP, { page: 1, limit: 100 } as any, PEOPLE.grace.id);
    const line = (w: Who) => {
      const m = page.data.find((x: any) => x.id === PEOPLE[w].id);
      return `${m.phoneNumber ? `Their WhatsApp number is ${m.phoneNumber}. ` : ''}${m.whatsappSays ?? ''}`;
    };
    expect(line('kevin')).toBe('Their WhatsApp number is +254712345678. Waiting for their first message on WhatsApp.');
    expect(line('mercy')).toBe('Their WhatsApp number is +254712345679. Waiting for their first message on WhatsApp.');
    expect(line('joseph')).toBe('Their WhatsApp number is +254712345680. Waiting for their first message on WhatsApp.');
    expect(line('peter')).toBe('Their WhatsApp number is +254712345681. Waiting for their first message on WhatsApp.');
    expect(line('grace')).toBe('Their WhatsApp number is +254712345600. Not connected yet. Nothing has been sent to this number.');
  });

  it('each rep is sent their first WhatsApp from Groundwork\'s own number, as the approved first contact, naming Drop Access and the check-in', () => {
    for (const w of REPS) {
      const went = whatWentTo(w);
      expect(went).toHaveLength(1);
      expect(went[0].from).toBe(GROUNDWORKS_NUMBER_ID);
      expect(went[0].template).toBe('groundwork_first_contact');
      expect(went[0].words.startsWith('This is Groundwork, writing for Drop Access.')).toBe(true);
      expect(went[0].words).toContain('Sales team, Q4');
      expect(went[0].words.endsWith('Not you? Reply STOP.')).toBe(true);
    }
    /* Grace has no session of her own open here, so nothing went to her yet. */
    expect(whatWentTo('grace')).toEqual([]);
  });

  it('the next morning, each rep\'s new session opens on WhatsApp, as the approved opening, once', async () => {
    jest.setSystemTime(new Date('2026-10-22T05:00:00Z'));
    for (const w of REPS) {
      db.rows.checkIn.push({ id: sessionOf(w, 2), groundId: SALES, participantId: pid(w), sessionNumber: 2, status: 'NOT_STARTED', isSetup: false, optional: false, availableFrom: new Date('2026-10-22T05:00:00Z'), createdAt: new Date('2026-10-22T05:00:00Z') });
      await d.listener.onCheckInOpened({ groundId: SALES, checkInId: sessionOf(w, 2), participantId: pid(w), sessionNumber: 2, personExternalId: null } as any);
      await d.listener.onCheckInOpened({ groundId: SALES, checkInId: sessionOf(w, 2), participantId: pid(w), sessionNumber: 2, personExternalId: null } as any);
    }
    for (const w of REPS) {
      const went = whatWentTo(w);
      expect(went).toHaveLength(2);
      expect(went[1].from).toBe(GROUNDWORKS_NUMBER_ID);
      expect(went[1].template).toBe('checkin_open');
      expect(went[1].words).toContain('Sales team, Q4');
    }
  });

  it('Kevin changes phones: Grace changes his number on People while he is looking at another organisation, and the opening goes to the new one', async () => {
    /* Kevin wrote from his old number yesterday, and was told his session is open there. */
    const kevinsEntry = db.rows.person.find((p) => p.email === PEOPLE.kevin.email)!;
    kevinsEntry.whatsappLastInboundAt = new Date('2026-10-20T15:00:00Z');
    db.rows.whatsAppInboundMessage = [{ messageId: `ours:${NUMBER.kevin}:wamid.old`, organizationId: DROP, handledAt: new Date('2026-10-20T15:00:00Z') }];
    db.rows.user.find((u) => u.id === PEOPLE.kevin.id)!.organizationId = 'org-somewhere-else';
    fetchSpy.mockClear();
    await d.users.update(PEOPLE.kevin.id, DROP, { phoneNumber: '0712 345 699' } as any, PEOPLE.grace.id);
    /* His roster entry here follows, and the stamp about the old number is gone. */
    expect(kevinsEntry.phone).toBe('+254712345699');
    expect(kevinsEntry.whatsappLastInboundAt).toBeNull();
    const rows = await whereEachPersonIsOnWhatsApp(d.prisma, { groundId: SALES, organizationId: DROP, userId: PEOPLE.grace.id, role: 'ADMIN' });
    expect(rows.find((r) => r.participantId === pid('kevin'))).toMatchObject({ phone: '+254712345699', says: 'Waiting for their first message on WhatsApp.' });
    /* The session's opening went to his old number; the new number is still told, as a first contact, from Groundwork's number. */
    const toNew = fetchSpy.mock.calls.map(([url, init]: any[]) => ({ url: String(url), body: JSON.parse(init.body) })).filter((c) => c.body.to === '254712345699');
    expect(toNew).toHaveLength(1);
    expect(toNew[0].url).toContain(`/${GROUNDWORKS_NUMBER_ID}/messages`);
    expect(toNew[0].body.template.name).toBe('groundwork_first_contact');
  });

  it('Grace types Kevin\'s number into the organisation\'s own WhatsApp setup: nothing is saved, and she is told why', async () => {
    /* A server that can keep keys sealed, as production is. */
    const was = process.env.SETTINGS_ENCRYPTION_KEY;
    process.env.SETTINGS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    await expect(d.wa.connect(DROP, { phoneNumberId: '0712345678' })).rejects.toThrow(NOTHING_WAS_SAVED_BECAUSE(['the WhatsApp Business account ID', 'the number as people will see it', 'the access token', 'the app secret']));
    await expect(d.wa.connect(DROP, { phoneNumberId: '254712345678', businessAccountId: '254712345678', displayNumber: '0712 345 678', accessToken: '0712 345 678', appSecret: '0712 345 678' }))
      .rejects.toThrow(THAT_IS_A_TEAM_MEMBERS_NUMBER('Kevin Omondi'));
    expect(db.rows.whatsAppConnection).toEqual([]);
    /* And the message she reads, word for word. */
    expect(THAT_IS_A_TEAM_MEMBERS_NUMBER('Kevin Omondi')).toBe("Nothing was saved, because that is Kevin Omondi's number, not a WhatsApp Business number. This is for connecting your organisation's own WhatsApp Business number. To let a team member check in on WhatsApp, add their number on People and setup.");
    if (was === undefined) delete process.env.SETTINGS_ENCRYPTION_KEY; else process.env.SETTINGS_ENCRYPTION_KEY = was;
  });
});

/*
 * ON MAIN, THE EMAIL WHEN WHATSAPP CANNOT DELIVER IS THE SESSION'S OWN EMAIL: the invitation for the first session, and "your next
 * check-in is open" for every later one, skipped only when the WhatsApp opening went (this branch's own fix, tested in
 * a-saved-number-is-told-on-whatsapp-and-by-email.spec.ts). The lead's summary falls back to email (the-leads-daily-summary.spec.ts).
 */
describe('Drop Access: a half-set-up organisation number, as production may hold, is no connection', () => {
  it.each([
    ['switched on with Kevin\'s number as its ID and no keys', { enabled: true, phoneNumberId: '0712345678', displayNumber: '0712 345 678', accessToken: '', appSecret: '', verifyToken: 'gwv_1' }],
    ['switched on with numbers typed into every box, never proven', { enabled: true, phoneNumberId: '254712345678', displayNumber: '+254 712 345 678', accessToken: '254712345678', appSecret: '254712345678', verifyToken: 'gwv_1' }],
  ])('%s: the first messages go from Groundwork\'s own number', async (_n, connection) => {
    const db = aCompanyLikeDropAccess({ now: NOW, connection: { id: 'c-half', ...connection } });
    const d = theDoors(db);
    await graceTypesTheTeamsNumbers(d);
    for (const w of REPS) {
      const went = whatWentTo(w);
      expect(went).toHaveLength(1);
      expect(went[0].from).toBe(GROUNDWORKS_NUMBER_ID);
      expect(went[0].template).toBe('groundwork_first_contact');
    }
    expect(fetchSpy.mock.calls.some(([url]: any[]) => /\/(0712345678|254712345678)\/messages/.test(String(url)))).toBe(false);
  });
});
