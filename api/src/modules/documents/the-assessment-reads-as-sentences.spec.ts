import { DocumentsService } from './documents.service';

/**
 * THE ASSESSMENT CARD READS AS SENTENCES, NOT FRAGMENTS (the fragment fault, 30 Sep 2026).
 *
 * `assessDocument` asks the model for "one plain sentence" per bullet, but a bare noun phrase still
 * gets through sometimes, and the Context page joins the first two "suggests" bullets straight after
 * each other with nothing between them - a fragment there reads the same wrong way `whatItIs` used
 * to, before that fix. `aSentence` (what-a-document-holds.ts) is now applied to every bullet here, in
 * code, so a person reads full sentences whatever the model hands back.
 */
function aService(extract: jest.Mock) {
  const s = Object.create(DocumentsService.prototype) as any;
  s.anthropic = { extract };
  s.logger = { log: jest.fn(), warn: jest.fn() };
  return s;
}

describe('the document assessment card reads as sentences', () => {
  it('turns a bare noun phrase in "suggests" or "willDo" into a full sentence', async () => {
    const s = aService(jest.fn(async () => ({
      suggests: ['Higher marketing spend than budgeted', 'This shows the campaign ran over three months.'],
      willDo: ['Evidence for the spend you described'],
    })));
    const result = await s.assessDocument('some document text', 'spend.pdf');
    expect(result.suggests).toEqual([
      'It looks like higher marketing spend than budgeted.',
      'This shows the campaign ran over three months.',
    ]);
    expect(result.willDo).toEqual(['It looks like evidence for the spend you described.']);
  });

  it('drops an empty bullet rather than inventing a sentence for it', async () => {
    const s = aService(jest.fn(async () => ({ suggests: ['A price list for the 600L cookers', '  '], willDo: [] })));
    const result = await s.assessDocument('some document text', 'q3.pdf');
    expect(result.suggests).toEqual(['It looks like a price list for the 600L cookers.']);
    expect(result.willDo).toEqual([]);
  });

  it('returns null when the model finds nothing to suggest', async () => {
    const s = aService(jest.fn(async () => ({ suggests: [], willDo: [] })));
    expect(await s.assessDocument('some document text', 'q3.pdf')).toBeNull();
  });
});
