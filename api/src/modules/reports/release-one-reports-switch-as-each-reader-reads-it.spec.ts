import { withTheSalesReadings, theirOwnLinesReadRight } from './the-sales-readings-for-a-report';
import { TheWeeklyReportService } from './the-weekly-report.service';
import { theShortRunsDatabase, G, R, uidOf, pidOf } from './the-short-run-reports-bed';

/**
 * RELEASE 1, PULL REQUEST 4: WITH THE SWITCH OFF, THE REPORTS READ AS THEY DID BEFORE (release-one-sales-board).
 *
 * The same short run of Drop Access (gw_sweep_drop3) as the other report specs, with `Organization.release1SalesBoardOn` false,
 * as it is for every organisation already here. Grace runs the check-in; Mercy checks in. Each reads the team report, her own
 * report and the weekly report, and nothing Release 1 brings is served: the report comes back as it was built, her own lines as
 * they were kept, and the weekly report without the week's deals. The same reads with the switch on show what it changes.
 */
const WRITTEN = new Date('2026-10-15T08:00:00Z');
const OPENED = new Date('2026-10-18T17:09:00Z');
const AS_BUILT = () => ({
  sessionNumber: 3,
  counting: [{ who: 'Mercy Wairimu', answered: true }, { who: 'Joseph Kariuki', answered: true }, { who: 'Kevin Omondi', answered: true }],
  confidence: { band: 'solid', saying: 'There is enough here to act on.', reasons: ['1 of 5 commitment has no owner or no date. Naming one of each would make it checkable.'] },
  whatEachPersonSaid: [{ who: 'Mercy Wairimu', isYou: false, lines: ['I quoted her KES 10,000 for the two units.'] }],
});
const as = (first: string) => ({ userId: uidOf(first), role: 'MEMBER', organizationId: 'org' });

describe('the team report and each person’s own report, with Release 1’s switch off', () => {
  for (const who of ['Grace', 'Mercy']) {
    it(`${who} is served the team report exactly as it was built: no day read from the deals, no mark, no closing line`, async () => {
      const served: any = await withTheSalesReadings(theShortRunsDatabase({ switchOn: false }), G, 3, uidOf(who), AS_BUILT());
      expect(served).toEqual(AS_BUILT());
      expect(served.theTeamsDay).toBeUndefined();
      expect(served.releaseOneSalesReport).toBeUndefined();
    });
  }

  it('with the switch on, the same report is read from the deals (what the switch changes)', async () => {
    jest.useFakeTimers({ now: OPENED, doNotFake: ['nextTick', 'setImmediate'] });
    try {
      const served: any = await withTheSalesReadings(theShortRunsDatabase({ switchOn: true }), G, 3, uidOf('Grace'), AS_BUILT());
      expect(served.releaseOneSalesReport).toBe(true);
      expect(served.theTeamsDay.inShort.length).toBeGreaterThan(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('Mercy’s own lines are served as they were kept: no line read with a document’s date, no customer’s promise moved', async () => {
    const rows = (R.lines as any[]).filter((l) => l.participantId === pidOf('Mercy')).map((l, i) => ({ id: `m${i}`, type: String(l.type ?? 'PROGRESS'), text: String(l.text), how: null, createdAt: l.createdAt, checkInId: l.checkInId ?? null }));
    expect(rows.length).toBeGreaterThan(0);
    const read = await theirOwnLinesReadRight(theShortRunsDatabase({ switchOn: false }) as any, pidOf('Mercy'), rows);
    expect(read).toEqual(rows);
  });
});

describe('the weekly report for 12 to 14 October, with Release 1’s switch off', () => {
  let grace: any; let mercy: any;
  beforeAll(async () => {
    jest.useFakeTimers({ now: WRITTEN, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    const svc = new TheWeeklyReportService(theShortRunsDatabase({ switchOn: false }) as any);
    await svc.build(G, WRITTEN);
    jest.setSystemTime(OPENED);
    grace = await svc.read(G, as('Grace'), OPENED);
    mercy = await svc.read(G, as('Mercy'), OPENED);
  });
  afterAll(() => jest.useRealTimers());

  it('the heading runs to today, as before, and does not say when it was written', () => {
    expect(grace.heading).toBe('This week, 12 to 18 Oct, so far');
    expect(mercy.heading).toBe('This week, 12 to 18 Oct, so far');
  });

  it('the week in numbers has no figure counted from the deals', () => {
    for (const reader of [grace, mercy]) {
      const figures = (reader.inNumbers ?? []).map((f: any) => `${f.figure} ${f.of}`).join(' | ');
      expect(figures).not.toMatch(/deals moved stage|sales closed|stall rule|backed by a document/);
    }
  });

  it('nothing Release 1 brings is served: no paragraphs from the deals, no Adapted row, no list in order, no promise read from the words', () => {
    for (const reader of [grace, mercy]) {
      expect(reader.whatThisWeekShows).toBeUndefined();
      expect(reader.forNextWeekIsRanked).toBeUndefined();
      expect(reader.whatChanged?.adapted).toBeUndefined();
      expect(JSON.stringify(reader.threeInARow ?? [])).not.toContain('promised three check-ins running');
    }
  });
});
