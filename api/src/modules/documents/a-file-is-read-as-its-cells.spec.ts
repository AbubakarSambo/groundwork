/**
 * A FILE READ AS ITS CELLS (Dangote brief, change 1). Every file here is a real Office zip of XML, built in the test, with made-up content: a
 * workbook whose rows are coloured and whose data starts on row 3, a Word report with a shaded table, and a deck whose table slide was moved.
 * What is checked is what a rule downstream needs to cite and count: the sheet's name, the Excel row, the fill as a colour and a name, the day
 * a date cell holds, and the slide number a person sees.
 */
import { readTheCells, rowsOf, colourName, a1, fromA1, serialToDay } from './a-file-as-cells';
import { readTheTracker } from '../principal-work/the-payments-tracker';
const JSZip = require('jszip') as typeof import('jszip');

const STYLES = `<styleSheet>
  <numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor theme="9" tint="0.3999755851924192"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor indexed="10"/></patternFill></fill>
  </fills>
  <cellXfs count="5">
    <xf numFmtId="0" fillId="0"/>
    <xf numFmtId="0" fillId="2"/>
    <xf numFmtId="0" fillId="3"/>
    <xf numFmtId="164" fillId="0"/>
    <xf numFmtId="0" fillId="4"/>
  </cellXfs>
</styleSheet>`;
const THEME = `<a:theme xmlns:a="a"><a:themeElements><a:clrScheme name="Office">
  <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
  <a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
  <a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
  <a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>
</a:clrScheme></a:themeElements></a:theme>`;

/** A two-sheet workbook. "2026" starts at row 3 (a title above it), as a register kept by hand does. */
async function aWorkbook(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('xl/workbook.xml', '<workbook xmlns:r="r"><sheets><sheet name="2025" sheetId="1" r:id="rId1"/><sheet name="2026" sheetId="2" r:id="rId2"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>');
  zip.file('xl/sharedStrings.xml', '<sst><si><t>Invoice</t></si><si><t>Status</t></si><si><r><t>Approved, </t></r><r><t>not paid</t></r></si><si><t>Queried &amp; returned</t></si><si><t>Amount</t></si><si><t>Applications register</t></si></sst>');
  zip.file('xl/styles.xml', STYLES);
  zip.file('xl/theme/theme1.xml', THEME);
  zip.file('xl/worksheets/sheet1.xml', '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>');
  zip.file('xl/worksheets/sheet2.xml', `<worksheet><sheetData>
    <row r="1"><c r="A1" t="s"><v>5</v></c></row>
    <row r="3"><c r="A3" t="s"><v>0</v></c><c r="B3" t="s"><v>1</v></c><c r="C3" t="s"><v>4</v></c><c r="D3" t="inlineStr"><is><t>Paid on</t></is></c></row>
    <row r="4"><c r="A4" s="1"><v>1001</v></c><c r="B4" s="1" t="s"><v>2</v></c><c r="C4" s="1"><v>2500000</v></c><c r="D4" s="3"><v>46337</v></c></row>
    <row r="5"><c r="A5" s="2"><v>1002</v></c><c r="B5" s="2" t="s"><v>3</v></c><c r="C5"><f>C4*2</f><v>5000000</v></c></row>
    <row r="6"><c r="A6" s="4"><v>1003</v></c><c r="B6" s="4"/></row>
  </sheetData></worksheet>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function aReport(): Promise<Buffer> {
  const zip = new JSZip();
  const cell = (t: string, fill?: string) => `<w:tc><w:tcPr>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}</w:tcPr><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:tc>`;
  zip.file('word/document.xml', `<w:document xmlns:w="w"><w:body><w:p><w:r><w:t>Weekly correspondence</w:t></w:r></w:p>
    <w:tbl><w:tblPr/><w:tr>${cell('Item')}${cell('Ministry')}${cell('Status')}</w:tr>
    <w:tr>${cell('Waiver request')}${cell('Ministry of Finance')}${cell('Awaiting approval', 'FFFF00')}</w:tr></w:tbl>
  </w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function aDeck(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('ppt/presentation.xml', '<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rId9"/><p:sldId id="257" r:id="rId8"/></p:sldIdLst></p:presentation>');
  zip.file('ppt/_rels/presentation.xml.rels', '<Relationships><Relationship Id="rId8" Target="slides/slide1.xml"/><Relationship Id="rId9" Target="slides/slide2.xml"/></Relationships>');
  zip.file('ppt/slides/slide1.xml', '<p:sld xmlns:a="a" xmlns:p="p"><a:p><a:r><a:t>Paddy prices</a:t></a:r></a:p><a:tbl><a:tblGrid/>'
    + '<a:tr><a:tc><a:txBody><a:p><a:r><a:t>Market</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>Price</a:t></a:r></a:p></a:txBody></a:tc></a:tr>'
    + '<a:tr><a:tc><a:txBody><a:p><a:r><a:t>Market A</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>41,500</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:tcPr></a:tc></a:tr>'
    + '</a:tbl></p:sld>');
  zip.file('ppt/slides/slide2.xml', '<p:sld xmlns:a="a" xmlns:p="p"><a:p><a:r><a:t>Cover</a:t></a:r></a:p></p:sld>');
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('a file is read as its cells', () => {
  it('keeps every sheet by its own name, and each cell at its Excel row and A1 reference', async () => {
    const wb = await readTheCells(await aWorkbook(), 'register.xlsx');
    expect(wb?.kind).toBe('workbook');
    expect(wb!.sheets.map((s) => s.name)).toEqual(['2025', '2026']);
    const s = wb!.sheets[1];
    expect(s.cells.find((c) => c.ref === 'B4')).toMatchObject({ row: 4, col: 2, value: 'Approved, not paid' });
    expect(s.cells.find((c) => c.ref === 'B5')?.value).toBe('Queried & returned');
    expect(s.cells.find((c) => c.ref === 'D3')?.value).toBe('Paid on');
  });

  it('reads a fill however the sheet gives it (a colour, a theme colour with a tint, the old palette) and names it', async () => {
    const s = (await readTheCells(await aWorkbook(), 'register.xlsx'))!.sheets[1];
    const at = (ref: string) => s.cells.find((c) => c.ref === ref)!;
    expect(at('A4')).toMatchObject({ fill: '#FFFF00', fillName: 'yellow' });
    expect(at('A5').fillName).toBe('green');
    expect(at('A6')).toMatchObject({ fill: '#FF0000', fillName: 'red' });
    /* A coloured cell with nothing in it is still kept: the colour is the status. */
    expect(at('B6')).toMatchObject({ value: '', fillName: 'red' });
    expect(at('C5').fill).toBeNull();
  });

  it('gives a date cell as its day, and a formula with the value it shows', async () => {
    const s = (await readTheCells(await aWorkbook(), 'register.xlsx'))!.sheets[1];
    expect(s.cells.find((c) => c.ref === 'D4')).toMatchObject({ value: '2026-11-11', isDate: true });
    expect(s.cells.find((c) => c.ref === 'C5')).toMatchObject({ value: '5000000', formula: 'C4*2' });
    expect(s.cells.find((c) => c.ref === 'C4')?.isDate).toBeUndefined();
  });

  it('gives rows with the number the file gives them, blank rows left out', async () => {
    const rows = rowsOf((await readTheCells(await aWorkbook(), 'register.xlsx'))!.sheets[1].cells);
    expect(rows.map((r) => r.row)).toEqual([1, 3, 4, 5, 6]);
    expect(rows[2].values.slice(0, 3)).toEqual(['1001', 'Approved, not paid', '2500000']);
    expect(rows[2].fills[0]).toBe('#FFFF00');
    expect(rows[2].refs[2]).toBe('C4');
  });

  it('keeps a Word table as rows and cells, with each cell\'s shading', async () => {
    const doc = await readTheCells(await aReport(), 'liaison.docx');
    expect(doc?.kind).toBe('document');
    expect(doc!.tables).toHaveLength(1);
    const rows = rowsOf(doc!.tables[0].cells);
    expect(rows[1].values).toEqual(['Waiver request', 'Ministry of Finance', 'Awaiting approval']);
    expect(doc!.tables[0].cells.find((c) => c.value === 'Awaiting approval')).toMatchObject({ ref: 'row 2, column 3', fillName: 'yellow' });
    expect(doc!.tables[0].where).toBe('Table 1');
  });

  it('cites a slide table by the slide number a person sees, after the slide was moved', async () => {
    const deck = await readTheCells(await aDeck(), 'states.pptx');
    expect(deck?.kind).toBe('deck');
    expect(deck!.tables).toHaveLength(1);
    expect(deck!.tables[0]).toMatchObject({ slide: 2, where: 'Slide 2, table 1' });
    expect(deck!.tables[0].cells.find((c) => c.value === '41,500')).toMatchObject({ ref: 'row 2, column 2', fillName: 'red' });
  });

  it('says nothing, and never throws, for a file that is not an Office file or will not open', async () => {
    expect(await readTheCells(Buffer.from('a,b\n1,2'), 'x.csv')).toBeNull();
    expect(await readTheCells(Buffer.from('not a zip'), 'x.xlsx')).toBeNull();
    expect(await readTheCells(null, 'x.xlsx')).toBeNull();
  });

  it('names colours by their hue, so any shade of yellow is yellow', () => {
    expect(['#FFFF00', '#FFEB9C', '#FFD966', '#FFA500'].map(colourName)).toEqual(['yellow', 'yellow', 'yellow', 'orange']);
    expect(['#C6EFCE', '#00B050', '#FFC7CE', '#FF0000', '#BDD7EE', '#FFFFFF', '#D9D9D9', null].map(colourName))
      .toEqual(['green', 'green', 'red', 'red', 'blue', 'white', 'grey', null]);
  });

  it('turns references and serial days both ways', () => {
    expect(a1(7, 2)).toBe('B7');
    expect(a1(1, 28)).toBe('AB1');
    expect(fromA1('AB12')).toEqual({ row: 12, col: 28 });
    expect(serialToDay(46337)).toBe('2026-11-11');
    expect(serialToDay(-1)).toBeNull();
  });
});

describe('a payment tracker read from its cells', () => {
  it('cites the Excel row and the sheet, not the line of a CSV, when the sheet starts below row 1', async () => {
    const zip = new JSZip();
    zip.file('xl/workbook.xml', '<workbook xmlns:r="r"><sheets><sheet name="November" sheetId="1" r:id="rId1"/></sheets></workbook>');
    zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
    const s = (r: number, c: string, v: string) => `<c r="${c}${r}" t="inlineStr"><is><t>${v}</t></is></c>`;
    zip.file('xl/worksheets/sheet1.xml', `<worksheet><sheetData>
      <row r="3">${s(3, 'B', 'Payee')}${s(3, 'C', 'Amount')}${s(3, 'D', 'Status')}</row>
      <row r="4">${s(4, 'B', 'Acme Supplies Ltd')}${s(4, 'C', 'NGN 1,250,000')}${s(4, 'D', 'Pending')}</row>
      <row r="6">${s(6, 'B', 'Kilele Hauliers')}${s(6, 'C', 'NGN 300,000')}${s(6, 'D', 'Paid')}</row>
    </sheetData></worksheet>`);
    const cells = await readTheCells(await zip.generateAsync({ type: 'nodebuffer' }), 'tracker.xlsx');
    const read = readTheTracker('', [], cells);
    expect(read.sheet).toBe('November');
    expect(read.lines.map((l) => [l.payee, l.rowNumber, l.sheet])).toEqual([['Acme Supplies Ltd', 4, 'November'], ['Kilele Hauliers', 6, 'November']]);
  });

  it('reads from text as before where no cells are kept', () => {
    const read = readTheTracker('--- Sheet: Payments ---\nPayee,Amount,Status\nAcme Supplies Ltd,"NGN 1,250,000",Pending');
    expect(read.lines.map((l) => [l.payee, l.rowNumber, l.sheet])).toEqual([['Acme Supplies Ltd', 2, 'Payments']]);
  });
});
