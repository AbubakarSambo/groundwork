/**
 * Sixteen documents attached across a hundred journeys and one report of a hundred and forty-five
 * mentioned one. The synthesis prompt was handed `docStatus.total` — a count — so the model had
 * nothing to refer to, and somebody who attached a contract and answered questions about it read a
 * record that never acknowledged it existed.
 */
import * as fs from 'fs';
import * as path from 'path';
import { documentsSection } from './a-document-in-the-corpus';

const doc = (over: Partial<Parameters<typeof documentsSection>[0][number]> = {}) => ({
  fileName: 'offer-letter.pdf',
  attachedBy: 'The manager',
  suggests: ['Base salary is 90,000', 'Reports to the delivery lead'],
  uploaderNote: null,
  ...over,
});

describe('documents in the corpus', () => {
  it('says nothing at all when there are none', () => {
    expect(documentsSection([])).toBe('');
  });

  it('names the document and who attached it', () => {
    const said = documentsSection([doc()]);
    expect(said).toContain('"offer-letter.pdf"');
    expect(said).toContain('attached by The manager');
  });

  it('carries what was read from it', () => {
    expect(documentsSection([doc()])).toContain('Base salary is 90,000');
  });

  it('says plainly when nothing was read from it', () => {
    /* A document sitting on a check-in that nothing looked at is a real state, and the model
       must not treat an empty assessment as an empty document. */
    expect(documentsSection([doc({ suggests: [] })])).toContain('Nothing was read from it');
  });

  it('carries what the person said as they attached it, as their words', () => {
    const said = documentsSection([doc({ uploaderNote: 'This is the version we signed.' })]);
    expect(said).toContain('They said as they attached it: "This is the version we signed."');
  });

  it('tells the model a document is not a party speaking', () => {
    const said = documentsSection([doc()]);
    expect(said).toMatch(/NOT their own words/);
    expect(said).toMatch(/never treat what a document asserts as established fact/);
  });

  it('and that it may be referred to by name, which is the whole point', () => {
    expect(documentsSection([doc()])).toMatch(/refer to a document by name/);
  });
});

describe('and only the documents everybody can see', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('queries OPEN visibility only', () => {
    const from = src.indexOf('const openDocs =');
    expect(from).toBeGreaterThan(-1);
    const query = src.slice(from, from + 320);
    expect(query).toContain("visibility: 'OPEN'");
  });

  it('never selects the document content into the corpus', () => {
    /* The assessment is a reading; the content is the file. Putting a party's file into the one
       shared picture is a different decision from naming a shared brief. */
    const from = src.indexOf('const openDocs =');
    const query = src.slice(from, from + 320);
    expect(query).not.toMatch(/content: true/);
  });

  it('and the section reaches the corpus', () => {
    expect(src).toContain('documentsNotice +');
  });
});
