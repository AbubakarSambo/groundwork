import { theSessionReport, type SessionReportInputs } from './the-session-report';
import { reportAsTemplateBlanks, reportAsOneLine } from '../public-api/a-whatsapp-message-is-routed';

/**
 * "3 SETTLED, 3 STILL OPEN." (messages test, 19 October, finding 13 in the list, 14 in the findings file).
 *
 * Drop Access (test). Mercy, on Wednesday 14 October at 10:00, and Joseph at 14:08, were sent groundwork_report_ready on WhatsApp: "Your report
 * for Sales team, Q4 is ready. 3 settled, 3 still open. Open Groundwork to read it." The line is where the report says where things stand, the
 * same on the report page. It is a whole sentence now, with its numbers in words. The template's own words are unchanged; only its blank is.
 */
const base: SessionReportInputs = {
  sessionNumber: 2, closed: true, agreements: [], divergences: [], entries: [], previousEntries: [], baselineSuccess: null, startingPoint: null,
  previousSharedPicture: null, evidence: [], specificityLevel: null, centralQuestion: null, movedOnTargets: null, blocked: 0,
  answeredThisSession: [{ who: 'Kevin Omondi', isYou: false }, { who: 'Amos Kiprono', isYou: false }],
};
const three = (xs: string[]) => xs.map((title) => ({ title }));

describe('where things stand is a whole sentence', () => {
  const report = theSessionReport({
    ...base,
    agreements: three(['The team target is 120 units by 30 October', 'Kilele Hotel bought 40 units', 'Visits are on Ngong Road this week']),
    divergences: three(['How progress toward the target is measured', 'Whether a sale counts before a payment', 'Who follows up with Juja Hardware']),
  } as any);

  /* Changed 4 November 2026 (release batch 1): the direct morning's words are the only words, so it says who agrees and differs, never "settled". */
  it('on the report page', () => {
    expect(report.whereThingsStand.saying).toBe('People agree on three things, and differ on three.');
  });

  it('and in the WhatsApp message Mercy and Joseph read', () => {
    expect(reportAsTemplateBlanks(report, 'Sales team, Q4')).toEqual(['Sales team, Q4', 'The people in "Sales team, Q4" differ on "How progress toward the target is measured".']);
    expect(reportAsOneLine(report, 'Sales team, Q4')).toBe('Your report for Sales team, Q4 is ready. The people in "Sales team, Q4" differ on "How progress toward the target is measured".');
  });

  it('one, and none', () => {
    const one = theSessionReport({ ...base, agreements: three(['Kilele Hotel bought 40 units']), divergences: [] } as any);
    expect(one.whereThingsStand.saying).toBe('People agree on one thing, and differ on nothing.');
    const none = theSessionReport({ ...base, agreements: [], divergences: three(['Who follows up with Juja Hardware']) } as any);
    expect(none.whereThingsStand.saying).toBe('People differ on one thing.');
  });
});
