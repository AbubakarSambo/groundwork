import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * `text/markdown` WAS ON THE ALLOW-LIST AND A MARKDOWN FILE WAS STILL REFUSED.
 *
 * Most browsers report a `.md` upload as `application/octet-stream` or as an empty string - they
 * only know the extensions their own operating system has registered. So the allow-list was right
 * about the format and never saw it, and the person was told their file type was unsupported when
 * it was supported.
 *
 * Comments stripped: this explanation names the constants it protects.
 */
const SRC = readFileSync(join(__dirname, 'documents.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

describe('a browser does not know what a file is', () => {
  it('treats an unnamed type as unnamed rather than as unsupported', () => {
    expect(SRC).toContain("const UNHELPFUL_MIMES = ['', 'application/octet-stream', 'binary/octet-stream']");
  });

  it('lets the extension decide only where the browser said nothing useful', () => {
    /* Not a general extension allow-list: a browser that DID name a type is believed. */
    expect(SRC).toContain('const readableByName = browserWasNoHelp && looksLikeTextFromItsName(file.originalname)');
  });

  it('and the refusal actually consults it', () => {
    /*
     * The first version of this only checked that `readableByName` was DECLARED, so deleting it
     * from the condition it exists for left the guard green and markdown refused again. A computed
     * value nothing reads is the same as no value.
     */
    const refusal = SRC.slice(SRC.indexOf('if (!ALLOWED_MIME.includes(file.mimetype)'));
    expect(refusal.slice(0, 200)).toContain('!readableByName');
  });

  it('accepts markdown by name, which is the file that started this', () => {
    const exts = SRC.slice(SRC.indexOf('const TEXT_EXTENSIONS'), SRC.indexOf('function looksLikeTextFromItsName'));
    expect(exts).toContain("'.md'");
    expect(exts).toContain("'.markdown'");
  });

  it('only ever guesses at formats that are plain text anyway', () => {
    /*
     * Being wrong here costs a file that reads as gibberish. An extension list containing a binary
     * format would put raw bytes into somebody's check-in.
     */
    const exts = SRC.slice(SRC.indexOf('const TEXT_EXTENSIONS'), SRC.indexOf('function looksLikeTextFromItsName'));
    for (const binary of ['.pdf', '.docx', '.xlsx', '.png', '.jpg', '.zip', '.pptx']) {
      expect(exts).not.toContain(binary);
    }
  });

  it('and reads such a file as text rather than falling through', () => {
    /* The allow-list and the extractor are two separate decisions, and letting a file past the
       first without teaching the second what to do with it is how an accepted upload stores '' . */
    const extract = SRC.slice(SRC.indexOf('private async extractContent'));
    expect(extract.slice(0, 400)).toContain('looksLikeTextFromItsName(file.originalname)');
  });
});

describe('what a refusal tells somebody', () => {
  it('names slides directly, because slides are the common one', () => {
    expect(SRC).toContain('Slides cannot be read yet');
    /* And gives the way through rather than only the rule. */
    expect(SRC).toContain('Export the deck as a PDF');
  });

  it('lists formats in words a person uses, not mimetypes', () => {
    const msg = SRC.slice(SRC.indexOf('That file type cannot be read'), SRC.indexOf('That file type cannot be read') + 200);
    expect(msg).toContain('Word');
    expect(msg).toContain('Markdown');
    expect(msg).not.toContain('application/');
  });
});
