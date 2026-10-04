import { ReportsService } from './reports.service';
import { aReportWithNoEmptyLine } from './a-report-has-no-empty-line';

/**
 * THE ADVISOR CHECK-IN, RUN 29 (its served report is copied below; the run's own file is not kept in git). Peter, who takes part, was served a report with
 * "centralQuestion": "", a finding with "headline": "" and a guide to the next conversation of three empty lines, left behind
 * where the wall took the sentence out. A line with no words is not a line, for any reader.
 */
const asPeterReadIt = {
  sharedPicture: 'Both people have answered. They disagree on the fundamental purpose of your role.',
  agreements: ['Both state this is a two-year advisory engagement.', 'Both see an introduction to Equity Bank as a component of the work.'],
  centralQuestion: '',
  findings: [{ text: 'You understood the role to be an advisor focused on financial services, offering strategic guidance and insights.', hasGap: true, headline: '', mark: 'said', markSays: 'Only someone\u2019s word' }],
  postReportGuide: { openingLine: '', toAcknowledge: '', questionToCarry: '' },
};

const emptyLines = (v: any, at = ''): string[] =>
  Array.isArray(v) ? v.flatMap((x, i) => emptyLines(x, `${at}/${i}`))
    : v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => emptyLines(x, `${at}/${k}`))
    : v === '' ? [at] : [];

describe('the advisor report as Peter was served it', () => {
  it('had empty lines (so this checks something)', () => {
    expect(emptyLines(asPeterReadIt).length).toBeGreaterThanOrEqual(3);
  });

  it('has none after the last pass, and the central question is none rather than an empty line', () => {
    const served: any = aReportWithNoEmptyLine(asPeterReadIt);
    expect(emptyLines(served)).toEqual([]);
    expect(served.centralQuestion).toBeNull();
    expect(served.findings[0].headline).toBeUndefined();
    expect(served.findings[0].text).toContain('You understood the role to be an advisor');
    expect(served.postReportGuide).toBeUndefined();
    /* Every sentence that had words is as it was. */
    expect(served.sharedPicture).toBe(asPeterReadIt.sharedPicture);
    expect(served.agreements).toEqual(asPeterReadIt.agreements);
  });

  it('keeps the words of a line that has some, and a question that was said', () => {
    const served: any = aReportWithNoEmptyLine({ centralQuestion: 'What should come first?', postReportGuide: { openingLine: 'Thank you for this.', toAcknowledge: '', questionToCarry: '' }, list: ['One.', '', '  '] });
    expect(served).toEqual({ centralQuestion: 'What should come first?', postReportGuide: { openingLine: 'Thank you for this.' }, list: ['One.'] });
  });
});

describe('every report read goes through it', () => {
  const ground = (viewer: 'lead' | 'participant') => ({
    scenario: 'ADVISOR',
    peersVisibleToEachOther: false,
    initiatorId: 'u-grace',
    participants: [
      { id: 'p-grace', userId: 'u-grace', partyType: 'INITIATOR', user: { firstName: 'Grace', lastName: 'Mutiso' } },
      { id: 'p-peter', userId: 'u-peter', partyType: 'PARTICIPANT', user: { firstName: 'Peter', lastName: 'Kimani' } },
    ],
    report: { sharedPicture: 'Both people have answered.', agreements: ['Both state this is a two-year engagement.', ''], divergences: [], centralQuestion: '', findings: [{ text: 'You understood the role.', headline: '', participantId: 'p-peter' }], postReportGuide: { openingLine: '', toAcknowledge: '', questionToCarry: '' } },
  });
  const svc: any = Object.create(ReportsService.prototype);

  it.each([['Grace, who runs it', 'p-grace', true], ['Peter, who takes part', 'p-peter', false]])('%s is served no empty line', (_who, participantId, isLead) => {
    const served = svc.asItWasShared(ground(isLead ? 'lead' : 'participant'), participantId, isLead);
    expect(emptyLines(served)).toEqual([]);
    expect(served.centralQuestion).toBeNull();
  });
});
