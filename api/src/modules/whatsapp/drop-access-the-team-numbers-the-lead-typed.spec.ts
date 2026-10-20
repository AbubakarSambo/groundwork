import { WhatsAppService } from './whatsapp.service';
import { TEMPLATES, fill, THE_NAMES_TO_SUBMIT } from './a-message-outside-the-window';
import { aCompanyLikeDropAccess, DROP, SALES, PEOPLE, pid, sessionOf, type Who, type Db } from './a-company-like-drop-access';
import { theLeadAddsAWhatsAppNumber, whereEachPersonIsOnWhatsApp, theOpeningsGoToANumberJustSaved } from '../grounds/the-lead-adds-a-whatsapp-number';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { ScimService } from '../people/scim.service';
import { WebhooksListener } from '../webhooks/webhooks.listener';
import { THAT_IS_A_TEAM_MEMBERS_NUMBER, NOTHING_WAS_SAVED_BECAUSE } from './a-connection-that-works';
import { sendTheLeadsDailyNudges } from '../engagement/the-leads-daily-nudge';
import { theNightRunsDatabase, theLeadsBoard, theLeadOf, N } from '../engagement/the-night-run-bed';
import { META_REFUSED_IT } from './by-email-instead';
import { boardAs, person, A_RELEASED_REPORT } from '../board/the-switchboards-sections-harness';
import * as RUN from '../board/__fixtures__/drop-access-run-1.json';

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
 * Ten thirty in the morning in Nairobi, so quiet hours hold nothing. No model is called; WhatsApp and email are recorded, not sent.
 */
const NOW = new Date('2026-10-21T07:30:00Z');
const GROUNDWORKS_NUMBER_ID = '111111111';
const REPS: Who[] = ['kevin', 'mercy', 'joseph', 'peter'];
const NUMBER: Record<Who, string> = { grace: '+254712345600', kevin: '+254712345678', mercy: '+254712345679', joseph: '+254712345680', peter: '+254712345681' };

type Meta = 'takes-it' | 'refuses-it';
function theDoors(db: Db, o: { approved?: string[]; meta?: Meta } = {}) {
  const prisma = db.client();
  const config: any = {
    get: (k: string) => ({
      'whatsapp.enabled': true, 'whatsapp.accessToken': 'groundworks-token', 'whatsapp.phoneNumberId': GROUNDWORKS_NUMBER_ID,
      'whatsapp.approvedTemplates': o.approved ?? THE_NAMES_TO_SUBMIT, 'whatsapp.displayNumber': '+254 700 000 000', 'resend.frontendUrl': 'https://app.test', 'app.frontendUrl': 'https://app.test',
    } as any)[k],
  };
  const mails: { to: string; subject: string; words: string; kind: string }[] = [];
  const mail = (kind: string) => jest.fn(async (to: string, subject: string, words: string) => { mails.push({ to, subject, words, kind }); return 'sent'; });
  const email: any = { sendTheRoutineMessageByEmail: mail('routine'), sendTheMessageByEmail: mail('notice'), sendTheAnswerByEmail: mail('answer') };
  const wa = new WhatsAppService(config, prisma, undefined, email);
  const users = new UsersService(prisma, {} as any, {} as any, {} as any, { emit: () => undefined } as any, wa);
  const auth = new AuthService(prisma, {} as any, config, {} as any, wa, {} as any, { emit: () => undefined } as any);
  (auth as any).getProfile = async (id: string) => db.rows.user.find((u) => u.id === id);
  const scim = new ScimService(prisma);
  const listener = new WebhooksListener(prisma, { emit: async () => undefined } as any, config, { tell: async () => undefined } as any, wa);
  return { prisma, wa, users, auth, scim, listener, mails };
}

let fetchSpy: jest.Mock;
let meta: Meta = 'takes-it';
const realFetch = (global as any).fetch;
beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  meta = 'takes-it';
  fetchSpy = jest.fn(async (_url: string, init: any): Promise<any> => {
    const body = JSON.parse(init.body);
    if (meta === 'refuses-it' && body.type === 'template') return { ok: false, status: 400, text: async (): Promise<string> => '{"error":{"code":131026,"message":"Message undeliverable"}}' };
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

describe('Drop Access: when WhatsApp cannot deliver, the opening goes by email instead, on one channel', () => {
  it('before groundwork_first_contact is approved, each rep\'s opening goes by email, and nothing goes on WhatsApp', async () => {
    const db = aCompanyLikeDropAccess({ now: NOW });
    const d = theDoors(db, { approved: THE_NAMES_TO_SUBMIT.filter((n) => n !== 'groundwork_first_contact') });
    await graceTypesTheTeamsNumbers(d);
    for (const w of REPS) expect(whatWentTo(w)).toEqual([]);
    for (const w of REPS) {
      const theirs = d.mails.filter((m) => m.to === PEOPLE[w].email);
      expect(theirs).toHaveLength(1);
      expect(theirs[0].words).toContain('Sales team, Q4');
      expect(theirs[0].words).not.toMatch(/Reply (START|STOP)/);
    }
  });

  it('when Meta itself refuses the first message, the same words go by email, once', async () => {
    const db = aCompanyLikeDropAccess({ now: NOW });
    const d = theDoors(db);
    meta = 'refuses-it';
    await graceTypesTheTeamsNumbers(d);
    for (const w of REPS) {
      expect(db.rows.whatsAppSend.filter((s) => s.phone === NUMBER[w] && s.sentAt === null).length).toBeGreaterThan(0);
      const theirs = d.mails.filter((m) => m.to === PEOPLE[w].email);
      expect(theirs).toHaveLength(1);
      expect(theirs[0].words).toContain('Sales team, Q4');
    }
  });
});

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

/*
 * GRACE'S MORNING SUMMARY AND HER BOARD. Built on Drop Access's own record, as the test runs left it (the night run of 20 October for
 * the summary, the first ten-day run for the board), with her number the one the roster import kept: "0712 345 600".
 */
describe('Drop Access: Grace gets her morning summary, on WhatsApp or by email', () => {
  const MORNING = new Date('2026-10-20T04:00:00Z');
  function morning(sendFor: jest.Mock) {
    const db: any = theNightRunsDatabase('drop', { directMorning: true });
    const ground = { ...N.drop.ground, createdAt: new Date(N.drop.ground.createdAt) };
    db.ground.findMany = jest.fn(async () => [ground]);
    db.person.findFirst = jest.fn(async (q: any) => (q?.where?.OR || q?.where?.linkedUserId ? { phone: NUMBER.grace } : null));
    const mails: any[] = [];
    const deps: any = {
      prisma: db,
      whatsapp: { isEnabled: async () => true, hasSaidStop: async () => false, sendFor },
      email: { sendTheLeadsDailyNudge: jest.fn(async (...a: any[]) => { mails.push(a); return 'sent'; }), sendTheDirectMorning: jest.fn(async (...a: any[]) => { mails.push(a); return 'sent'; }) },
      boards: {} as any, frontendUrl: 'https://app.test', board: { get: async () => theLeadsBoard('drop') },
    };
    return { deps, mails };
  }
  beforeEach(() => jest.setSystemTime(MORNING));

  it('on WhatsApp, to the number the roster import kept', async () => {
    const sendFor = jest.fn(async () => ({ sent: true }));
    const { deps, mails } = morning(sendFor);
    expect((await sendTheLeadsDailyNudges(deps, MORNING, { onlyTheDirectMorningAt7: true })).tried).toBe(1);
    expect(sendFor).toHaveBeenCalledTimes(1);
    const [, phone, , ctx] = (sendFor.mock.calls[0] as any[]);
    expect(phone).toBe(NUMBER.grace);
    expect(ctx.kind).toBe('lead-summary');
    expect(ctx.params[0]).toBe(theLeadOf('drop').firstName);
    expect(mails).toEqual([]);
  });

  it('by email instead when Meta refuses it', async () => {
    const sendFor = jest.fn(async () => ({ sent: false, error: META_REFUSED_IT }));
    const { deps, mails } = morning(sendFor);
    await sendTheLeadsDailyNudges(deps, MORNING, { onlyTheDirectMorningAt7: true });
    expect(mails).toHaveLength(1);
  });
});

describe('Drop Access: Grace\'s board shows her prospective clients, each deal\'s stage and next step, the gap and what needs her', () => {
  const R: any = RUN;
  const at = (s: any) => (s ? new Date(s) : null);
  let board: any;
  beforeAll(async () => {
    jest.useRealTimers();
    const LINES = R.lines.map((l: any) => ({ ...l, createdAt: at(l.createdAt), confirmedAt: at(l.confirmedAt), disputedAt: null }));
    const WAITS = R.dependencies.map((x: any) => ({ ...x, createdAt: at(x.createdAt), updatedAt: at(x.updatedAt), clearedAt: at(x.clearedAt), escalatedAt: at(x.escalatedAt), dueOn: at(x.dueOn) }));
    const grace = R.participants.find((p: any) => p.user.firstName === 'Grace').userId;
    board = await boardAs({
      people: R.participants.map((p: any) => person(p.id, p.userId, p.user.firstName, p.user.lastName, p.partyType)),
      initiatorId: grace, kindOfWork: 'sales team', releaseOneSalesBoard: true, label: R.ground.label,
      clock: { now: new Date('2026-10-26T08:15:00Z'), endsAt: new Date('2026-10-30T17:00:00Z') },
      checkIns: R.checkIns.map((c: any) => ({ ...c, completedAt: at(c.completedAt) })), lines: LINES, recordLines: LINES,
      documents: R.documents.map((x: any) => ({ ...x, createdAt: at(x.createdAt) })),
      items: R.items.map((i: any) => ({ ...i, groundId: 'g-1', createdAt: at(i.createdAt), updatedAt: at(i.updatedAt), dueAt: at(i.dueAt) })),
      dependencies: WAITS,
      objectives: R.objectives.map((x: any) => ({ ...x, groundId: 'g-1', createdAt: at(x.createdAt), updatedAt: at(x.updatedAt), dueOn: at(x.dueOn) })),
      turns: R.turns.map((t: any) => ({ checkInId: t.checkInId, content: t.content })), room: R.room,
      report: { ...A_RELEASED_REPORT, releasedAt: new Date('2026-10-23T17:00:00Z') },
      prismaExtras: { groundDependency: { findMany: jest.fn(async () => structuredClone(WAITS)), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0) } },
    } as any, grace, 'MEMBER');
  }, 60_000);

  it('each open deal, its stage and its next step', () => {
    const grid = (board.workRecords ?? []).find((s: any) => (s.rows ?? []).some((r: any) => r.kind === 'deal'));
    const open = grid.rows.filter((r: any) => r.stage !== 'Won').map((r: any) => [r.name, r.stage, r.nextSays]);
    expect(open).toEqual(expect.arrayContaining([
      ['Juja Hardware', 'Qualified', 'Your answer on KES 4,500 a unit, then a buying date from Mr. Kariuki.'],
      ['Mama Pima', 'Contacted', 'Joseph said the next step is “call her next week”.'],
      ['Kawangware Fresh', 'Qualified', 'Mercy said the next step is “follow up with Esther to see if she has a budget”, by tomorrow.'],
      ['Lavington Spa', 'Contacted', 'Kevin said the next step is “follow up with Lavington Spa tomorrow morning”.'],
    ]));
  });

  it('the gap to the target, and whether the open deals cover it', () => {
    expect(board.toCloseTheGap.aim).toBe('The team is aiming for 120 units sold by 30 October');
    expect(board.toCloseTheGap.gap).toBe(19);
    expect(board.toCloseTheGap.says).toBe('Even if all five here close, that is 22 units, enough to close the gap.');
  });

  it('what needs her', () => {
    const says = (board.leadActions ?? []).map((a: any) => a.says);
    expect(says).toEqual(expect.arrayContaining([
      'Decide whether a price range counts as a budget',
      expect.stringMatching(/^You need to get back to Joseph Kariuki, who is waiting on you/),
    ]));
  });
});
