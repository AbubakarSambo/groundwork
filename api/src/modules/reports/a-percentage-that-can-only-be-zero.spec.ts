import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { isBackedByADocument, documentBackedShare } from './backed-by-a-document';

/**
 * A PERCENTAGE THAT CAN ONLY BE ZERO. `evidenceType` was read in four places and written in none, so
 * the document-backed share printed 0% on every report and suppressed the strong coverage band for
 * good. Narrowed from the plan's "every enum value read is written somewhere" (which Stripe and SCIM
 * enums would fail) to the one column that was the defect, per planaudit_a_e.md.
 */
const SRC = join(__dirname, '..', '..');
function everyTsFile(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? everyTsFile(p) : p.endsWith('.ts') && !p.endsWith('a-percentage-that-can-only-be-zero.spec.ts') ? [p] : [];
  });
}

describe('the column nothing wrote', () => {
  it('is read nowhere and exists nowhere', () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const readers = everyTsFile(SRC).filter((f) => /\bevidenceType\b|\bEvidenceType\b/.test(strip(readFileSync(f, 'utf8'))));
    expect(readers).toEqual([]);
    expect(readFileSync(join(SRC, '..', 'prisma', 'schema.prisma'), 'utf8')).not.toMatch(/EvidenceType|evidenceType/);
  });
});

describe('backed by a document', () => {
  it('means a document is anchored, the line is not from memory, and the document is a source', () => {
    expect(isBackedByADocument({ anchoredDocumentId: 'd1', anchoredOrigin: 'photo', recallBased: false })).toBe(true);
    expect(isBackedByADocument({ anchoredDocumentId: 'd1', anchoredOrigin: null, recallBased: false })).toBe(true);
    expect(isBackedByADocument({ anchoredDocumentId: null, anchoredOrigin: null, recallBased: false })).toBe(false);
    expect(isBackedByADocument({ anchoredDocumentId: 'd1', anchoredOrigin: 'photo', recallBased: true })).toBe(false);
    expect(isBackedByADocument({ anchoredDocumentId: 'd1', anchoredOrigin: 'generated', recallBased: false })).toBe(false);
  });

  it('and the share can now be something other than zero', () => {
    const a = { anchoredDocumentId: 'd1', anchoredOrigin: 'scan', recallBased: false };
    const b = { anchoredDocumentId: null, anchoredOrigin: null, recallBased: false };
    expect(documentBackedShare([a, b, b, b])).toBe(25);
    expect(documentBackedShare([])).toBe(0);
  });

  it('the report and the pattern detector read through it', () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(strip(readFileSync(join(__dirname, 'reports.service.ts'), 'utf8'))).toMatch(/documentBackedShare\(allGroundTexts\)/);
    expect(strip(readFileSync(join(__dirname, '..', 'patterns', 'patterns.service.ts'), 'utf8'))).toMatch(/isBackedByADocument\(r\)/);
  });
});
