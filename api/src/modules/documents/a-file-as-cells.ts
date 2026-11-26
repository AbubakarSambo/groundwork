/**
 * A FILE READ AS ITS CELLS (Dangote brief, change 1: "code reads colours, does the arithmetic and computes the diffs; the model never does").
 *
 * Every other reader turns a file into words: a workbook becomes values-only CSV (documents.service xlsxToText), a Word table becomes paragraphs
 * (mammoth's raw text), a deck becomes runs of slide text. That is right for reading meaning, and wrong for anything that must be cited or counted:
 * a row's fill colour is gone, the CSV line is not the Excel row (a sheet whose used range starts at row 3 put every row two out), a Word table's
 * columns are gone, and a slide number came from the file name, not the deck's own order.
 *
 * This reads the same zip of XML the other readers already open (JSZip, no new dependency) and keeps each cell with where it is:
 *
 *   workbook   every sheet by its own name, each cell with its A1 reference, its real row and column, its value, whether it is a date,
 *              its formula, and its fill colour (as #RRGGBB, with a plain name such as "yellow")
 *   document   every Word table, row by row, each cell with its shading
 *   deck       every table on every slide, row by row, with the slide's number in the order the deck shows it
 *
 * It decides nothing. What a colour means, which column is which and what changed are the stream rules' business, in code, reading this.
 */
import * as JSZip from 'jszip';

export interface ACell {
  /** "B7". For a table in a document or a deck: "row 3, column 2". */
  ref: string;
  /** The row as the file numbers it, 1-based: Excel's own row number, or the table's row. */
  row: number;
  /** 1-based. */
  col: number;
  /** The value as the file holds it. A number is its digits; a date is its ISO day (see `isDate`). */
  value: string;
  /** True where the value is a day the sheet formats as a date, held as YYYY-MM-DD. */
  isDate?: boolean;
  /** The formula, without "=", where the cell has one. */
  formula?: string | null;
  /** "#FFFF00", or null where the cell has no fill. */
  fill: string | null;
  /** A plain name for the fill: "yellow", "green", "red", "orange", "blue", "purple", "grey", "white", "black". */
  fillName: string | null;
}

export interface ASheet { name: string; cells: ACell[] }
export interface ATable { /** "Slide 4, table 1" or "Table 2". */ where: string; slide: number | null; index: number; cells: ACell[] }
export interface TheCells { kind: 'workbook' | 'document' | 'deck'; sheets: ASheet[]; tables: ATable[]; /** For a deck: the slide file of each slide number, in the deck's own order. */ slideOrder?: string[] }

/* ------------------------------------------------------------------ small helpers */

export function unescapeXml(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}
const attr = (tag: string, name: string): string | null => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? unescapeXml(m[1]) : null;
};

/** "B7" from row 7, column 2. */
export function a1(row: number, col: number): string {
  let s = ''; let c = col;
  while (c > 0) { const r = (c - 1) % 26; s = String.fromCharCode(65 + r) + s; c = Math.floor((c - 1) / 26); }
  return `${s}${row}`;
}
/** Row and column of "B7". */
export function fromA1(ref: string): { row: number; col: number } | null {
  const m = /^([A-Z]+)(\d+)$/i.exec(ref.trim());
  if (!m) return null;
  let col = 0;
  for (const ch of m[1].toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row: Number(m[2]), col };
}

/** Each top-level element `name` in `xml`, nested ones kept inside their parent. */
export function elements(xml: string, name: string): string[] {
  const out: string[] = [];
  const open = new RegExp(`<${name}(?=[\\s>/])`, 'g');
  const close = `</${name}>`;
  let i = 0;
  while (true) {
    open.lastIndex = i;
    const m = open.exec(xml);
    if (!m) break;
    const start = m.index;
    const tagEnd = xml.indexOf('>', start);
    if (tagEnd < 0) break;
    if (xml[tagEnd - 1] === '/') { out.push(xml.slice(start, tagEnd + 1)); i = tagEnd + 1; continue; }
    let depth = 1; let j = tagEnd + 1;
    while (depth > 0) {
      open.lastIndex = j;
      const nextOpen = open.exec(xml);
      const nextClose = xml.indexOf(close, j);
      if (nextClose < 0) { j = xml.length; break; }
      if (nextOpen && nextOpen.index < nextClose) {
        const e = xml.indexOf('>', nextOpen.index);
        if (xml[e - 1] !== '/') depth++;
        j = e + 1;
      } else { depth--; j = nextClose + close.length; }
    }
    out.push(xml.slice(start, j));
    i = j;
  }
  return out;
}

/* ------------------------------------------------------------------ colours */

/** Excel's legacy palette, for fills given as an index (64 is "automatic"). */
const INDEXED = ['000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF', '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080', '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF',
  '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF', '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99',
  '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696', '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333'];

/** A theme colour lightened or darkened by Excel's tint (-1 to 1). */
function withTint(hex: string, tint: number): string {
  if (!tint) return hex;
  const ch = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).map((v) => (tint < 0 ? v * (1 + tint) : v + (255 - v) * tint));
  return ch.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** A plain name for a colour, by its hue, so a rule can say "yellow" whatever shade the sheet uses. */
export function colourName(hex: string | null): string | null {
  if (!hex) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2; const d = max - min;
  if (d < 0.08) return l > 0.9 ? 'white' : l < 0.15 ? 'black' : 'grey';
  const s = d / (1 - Math.abs(2 * l - 1));
  if (s < 0.15) return l > 0.9 ? 'white' : 'grey';
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 340) return 'red';
  if (h < 40) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 170) return 'green';
  if (h < 260) return 'blue';
  return 'purple';
}

/** A colour element (`<fgColor rgb=".."/>`, `<a:srgbClr val=".."/>`, `w:fill=".."`) as #RRGGBB, or null for none or automatic. */
function colourOf(tag: string, theme: string[]): string | null {
  const rgb = attr(tag, 'rgb');
  if (rgb && /^[0-9A-F]{6,8}$/i.test(rgb)) return `#${rgb.slice(-6).toUpperCase()}`;
  const indexed = attr(tag, 'indexed');
  if (indexed !== null) { const n = Number(indexed); return n < INDEXED.length ? `#${INDEXED[n]}` : null; }
  const th = attr(tag, 'theme');
  if (th !== null && theme[Number(th)]) return `#${withTint(theme[Number(th)], Number(attr(tag, 'tint') ?? 0))}`;
  return null;
}

/* ------------------------------------------------------------------ workbooks */

/** Excel's theme colours in the order a cell's `theme="n"` counts them (light 1 and dark 1 come swapped). */
function themeColours(xml: string | null): string[] {
  if (!xml) return [];
  const scheme = elements(xml, 'a:clrScheme')[0] ?? '';
  const order = ['a:lt1', 'a:dk1', 'a:lt2', 'a:dk2', 'a:accent1', 'a:accent2', 'a:accent3', 'a:accent4', 'a:accent5', 'a:accent6', 'a:hlink', 'a:folHlink'];
  return order.map((n) => {
    const el = elements(scheme, n)[0] ?? '';
    return /<a:srgbClr[^>]*val="([0-9A-F]{6})"/i.exec(el)?.[1]?.toUpperCase() ?? /<a:sysClr[^>]*lastClr="([0-9A-F]{6})"/i.exec(el)?.[1]?.toUpperCase() ?? '';
  });
}

const DATE_FORMAT_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);
const looksLikeADateFormat = (code: string) => /[dy]/i.test(code.replace(/"[^"]*"|\[[^\]]*\]/g, ''));

/** An Excel serial day as YYYY-MM-DD (the 1900 system, with its leap-year bug). */
export function serialToDay(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2_958_465) return null;
  const ms = Math.round((serial - 25569) * 86_400_000);
  return new Date(ms).toISOString().slice(0, 10);
}

async function readAWorkbook(zip: JSZip): Promise<TheCells> {
  const text = async (p: string) => (zip.file(p) ? await zip.file(p)!.async('string') : null);
  const workbook = (await text('xl/workbook.xml')) ?? '';
  const rels = (await text('xl/_rels/workbook.xml.rels')) ?? '';
  const target = new Map<string, string>();
  for (const r of elements(rels, 'Relationship')) { const id = attr(r, 'Id'); const t = attr(r, 'Target'); if (id && t) target.set(id, t.replace(/^\/?xl\//, '').replace(/^\//, '')); }

  const shared: string[] = elements((await text('xl/sharedStrings.xml')) ?? '', 'si').map((si) => [...si.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1])).join(''));

  const theme = themeColours(await text('xl/theme/theme1.xml'));
  const styles = (await text('xl/styles.xml')) ?? '';
  const fills = elements(elements(styles, 'fills')[0] ?? '', 'fill').map((f) => {
    const pf = elements(f, 'patternFill')[0];
    if (!pf || (attr(pf, 'patternType') ?? 'none') === 'none') return null;
    const fg = /<fgColor[^>]*\/?>/.exec(pf)?.[0];
    const bg = /<bgColor[^>]*\/?>/.exec(pf)?.[0];
    return (fg && colourOf(fg, theme)) ?? (bg && colourOf(bg, theme)) ?? null;
  });
  const formats = new Map<number, string>();
  for (const n of elements(elements(styles, 'numFmts')[0] ?? '', 'numFmt')) formats.set(Number(attr(n, 'numFmtId')), attr(n, 'formatCode') ?? '');
  const xfs = elements(elements(styles, 'cellXfs')[0] ?? '', 'xf').map((xf) => {
    const fmt = Number(attr(xf, 'numFmtId') ?? 0);
    return { fill: fills[Number(attr(xf, 'fillId') ?? 0)] ?? null, isDate: DATE_FORMAT_IDS.has(fmt) || (formats.has(fmt) && looksLikeADateFormat(formats.get(fmt)!)) };
  });

  const sheets: ASheet[] = [];
  for (const s of elements(elements(workbook, 'sheets')[0] ?? '', 'sheet')) {
    const name = attr(s, 'name') ?? `Sheet ${sheets.length + 1}`;
    const path = target.get(attr(s, 'r:id') ?? '') ?? null;
    const xml = path ? await text(`xl/${path}`) : null;
    if (!xml) { sheets.push({ name, cells: [] }); continue; }
    const cells: ACell[] = [];
    for (const c of elements(elements(xml, 'sheetData')[0] ?? '', 'c')) {
      const head = c.slice(0, c.indexOf('>') + 1);
      const ref = attr(head, 'r');
      const at = ref ? fromA1(ref) : null;
      if (!ref || !at) continue;
      const t = attr(head, 't');
      const style = xfs[Number(attr(head, 's') ?? 0)] ?? { fill: null, isDate: false };
      const v = /<v>([\s\S]*?)<\/v>/.exec(c)?.[1];
      const f = /<f(?:\s[^>]*)?>([\s\S]*?)<\/f>/.exec(c)?.[1];
      let value = '';
      let isDate = false;
      if (t === 's') value = shared[Number(v)] ?? '';
      else if (t === 'inlineStr') value = [...c.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1])).join('');
      else if (t === 'b') value = v === '1' ? 'TRUE' : v === '0' ? 'FALSE' : '';
      else if (v !== undefined) {
        value = unescapeXml(v);
        if (t !== 'str' && t !== 'e' && style.isDate) { const day = serialToDay(Number(value)); if (day) { value = day; isDate = true; } }
      }
      if (!value && !style.fill && !f) continue;
      cells.push({ ref, row: at.row, col: at.col, value, ...(isDate ? { isDate } : {}), ...(f ? { formula: unescapeXml(f) } : {}), fill: style.fill, fillName: colourName(style.fill) });
    }
    sheets.push({ name, cells });
  }
  return { kind: 'workbook', sheets, tables: [] };
}

/* ------------------------------------------------------------------ tables in Word and PowerPoint */

/** A table's rows and cells, wherever its XML uses `rowTag` and `cellTag`, reading each cell's text runs and its shading. */
function readATable(xml: string, a: { rowTag: string; cellTag: string; textTag: string; fillOf: (cell: string) => string | null }): ACell[] {
  const cells: ACell[] = [];
  elements(xml, a.rowTag).forEach((tr, ri) => {
    let col = 0;
    for (const tc of elements(tr, a.cellTag)) {
      col++;
      const paragraphs = elements(tc, a.rowTag === 'w:tr' ? 'w:p' : 'a:p');
      const words = (paragraphs.length ? paragraphs : [tc])
        .map((p) => [...p.matchAll(new RegExp(`<${a.textTag}(?:\\s[^>]*)?>([\\s\\S]*?)</${a.textTag}>`, 'g'))].map((m) => unescapeXml(m[1])).join(''))
        .filter((t) => t.trim()).join('\n').trim();
      const fill = a.fillOf(tc);
      cells.push({ ref: `row ${ri + 1}, column ${col}`, row: ri + 1, col, value: words, fill, fillName: colourName(fill) });
      /* A merged cell spans columns; the next one starts after it. */
      const span = Number(/<w:gridSpan[^>]*w:val="(\d+)"/.exec(tc)?.[1] ?? /\sgridSpan="(\d+)"/.exec(tc)?.[1] ?? 1);
      col += Math.max(0, span - 1);
    }
  });
  return cells;
}

async function readADocument(zip: JSZip): Promise<TheCells> {
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? '';
  const body = elements(xml, 'w:body')[0] ?? xml;
  const tables = elements(body, 'w:tbl').map((tbl, i) => ({
    where: `Table ${i + 1}`, slide: null, index: i + 1,
    cells: readATable(tbl, {
      rowTag: 'w:tr', cellTag: 'w:tc', textTag: 'w:t',
      fillOf: (tc) => { const fill = /<w:shd[^>]*w:fill="([0-9A-F]{6})"/i.exec(tc)?.[1]; return fill ? `#${fill.toUpperCase()}` : null; },
    }),
  }));
  return { kind: 'document', sheets: [], tables };
}

/**
 * The slides in the order the deck shows them (presentation.xml's list), each numbered by that order, so "Slide 4" is the fourth slide a
 * person sees, even after slides were moved. A deck with no list (rare, hand-made) keeps its file names' order and numbers. The number
 * travels with the file either way, so a slide with no text never shifts the ones after it.
 */
export async function slidesOfADeck(zip: JSZip): Promise<{ name: string; number: number }[]> {
  const pres = (await zip.file('ppt/presentation.xml')?.async('string')) ?? '';
  const rels = (await zip.file('ppt/_rels/presentation.xml.rels')?.async('string')) ?? '';
  const target = new Map<string, string>();
  for (const r of elements(rels, 'Relationship')) { const id = attr(r, 'Id'); const t = attr(r, 'Target'); if (id && t) target.set(id, `ppt/${t.replace(/^\/?ppt\//, '').replace(/^\//, '')}`); }
  const listed = elements(elements(pres, 'p:sldIdLst')[0] ?? '', 'p:sldId').map((s) => target.get(attr(s, 'r:id') ?? '')).filter((x): x is string => !!x && !!zip.file(x));
  if (listed.length) return listed.map((name, i) => ({ name, number: i + 1 }));
  return Object.keys(zip.files)
    .map((name) => ({ name, number: Number(/^ppt\/slides\/slide(\d+)\.xml$/.exec(name)?.[1] ?? NaN) }))
    .filter((x) => Number.isFinite(x.number))
    .sort((a, b) => a.number - b.number);
}

async function readADeck(zip: JSZip): Promise<TheCells> {
  const order = await slidesOfADeck(zip);
  const tables: ATable[] = [];
  for (const { name, number } of order) {
    const xml = (await zip.file(name)!.async('string')) ?? '';
    elements(xml, 'a:tbl').forEach((tbl, t) => {
      tables.push({
        where: `Slide ${number}, table ${t + 1}`, slide: number, index: t + 1,
        cells: readATable(tbl, {
          rowTag: 'a:tr', cellTag: 'a:tc', textTag: 'a:t',
          fillOf: (tc) => { const pr = elements(tc, 'a:tcPr')[0] ?? ''; const solid = elements(pr, 'a:solidFill')[0] ?? ''; const hex = /<a:srgbClr[^>]*val="([0-9A-F]{6})"/i.exec(solid)?.[1]; return hex ? `#${hex.toUpperCase()}` : null; },
        }),
      });
    });
  }
  return { kind: 'deck', sheets: [], tables, slideOrder: order.map((x) => x.name) };
}

/* ------------------------------------------------------------------ the one way in */

const KIND = (fileName: string, mimeType?: string | null): 'workbook' | 'document' | 'deck' | null => {
  const n = fileName.toLowerCase(); const m = (mimeType ?? '').toLowerCase();
  if (n.endsWith('.xlsx') || n.endsWith('.xlsm') || m.includes('spreadsheetml')) return 'workbook';
  if (n.endsWith('.docx') || m.includes('wordprocessingml')) return 'document';
  if (n.endsWith('.pptx') || m.includes('presentationml')) return 'deck';
  return null;
};

/** The cells of an Office file, or null for anything else or a file that will not open. Never throws. */
export async function readTheCells(bytes: Buffer | Uint8Array | null | undefined, fileName: string, mimeType?: string | null): Promise<TheCells | null> {
  const kind = KIND(fileName, mimeType);
  if (!kind || !bytes || !bytes.length) return null;
  try {
    const zip = await JSZip.loadAsync(bytes);
    return kind === 'workbook' ? await readAWorkbook(zip) : kind === 'document' ? await readADocument(zip) : await readADeck(zip);
  } catch {
    return null;
  }
}

/** A sheet or table as rows of values, each row with the row number the file gives it, blank rows left out. */
export function rowsOf(cells: ACell[]): { row: number; values: string[]; fills: (string | null)[]; refs: string[] }[] {
  const byRow = new Map<number, ACell[]>();
  for (const c of cells) byRow.set(c.row, [...(byRow.get(c.row) ?? []), c]);
  const width = cells.reduce((w, c) => Math.max(w, c.col), 0);
  return [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(([row, cs]) => {
    const values = Array.from({ length: width }, () => ''); const fills: (string | null)[] = Array.from({ length: width }, () => null); const refs = Array.from({ length: width }, (_, i) => a1(row, i + 1));
    for (const c of cs) { values[c.col - 1] = c.value; fills[c.col - 1] = c.fill; refs[c.col - 1] = c.ref; }
    return { row, values, fills, refs };
  }).filter((r) => r.values.some((v) => v.trim()));
}
