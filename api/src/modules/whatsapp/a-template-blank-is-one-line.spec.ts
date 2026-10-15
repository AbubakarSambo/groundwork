import { WhatsAppService } from './whatsapp.service';
import { TEMPLATES, A_TEMPLATE_BODY_LIMIT, fill } from './a-message-outside-the-window';
import { reportAsText, reportAsTemplateBlanks, A_TEXT_MESSAGE_LIMIT } from '../public-api/a-whatsapp-message-is-routed';
import { anInboundHarness } from './a-whatsapp-inbound-harness';

/**
 * A TEMPLATE'S BLANK IS ONE LINE, AND THE WHOLE MESSAGE FITS (hosted item).
 *
 * WhatsApp refuses a template whose blank holds a line break, a tab, or more than four spaces in a
 * row, and a body longer than 1,024 characters. The report went into one blank whole, with its line
 * breaks. Now every blank is one line, the whole fits, and the report outside the 24 hours is its
 * name and one short line, with "Open Groundwork to read it." from the template itself.
 */
const REPORT = {
  whereThingsStand: { saying: 'Amina met two of the three goals. The third, the Kisumu visit, moved to next week.' },
  atAGlance: [{ label: 'Goals met', value: '2 of 3' }, { label: 'Next visit', value: 'Kisumu', sub: 'next week' }],
  theConversationWorthHaving: 'What would make the Kisumu visit happen this time?',
};

describe('every template', () => {
  const awkward = 'Line one\nline two\t\tand     five spaces ' + 'and a very long tail '.repeat(80);
  it.each(Object.keys(TEMPLATES))('%s: no blank holds a line break, a tab or a run of spaces, and the whole is within 1,024 characters', (kind) => {
    const t = TEMPLATES[kind];
    const blanks = new Set(t.body.match(/\{\{\d+\}\}/g) ?? []).size;
    const params = Array.from({ length: blanks }, () => awkward);
    const sent = t.components('', params)[0].parameters.map((p) => p.text);
    for (const p of sent) expect(p).not.toMatch(/[\n\r\t]| {2,}/);
    expect(fill(t.body, params).length).toBeLessThanOrEqual(A_TEMPLATE_BODY_LIMIT);
  });
});

describe('the report', () => {
  it('as its template\'s blanks: the name and where things stand, whole when it fits, on one line', () => {
    expect(reportAsTemplateBlanks(REPORT, 'Sales team')).toEqual(['Sales team', 'Amina met two of the three goals. The third, the Kisumu visit, moved to next week.']);
    expect(fill(TEMPLATES.report.body, reportAsTemplateBlanks(REPORT, 'Sales team'))).toBe('Your report for Sales team is ready. Amina met two of the three goals. The third, the Kisumu visit, moved to next week. Open Groundwork to read it.');
  });

  it('inside the 24 hours it goes whole, and where it would not fit one message it is one short line and the app', () => {
    expect(reportAsText(REPORT, 'Sales team').split('\n\n')[0]).toBe('Your report for Sales team is ready.');
    const huge = { ...REPORT, theConversationWorthHaving: 'A long thought. '.repeat(400) };
    const text = reportAsText(huge, 'Sales team');
    expect(text.length).toBeLessThanOrEqual(A_TEXT_MESSAGE_LIMIT);
    expect(text).toBe('Your report for Sales team is ready. Amina met two of the three goals. The third, the Kisumu visit, moved to next week. Open Groundwork to read it.');
  });

  it('the report sent after a session closes carries its blanks', async () => {
    const h = anInboundHarness({ completed: { overWhatsApp: null, scenario: 'PULSE_CHECK', label: 'Sales team' } });
    h.reports.sessionReport.mockResolvedValue(REPORT);
    await h.service.onCheckInCompleted({ checkInId: 'ci-1', groundId: 'g-1', sessionNumber: 2 } as any);
    for (let i = 0; i < 5 && !h.sent.length; i++) await new Promise((r) => setImmediate(r));
    expect(h.sent[0].context).toMatchObject({ kind: 'report', params: ['Sales team', 'Amina met two of the three goals. The third, the Kisumu visit, moved to next week.'] });
  });

  it('outside the 24 hours, with the template approved, Meta is sent the blanks, never the report with its line breaks', async () => {
    const realFetch = (global as any).fetch;
    const fetchSpy = jest.fn(async (..._a: any[]) => ({ ok: true, status: 200 }));
    (global as any).fetch = fetchSpy;
    const prisma: any = {
      platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
      whatsAppConnection: { findUnique: jest.fn(async () => null) },
      person: { findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: new Date(Date.now() - 3 * 86_400_000) })), findMany: jest.fn(async () => []) },
      user: { findMany: jest.fn(async () => []) },
      whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
      whatsAppSend: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) },
      notification: { create: jest.fn(async () => ({})) },
    };
    const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111', 'whatsapp.approvedTemplates': ['groundwork_report_ready'] } as any)[k] };
    const wa = new WhatsAppService(config, prisma);
    const got = await wa.sendFor('org-1', '+254712345678', reportAsText(REPORT, 'Sales team'), { checkInId: 'ci-1', kind: 'report', params: reportAsTemplateBlanks(REPORT, 'Sales team') });
    expect(got.sent).toBe(true);
    const body = JSON.parse((fetchSpy.mock.calls[0] as any[])[1].body);
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('groundwork_report_ready');
    expect(body.template.components[0].parameters.map((p: any) => p.text)).toEqual(['Sales team', 'Amina met two of the three goals. The third, the Kisumu visit, moved to next week.']);
    (global as any).fetch = realFetch;
  });

  it('a template with no words for its blanks is not sent half empty', async () => {
    const realFetch = (global as any).fetch;
    const fetchSpy = jest.fn(async () => ({ ok: true, status: 200 }));
    (global as any).fetch = fetchSpy;
    const prisma: any = {
      platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
      whatsAppConnection: { findUnique: jest.fn(async () => null) },
      person: { findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: null })), findMany: jest.fn(async () => []) },
      user: { findMany: jest.fn(async () => []) },
      whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
      whatsAppSend: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) },
      notification: { create: jest.fn(async () => ({})) },
    };
    const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 'test-token', 'whatsapp.phoneNumberId': '111111', 'whatsapp.approvedTemplates': ['groundwork_report_ready'] } as any)[k] };
    const got = await new WhatsAppService(config, prisma).sendFor('org-1', '+254712345678', 'A report.', { checkInId: 'ci-1', kind: 'report' });
    expect(got).toEqual({ sent: false, error: 'No words for every blank of groundwork_report_ready; not sent' });
    expect(fetchSpy).not.toHaveBeenCalled();
    (global as any).fetch = realFetch;
  });
});
