import { sendTheDailyDeliveryAlert, theAlertEmail, whatWentWrongYesterday, theDeliveryAlertAddress, DELIVERY_ALERT_KEY, yesterdayInNairobi } from './the-daily-delivery-alert';
import { OUTSIDE_THE_WINDOW, NOT_TODAY } from '../whatsapp/a-message-outside-the-window';
import { FIRST_CONTACT_NOT_APPROVED } from '../whatsapp/the-first-message-to-a-number';
import { BY_EMAIL_ROUTINE } from '../whatsapp/by-email-instead';
import { whatThisMailIs } from '../email/nothing-goes-out-that-was-turned-off';
import { TheDailyDeliveryAlertCron } from '../email/the-daily-delivery-alert.cron';
import { AdminService } from '../admin/admin.service';
import { EmailService } from '../email/email.service';
import { whatIsNotPlainIn } from '../reports/a-product-sentence-is-plain';

/**
 * THE DAILY DELIVERY ALERT, AS HAFSAH READS IT. Tuesday 20 October 2026, half past seven in Nairobi, about Monday 19 October.
 *
 * Drop Access: Peter Njoroge's opening was refused on WhatsApp and no email went; Mercy Wanjiru's opening went on WhatsApp, but her reminder
 * that the check-in is due tomorrow was refused; Joseph Kariuki's opening was refused on WhatsApp and went by email instead, and he answered.
 * The lead, Wanjiru Kamau, had her morning summary on WhatsApp. Bridge Merchant: Amos Otieno's morning summary was never tried, and Grace
 * Akinyi, the only person in his check-in, was reached on WhatsApp and did not answer.
 */
const NOW = new Date('2026-10-20T04:30:00Z');
const MON = (hhmm: string) => new Date(`2026-10-19T${hhmm}:00Z`);

const person = (id: string, first: string, last: string, email: string, phone: string | null = null) => ({
  id, email, nameGiven: null, userId: `u-${id}`, managingOnly: false, awaitingSeat: false, erasedFrom: null, leftAt: null,
  user: { firstName: first, lastName: last, phoneNumber: phone },
});
const G1 = { id: 'g1', label: 'Sales team, Q4', organizationId: 'o1', status: 'ACTIVE' };
const G3 = { id: 'g3', label: 'Field sales', organizationId: 'o2', status: 'ACTIVE' };
const PETER = person('p1', 'Peter', 'Njoroge', 'peter@drop.test', '+254700000011');
const MERCY = person('p2', 'Mercy', 'Wanjiru', 'mercy@drop.test', '+254700000012');
const JOSEPH = person('p3', 'Joseph', 'Kariuki', 'joseph@drop.test', '+254700000013');
const GRACE = person('p4', 'Grace', 'Akinyi', 'grace@bridge.test', '+254700000014');
const ci = (id: string, p: any, g: any, availableFrom: Date, status = 'NOT_STARTED', sessionNumber = 2) =>
  ({ id, groundId: g.id, sessionNumber, status, availableFrom, createdAt: availableFrom, isSetup: false, participant: p, ground: g });

function aWorld(over: Partial<Record<string, any[]>> = {}) {
  const w: Record<string, any[]> = {
    organizations: [{ id: 'o1', name: 'Drop Access' }, { id: 'o2', name: 'Bridge Merchant' }],
    checkIns: [
      ci('c1', PETER, G1, MON('05:00')),
      ci('c2', MERCY, G1, MON('05:00')),
      ci('c3', JOSEPH, G1, MON('05:00')),
      ci('c1b', PETER, G1, new Date('2026-10-16T05:00:00Z'), 'COMPLETED', 1),
      ci('c0', MERCY, G1, new Date('2026-10-14T05:00:00Z'), 'COMPLETED', 1),
      ci('c4', GRACE, G3, MON('06:00')),
    ],
    /* Whether somebody answered is whether a reply of theirs exists (Hafsah, 3 November 2026): Joseph answered this week, and Peter's
       and Mercy's first sessions, which they completed, hold their replies. */
    turns: [{ checkInId: 'c3' }, { checkInId: 'c1b' }, { checkInId: 'c0' }],
    sends: [
      { organizationId: 'o1', phone: '+254700000011', checkInId: 'c1', kind: 'checkin-open', sentAt: null, failedAt: MON('05:00'), error: OUTSIDE_THE_WINDOW, createdAt: MON('05:00') },
      { organizationId: 'o1', phone: '+254700000012', checkInId: 'c2', kind: 'checkin-open', sentAt: MON('05:00'), failedAt: null, error: null, createdAt: MON('05:00') },
      { organizationId: 'o1', phone: '+254700000013', checkInId: 'c3', kind: 'checkin-open', sentAt: null, failedAt: MON('05:00'), error: FIRST_CONTACT_NOT_APPROVED, createdAt: MON('05:00') },
      { organizationId: 'o1', phone: '+254700000012', checkInId: 'c2', kind: 'due-tomorrow', sentAt: null, failedAt: MON('07:30'), error: OUTSIDE_THE_WINDOW, createdAt: MON('07:30') },
      /* Held by the one-a-day rule: Groundwork working as it should. */
      { organizationId: 'o1', phone: '+254700000011', checkInId: 'c1', kind: 'overdue', sentAt: null, failedAt: MON('07:30'), error: NOT_TODAY, createdAt: MON('07:30') },
      /* Refused on WhatsApp and went by email instead. */
      { organizationId: 'o1', phone: '+254700000013', checkInId: 'c3', kind: 'closes-soon', sentAt: null, failedAt: MON('07:30'), error: OUTSIDE_THE_WINDOW, createdAt: MON('07:30') },
      { organizationId: 'o1', phone: '+254700000001', checkInId: null, kind: 'lead-summary', sentAt: MON('08:00'), failedAt: null, error: null, createdAt: MON('08:00') },
      { organizationId: 'o2', phone: '+254700000014', checkInId: 'c4', kind: 'checkin-open', sentAt: MON('06:00'), failedAt: null, error: null, createdAt: MON('06:00') },
    ],
    mail: [
      { channel: 'email', toAddress: 'joseph@drop.test', sender: 'sendSessionReady', subject: 'Your next check-in is open: Sales team, Q4', outcome: 'sent', because: null, createdAt: MON('05:30') },
      { channel: 'email', toAddress: 'joseph@drop.test', sender: BY_EMAIL_ROUTINE, subject: 'Your check-in for Sales team, Q4 closes soon', outcome: 'sent', because: null, createdAt: MON('07:31') },
    ],
    grounds: [
      { id: 'g1', label: 'Sales team, Q4', organizationId: 'o1', initiatorId: 'lead1', workingDays: [], status: 'ACTIVE', createdAt: new Date('2026-10-01T08:00:00Z'),
        initiator: { id: 'lead1', firstName: 'Wanjiru', lastName: 'Kamau', email: 'wanjiru@drop.test', phoneNumber: '+254700000001', deletedAt: null, isActive: true },
        participants: [{ partyType: 'INITIATOR', leftAt: null, erasedFrom: null, managingOnly: false }, { partyType: 'PARTICIPANT', leftAt: null, erasedFrom: null, managingOnly: false }] },
      { id: 'g3', label: 'Field sales', organizationId: 'o2', initiatorId: 'lead2', workingDays: [], status: 'ACTIVE', createdAt: new Date('2026-10-01T08:00:00Z'),
        initiator: { id: 'lead2', firstName: 'Amos', lastName: 'Otieno', email: 'amos@bridge.test', phoneNumber: null, deletedAt: null, isActive: true },
        participants: [{ partyType: 'PARTICIPANT', leftAt: null, erasedFrom: null, managingOnly: false }] },
    ],
    people: [],
    settings: [],
  };
  for (const [k, v] of Object.entries(over)) w[k] = v as any[];
  return w;
}

/** A stand-in database that hands back the world's rows; the alert itself keeps only what is about yesterday and the last seven days. */
function aDatabase(w: Record<string, any[]>) {
  return {
    organization: { findMany: jest.fn(async () => w.organizations) },
    checkIn: { findMany: jest.fn(async (args: any) => (args?.where?.id?.in ? w.checkIns.filter((c) => args.where.id.in.includes(c.id)) : w.checkIns)) },
    conversationTurn: { findMany: jest.fn(async () => w.turns) },
    whatsAppSend: { findMany: jest.fn(async () => w.sends) },
    notification: { findMany: jest.fn(async () => w.mail) },
    ground: { findMany: jest.fn(async () => w.grounds) },
    person: { findMany: jest.fn(async () => w.people) },
    groundParticipant: { findMany: jest.fn(async () => []) },
    leaveRequest: { findMany: jest.fn(async () => []) },
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => w.settings.find((s) => s.key === where.key) ?? null) },
  };
}

const anEmailDoor = () => ({ sendTheDailyDeliveryAlert: jest.fn(async () => ({ sent: true })) });
const ADDRESS = { DELIVERY_ALERT_EMAIL: 'ops@myground.work' };

async function theEmail(w = aWorld()) {
  const email = anEmailDoor();
  const done = await sendTheDailyDeliveryAlert({ prisma: aDatabase(w), email, env: ADDRESS }, NOW);
  const call = (email.sendTheDailyDeliveryAlert.mock.calls[0] ?? []) as any[];
  return { done, email, to: call[0] as string, subject: call[1] as string, html: call[2] as string, text: call[3] as string };
}

describe('the daily delivery alert, as Hafsah reads it on Tuesday 20 October', () => {
  it('reads Monday 19 October, the Nairobi day before', () => {
    const { from, to } = yesterdayInNairobi(NOW);
    expect(from.toISOString()).toBe('2026-10-18T21:00:00.000Z');
    expect(to.toISOString()).toBe('2026-10-19T21:00:00.000Z');
  });

  it('is one email to the platform address, with the clients counted in the subject', async () => {
    const { done, to, subject } = await theEmail();
    expect(done.sent).toBe(true);
    expect(to).toBe('ops@myground.work');
    expect(subject).toBe('Groundwork: 2 clients had messages that did not go out yesterday');
    if (process.env.PRINT_THE_ALERT) process.stdout.write(`\nSUBJECT ${subject}\n\n${(await theEmail()).text}\n`);
  });

  it('reports an opening refused on WhatsApp with no email, with the reason in plain words', async () => {
    const { text } = await theEmail();
    expect(text).toContain("Peter Njoroge's opening for Sales team, Q4 did not go out on Monday 19 October. WhatsApp did not send it because it was outside the 24-hour window and there is no approved template for this message. No email went instead.");
  });

  it('does not report an opening that went on WhatsApp, or one that went by email instead', async () => {
    const { text } = await theEmail();
    expect(text).not.toContain("Mercy Wanjiru's opening");
    expect(text).not.toContain("Joseph Kariuki's opening");
  });

  it('does not report an opening that went by email instead, even when the person has not answered yet, and does once the email is gone', async () => {
    const w = aWorld({ turns: [] });
    expect((await theEmail(w)).text).not.toContain("Joseph Kariuki's opening");
    w.mail = w.mail.filter((m) => m.sender !== 'sendSessionReady');
    expect((await theEmail(w)).text).toContain("Joseph Kariuki's opening for Sales team, Q4 did not go out on Monday 19 October. WhatsApp did not send it because it was the first message to this number and the first-contact template is not approved yet. No email went instead.");
  });

  it('reports an opening nothing was tried for, on either channel', async () => {
    const w = aWorld();
    w.sends = w.sends.filter((s) => s.checkInId !== 'c1');
    const { text } = await theEmail(w);
    expect(text).toContain("Peter Njoroge's opening for Sales team, Q4 did not go out on Monday 19 October. Nothing was tried on WhatsApp. No email was sent either.");
  });

  it('reports a reminder that did not go, but not one held by the one-a-day rule or one that went by email instead', async () => {
    const { text } = await theEmail();
    expect(text).toContain("Mercy Wanjiru's reminder that the check-in for Sales team, Q4 is due tomorrow did not go out on Monday 19 October. WhatsApp did not send it because it was outside the 24-hour window and there is no approved template for this message. No email went instead.");
    expect(text).not.toContain('is late');
    expect(text).not.toContain('closes soon');
  });

  it('reports a lead whose morning summary did not go, and not a lead who had it on WhatsApp', async () => {
    const { text } = await theEmail();
    expect(text).toContain("Amos Otieno's morning summary for Field sales did not go out on Monday 19 October. Groundwork did not try to send it, so either it found nothing to tell them or the morning job did not run.");
    expect(text).not.toContain("Wanjiru Kamau's morning summary");
  });

  it('says why a morning summary refused on WhatsApp and by email did not go', async () => {
    const w = aWorld();
    w.sends = w.sends.map((s) => (s.kind === 'lead-summary' ? { ...s, sentAt: null, failedAt: MON('08:00'), error: OUTSIDE_THE_WINDOW } : s));
    w.mail = [...w.mail, { channel: 'email', toAddress: 'wanjiru@drop.test', sender: 'sendTheLeadsDailyNudge', subject: 'Three things need you today', outcome: 'failed', because: 'validation_error: The domain is not verified', createdAt: MON('08:01') }];
    const { text } = await theEmail(w);
    expect(text).toContain("Wanjiru Kamau's morning summary for Sales team, Q4 did not go out on Monday 19 October. WhatsApp did not send it because it was outside the 24-hour window and there is no approved template for this message. The email service refused the email and said \"validation_error: The domain is not verified\".");
  });

  it('reports a check-in nobody answered, and not one somebody answered', async () => {
    const { text } = await theEmail();
    expect(text).toContain('Nobody answered the check-in for Field sales that opened on Monday 19 October. It went to Grace Akinyi.');
    expect(text).not.toContain('Nobody answered the check-in for Sales team, Q4');
  });

  it("gives each person's answers over the last seven days, for each organisation with a problem", async () => {
    const found = await whatWentWrongYesterday(aDatabase(aWorld()), NOW);
    const drop = found.organisations.find((o) => o.name === 'Drop Access')!;
    expect(drop.rates).toEqual([
      { name: 'Mercy Wanjiru', opened: 2, answered: 1, notAnswered: 1, percent: 50 },
      { name: 'Peter Njoroge', opened: 2, answered: 1, notAnswered: 1, percent: 50 },
      { name: 'Joseph Kariuki', opened: 1, answered: 1, notAnswered: 0, percent: 100 },
    ]);
    const { text, html } = await theEmail();
    expect(text).toContain('How each person at Drop Access answered in the last 7 days');
    expect(text).toContain('- Peter Njoroge was sent 2 check-ins and answered 1, so 1 was not answered (50 percent answered).');
    expect(text).toContain('- Joseph Kariuki was sent 1 check-in and answered it.');
    expect(text).toContain('- Grace Akinyi was sent 1 check-in and did not answer it.');
    /* UPDATED 20 October (the kit's design everywhere): the header's line is the kit's warm rule (#EDE5D6), not grey #ccc. Only the colour changed. */
    expect(html).toContain('<th style="text-align:left;padding:4px 10px 4px 0;border-bottom:1px solid #EDE5D6;font-size:13px">Not answered</th>');
    expect(html).toMatch(/<td[^>]*>Grace Akinyi<\/td><td[^>]*>1<\/td><td[^>]*>0<\/td><td[^>]*>1<\/td><td[^>]*>0<\/td>/);
  });

  it('escapes what it puts in the HTML', () => {
    const mail = theAlertEmail({ day: 'Monday 19 October', organisations: [{ organizationId: 'o', name: 'A <b>bold</b> & Co', problems: [{ kind: 'opening', sentence: 'x' }], rates: [] }] })!;
    expect(mail.html).toContain('A &lt;b&gt;bold&lt;/b&gt; &amp; Co');
    expect(mail.html).not.toContain('<b>bold</b>');
  });

  it('sends nothing when nothing went wrong', async () => {
    const w = aWorld({ checkIns: [], sends: [w0LeadSummary()], mail: [] });
    w.grounds = w.grounds.slice(0, 1);
    const { done, email } = await theEmail(w);
    expect(done.sent).toBe(false);
    expect(email.sendTheDailyDeliveryAlert).not.toHaveBeenCalled();
  });

  it('sends nothing, and reads nothing, while no address is set', async () => {
    const db = aDatabase(aWorld());
    const email = anEmailDoor();
    const done = await sendTheDailyDeliveryAlert({ prisma: db, email, env: {} }, NOW);
    expect(done).toEqual(expect.objectContaining({ sent: false, to: null }));
    expect(email.sendTheDailyDeliveryAlert).not.toHaveBeenCalled();
    expect(db.checkIn.findMany).not.toHaveBeenCalled();
  });

  it('uses the address saved in the back office before the server setting', async () => {
    const w = aWorld({ settings: [{ key: DELIVERY_ALERT_KEY, value: 'hafsah@myground.work' }] });
    expect(await theDeliveryAlertAddress(aDatabase(w), ADDRESS)).toEqual({ email: 'hafsah@myground.work', from: 'here' });
    expect(await theDeliveryAlertAddress(aDatabase(aWorld({ settings: [{ key: DELIVERY_ALERT_KEY, value: '' }] })), ADDRESS)).toEqual({ email: 'ops@myground.work', from: 'server' });
  });

  it('goes as operational mail, which no client preference or quiet hour holds', () => {
    expect(whatThisMailIs('sendTheDailyDeliveryAlert')).toBe('operational');
  });

  it('runs from the cron, which sends what the alert found', async () => {
    const email = anEmailDoor();
    const prev = process.env.DELIVERY_ALERT_EMAIL;
    process.env.DELIVERY_ALERT_EMAIL = 'ops@myground.work';
    try {
      const cron = new TheDailyDeliveryAlertCron(aDatabase(aWorld()) as any, email as any);
      const done = await cron.sendNow(NOW);
      expect(done.sent).toBe(true);
      expect(email.sendTheDailyDeliveryAlert).toHaveBeenCalledTimes(1);
    } finally {
      if (prev === undefined) delete process.env.DELIVERY_ALERT_EMAIL; else process.env.DELIVERY_ALERT_EMAIL = prev;
    }
  });

  it('is set in the back office, and an address that is not one is refused in a sentence', async () => {
    const upsert = jest.fn(async () => ({}));
    const prisma: any = { platformSetting: { upsert, findUnique: jest.fn(async () => ({ key: DELIVERY_ALERT_KEY, value: 'hafsah@myground.work' })) } };
    const admin = new AdminService(prisma, {} as any, {} as any);
    await expect(admin.setDeliveryAlert('not an address', 'admin1')).rejects.toThrow('That needs to be one email address, for example ops@myground.work.');
    expect(await admin.setDeliveryAlert(' hafsah@myground.work ', 'admin1')).toEqual({ email: 'hafsah@myground.work', from: 'here' });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ key: DELIVERY_ALERT_KEY, value: 'hafsah@myground.work' }) }));
  });
});

function w0LeadSummary() {
  return { organizationId: 'o1', phone: '+254700000001', checkInId: null, kind: 'lead-summary', sentAt: MON('08:00'), failedAt: null, error: null, createdAt: MON('08:00') };
}

describe('the daily delivery alert, as it leaves through the one door every email goes through', () => {
  it('reaches the platform address with its own text part, the table in the HTML, and no way out a client mail would carry', async () => {
    const { subject, html, text } = await theEmail();
    const sent: any[] = [];
    const prisma: any = { notification: { create: jest.fn(async () => ({})) } };
    const door: any = new EmailService({ get: () => undefined } as any, { recordSend: jest.fn(async () => undefined) } as any, prisma);
    jest.spyOn(door, 'isDev').mockReturnValue(false);
    jest.spyOn(door, 'theResendClient').mockReturnValue({ emails: { send: jest.fn(async (o: any) => { sent.push(o); return { data: { id: 'r1' }, error: null }; }) } });
    expect(await door.sendTheDailyDeliveryAlert('ops@myground.work', subject, html, text)).toEqual({ sent: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('ops@myground.work');
    expect(sent[0].subject).toBe('Groundwork: 2 clients had messages that did not go out yesterday');
    expect(sent[0].text).toBe(text);
    expect(sent[0].html).toContain('<table');
    expect(sent[0].html).not.toMatch(/unsubscribe/i);
    expect(sent[0].headers).toBeUndefined();
    expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sender: 'sendTheDailyDeliveryAlert', outcome: 'sent', toAddress: 'ops@myground.work' }) }));
  });
});

describe('the daily delivery alert, in plain words', () => {
  it('holds every sentence to the same wording rules as the board and the reports', async () => {
    const { text } = await theEmail();
    const lines = text.split('\n').map((l) => l.replace(/^- /, '').trim())/* The headings (an organisation's name, "Openings that did not go out") are headings; everything else is a sentence. */
      .filter((l) => /[.!?]$/.test(l));
    expect(lines.length).toBeGreaterThan(8);
    const faults = lines.flatMap((l) => whatIsNotPlainIn(l, { whole: true }).map((f) => `${f.rule}: ${f.found} in "${l}"`));
    expect(faults).toEqual([]);
  });
});

/*
 * NUDGES THAT GET ANSWERS (20 October 2026). The lead's own nudge is not a routine message: a nudge row, sent or not, is never reported as
 * a reminder that did not go out, and a nudge that went never counts as the person's opening having reached them. A message not sent
 * after two missed days (never-the-same-words-twice.ts) is reported as that choice, under its own heading, never as "did not go out".
 */
describe('the lead’s own nudge, and a message not sent on purpose', () => {
  const THE_SAME = 'Not sent again: they had not checked in for 2 days or more, and these were the same words as the last message they were sent.';
  it('a nudge from the lead, sent or refused, is not reported as a reminder that did not go out, and is not Peter’s opening', async () => {
    const w = aWorld();
    w.sends.push(
      { organizationId: 'o1', phone: '+254700000011', checkInId: 'c1', kind: 'lead-nudge', sentAt: MON('12:30'), failedAt: null, error: null, createdAt: MON('12:30') },
      { organizationId: 'o1', phone: '+254700000012', checkInId: 'c2', kind: 'lead-nudge:template', sentAt: null, failedAt: MON('12:31'), error: OUTSIDE_THE_WINDOW, createdAt: MON('12:31') },
    );
    w.mail.push({ channel: 'email', toAddress: 'mercy@drop.test', sender: 'sendTheLeadsNudge', subject: 'Wanjiru has a question for you today', outcome: 'failed', because: 'validation_error: x', createdAt: MON('12:32') });
    const { text } = await theEmail(w);
    expect(text).not.toMatch(/nudge|question for you today/i);
    /* Peter's opening still did not reach him, whatever the nudge did. */
    expect(text).toContain("Peter Njoroge's opening for Sales team, Q4 did not go out on Monday 19 October.");
  });

  it('an opening not sent after two missed days is said as that choice, and not as an opening that did not go out', async () => {
    const w = aWorld();
    w.sends = w.sends.filter((s) => s.checkInId !== 'c1');
    w.mail.push({ channel: 'whatsapp', toAddress: 'peter@drop.test', sender: 'checkin-open', subject: null, outcome: 'skipped', because: THE_SAME, createdAt: MON('05:00') });
    const { text, html } = await theEmail(w);
    expect(text).not.toContain("Peter Njoroge's opening for Sales team, Q4 did not go out");
    expect(text).toContain('Messages not sent on purpose');
    expect(text).toContain("Groundwork did not send Peter Njoroge's opening for Sales team, Q4 on Monday 19 October, on purpose. Peter had not checked in for 2 days or more, and it would have said the same words as the last message Peter was sent.");
    const said = text.split('\n').find((l) => l.includes('on purpose.'))!.replace(/^- /, '');
    expect(whatIsNotPlainIn(said, { whole: true })).toEqual([]);
    expect(html).toContain('Messages not sent on purpose');
  });

  it('a reminder not sent after two missed days is said as that choice too, and each person’s week is still there', async () => {
    const w = aWorld();
    w.mail.push({ channel: 'whatsapp', toAddress: 'mercy@drop.test', sender: 'overdue', subject: null, outcome: 'skipped', because: THE_SAME, createdAt: MON('08:30') });
    const { text } = await theEmail(w);
    expect(text).toContain("Groundwork did not send Mercy Wanjiru's reminder that their check-in is late on Monday 19 October, on purpose. Mercy had not checked in for 2 days or more, and it would have said the same words as the last message Mercy was sent.");
    expect(text).toContain('How each person at Drop Access answered in the last 7 days');
  });
});
