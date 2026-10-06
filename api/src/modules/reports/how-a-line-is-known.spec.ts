import { readFileSync } from 'fs';
import { join } from 'path';
import { RecordEntryType } from '@prisma/client';
import { howALineIsKnown } from './how-a-line-is-known';
import { theSessionReport } from './the-session-report';
import { theEndCard } from '../conversation/the-end-card';

/**
 * THE FOUR MARKS, IN ONE PLACE (weeks 6 and 6b). See how-a-line-is-known.ts.
 */

describe('how a line is known', () => {
  it('a line a document the person added backs is proven', () => {
    expect(howALineIsKnown({ type: 'PROGRESS', text: 'The quote went to Green Mart', recallBased: false, anchoredOrigin: 'photo' })).toBe('proven');
    /* A document from before origins existed counts as a source. */
    expect(howALineIsKnown({ type: 'PROGRESS', text: 'The quote went to Green Mart', recallBased: false, anchoredOrigin: null })).toBe('proven');
  });
  /* Read on the local corpus: the lead's workplan "backed" Tomi's "The build is on track for the 14th". */
  it('somebody else\'s document proves nothing of theirs', () => {
    expect(howALineIsKnown({ type: 'PROGRESS', text: 'The build is on track for the 14th', recallBased: false, anchoredOrigin: 'typed', documentIsTheirOwn: false })).toBe('said');
    expect(howALineIsKnown({ type: 'PROGRESS', text: 'The build is on track for the 14th', recallBased: false, anchoredOrigin: 'typed', documentIsTheirOwn: true })).toBe('proven');
  });
  it('notes we generated prove nothing', () => {
    expect(howALineIsKnown({ type: 'PROGRESS', text: 'The quote went to Green Mart', recallBased: false, anchoredOrigin: 'generated' })).toBe('said');
  });
  it('a line the colleague who received it confirmed is confirmed', () => {
    expect(howALineIsKnown({ type: 'PROGRESS', text: 'I sent the sales deck to Brian', recallBased: true, confirmedAt: new Date() })).toBe('confirmed');
  });
  it('a figure about what happened, with nothing attached, is memory', () => {
    expect(howALineIsKnown({ type: 'PROGRESS', text: 'I have 31 applications from businesses', recallBased: true })).toBe('memory');
  });
  /* The reviewer's reads (task 2.7): the same kind of line came out as their word on one line and as
     memory on the next. Every one of these is about what happened, with a figure and nothing attached. */
  it("a figure about what happened is memory whatever its type and however it was worded (the reviewer's strings)", () => {
    for (const [type, text] of [
      ['PROGRESS', 'N19 million disbursed.'],
      ['OUTCOME', 'Six facilities approved.'],
      ['PROGRESS', 'The total disbursed is N8 million.'],
      ['WORRY', 'N8 million has been disbursed this quarter.'],
      ['TENSION', 'About 30 of the 40 clients have not paid.'],
      ['PROGRESS', 'We sold ₦2.5m of stock last week.'],
    ]) expect([text, howALineIsKnown({ type, text, recallBased: true })]).toEqual([text, 'memory']);
  });
  it('a line with a figure that a document of theirs backs is still proven, not memory', () => {
    expect(howALineIsKnown({ type: 'PROGRESS', text: 'N19 million disbursed.', recallBased: false, anchoredOrigin: 'photo' })).toBe('proven');
  });
  it('a date, a time, a year or "this quarter" is not a figure', () => {
    for (const text of ['The build is on track for the 14th', 'The meeting happened this quarter', 'Harbor Foods paid on the 3rd', 'We met at 4pm', 'It launched in 2025'])
      expect([text, howALineIsKnown({ type: 'PROGRESS', text, recallBased: true })]).toEqual([text, 'said']);
  });
  it('a target, a plan or a promise with a figure in it is their word, whatever its type', () => {
    expect(howALineIsKnown({ type: 'SUCCESS_DEFINITION', text: 'Twelve approved facilities by December', recallBased: true })).toBe('said');
    expect(howALineIsKnown({ type: 'COMMITMENT', text: 'I will disburse N5 million by Friday', recallBased: true })).toBe('said');
    expect(howALineIsKnown({ type: 'PROGRESS', text: 'We plan to approve 6 more facilities', recallBased: true })).toBe('said');
    expect(howALineIsKnown({ type: 'WORRY', text: 'We might lose 3 clients', recallBased: true })).toBe('said');
  });
  it('a target, a plan or a line with no figure is their word', () => {
    expect(howALineIsKnown({ type: 'INTENT', text: 'My part is 12 approved facilities', recallBased: true })).toBe('said');
    expect(howALineIsKnown({ type: 'PROGRESS', text: 'Green Mart will buy in January', recallBased: true })).toBe('said');
  });
});

describe('the session report marks each line the same way', () => {
  const base: any = {
    sessionNumber: 1, closed: true, agreements: [], divergences: [], entries: [], previousEntries: [],
    baselineSuccess: null, startingPoint: null, previousSharedPicture: null, evidence: [], specificityLevel: null,
    centralQuestion: null, movedOnTargets: null, blocked: 0, answeredThisSession: [],
  };
  const line = (type: RecordEntryType, text: string, extra: Record<string, unknown> = {}) => ({ type, text, who: null, recallBased: true, threadKey: null, ...extra });

  it('proven, confirmed, memory and their word, on the lines of its sections', () => {
    const out = theSessionReport({
      ...base,
      entries: [
        line(RecordEntryType.PROGRESS, 'The quote went to Green Mart', { recallBased: false, backedBy: 'photo' }),
        line(RecordEntryType.PROGRESS, 'I sent the sales deck to Brian', { confirmedAt: new Date() }),
        line(RecordEntryType.PROGRESS, 'I have 31 applications from businesses'),
        line(RecordEntryType.COMMITMENT, 'I will visit Westgate Deli on Friday'),
      ],
    });
    const marks = new Map(out.sections.flatMap((s) => s.items).map((i) => [i.text, i.mark]));
    expect(marks.get('The quote went to Green Mart')).toBe('proven');
    expect(marks.get('I sent the sales deck to Brian')).toBe('confirmed');
    expect(marks.get('I have 31 applications from businesses')).toBe('memory');
    expect(marks.get('I will visit Westgate Deli on Friday')).toBe('said');
  });

  it('and on what each person said they did, beside their lines in the same order', () => {
    const out = theSessionReport({
      ...base,
      answeredThisSession: [{ who: 'Tomi', isYou: false }, { who: 'Zainab', isYou: false }],
      entries: [
        { ...line(RecordEntryType.PROGRESS, 'I have 31 applications from businesses'), who: 'Tomi' },
        { ...line(RecordEntryType.PROGRESS, 'The quote went to Green Mart', { recallBased: false, backedBy: 'photo' }), who: 'Tomi' },
      ],
    });
    const tomi = out.whatEachPersonSaid.find((p) => p.who === 'Tomi')!;
    expect(tomi.lines).toEqual(['I have 31 applications from businesses', 'The quote went to Green Mart']);
    expect(tomi.lineMarks).toEqual(['memory', 'proven']);
    /* Nobody else's lines, so nothing to mark. */
    expect(out.whatEachPersonSaid.find((p) => p.who === 'Zainab')!.lineMarks).toBeUndefined();
  });

  it('and a line reads the same on the end card', () => {
    const lines = [
      { type: 'PROGRESS', text: 'I have 31 applications from businesses', recallBased: true },
      { type: 'PROGRESS', text: 'I sent the sales deck to Brian', recallBased: true, confirmedAt: new Date() },
    ];
    expect(theEndCard(lines)!.inYourRecord!.map((l) => l.mark)).toEqual(lines.map((l) => howALineIsKnown(l)));
  });

  it('both reads that build it fetch when a line was confirmed', () => {
    /* Code only: a comment quoting these lines must not be able to satisfy the check. */
    const code = (path: string) => readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const reports = code(join(__dirname, 'reports.service.ts'));
    const board = code(join(__dirname, '..', 'board', 'board.service.ts'));
    expect(reports).toContain('confirmedAt: (e as any).confirmedAt ?? null,');
    expect(board).toContain('confirmedAt: (e as any).confirmedAt ?? null,');
    /* And whose document backs each line. */
    for (const src of [reports, board]) expect(src).toContain('documentIsTheirOwn: whoseDocument.get((e as any).anchoredDocumentId) === e.participantId');
  });

  it('the words of a mark never rate a person', () => {
    /* The four values are all the screens get; the words are the prototype's legend, drawn by the screens. */
    for (const m of ['proven', 'confirmed', 'said', 'memory']) expect(m).not.toMatch(/score|rating|weak|strong/);
  });
});
