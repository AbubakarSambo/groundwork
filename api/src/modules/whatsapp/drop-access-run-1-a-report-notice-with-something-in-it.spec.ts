import { WhatsAppService } from './whatsapp.service';
import { aReportWorthItsTemplate, reportAsTemplateBlanks, THANKS_ONLY, THANKS_YOUR_ANSWER_IS_IN } from '../public-api/a-whatsapp-message-is-routed';
import { theTemplateParagraph } from '../engagement/the-leads-daily-nudge';
import { forgetTheOrganisationsZone } from '../../common/the-organisations-own-day';

/**
 * DROP ACCESS RUN 1, ITEMS 22 AND 23: A REPORT NOTICE SAYS SOMETHING, OR DOES NOT GO (gw_sweep_drop10, 18 October 2026).
 *
 * Joseph, last to check in, read on WhatsApp at 11:30 UTC on six days (groundwork_report_ready, {{2}}): "Everybody has answered. The report
 * has not yet found anything they agree or differ on." At 15:30 the same days Grace was emailed that the shared picture "found two
 * differences still open". And Grace's very first WhatsApp message, 12 October 09:00 UTC, was groundwork_first_contact carrying "Your report
 * for Sales team, Q4 is ready. Not everyone has answered yet, so there is nothing to agree or differ with. Open Groundwork to read it."
 */
const JOSEPHS_READ_AT_11_30 = { state: 'forming', whereThingsStand: { agreed: 0, stillOpen: 0, saying: 'Everybody has answered. The report has not yet found anything they agree or differ on.' } };
const GRACES_FIRST = { state: 'forming', whereThingsStand: { agreed: 0, stillOpen: 0, saying: 'Not everyone has answered yet, so there is nothing to agree or differ with.' } };
const GRACES_16_OCTOBER = { state: 'released', whereThingsStand: { agreed: 5, stillOpen: 2, saying: '5 settled, 2 still open.' } };

let n = 0;
function aSender(o: { wroteWithinADay?: boolean; neverInTouch?: boolean }) {
  const org = `drop-access-report-${(n += 1)}`;
  forgetTheOrganisationsZone(org);
  const posted: any[] = [];
  const rows: any[] = [];
  (global as any).fetch = jest.fn(async (_u: string, init: any) => { posted.push(JSON.parse(init.body)); return { ok: true, status: 200, text: async () => '{}', json: async () => ({}) }; });
  const prisma: any = {
    organization: { findUnique: jest.fn(async () => ({ id: org, name: 'Drop Access (test)', timeZone: 'Africa/Nairobi', whatsappAddOnOn: true })) },
    user: { findMany: jest.fn(async () => []) },
    person: { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => ({ whatsappStoppedAt: null, whatsappLastInboundAt: o.wroteWithinADay ? new Date(Date.now() - 3_600_000) : null })) },
    platformSetting: { findUnique: jest.fn(async () => ({ value: true })) },
    whatsAppConnection: { findUnique: jest.fn(async () => null) },
    whatsAppInboundMessage: { findFirst: jest.fn(async () => null) },
    whatsAppSend: { findFirst: jest.fn(async ({ where }: any) => (where?.kind?.in || o.neverInTouch ? null : { id: 'earlier' })), findMany: jest.fn(async () => []), create: jest.fn(async ({ data }: any) => { rows.push(data); return data; }) },
    notification: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) },
    checkIn: { findUnique: jest.fn(async () => ({ ground: { organizationId: org } })) },
  };
  const config: any = { get: (k: string) => ({ 'whatsapp.enabled': true, 'whatsapp.accessToken': 't', 'whatsapp.phoneNumberId': '1', 'whatsapp.approvedTemplates': ['groundwork_report_ready', 'groundwork_first_contact', 'lead_daily_summary'], 'whatsapp.graphBaseUrl': 'http://127.0.0.1:3985' } as any)[k] };
  return { org, wa: new WhatsAppService(config, prisma), posted, rows };
}
beforeEach(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }).setSystemTime(new Date('2026-10-22T11:15:00.144Z')));
afterEach(() => jest.useRealTimers());

describe('which report is worth its template', () => {
  it('only one with something agreed or open', () => {
    expect(aReportWorthItsTemplate(JOSEPHS_READ_AT_11_30)).toBe(false);
    expect(aReportWorthItsTemplate(GRACES_FIRST)).toBe(false);
    expect(aReportWorthItsTemplate(GRACES_16_OCTOBER)).toBe(true);
    expect(reportAsTemplateBlanks(GRACES_16_OCTOBER, 'Sales team, Q4')).toEqual(['Sales team, Q4', '5 settled, 2 still open.']);
  });
});

describe("Joseph's notice at 11:15 on 22 October, when nothing is agreed or open yet", () => {
  it('before: "Everybody has answered. The report has not yet found anything they agree or differ on." went as a template. Now, outside the 24 hours, nothing goes', async () => {
    const s = aSender({});
    const result = await s.wa.sendFor(s.org, '+254700300004', THANKS_YOUR_ANSWER_IS_IN('Sales team, Q4'), { checkInId: '16a7a44f-45a1-4cf2-8795-af1e21469cff', kind: THANKS_ONLY });
    expect(result.sent).toBe(false);
    expect(s.posted).toHaveLength(0);
  });
  it('inside the 24 hours he is thanked, in plain words that claim nothing about the report', async () => {
    const s = aSender({ wroteWithinADay: true });
    const result = await s.wa.sendFor(s.org, '+254700300004', THANKS_YOUR_ANSWER_IS_IN('Sales team, Q4'), { checkInId: '16a7a44f-45a1-4cf2-8795-af1e21469cff', kind: THANKS_ONLY });
    expect(result.sent).toBe(true);
    expect(s.posted[0].text.body).toBe('Thank you, your answer for Sales team, Q4 is in. The shared picture is made once everyone has answered, and you will be told as soon as there is something to read.');
  });
});

describe("Grace's first WhatsApp message", () => {
  it('is never a report with nothing in it: to a number never written to, the thank-you does not go at all', async () => {
    jest.setSystemTime(new Date('2026-10-12T09:00:00.001Z'));
    const s = aSender({ neverInTouch: true });
    const result = await s.wa.sendFor(s.org, '+254700300001', THANKS_YOUR_ANSWER_IS_IN('Sales team, Q4'), { checkInId: '158bde55-538b-4547-b3f3-5f19ad1e8d0e', kind: THANKS_ONLY });
    expect(result.sent).toBe(false);
    expect(s.posted).toHaveLength(0);
  });
  it('her first one is her morning summary, introduced: "This is Groundwork, writing for Drop Access (test). Good morning Grace. ..."', async () => {
    jest.setSystemTime(new Date('2026-10-15T08:00:00.036Z'));
    const s = aSender({ neverInTouch: true });
    const t = theTemplateParagraph('Grace', { needsYou: [{ text: 'Joseph is waiting on you for a decision on the KES 4,500 price for Juja Hardware since Wednesday 14 October.' }], overdueOnYourTeam: [], risks: [] }, 'http://localhost:5195/today');
    await s.wa.sendFor(s.org, '+254700300001', t.text, { kind: 'lead-summary', params: t.params });
    expect(s.posted).toHaveLength(1);
    expect(s.posted[0].template.name).toBe('groundwork_first_contact');
    const [org, words] = s.posted[0].template.components[0].parameters.map((p: any) => p.text);
    expect(`This is Groundwork, writing for ${org}. ${words} Not you? Reply STOP.`).toBe('This is Groundwork, writing for Drop Access (test). Good morning Grace. Here is today\'s summary of your check-ins. These need you. Joseph is waiting on you for a decision on the KES 4,500 price for Juja Hardware since Wednesday 14 October. You can open your board for the full picture here http://localhost:5195/today If you would rather not hear from us here again today, reply "not now". Not you? Reply STOP.');
  });
});
