import * as fs from 'fs';
import * as path from 'path';
import { ALIGNMENT_FEED_ONLY_CODES, BAD_FAITH_CODES, CARRYING_CODES, POSITIVE_CODES } from './pattern-library';
import { NEVER_NAMED_TO_A_PERSON, PLAIN_PATTERN_NAMES, plainNameOf } from './plain-pattern-names';

/**
 * ONE PLAIN NAME FOR EACH OF THE 49, AND THE SAME ONE AS THE DOCUMENT HAFSAH IS APPROVING.
 *
 * Decision 19, and docs/pattern-names.md. The document is what she reads and approves; this file is
 * what the product reads. If they disagree, she approved one list and the screens show another, so
 * the document's tables are read here and compared name by name.
 */

const EVERY_CODE = [...POSITIVE_CODES, ...CARRYING_CODES, ...BAD_FAITH_CODES];
const INTERNAL_NAMES = EVERY_CODE.map((c) => c.name);

function theDocumentsNames(): Map<string, string> {
  const doc = fs.readFileSync(path.join(__dirname, '../../../../docs/pattern-names.md'), 'utf8');
  const out = new Map<string, string>();
  for (const line of doc.split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    /* | Code | Internal name | Plain name | What the record shows | */
    if (cells.length < 5 || !/^[A-Z]\d{1,2}$/.test(cells[1])) continue;
    out.set(cells[1], cells[3]);
  }
  return out;
}

describe('the plain names of the patterns', () => {
  it('there are 49 patterns, and every one has a plain name or is one of the two never named to a person', () => {
    expect(EVERY_CODE).toHaveLength(49);
    const missing = EVERY_CODE.map((c) => c.code).filter((code) => !PLAIN_PATTERN_NAMES[code] && !NEVER_NAMED_TO_A_PERSON[code]);
    expect(missing).toEqual([]);
    expect(Object.keys(PLAIN_PATTERN_NAMES)).toHaveLength(47);
  });

  it('E4 and F5 are never given a name a person may read', () => {
    expect(Object.keys(NEVER_NAMED_TO_A_PERSON).sort()).toEqual(['E4', 'F5']);
    for (const code of ALIGNMENT_FEED_ONLY_CODES) expect(plainNameOf(code)).toBeNull();
  });

  it('a code the library does not know has no name, rather than its code as a name', () => {
    expect(plainNameOf('k5')).toBeNull();
    expect(plainNameOf('CONCENTRATION_RISK')).toBeNull();
    expect(plainNameOf('toString')).toBeNull();
  });

  it('each name is the one in docs/pattern-names.md, word for word', () => {
    const doc = theDocumentsNames();
    expect(doc.size).toBe(49);
    for (const [code, plain] of Object.entries(PLAIN_PATTERN_NAMES)) expect([code, plain.name]).toEqual([code, doc.get(code)]);
    for (const [code, plain] of Object.entries(NEVER_NAMED_TO_A_PERSON)) expect([code, plain]).toEqual([code, doc.get(code)]);
  });

  it('no plain name holds an internal name, a code, a colon, an arrow or a dot joining pieces', () => {
    for (const { name } of Object.values(PLAIN_PATTERN_NAMES)) {
      for (const internal of INTERNAL_NAMES) expect(name.toLowerCase()).not.toContain(internal.toLowerCase());
      expect(name).not.toMatch(/\b[A-Z]\d{1,2}\b|[:→·•]/);
    }
  });

  it('good news, carrying and the rest are kept apart, as the library keeps them', () => {
    for (const c of POSITIVE_CODES) expect(plainNameOf(c.code)?.kind).toBe('good');
    for (const c of CARRYING_CODES) expect(plainNameOf(c.code)?.kind).toBe('carrying');
    for (const c of BAD_FAITH_CODES.filter((c) => !ALIGNMENT_FEED_ONLY_CODES.has(c.code))) expect(plainNameOf(c.code)?.kind).toBe('attention');
  });

  it('nothing that serves a pattern imports the names that are for an internal screen only', () => {
    const root = path.join(__dirname, '..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.ts') && !p.endsWith('.spec.ts') && !p.endsWith('plain-pattern-names.ts')) {
          /* Comments stripped first, so a comment that mentions it cannot satisfy or fail this. */
          const code = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
          /* The final check imports them only to take them out of a sentence about a person (b6d5c4702); it serves none. */
          if (code.includes('NEVER_NAMED_TO_A_PERSON') && !p.endsWith(path.join('conversation', 'the-final-check.ts'))) offenders.push(path.relative(root, p));
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
