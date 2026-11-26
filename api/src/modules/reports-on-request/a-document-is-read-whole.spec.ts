/**
 * A DOCUMENT IS READ WHOLE, AND EVERY LINE KEEPS ITS SOURCE (the documents test of 24 November 2026).
 *
 * Made-up material only, in the shapes that broke: a workbook whose summary misses a row because an amount was typed as text and whose
 * total is a formula, long source ids the model did not copy back, and a report whose gaps become the check-ins that ask for them.
 */
import { theWorkbookAsFiles, theSizeSaid, aReadingMadeSafe, aReadingForTheModel } from './reading-a-document';
import { shortIdsFor, theSourcesNamed, anOutlineMadeSafe, theOutlineAsked, theOutlineSaid, type ASource } from './the-report-on-request';
import { aWrittenReportFromTheReadings } from './writing-the-report';
import { theReportAsBlocks, theRegisterAsAWorkbook, beforeTheFinal } from './the-report-files';

const XLSX = require('xlsx') as typeof import('xlsx');

function aWorkbook(): Buffer {
  const book = XLSX.utils.book_new();
  const may = XLSX.utils.aoa_to_sheet([['Item', 'Amount'], ['Flights', 1170000], ['Hotel', '630,000'], ['Fuel', 5000000]]);
  XLSX.utils.book_append_sheet(book, may, 'May');
  const summary = XLSX.utils.aoa_to_sheet([['Line', 'Spent']]);
  summary.A2 = { t: 's', v: 'May total' };
  summary.B2 = { t: 'n', v: 6170000, f: 'SUM(May!B2:B4)' };
  summary['!ref'] = 'A1:B2';
  XLSX.utils.book_append_sheet(book, summary, 'Summary');
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const doc = (n: number): ASource => ({ id: `material:0f3c${n}a9e-6fa0-4750-a905-c80c3bc7bedd`, kind: 'material', label: `the document Report ${n}.docx you uploaded`, name: `Report ${n}.docx`, text: `Week ${n}.` });
const checkIn: ASource = { id: 'checkin:g-dispatch', kind: 'check_in', label: 'the report on "Dispatch weekly"', name: '"Dispatch weekly"', text: 'The van is late.' };

describe('a workbook goes to the model as data its code can check', () => {
  it('every sheet as a CSV with its row numbers, and every formula and every number stored as text by sheet and cell', () => {
    const { files, sheets } = theWorkbookAsFiles(aWorkbook());
    expect(sheets).toEqual([{ name: 'May', rows: 4 }, { name: 'Summary', rows: 2 }]);
    expect(files.map((f) => f.name)).toEqual(['sheet 1 May.csv', 'sheet 2 Summary.csv', 'formulas and numbers stored as text.csv']);
    expect(files[0].text.split('\n')[0]).toBe('row,A,B');
    expect(files[0].text).toContain('4,Fuel,5000000');
    const cells = files[2].text;
    expect(cells).toContain('May,B3,number stored as text,,"630,000"');
    expect(cells).toContain('Summary,B2,formula,=SUM(May!B2:B4),6170000');
    expect(theSizeSaid({ sheets })).toBe('2 sheets and 6 rows');
    expect(theSizeSaid({ words: 'one two three' })).toBe('3 words');
  });

  it('a reading keeps every figure with where it sits, and lays out for the next step under its short id', () => {
    const r = aReadingMadeSafe({
      whatItIs: 'An account workbook', period: 'May 2026', summary: 'May spending.', facts: [{ text: 'Flights were booked.', where: 'May row 2' }],
      figures: [{ what: 'May total', value: '6,170,000', where: 'Summary B2', working: 'SUM of May B2 to B4, which leaves out the hotel typed as text' }],
      openMatters: [], notes: [{ text: 'Did this reach HQ?', by: 'the reviewer', where: 'page 1' }], problems: [{ text: 'The hotel amount is text, so the total leaves it out.', where: 'May B3' }],
    }, '2 sheets and 6 rows', ['Ran:\nsum(...)', 'Got:\n6170000']);
    expect(r!.workings).toHaveLength(2);
    const laid = aReadingForTheModel('D3', 'Accounts.xlsx', r!);
    expect(laid).toContain('DOCUMENT D3: Accounts.xlsx');
    expect(laid).toContain('- May total: 6,170,000 [Summary B2] (worked out: SUM of May B2 to B4, which leaves out the hotel typed as text)');
    expect(laid).toContain('- the reviewer: Did this reach HQ? [page 1]');
    expect(aReadingMadeSafe({ whatItIs: 'x' }, '1 word')).toBeNull();
  });
});

describe('sources are named to the model by short ids, and mapped back by code', () => {
  it('D for documents, C for check-ins; a short id, a full id, or "D2, D3" in one string all count, and nothing else does', () => {
    const index = shortIdsFor([doc(1), checkIn, doc(2), doc(3)]);
    expect(index.map((x) => x.short)).toEqual(['D1', 'C1', 'D2', 'D3']);
    expect(theSourcesNamed(['D2, D3', 'c1', 'material:0f3c1a9e-6fa0-4750-a905-c80c3bc7bedd', 'D9', 'material:0f3c1a9e'], index).map((s) => s.name)).toEqual(['Report 2.docx', 'Report 3.docx', '"Dispatch weekly"', 'Report 1.docx']);
  });

  it('the outline lists short ids, so the sections keep their documents (every section of the first run used none)', () => {
    const sources = [doc(1), doc(2)];
    const asked = theOutlineAsked({ asked: 'a report on the year', said: [], outline: null, sources });
    expect(asked).toContain('- D1: the document Report 1.docx you uploaded. Week 1.');
    expect(asked).not.toContain('material:');
    expect(anOutlineMadeSafe({ sections: [{ heading: 'The year', sourceIds: ['D1', 'D2'] }] }, sources)).toEqual([{ heading: 'The year', sourceIds: [sources[0].id, sources[1].id] }]);
  });
});

describe('a long outline names three documents and counts the rest (one ran to 1,284 words)', () => {
  it('each section and the documents left out', () => {
    const sources = Array.from({ length: 40 }, (_, i) => doc(i + 1));
    const said = theOutlineSaid([{ heading: 'The year', sourceIds: sources.slice(0, 30).map((s) => s.id) }], sources, true);
    expect(said).toContain('1. The year. This would use the document Report 1.docx you uploaded, the document Report 2.docx you uploaded and 28 other sources.');
    expect(said).toContain('It does not use the document Report 31.docx you uploaded, the document Report 32.docx you uploaded and 8 other sources.');
    const few = theOutlineSaid([{ heading: 'The year', sourceIds: [sources[0].id, sources[1].id] }], sources.slice(0, 2), true);
    expect(few).toContain('This would use the document Report 1.docx you uploaded and the document Report 2.docx you uploaded.');
  });
});

describe('the report, laid out from one record', () => {
  const index = shortIdsFor([doc(1), doc(2)]);
  const written = aWrittenReportFromTheReadings({
    title: 'The office in 2026',
    summary: [{ text: 'Approvals moved fast and the records are weak', sourceIds: ['D1'] }],
    knowFirst: [{ text: 'The summary leaves out the hotel', sourceIds: ['D2'] }],
    sections: [{ heading: 'What it cost', blocks: [
      { kind: 'table', title: 'Spending against budget', columns: ['Line', 'Budget', 'Spent'], rows: [{ cells: ['Flights', '1,000,000', '1,170,000'] }], sourceIds: ['D2'] },
      { kind: 'line', text: 'Nobody checked the summary against the ledger', sourceIds: [] },
    ] }],
    decisions: [{ text: 'Order the summary rebuilt', when: 'before year end', sourceIds: ['D2'] }],
    register: [{ id: 'A1', action: 'Rebuild the summary sheet', owner: 'Admin and Finance', due: '15 December', priority: 'High', amount: '630,000', evidence: 'May B3', sourceIds: ['D2'] }],
    gaps: [
      { gap: 'No bank statements', limits: 'No bank reconciliation', recordsNeeded: 'Bank statements for January to October', who: 'Admin and Finance', beforeFinal: true, sourceIds: [] },
      { gap: 'No 2027 plan', limits: 'Nothing for next year', recordsNeeded: 'The 2027 plan', who: 'The director', beforeFinal: false, sourceIds: [] },
    ],
  }, index, [{ figure: 'May total', value: '6,170,000', where: 'Summary B2', working: 'SUM of May B2 to B4', source: 'Report 2.docx' }])!;

  it('a line keeps which documents it rests on, never their text, so the stored report stays small (one stored 136 MB)', () => {
    expect(written.sources.every((s) => s.text === '' && !s.reading)).toBe(true);
    expect(JSON.stringify(written)).not.toContain('Week 2.');
  });

  it('every part names its documents in the Word file, a line nothing backs is said to be unverified, and tables stay tables', () => {
    const blocks = theReportAsBlocks(written, new Date('2026-11-24T09:00:00Z'));
    expect(blocks.find((b) => b.t === 'table' && b.columns?.[0] === 'Line')!.rows).toEqual([['Flights', '1,000,000', '1,170,000']]);
    expect(blocks.map((b) => b.text)).toContain('From Report 2.docx.');
    expect(blocks.map((b) => b.text)).toContain('I could not find this in any of the documents, so treat it as unverified.');
    expect(written.sources.map((s) => s.name)).toEqual(['Report 1.docx', 'Report 2.docx']);
  });

  it('the Excel file holds the register, the gaps, the evidence and the documents read', () => {
    const book = XLSX.read(theRegisterAsAWorkbook(written), { type: 'buffer' });
    expect(book.SheetNames).toEqual(['Actions register', 'Gaps', 'Evidence index', 'Documents read']);
    const register = XLSX.utils.sheet_to_json<any>(book.Sheets['Actions register']);
    expect(register[0]).toMatchObject({ ID: 'A1', Action: 'Rebuild the summary sheet', Owner: 'Admin and Finance', Documents: 'Report 2.docx' });
    expect(XLSX.utils.sheet_to_json<any>(book.Sheets['Evidence index'])[0]).toMatchObject({ Figure: 'May total', 'How it was worked out': 'SUM of May B2 to B4' });
  });

  it('only the gaps to close before the final report become what the check-ins ask for', () => {
    expect(beforeTheFinal(written).map((g) => g.gap)).toEqual(['No bank statements']);
  });
});
