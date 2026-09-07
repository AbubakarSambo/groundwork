/**
 * The upload response carried an id, a name, a mime type, a timestamp and an assessment — and not
 * the one thing the person who just attached a contract is wondering. `OWN` is a column value, not
 * an answer to "who will read this".
 */
import * as fs from 'fs';
import * as path from 'path';
import { DocumentVisibility } from '@prisma/client';
import { whoCanSeeItInWords } from './who-can-see-a-document';

describe('who can see it, in words', () => {
  it('tells an uploader their own evidence stays theirs', () => {
    const said = whoCanSeeItInWords(DocumentVisibility.OWN, true);
    expect(said).toMatch(/Only you/);
    expect(said).toMatch(/nobody else can open it/i);
  });

  it('says plainly when everybody can see it', () => {
    expect(whoCanSeeItInWords(DocumentVisibility.OPEN, true)).toMatch(/Everybody on this check-in/);
  });

  it('and when it is the lead\'s only', () => {
    expect(whoCanSeeItInWords(DocumentVisibility.CLOSED, true)).toMatch(/whoever leads this check-in/);
  });

  it('never contradicts the read path when context is off', () => {
    /* The flag off is the old product: every document is private to its uploader whatever the
       column says. Promising "everybody can see this" there would be false. */
    for (const v of Object.values(DocumentVisibility)) {
      expect(whoCanSeeItInWords(v, false)).toMatch(/Only you can see this/);
    }
  });

  it('names no enum value, because that is what it is replacing', () => {
    for (const v of Object.values(DocumentVisibility)) {
      const said = whoCanSeeItInWords(v, true);
      expect(said).not.toMatch(/OWN|OPEN|CLOSED|visibility/);
    }
  });
});

describe('and every upload path asks for it', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'documents.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('selects visibility wherever it creates a document', () => {
    const creates = [...src.matchAll(/groundDocument\.create\(\{[\s\S]{0,900}?\}\);/g)].map((m) => m[0]);
    expect(creates.length).toBeGreaterThanOrEqual(2);
    for (const c of creates) {
      /* A create that does not select it hands back a shape with no answer in it: `toDocShape`
         omits what was not asked for rather than guessing, which is the right rule and the reason
         the omission was invisible. */
      expect(c).toContain('visibility: true');
    }
  });

  it('and the shape says it in words as well as in the column', () => {
    expect(src).toContain('whoCanSeeIt: whoCanSeeItInWords(');
  });
});
