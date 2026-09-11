import { whatLooksWrong, isAReportRead, isATranscriptRead, CALLS_PER_MINUTE, DayOfCalls } from './the-api-is-watched';

const quiet: DayOfCalls = { calls: 500, reads: 250, writes: 250, reportReads: 20, transcriptReads: 0, busiestMinute: 12, checkInsOpened: 30, peopleWritten: 40 };

describe('the API is watched for use that looks like copying', () => {
  it('says nothing about an integration that writes as much as it reads', () => {
    expect(whatLooksWrong(quiet)).toEqual([]);
  });

  it('says nothing about a day too quiet to judge', () => {
    expect(whatLooksWrong({ ...quiet, calls: 50, reads: 50, writes: 0, reportReads: 50 })).toEqual([]);
  });

  it('flags reads that dwarf writes', () => {
    const flags = whatLooksWrong({ ...quiet, calls: 1200, reads: 1180, writes: 20 });
    expect(flags.map((f) => f.kind)).toContain('reads-without-writes');
  });

  it('flags report reads far beyond check-ins opened', () => {
    const flags = whatLooksWrong({ ...quiet, reportReads: 400, checkInsOpened: 10 });
    expect(flags.map((f) => f.kind)).toContain('report-harvest');
  });

  it('flags transcripts read by the dozen, and a burst over the per-minute limit', () => {
    const flags = whatLooksWrong({ ...quiet, transcriptReads: 80, busiestMinute: CALLS_PER_MINUTE + 1 });
    expect(flags.map((f) => f.kind)).toEqual(expect.arrayContaining(['transcript-harvest', 'burst']));
  });

  it('knows a report read and a transcript read by their paths', () => {
    expect(isAReportRead('GET', '/api/v1/grounds/abc/report')).toBe(true);
    expect(isAReportRead('GET', '/api/v1/reports/my-people?x=1')).toBe(true);
    expect(isAReportRead('POST', '/api/v1/grounds/abc/report')).toBe(false);
    expect(isATranscriptRead('GET', '/api/v1/check-ins/1/transcript')).toBe(true);
  });
});
