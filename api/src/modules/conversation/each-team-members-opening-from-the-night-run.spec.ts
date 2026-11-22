import { theNightRunsDatabase, N, type AGroundOfTheRun } from '../engagement/the-night-run-bed';
import { aTeamMembersOpeningFor, theOpeningFrom, theOneThingTodayBlock, theThingsThatMatter } from './the-one-thing-today';
import { ConversationService } from './conversation.service';
import { anInboundHarness } from '../whatsapp/a-whatsapp-inbound-harness';
import { WebhooksListener } from '../webhooks/webhooks.listener';
import { theCheckInIsOpen } from '../whatsapp/what-goes-to-a-phone';
import { withTheOpeningLine } from './the-opening-line';

/**
 * EACH TEAM MEMBER'S OPENING, READ FROM THE SECOND NIGHT RUN (the direct morning, part 3; Hafsah, 20 October 2026).
 *
 * The record as `gw_night_run2` held it on Tuesday 20 October in the morning (Nairobi): Drop Access's "Sales team, Q4" (Grace runs it;
 * Kevin, Mercy, Joseph and Peter answer it) and Muchemi & Co's "Fee notes" (Wanjiru runs it; Njeri, Aisha and Brian answer it). What each
 * person reads first is checked word for word, with the organisation's switch on and off, as each reader: a rep, a late rep, the lead.
 *
 * Before (raw/messages.json, Monday 19 October): every rep read "Hi Kevin, your check-in for Sales team, Q4 is open. It takes about ten
 * minutes, and you can answer right here. Reply START to begin." and, once they replied, "Sales team, Q4, session 6. You can write "ask"
 * at any time ..." and a question the model wrote.
 */
const NOW = new Date('2026-10-20T05:30:00.000Z');
const person = (g: AGroundOfTheRun, first: string) => N[g].participants.find((p: any) => p.user?.firstName === first);
const today = (g: AGroundOfTheRun, first: string) => N[g].checkIns.find((c: any) => c.participantId === person(g, first).id && c.status === 'NOT_STARTED');
const openingFor = async (g: AGroundOfTheRun, first: string, on = true) => {
  const db = theNightRunsDatabase(g, { directMorning: on });
  const ci = today(g, first);
  return aTeamMembersOpeningFor(db, { groundId: N[g].ground.id, participantId: person(g, first).id, sessionNumber: ci?.sessionNumber ?? null, now: NOW });
};

const KEVIN = 'Kevin, Ngong Road Minimart said they would pay KES 25,000 for 5 units on delivery tomorrow. Is the delivery set for tomorrow?';
const MERCY = "Mercy, Mama Rose's Kiosk is marked won for KES 5,000, and no payment record is filed for it yet. Can you send the M-Pesa message or the receipt?";
/* Changed 4 November 2026 (batch 1 merge, one opener): somebody late reads both things as the fact line, then one question about both. */
const JOSEPH_LATE_LINE = "Joseph, two things are open from last time. Juja Hardware is waiting on the KES 4,500 price for 5 units. You're waiting on Mrs Atieno at Mama Pima Stores for her final decision on the number of units and confirmation of payment.";
const JOSEPH_LATE = `${JOSEPH_LATE_LINE} What's happening with the KES 4,500 price for Juja Hardware, and has Mrs Atieno at Mama Pima Stores decided?`;
const KEVINS_LINE = 'Kevin, Ngong Road Minimart said they would pay KES 25,000 for 5 units on delivery tomorrow.';
const JOSEPH = "Joseph, Juja Hardware is waiting on the KES 4,500 price for 5 units. What's happening with it, and what's next?";
const NJERI = 'Njeri, Aisha is waiting on you for confirmation of payment for Baraka Hardware (FN-006), since 12 October. When will Aisha have it?';
const AISHA = 'Aisha, FN-006 for Baraka Hardware, KES 120,000, is marked paid, and no payment record is filed for it yet. Can you send the bank slip or the M-Pesa message?';
const BRIAN = 'Brian, Wanjiru is waiting on you for the payment status of FN-004, which was due on Monday 5 October. When will Wanjiru have it?';

describe('each team member reads the one thing that matters to them today, from the record (switch on)', () => {
  it('Kevin, a rep: his customer said they would pay tomorrow on delivery', async () => {
    const o = await openingFor('drop', 'Kevin');
    expect(o?.text).toBe(KEVIN);
    expect(o?.subject).toBe('Kevin, Ngong Road Minimart said they would pay tomorrow');
    expect(o?.late).toBe(false);
  });

  it('Mercy, a rep: a sale marked won with no payment record', async () => {
    expect((await openingFor('drop', 'Mercy'))?.text).toBe(MERCY);
  });

  it('Joseph, a late rep (his Monday session closed with nothing said): the short version, two things at most', async () => {
    const o = await openingFor('drop', 'Joseph');
    expect(o?.late).toBe(true);
    expect(o?.text).toBe(JOSEPH_LATE);
    expect(o?.text.startsWith('Joseph, two things are open from last time.')).toBe(true);
    expect(o?.things).toHaveLength(2);
    expect(o?.subject).toBe('Joseph, just two things today on Sales team, Q4');
  });

  it('Joseph on time would read the one thing, his customer waiting on a price, with the customer, the amount and the units', async () => {
    const o = await openingFor('drop', 'Joseph');
    const onTime = theOpeningFrom('Joseph', o!.things, false, 'Sales team, Q4');
    expect(onTime?.text).toBe(JOSEPH);
  });

  it('Peter: nothing specific on record about his own work, so his opening is today\'s (null here)', async () => {
    expect(await openingFor('drop', 'Peter')).toBeNull();
  });

  it('the lead never gets a team member\'s opening', async () => {
    expect(await openingFor('drop', 'Grace')).toBeNull();
    expect(await openingFor('fees', 'Wanjiru')).toBeNull();
  });

  it('on a "collect what\'s owed" check-in: a wait on them, and a fee note they follow up marked paid with no proof', async () => {
    expect((await openingFor('fees', 'Njeri'))?.text).toBe(NJERI);
    expect((await openingFor('fees', 'Aisha'))?.text).toBe(AISHA);
    expect((await openingFor('fees', 'Brian'))?.text).toBe(BRIAN);
  });

  it('every opening is plain full sentences, ends on one question, and carries no label or judgement about the person', async () => {
    for (const t of [KEVIN, MERCY, JOSEPH_LATE, JOSEPH, NJERI, AISHA, BRIAN]) {
      expect(t.trim().endsWith('?')).toBe(true);
      expect((t.match(/\?/g) ?? []).length).toBe(1);
      expect(t).not.toMatch(/\b(?:PIP|exit|at risk|underperform|lazy|slow|unreliable|pattern|session \d|check-in is open)\b/i);
      expect(t).not.toMatch(/ [-–—>] |:\s/);
    }
  });

  it('a promise carried over three check-ins running is said as what happened, with the colleague who waits named', () => {
    const things = theThingsThatMatter({
      participantId: 'joseph', firstName: 'Joseph', callThem: (id) => (id === 'mercy' ? 'Mercy' : null),
      waits: [{ id: 'w1', fromParticipantId: 'mercy', onParticipantId: 'joseph', what: 'the samples for Tuskys Westgate', status: 'WAITING', createdAt: new Date('2026-10-12T09:00:00Z') }],
      carriedWaitIds: new Set(['w1']), deals: [], silentSince: new Map(), bills: null, billWord: 'invoice', now: NOW, zone: 'Africa/Nairobi',
    });
    expect(theOpeningFrom('Joseph', things, false, 'Sales team, Q4')?.text).toBe("Joseph, you've promised Mercy the samples for Tuskys Westgate three times. What day will Mercy have them?");
  });

  it('a colleague is "a colleague" where the check-in does not name people to each other', () => {
    const things = theThingsThatMatter({
      participantId: 'njeri', firstName: 'Njeri', callThem: () => 'a colleague',
      waits: [{ id: 'w1', fromParticipantId: 'aisha', onParticipantId: 'njeri', what: 'confirmation of payment for FN-006', status: 'WAITING', createdAt: new Date('2026-10-12T09:00:00Z') }],
      carriedWaitIds: new Set(), deals: [], silentSince: new Map(), bills: null, billWord: 'invoice', now: NOW, zone: 'Africa/Nairobi',
    });
    expect(theOpeningFrom('Njeri', things, false, 'Fee notes')?.text).toBe('Njeri, a colleague is waiting on you for confirmation of payment for FN-006, since 12 October. When will they have it?');
  });
});

/* --------------------------------------------------------------------------------------------------------------------------- */
/* The check-in itself: the opening turn is the line, word for word, and the model is not asked for it                          */
/* --------------------------------------------------------------------------------------------------------------------------- */

function aCheckInOver(g: AGroundOfTheRun, first: string, on: boolean, modelSays = 'What moved on your deals since yesterday?') {
  const db = theNightRunsDatabase(g, { directMorning: on });
  const p = person(g, first);
  const ci = today(g, first) ?? N[g].checkIns.filter((c: any) => c.participantId === p.id).sort((a: any, b: any) => b.sessionNumber - a.sessionNumber)[0];
  const saved: any[] = [];
  db.conversationTurn.create = jest.fn(async ({ data }: any) => { const t = { id: `t${saved.length + 1}`, createdAt: new Date(), ...data }; saved.push(t); return t; });
  db.conversationTurn.findFirst = jest.fn(async (q: any) => (q?.where?.checkInId === ci.id ? saved.find((t) => t.role === q.where.role) ?? null : { id: 'another-round' }));
  db.checkIn.update = jest.fn(async () => ({}));
  db.ground.updateMany = jest.fn(async () => ({ count: 1 }));
  const anthropic: any = { respond: jest.fn(async () => modelSays), extract: jest.fn(async () => ({})) };
  const service = new ConversationService(
    db, {} as any, anthropic, { getActive: jest.fn(async () => ({ id: 'v1' })) } as any, { emit: jest.fn() } as any, {} as any,
    { canStartSession: jest.fn(async () => ({ allowed: true, sessionsBalance: -1 })) } as any, {} as any, { emit: jest.fn(() => Promise.resolve()) } as any, {} as any,
  );
  (service as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const theCheckIn = { ...ci, isSelfCorrection: false, isFinal: false, participant: { ...p, userId: p.userId } };
  jest.spyOn(service as any, 'openTheDoor').mockResolvedValue(theCheckIn);
  jest.spyOn(service as any, 'closeAsMissed').mockResolvedValue(false);
  jest.spyOn(service as any, 'composeSystemPrompt').mockResolvedValue('SYSTEM');
  jest.spyOn(service as any, 'theContextNotYetSaid').mockResolvedValue('');
  jest.spyOn(service as any, 'provisionalFunctionFromTheStatedRole').mockResolvedValue(undefined);
  jest.spyOn(service as any, 'theSubjectsToCover').mockResolvedValue(null);
  jest.spyOn(service as any, 'theFrameFor').mockResolvedValue(null);
  jest.spyOn(service as any, 'untoldGoalsOn').mockResolvedValue([]);
  jest.spyOn(service as any, 'theTurnAsItIsSaved').mockImplementation(async (_c: any, t: any) => t);
  jest.spyOn(service as any, 'withTheNewsTheyWaitOn').mockImplementation(async (_c: any, t: any) => t);
  jest.spyOn(service as any, 'theDocumentQuestionItRaised').mockResolvedValue(null);
  jest.spyOn(service as any, 'theOpenerIsHeldToTheSameBar').mockImplementation(async (_i: any, _s: any, _b: any, t: any) => t);
  return { service, anthropic, saved, ci, userId: p.userId };
}

describe('the check-in opens on that line (web, and the first message after START)', () => {
  beforeEach(() => jest.useFakeTimers({ now: NOW, doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval', 'nextTick', 'queueMicrotask'] }));
  afterEach(() => jest.useRealTimers());

  /*
   * CHANGED 4 November 2026 (batch 1 merge: the direct morning is on for everybody, and the prepared opener is the one opener). With no
   * draft ready on his row, Kevin's opener is his fact line straight away and a question written fresh after it, in one model call, with
   * the record's own question shown to the model. With a draft ready it is said as prepared, with no call: the-opening-prepared-in-advance.
   */
  it('Kevin, with no draft ready: his fact line, then the question written fresh after it, in one call that is shown the record\'s question', async () => {
    const { service, anthropic, saved, ci, userId } = aCheckInOver('drop', 'Kevin', true);
    const r: any = await service.open(ci.id, userId);
    expect(anthropic.respond).toHaveBeenCalledTimes(1);
    expect(anthropic.respond.mock.calls[0][0]).toContain('"Is the delivery set for tomorrow?"');
    expect(r.reply).toBe(withTheOpeningLine(`${KEVINS_LINE} What moved on your deals since yesterday?`));
    expect(r.personalOpening).toBe(true);
    expect(saved.filter((t) => t.role === 'AI').map((t) => t.content)).toEqual([r.reply]);
  });

  it('Joseph who is late: both things are his fact line, then the question', async () => {
    const { service, ci, userId } = aCheckInOver('drop', 'Joseph', true);
    expect((await service.open(ci.id, userId)).reply).toBe(withTheOpeningLine(`${JOSEPH_LATE_LINE} What moved on your deals since yesterday?`));
  });

  /* Changed 22 November 2026 (release test, bugs 6 and 11): "nothing is open from last time" was untrue whenever what was open was not
     on the short list. With nothing on it, the model opens from the whole record. */
  it('Peter with nothing specific on record: the model opens from the record, and nothing says "nothing is open"', async () => {
    const { service, anthropic, ci, userId } = aCheckInOver('drop', 'Peter', true);
    const r: any = await service.open(ci.id, userId);
    expect(anthropic.respond).toHaveBeenCalledTimes(1);
    expect(r.reply).toBe(withTheOpeningLine('What moved on your deals since yesterday?'));
  });

  it('switch on, the lead: her opening is the model\'s, as before', async () => {
    const { service, anthropic, ci, userId } = aCheckInOver('drop', 'Grace', true, 'Good morning Grace. What do you need from the team today?');
    const r: any = await service.open(ci.id, userId);
    expect(anthropic.respond).toHaveBeenCalledTimes(1);
    // Changed 26 October 2026 (Hafsah: item 1): the lead's opening is unchanged, with the opening line in front.
    expect(r.reply).toBe(withTheOpeningLine('Good morning Grace. What do you need from the team today?'));
  });

  it('the turns after it are told the question was asked and what the record holds behind it, in a block the code builds', async () => {
    const { service, ci, userId } = aCheckInOver('drop', 'Kevin', true);
    await service.open(ci.id, userId);
    const block = await (service as any).theOneThingTodayHere({ id: ci.id, groundId: ci.groundId, participantId: ci.participantId, sessionNumber: ci.sessionNumber });
    expect(block).toContain(`"${KEVINS_LINE} What moved on your deals since yesterday?"`);
    expect(block).toContain('already asked, word for word');
    expect(block).toContain('Ngong Road Minimart said they would pay KES 25,000 for 5 units on delivery tomorrow.');
  });
});

/* --------------------------------------------------------------------------------------------------------------------------- */
/* WhatsApp: after START, and inside the 24 hours                                                                               */
/* --------------------------------------------------------------------------------------------------------------------------- */

describe('on WhatsApp', () => {
  it('after START, the personal line is the first thing they read; the words that switch follow it, and no session number', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-kevin', status: 'NOT_STARTED', sessionNumber: 7, label: 'Sales team, Q4' }] });
    h.conversation.open = jest.fn(async () => ({ reply: KEVIN, theOpener: KEVIN, personalOpening: true }));
    await h.service.handle('org-1', h.message('START'), 'ours');
    const first = h.said[h.said.length - 1];
    expect(first.startsWith(KEVIN)).toBe(true);
    expect(first).toContain('You can write "ask" at any time');
    expect(first).not.toMatch(/session 7/);
    expect(h.conversation.sendMessage).not.toHaveBeenCalled();
  });

  it('switch off (no personal opening): after START they read exactly what they read today', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-kevin', status: 'NOT_STARTED', sessionNumber: 7, label: 'Sales team, Q4' }] });
    await h.service.handle('org-1', h.message('START'), 'ours');
    expect(h.said[h.said.length - 1]).toBe('Sales team, Q4, session 7. You can write "ask" at any time to talk to Ask Groundwork, "back" to come back to your check-in, and "switch" to choose another check-in.\n\nWhat moved since last time?');
  });

  it('inside the 24 hours the line already went as the message: their answer is handed in, and the line is not said again', async () => {
    const h = anInboundHarness({ open: [{ id: 'ci-kevin', status: 'NOT_STARTED', sessionNumber: 7, label: 'Sales team, Q4' }] });
    h.prisma.whatsAppSend.findFirst = jest.fn(async (q: any) => (q?.where?.kind?.in?.includes('checkin-open') && q.where.checkInId === 'ci-kevin' ? { id: 's1' } : null));
    h.conversation.open = jest.fn(async () => ({ reply: KEVIN, theOpener: KEVIN, personalOpening: true }));
    await h.service.handle('org-1', h.message('Yes, the delivery is set for 10 tomorrow and Ali pays then.'), 'ours');
    expect(h.conversation.sendMessage).toHaveBeenCalledWith('ci-kevin', expect.anything(), 'Yes, the delivery is set for 10 tomorrow and Ali pays then.', expect.anything());
    expect(h.said[h.said.length - 1]).toBe('Thank you. What happens next?');
  });

  async function theOpeningNotice(on: boolean, first = 'Kevin') {
    const db = theNightRunsDatabase('drop', { directMorning: on });
    const p = person('drop', first);
    const ci = today('drop', first);
    Object.assign(db, {
      person: { findFirst: jest.fn(async () => ({ phone: '+254722000101', externalId: 'ext-k' })) },
      leaveRequest: { findMany: jest.fn(async () => []) },
      whatsAppSend: { findFirst: jest.fn(async () => null) },
      notification: { findFirst: jest.fn(async () => null) },
      whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
    });
    const sendFor = jest.fn(async () => ({ sent: true }));
    const listener = new WebhooksListener(db, { emit: jest.fn(async () => undefined) } as any, { get: () => undefined } as any, {} as any, { sendFor } as any);
    (listener as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    jest.useFakeTimers({ now: NOW, doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval', 'nextTick', 'queueMicrotask'] });
    try {
      await listener.onCheckInOpened({ checkInId: ci.id, groundId: ci.groundId, participantId: p.id, sessionNumber: ci.sessionNumber, personExternalId: 'ext-k' } as any);
    } finally {
      jest.useRealTimers();
    }
    return { sendFor, today: theCheckInIsOpen({ firstName: first, label: 'Sales team, Q4' }, N.drop.ground.simplerWords) };
  }

  it('the opening notice: switch on, the personal line is the free message, and the template\'s blanks are the same as today\'s', async () => {
    const { sendFor, today: was } = await theOpeningNotice(true);
    expect(sendFor).toHaveBeenCalledTimes(1);
    const [, , text, context] = (sendFor.mock.calls[0] as any[]);
    expect(text).toBe(KEVIN);
    expect(context).toEqual(expect.objectContaining({ kind: 'checkin-open', params: was.params }));
  });

});

/* --------------------------------------------------------------------------------------------------------------------------- */
/* By email: the opening line of "your next check-in is open" is the personal line                                              */
/* --------------------------------------------------------------------------------------------------------------------------- */

import { GroundsCron } from '../grounds/grounds.cron';
import { EmailService } from '../email/email.service';

describe('by email', () => {
  async function theOpeningEmail(on: boolean, first: string) {
    const db = theNightRunsDatabase('drop', { directMorning: on });
    const p = person('drop', first);
    const ci = today('drop', first);
    Object.assign(db, {
      person: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      leaveRequest: { findMany: jest.fn(async () => []) },
      whatsAppSend: { findFirst: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
      notification: { findFirst: jest.fn(async () => null) },
      platformSetting: { findUnique: jest.fn(async () => null) },
    });
    const theRecord = db.checkIn.findMany;
    /* The sweep's own read is the one session that just opened; every other read is the record's. */
    db.checkIn.findMany = jest.fn(async (q: any) => (q?.where?.sessionReadyNotifiedAt !== null ? theRecord(q) : [{
      id: ci.id, groundId: ci.groundId, sessionNumber: ci.sessionNumber, availableFrom: new Date(ci.availableFrom),
      participant: { id: p.id, email: `${first.toLowerCase()}@drop.test`, userId: p.userId, ground: { label: 'Sales team, Q4', simplerWords: false, organizationId: N.drop.ground.organizationId, overWhatsApp: null }, user: { phoneNumber: null } },
    }]));
    db.checkIn.update = jest.fn(async () => ({}));
    const sent: any[] = [];
    const mail: any = new EmailService({ get: () => undefined } as any, {} as any, {} as any);
    mail.sendEmail = jest.fn(async (m: any, _c: any, sender: string) => { sent.push({ ...m, sender }); return 'id'; });
    mail.theWhatsAppLine = jest.fn(async () => '');
    const cron: any = new GroundsCron(db, { sendSessionReady: (...a: any[]) => mail.sendSessionReady(...a), buildCheckInUrl: (id: string) => `https://myground.work/checkin/${id}` } as any, { get: () => '' } as any, {} as any, {} as any, {} as any, {} as any);
    cron.logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    cron.announceOpenedSessions = jest.fn(async () => undefined);
    cron.openTheCheckInOnWhatsAppForTheInvited = jest.fn(async () => ({ sent: 0 }));
    jest.useFakeTimers({ now: NOW, doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval', 'nextTick', 'queueMicrotask'] });
    try { await cron.sendSessionReadyNotificationsInner(); } finally { jest.useRealTimers(); }
    return sent;
  }

  it('switch on, Kevin: the subject and the opening line are his one thing, and the link stays', async () => {
    const [m] = await theOpeningEmail(true, 'Kevin');
    expect(m.sender).toBe('sendSessionReady');
    expect(m.subject).toBe('Kevin, Ngong Road Minimart said they would pay tomorrow');
    expect(m.html).toContain(`<p>${KEVIN}</p>`);
    expect(m.html).not.toContain('Your next check-in');
    expect(m.html).toContain('>Check in</a>');
  });

  it('switch on, Joseph who is late: the short version opens the email', async () => {
    const [m] = await theOpeningEmail(true, 'Joseph');
    expect(m.subject).toBe('Joseph, just two things today on Sales team, Q4');
    expect(m.html).toContain(`<p>${JOSEPH_LATE}</p>`);
  });

});
