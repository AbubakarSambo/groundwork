/**
 * RECORDED, NEVER READ — AND THE DIFFERENCE HAS TO BE STRUCTURAL.
 *
 * A link kept alongside uploaded documents is a row with no text where every
 * prompt-assembling read expects text, and an assistant answering about a
 * contract it never opened reads exactly like one that did.
 */
import * as fs from 'fs';
import * as path from 'path';
import { whereItLives, whatToCallIt, whatWeCanAndCannotDo } from './where-a-document-lives';

const source = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

describe('where a pasted address lives', () => {
  it.each([
    ['https://docs.google.com/document/d/abc/edit', 'Google Docs'],
    ['https://drive.google.com/file/d/abc/view', 'Google Drive'],
    ['https://www.dropbox.com/s/abc/contract.pdf', 'Dropbox'],
    ['https://acme.sharepoint.com/sites/hr/doc.docx', 'SharePoint'],
    ['https://www.notion.so/Team-plan-abc', 'Notion'],
  ])('reads %s as %s', (url, called) => {
    expect(whereItLives(url)?.livesIn).toBe(called);
  });

  it('records somewhere it has never heard of, by its host', () => {
    expect(whereItLives('https://files.northwind.test/a/b')?.livesIn).toBe('files.northwind.test');
  });

  it('finds the link inside a sentence', () => {
    expect(whereItLives('here it is https://www.dropbox.com/s/abc/x.pdf have a look')?.url)
      .toBe('https://www.dropbox.com/s/abc/x.pdf');
  });

  it('is nothing when there is no link', () => {
    expect(whereItLives('the contract is in dropbox somewhere')).toBeNull();
  });

  it('refuses a path on one person’s laptop', () => {
    expect(whereItLives('file:///Users/ada/contract.pdf')).toBeNull();
  });

  it('drops the query string, because sharing links carry tokens', () => {
    const where = whereItLives('https://www.dropbox.com/s/abc/x.pdf?rlkey=SECRETTOKEN&dl=0')!;
    expect(where.url).toBe('https://www.dropbox.com/s/abc/x.pdf');
    expect(where.url).not.toContain('SECRETTOKEN');
  });
});

describe('what it is called on the check-in', () => {
  it('what they said about it, when they said something', () => {
    const where = whereItLives('the signed renewal contract https://www.dropbox.com/s/abc/x.pdf')!;
    expect(whatToCallIt(where, 'the signed renewal contract https://www.dropbox.com/s/abc/x.pdf'))
      .toBe('the signed renewal contract');
  });

  it('drops the handing-over words in front of it', () => {
    /* Found by running it: the row came back called "here is the signed renewal
       contract", which is a sentence rather than a document. */
    const said = "here is the signed renewal contract https://www.dropbox.com/s/abc/x.pdf";
    expect(whatToCallIt(whereItLives(said)!, said)).toBe('the signed renewal contract');
  });

  it('never an id, because an id tells nobody what the thing is', () => {
    const url = 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
    expect(whatToCallIt(whereItLives(url)!, url)).toBe('A document in Google Docs');
  });

  it('and never the link itself', () => {
    const url = 'https://www.dropbox.com/s/abc/renewal-contract';
    expect(whatToCallIt(whereItLives(url)!, url)).not.toContain('http');
  });
});

describe('what the person is told', () => {
  const said = whatWeCanAndCannotDo(whereItLives('https://docs.google.com/document/d/abc')!, 'The plan');

  it('says where it is', () => {
    expect(said).toContain('Google Docs');
  });

  it('says plainly that it has not been read', () => {
    expect(said).toContain('not read it');
  });

  it('and says what to do if what is inside it matters', () => {
    expect(said).toMatch(/paste|upload/);
  });
});

describe('nothing that assembles document text can reach one', () => {
  it('the recorded link carries no content field at all', () => {
    const schema = fs.readFileSync(path.join(__dirname, '../../../prisma/schema.prisma'), 'utf8');
    const model = schema.slice(schema.indexOf('model DocumentElsewhere'));
    const body = model.slice(0, model.indexOf('\n}'));
    expect(body).toContain('documents_elsewhere');
    expect(body).not.toMatch(/^\s+content\s/m);
  });

  it('records the link only where it could not be read, and holds text only where it could', () => {
    /* One or the other, never both and never a middle. A link we could not read
       is a row with no text, in the table nothing text-assembling can reach; a
       link we DID read is an ordinary document, because that is what it is. */
    const assistant = fs
      .readFileSync(path.join(__dirname, '../assistant/assistant.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    const from = assistant.indexOf('const where = whereItLives(message);');
    const branch = assistant.slice(from, assistant.indexOf('askWhoItIsFor(title)}`)', from));

    const read = branch.indexOf('if (attempt.read)');
    const holds = branch.indexOf('groundDocument.create');
    const records = branch.indexOf('documentElsewhere.create');

    expect(from).toBeGreaterThan(-1);
    expect(read).toBeGreaterThan(-1);
    /* The document we hold is created inside the read branch; the link is
       recorded after it, on the path where reading did not happen. */
    expect(holds).toBeGreaterThan(read);
    expect(records).toBeGreaterThan(holds);
  });

  it('and what it holds is the text that actually came back', () => {
    const assistant = fs.readFileSync(path.join(__dirname, '../assistant/assistant.service.ts'), 'utf8');
    expect(assistant).toContain('content: attempt.text');
  });
});
