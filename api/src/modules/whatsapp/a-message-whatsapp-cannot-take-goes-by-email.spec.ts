import { WhatsAppService } from './whatsapp.service';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TEMPLATES, fill, THE_NAMES_TO_SUBMIT, THE_FOUR_OF_19_OCTOBER, THE_ONE_OF_21_OCTOBER, THE_ONE_OF_4_NOVEMBER, THE_NAMES_WE_MAY_USE, FIRST_MESSAGES, theTemplateToUse } from './a-message-outside-the-window';
import { theReminderBody } from '../grounds/what-is-sent-in-simpler-words';
import { THANKS_YOUR_ANSWER_IS_IN } from '../public-api/a-whatsapp-message-is-routed';
import { ROUTINE_EMAILS } from '../engagement/one-routine-message-a-day';
import { BY_EMAIL_ROUTINE, BY_EMAIL_AFTER_THEIR_OWN, theWordsForAnEmail } from './by-email-instead';
import { itIsDueTomorrow, theCheckInIsOpen } from './what-goes-to-a-phone';

/**
 * A MESSAGE WHATSAPP CANNOT TAKE GOES BY EMAIL INSTEAD, AND THE FOUR TEMPLATES OF 19 OCTOBER GO ONLY ONCE THEY ARE LISTED
 * (Hafsah, 19 October, points 2 and 11; docs/whatsapp-templates.md).
 *
 * The messages test of 19 October, Muchemi & Co.: Brian Otieno finished his check-in on Monday 12 October at 11:38. His thank-you,
 * "Thank you, your answer for Fee notes is in. ...", was written down as "Outside the 24-hour service window and no approved template
 * for this message; not sent", and he heard nothing at all. Read here as Brian reads his mailbox and his phone.
 */
const DAYS_AGO = (n: number) => new Date(Date.now() - n * 86_400_000);

function aSender(o: { approved?: string[]; lastWrote?: Date | null; saidNotNow?: boolean; openingEmailed?: boolean } = {}) {
  const told = new Map<string, any>();
  const rows: any[] = [];
  const prisma: any = {
    platformSetting: {
      findUnique: jest.fn(async (q: any) => (String(q?.where?.key ?? '').startsWith('engagement.once.') ? (told.has(q.where.key) ? { value: told.get(q.where.key) } : null) : { value: true })),
      create: jest.fn(async (q: any) => { told.set(q.data.key, q.data.value); return {}; }),
      update: jest.fn(async () => ({})),
    },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    organization: { findUnique: jest.fn(async () => ({ name: 'Muchemi & Co (test)', whatsappAddOnOn: true })), findMany: jest.fn(async () => []) },
    person: {
      findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: o.lastWrote === undefined ? DAYS_AGO(3) : o.lastWrote, email: 'brian@muchemi.test' })),
      findMany: jest.fn(async () => []),
    },
    user: { findMany: jest.fn(async () => []) },
    checkIn: { findUnique: jest.fn(async () => ({ id: 'ci-brian', createdAt: DAYS_AGO(1), participantId: 'p-brian', participant: { email: 'brian@muchemi.test', user: { email: 'brian@muchemi.test' } } })) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => ({ messageId: 'ours:+254700400002:x' })) },
    whatsAppSend: {
      create: jest.fn(async (q: any) => { rows.push(q.data); return {}; }),
      findMany: jest.fn(async () => (o.saidNotNow ? [{ kind: 'not-now' }] : [])),
      findFirst: jest.fn(async (q: any) => (q?.where?.kind?.in ? null : { id: 'earlier' })),
    },
    notification: {
      create: jest.fn(async () => ({})),
      findFirst: jest.fn(async () => (o.openingEmailed ? { id: 'the-invitation' } : null)),
    },
  };
  const approved = o.approved ?? THE_NAMES_TO_SUBMIT;
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111', 'whatsapp.approvedTemplates': approved, 'resend.frontendUrl': 'https://myground.work' } as any)[k] };
  const mails: { to: string; subject: string; text: string; sender: string; link: any }[] = [];
  const as = (sender: string) => jest.fn(async (to: string, subject: string, text: string, label: string | null, url: string | null) => { mails.push({ to, subject, text, sender, link: url ? { label, url } : null }); return 'sent'; });
  const email: any = { sendTheRoutineMessageByEmail: as('sendTheRoutineMessageByEmail'), sendTheMessageByEmail: as('sendTheMessageByEmail'), sendTheAnswerByEmail: as('sendTheAnswerByEmail') };
  return { wa: new WhatsAppService(config, prisma, undefined, email), rows, mails };
}

describe('a message WhatsApp cannot take goes by email instead (point 2)', () => {
  const realFetch = (global as any).fetch;
  let fetchSpy: jest.Mock;
  beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200, text: async () => '{"messages":[{"id":"wamid.1"}]}' })); (global as any).fetch = fetchSpy; });
  afterEach(() => { (global as any).fetch = realFetch; });

  it("Brian's thank-you, which fell outside the 24 hours with no template, reaches his mailbox in the same words", async () => {
    const { wa, rows, mails } = aSender();
    const r = await wa.sendFor('org-muchemi', '+254700400002', THANKS_YOUR_ANSWER_IS_IN('Fee notes'), { checkInId: 'ci-brian', kind: 'report-thanks' });
    expect(r.sent).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(rows[0].error).toBe('Outside the 24-hour service window and no approved template for this message; not sent');
    expect(mails).toEqual([{
      to: 'brian@muchemi.test',
      subject: 'Thank you, your answer for Fee notes is in',
      text: 'Thank you, your answer for Fee notes is in. The shared picture is made once everyone has answered, and you will be told as soon as there is something to read.',
      sender: BY_EMAIL_AFTER_THEIR_OWN,
      link: null,
    }]);
  });

  it('one email for one message: the report and its retry are one, and the thank-you is said once', async () => {
    const { wa, mails } = aSender({ approved: [] });
    await wa.sendFor('org-muchemi', '+254700400002', 'Your report for Fee notes is ready. Two things are agreed. Open Groundwork to read it.', { checkInId: 'ci-brian', kind: 'report' });
    await wa.sendFor('org-muchemi', '+254700400002', 'Your report for Fee notes is ready. Two things are agreed. Open Groundwork to read it.', { checkInId: 'ci-brian', kind: 'report-retry' });
    await wa.sendFor('org-muchemi', '+254700400002', THANKS_YOUR_ANSWER_IS_IN('Fee notes'), { checkInId: 'ci-brian', kind: 'report-thanks' });
    await wa.sendFor('org-muchemi', '+254700400002', THANKS_YOUR_ANSWER_IS_IN('Fee notes'), { checkInId: 'ci-brian', kind: 'report-thanks' });
    expect(mails.map((m) => m.subject)).toEqual(['Your report for Fee notes is ready', 'Thank you, your answer for Fee notes is in']);
  });

  it('a reminder says what an email can say, links to the check-in, and is the day\'s one routine message', async () => {
    const { wa, mails } = aSender({ approved: [] });
    const said = itIsDueTomorrow({ firstName: 'Amos', label: 'Sales team, Q4' }, new Date('2026-10-13T09:00:00Z'));
    await wa.sendFor('org-drop', '+254700300007', said.text, { checkInId: 'ci-amos', kind: said.kind, params: said.params });
    expect(mails[0].text).toBe('Hi Amos, your check-in for Sales team, Q4 is due tomorrow, Tuesday 13 October. You can answer it in Groundwork whenever suits you before then.');
    expect(mails[0].link).toEqual({ label: 'Open your check-in', url: 'https://myground.work/checkin/ci-amos' });
    expect(mails[0].sender).toBe(BY_EMAIL_ROUTINE);
    expect(ROUTINE_EMAILS.has(BY_EMAIL_ROUTINE)).toBe(true);
  });

  it('one channel per opening: an opening already told by email is not emailed again', async () => {
    const { wa, mails } = aSender({ approved: [], openingEmailed: true });
    const said = theCheckInIsOpen({ firstName: 'Brian', label: 'Fee notes' });
    await wa.sendFor('org-muchemi', '+254700400002', said.text, { checkInId: 'ci-brian', kind: said.kind, params: said.params });
    expect(mails).toEqual([]);
  });

  it('never for a message that already has an email of its own, nor for one the day\'s rules held back', async () => {
    const { wa, mails } = aSender();
    await wa.sendFor('org-muchemi', '+254700400001', 'Good morning Wanjiru. Here is what is outstanding today.', { kind: 'lead-summary', params: ['Wanjiru', 'x', 'y'] });
    expect(mails).toEqual([]);
    const held = aSender({ saidNotNow: true, approved: [] });
    const said = itIsDueTomorrow({ firstName: 'Brian', label: 'Fee notes' }, new Date('2026-10-13T09:00:00Z'));
    expect((await held.wa.sendFor('org-muchemi', '+254700400002', said.text, { checkInId: 'ci-brian', kind: said.kind, params: said.params })).error).toBe('This person replied "Not now" today; not sent');
    expect(held.mails).toEqual([]);
  });

  it('inside the 24 hours it goes on WhatsApp as before, and nothing by email', async () => {
    const { wa, mails } = aSender({ lastWrote: new Date(Date.now() - 60_000) });
    expect((await wa.sendFor('org-muchemi', '+254700400002', THANKS_YOUR_ANSWER_IS_IN('Fee notes'), { checkInId: 'ci-brian', kind: 'report-thanks' })).sent).toBe(true);
    expect(mails).toEqual([]);
  });

  it('the words an email cannot say are said the way an email says them, and nothing else changes', () => {
    expect(theWordsForAnEmail('Hi Mercy, your check-in for Sales team, Q4 is open. It takes about ten minutes, and you can answer right here. Reply START to begin.'))
      .toBe('Hi Mercy, your check-in for Sales team, Q4 is open. It takes about ten minutes, and you can answer it in Groundwork.');
  });
});

describe('the four templates of 19 October, each only once it is listed (point 11)', () => {
  const realFetch = (global as any).fetch;
  let fetchSpy: jest.Mock;
  beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200, text: async () => '{"messages":[{"id":"wamid.1"}]}' })); (global as any).fetch = fetchSpy; });
  afterEach(() => { (global as any).fetch = realFetch; });
  const sent = () => JSON.parse(fetchSpy.mock.calls[0][1].body);
  const read = (body: any, t: { body: string }) => fill(t.body, body.template.components[0].parameters.map((p: any) => p.text));

  it('hold the words of docs/whatsapp-templates.md exactly, and may be listed', () => {
    expect(THE_FOUR_OF_19_OCTOBER.checkInOpen.body).toBe('Hi {{1}}, your check-in for {{2}} is open. It takes about ten minutes, and you can answer right here. Reply START to begin.');
    expect(THE_FOUR_OF_19_OCTOBER.thanks.body).toBe("Thank you, {{1}}. Your answer for {{2}} is in. You will hear here when the team's report is ready to read.");
    expect(THE_FOUR_OF_19_OCTOBER.yourReport.body).toBe('Hi {{1}}, your own report for {{2}} is ready. It shows what you did, what is still open and what to do next. Open it here: {{3}} . Reply STOP to stop these messages.');
    expect(THE_FOUR_OF_19_OCTOBER.promiseDue.body).toBe('Hi {{1}}, you said you would {{2}} by {{3}}. Reply DONE if it is done, or tell me what changed.');
    expect(THE_NAMES_WE_MAY_USE).toEqual(expect.arrayContaining(['groundwork_checkin_open_v2', 'groundwork_checkin_thanks', 'groundwork_your_report_ready', 'groundwork_promise_due']));
    /* No approved template is changed: checkin_open still says what Meta approved. */
    expect(TEMPLATES['checkin-open'].body).toBe('Hi {{1}}, your check-in for {{2}} is open. It takes about five minutes, and you can answer right here. Reply START to begin.');
  });

  it('checkin_open stays in use until groundwork_checkin_open_v2 is approved and listed', async () => {
    const said = theCheckInIsOpen({ firstName: 'Mercy', label: 'Sales team, Q4' });
    const before = aSender({ approved: THE_NAMES_TO_SUBMIT });
    await before.wa.sendFor('org-drop', '+254700300003', said.text, { checkInId: 'ci-mercy', kind: said.kind, params: said.params });
    expect(sent().template.name).toBe('checkin_open');
    fetchSpy.mockClear();
    const after = aSender({ approved: [...THE_NAMES_TO_SUBMIT, 'groundwork_checkin_open_v2'] });
    await after.wa.sendFor('org-drop', '+254700300003', said.text, { checkInId: 'ci-mercy', kind: said.kind, params: said.params });
    expect(sent().template.name).toBe('groundwork_checkin_open_v2');
    expect(read(sent(), THE_FOUR_OF_19_OCTOBER.checkInOpen)).toBe('Hi Mercy, your check-in for Sales team, Q4 is open. It takes about ten minutes, and you can answer right here. Reply START to begin.');
  });

  it("Brian's thank-you goes as groundwork_checkin_thanks once it is listed, and then nothing goes by email", async () => {
    const { wa, mails } = aSender({ approved: ['groundwork_checkin_thanks'] });
    const r = await wa.sendFor('org-muchemi', '+254700400002', THANKS_YOUR_ANSWER_IS_IN('Fee notes'), { checkInId: 'ci-brian', kind: 'report-thanks', paramsFor: { groundwork_checkin_thanks: ['Brian', 'Fee notes'] } });
    expect(r.sent).toBe(true);
    expect(read(sent(), THE_FOUR_OF_19_OCTOBER.thanks)).toBe("Thank you, Brian. Your answer for Fee notes is in. You will hear here when the team's report is ready to read.");
    expect(mails).toEqual([]);
  });

  it('a template whose blanks the message does not carry is never sent half empty', () => {
    expect(theTemplateToUse('report-thanks', ['groundwork_checkin_thanks'], {})).toBeNull();
    expect(theTemplateToUse('anchor-follow-up', ['groundwork_promise_due'], { params: ['Joseph', 'bring the samples', 'Sales team, Q4'] })).toBeNull();
    expect(theTemplateToUse('report', ['groundwork_your_report_ready', 'groundwork_report_ready'], { params: ['Fee notes', 'Two things are agreed.'] })?.template.name).toBe('groundwork_report_ready');
    expect(theTemplateToUse('report', ['groundwork_your_report_ready'], { paramsFor: { groundwork_your_report_ready: ['Brian', 'Fee notes', 'https://myground.work/checkin/ci-brian/report'] } })?.params)
      .toEqual(['Brian', 'Fee notes', 'https://myground.work/checkin/ci-brian/report']);
  });

  it('none is used while WHATSAPP_APPROVED_TEMPLATES does not list it, which is today', () => {
    for (const kind of ['checkin-open', 'report-thanks', 'report', 'anchor-follow-up']) {
      const t = theTemplateToUse(kind, THE_NAMES_TO_SUBMIT, { params: ['a', 'b', 'c'], paramsFor: { groundwork_checkin_thanks: ['a', 'b'], groundwork_your_report_ready: ['a', 'b', 'c'], groundwork_promise_due: ['a', 'b', 'c'] } });
      expect(String(t?.template.name ?? '')).not.toMatch(/^groundwork_(checkin_open_v2|checkin_thanks|your_report_ready|promise_due)$/);
    }
  });
});

/*
 * THE TEMPLATE OF 21 OCTOBER (Hafsah's answers of 21 October): groundwork_checkin_closes_soon_v2 replaces checkin_closes_soon once it is
 * approved and listed, outside the 24 hours only. Read as Mercy reads her phone.
 */
describe('the closing reminder of 21 October, only once it is listed', () => {
  const realFetch = (global as any).fetch;
  let fetchSpy: jest.Mock;
  beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200, text: async () => '{"messages":[{"id":"wamid.1"}]}' })); (global as any).fetch = fetchSpy; });
  afterEach(() => { (global as any).fetch = realFetch; });
  const sent = () => JSON.parse(fetchSpy.mock.calls[0][1].body);
  const read = (body: any, t: { body: string }) => fill(t.body, body.template.components[0].parameters.map((p: any) => p.text));
  const params = ['Mercy', 'Sales team, Q4', '6pm'];
  const text = fill(theReminderBody('closes-soon', TEMPLATES['closes-soon'].body), params);

  it('holds the words of docs/whatsapp-templates.md exactly, may be listed, and checkin_closes_soon is unchanged', () => {
    expect(THE_ONE_OF_21_OCTOBER.closesSoon.name).toBe('groundwork_checkin_closes_soon_v2');
    expect(THE_ONE_OF_21_OCTOBER.closesSoon.body).toBe('Hi {{1}}, your check-in for {{2}} closes at {{3}}. It takes about ten minutes, and you can answer right here.');
    expect(THE_NAMES_WE_MAY_USE).toContain('groundwork_checkin_closes_soon_v2');
    expect(THE_NAMES_TO_SUBMIT).not.toContain('groundwork_checkin_closes_soon_v2');
    expect(TEMPLATES['closes-soon'].body).toBe('Hi {{1}}, your check-in for {{2}} closes in an hour, at {{3}}. Five minutes now means your view is part of this round.');
    const doc = readFileSync(join(__dirname, '..', '..', '..', '..', 'docs', 'whatsapp-templates.md'), 'utf8');
    const section = doc.slice(doc.indexOf('### 5. groundwork_checkin_closes_soon_v2'));
    expect(/- \*\*Body:\*\*\s*(.+)/.exec(section)![1].trim()).toBe(THE_ONE_OF_21_OCTOBER.closesSoon.body);
    expect(section).toMatch(/\*\*Category:\*\* Utility/);
    expect(section).toContain('{{1}} = Mercy; {{2}} = Sales team, Q4; {{3}} = 6pm');
  });

  it('checkin_closes_soon goes as today until groundwork_checkin_closes_soon_v2 is approved and listed', async () => {
    const before = aSender({ approved: THE_NAMES_TO_SUBMIT });
    await before.wa.sendFor('org-drop', '+254700300003', text, { checkInId: 'ci-mercy', kind: 'closes-soon', params });
    expect(sent().template.name).toBe('checkin_closes_soon');
    expect(read(sent(), TEMPLATES['closes-soon'])).toBe('Hi Mercy, your check-in for Sales team, Q4 closes in an hour, at 6pm. Five minutes now means your view is part of this round.');
    fetchSpy.mockClear();
    const after = aSender({ approved: [...THE_NAMES_TO_SUBMIT, 'groundwork_checkin_closes_soon_v2'] });
    await after.wa.sendFor('org-drop', '+254700300003', text, { checkInId: 'ci-mercy', kind: 'closes-soon', params });
    expect(sent().template.name).toBe('groundwork_checkin_closes_soon_v2');
    expect(read(sent(), THE_ONE_OF_21_OCTOBER.closesSoon)).toBe('Hi Mercy, your check-in for Sales team, Q4 closes at 6pm. It takes about ten minutes, and you can answer right here.');
  });

  it('inside the 24 hours the reminder goes as an ordinary message, as before, even once it is listed', async () => {
    const { wa } = aSender({ approved: [...THE_NAMES_TO_SUBMIT, 'groundwork_checkin_closes_soon_v2'], lastWrote: new Date(Date.now() - 60 * 60 * 1000) });
    await wa.sendFor('org-drop', '+254700300003', text, { checkInId: 'ci-mercy', kind: 'closes-soon', params });
    expect(sent().type).toBe('text');
    expect(sent().text.body).toBe('Hi Mercy, your check-in for Sales team, Q4 closes in an hour, at 6pm. About ten minutes now means your view is part of this round.');
  });

  it('it is never sent with a blank missing, and it counts towards the messages Groundwork writes first that day', () => {
    expect(theTemplateToUse('closes-soon', ['groundwork_checkin_closes_soon_v2'], { params: ['Mercy', 'Sales team, Q4'] })).toBeNull();
    expect(theTemplateToUse('closes-soon', ['groundwork_checkin_closes_soon_v2', 'checkin_closes_soon'], { params: ['Mercy', 'Sales team, Q4'] })?.template.name).toBe('checkin_closes_soon');
    expect(FIRST_MESSAGES.has('closes-soon')).toBe(true);
  });
});

/*
 * THE TEMPLATE OF 4 NOVEMBER (Hafsah's answer 5 of 4 November): groundwork_checkin_your_view_matters_v2 replaces checkin_your_view_matters,
 * which says "about five minutes", once it is approved and listed, outside the 24 hours only. The lead's own nudge goes as it too. Read as
 * Mercy reads her phone.
 */
describe('the chase of 4 November, only once it is listed', () => {
  const realFetch = (global as any).fetch;
  let fetchSpy: jest.Mock;
  beforeEach(() => { fetchSpy = jest.fn(async () => ({ ok: true, status: 200, text: async () => '{"messages":[{"id":"wamid.1"}]}' })); (global as any).fetch = fetchSpy; });
  afterEach(() => { (global as any).fetch = realFetch; });
  const sent = () => JSON.parse(fetchSpy.mock.calls[0][1].body);
  const read = (body: any, t: { body: string }) => fill(t.body, body.template.components[0].parameters.map((p: any) => p.text));
  const params = ['Mercy', 'Sales team, Q4', 'Grace'];
  const text = fill(theReminderBody('your-view-matters', TEMPLATES['your-view-matters'].body), params);
  const V2 = 'groundwork_checkin_your_view_matters_v2';

  it('holds the words of docs/whatsapp-templates.md exactly, may be listed, and checkin_your_view_matters is unchanged', () => {
    expect(THE_ONE_OF_4_NOVEMBER.yourViewMatters.name).toBe(V2);
    expect(THE_ONE_OF_4_NOVEMBER.yourViewMatters.body).toBe("Hi {{1}}, your check-in for {{2}} is still waiting. Your answers help {{3}} understand what's in your way, and where they can help. It takes about ten minutes, and you can answer here.");
    expect(THE_NAMES_WE_MAY_USE).toContain(V2);
    expect(THE_NAMES_TO_SUBMIT).not.toContain(V2);
    expect(TEMPLATES['your-view-matters'].name).toBe('checkin_your_view_matters');
    const doc = readFileSync(join(__dirname, '..', '..', '..', '..', 'docs', 'whatsapp-templates.md'), 'utf8');
    const section = doc.slice(doc.indexOf(`### 6. ${V2}`));
    expect(/- \*\*Body:\*\*\s*(.+)/.exec(section)![1].trim()).toBe(THE_ONE_OF_4_NOVEMBER.yourViewMatters.body);
    expect(section).toMatch(/\*\*Category:\*\* Utility/);
  });

  it('checkin_your_view_matters goes as today until the new one is approved and listed, and then the new one goes', async () => {
    const before = aSender({ approved: THE_NAMES_TO_SUBMIT });
    await before.wa.sendFor('org-drop', '+254700300003', text, { checkInId: 'ci-mercy', kind: 'your-view-matters', params });
    expect(sent().template.name).toBe('checkin_your_view_matters');
    fetchSpy.mockClear();
    const after = aSender({ approved: [...THE_NAMES_TO_SUBMIT, V2] });
    await after.wa.sendFor('org-drop', '+254700300003', text, { checkInId: 'ci-mercy', kind: 'your-view-matters', params });
    expect(sent().template.name).toBe(V2);
    expect(read(sent(), THE_ONE_OF_4_NOVEMBER.yourViewMatters)).toBe("Hi Mercy, your check-in for Sales team, Q4 is still waiting. Your answers help Grace understand what's in your way, and where they can help. It takes about ten minutes, and you can answer here.");
  });

  it("the lead's own nudge goes as the new one once it is listed, and never with a blank missing", () => {
    expect(theTemplateToUse('lead-nudge', [V2, 'checkin_your_view_matters'], { params })?.template.name).toBe(V2);
    expect(theTemplateToUse('your-view-matters', [V2], { params: ['Mercy', 'Sales team, Q4'] })).toBeNull();
    expect(theTemplateToUse('your-view-matters', [V2, 'checkin_your_view_matters'], { params: ['Mercy', 'Sales team, Q4'] })?.template.name).toBe('checkin_your_view_matters');
  });

  it('inside the 24 hours the chase goes as an ordinary message, as before, even once it is listed', async () => {
    const { wa } = aSender({ approved: [...THE_NAMES_TO_SUBMIT, V2], lastWrote: new Date(Date.now() - 60 * 60 * 1000) });
    await wa.sendFor('org-drop', '+254700300003', text, { checkInId: 'ci-mercy', kind: 'your-view-matters', params });
    expect(sent().type).toBe('text');
    expect(sent().text.body).toBe(text);
  });
});
