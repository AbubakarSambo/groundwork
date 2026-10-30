import { readFileSync } from 'fs';
import { join } from 'path';

/** Hafsah, 26 October 2026: every upload is filed into References and resources, "where its summary and what it's used for appear". */
describe('a piece of evidence says what is in it and what it is for', () => {
  const src = readFileSync(join(__dirname, 'references-and-resources.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  it('reads each piece\'s document reading', () => {
    expect(src).toContain('prisma.groundDocument?.findMany?.({ where: { id: { in: rows.map((r) => r.documentId).filter(Boolean) } }, select: { id: true, assessment: true } })');
  });
  it('gives a summary, and what it is used for: proof for its item, else what Groundwork will do with it', () => {
    expect(src).toContain("summary: (reading.suggests ?? []).slice(0, 2)");
    expect(src).toContain('usedFor: r.countsAsProof && r.itemName ? `Proof for ${r.itemName}, on the board.`');
  });
});
