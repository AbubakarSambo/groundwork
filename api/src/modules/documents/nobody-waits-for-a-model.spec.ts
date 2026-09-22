import * as fs from 'fs';
import * as path from 'path';

/**
 * NOBODY WAITS FOR A MODEL TO FINISH READING THEIR FILE.
 *
 * Hafsah, 22 September 2026: "saving document, generating reports at the end of a checkin etc. all
 * seem to load for a long time."
 *
 * Measured rather than guessed. An upload took 20,211ms to answer: 10ms to take the text out of the
 * file, 12,004ms to read what it suggests and what kind of thing it is, 8,185ms to read what it
 * holds. After: the screen says the file is filed in 0.5s and the read lands on it at 16.5s, with
 * the numbers and the question.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const DOCS = strip(fs.readFileSync(path.join(__dirname, 'documents.service.ts'), 'utf8'));
const CONVO = strip(fs.readFileSync(path.join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8'));

describe('nobody waits for a model', () => {
  it('the upload stores the file and answers', () => {
    expect(DOCS).toContain('void this.readTheRestOfIt(');
    expect(DOCS).not.toMatch(/await this\.whatItHolds\(/);
    expect(DOCS).not.toMatch(/const assessment = await this\.assessDocument\(/);
  });

  it('and the two slow reads run together, afterwards', () => {
    const after = DOCS.slice(DOCS.indexOf('private async readTheRestOfIt('), DOCS.indexOf('private sayHowLongTheUploadTook('));
    expect(after).toContain('await Promise.all([');
    expect(after).toContain('this.assessDocument(');
    expect(after).toContain('this.whatItHolds(');
  });

  it('every step says how long it took, because "it feels slow" is not a measurement', () => {
    expect(DOCS).toContain('Took the text out of');
    expect(DOCS).toContain('Upload of ${JSON.stringify(fileName)} answered in ${Date.now() - startedAt}ms');
    expect(DOCS).toContain('after the upload was answered');
  });

  it('and the close of a check-in waits only on what the next step needs', () => {
    /* Extraction writes the record; anchoring and settling both read it, and neither reads the
       other, so they run together. Timed at both ends. */
    expect(CONVO).toContain('took the record out of it in ${Date.now() - closingStartedAt}ms');
    expect(CONVO).toContain('anchored the record and settled the gaps in');
    const close = CONVO.slice(CONVO.indexOf('const closingStartedAt'), CONVO.indexOf('const closingStartedAt') + 3000);
    expect(close).toContain('await Promise.all([');
  });
});
