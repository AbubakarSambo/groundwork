/**
 * A DOCUMENT WE COULD NOT READ IS NOT A SOURCE.
 *
 * The extractors write "[Attached: budget.xlsx - could not parse spreadsheet.]" into the content
 * column when text cannot be pulled out. Storing that is right: the file IS on record. Treating it
 * as evidence is not - it is our sentence about our own failure, not theirs.
 *
 * Three readers stepped around it with their own inline check. The fourth, the anchoring pass, did
 * not exist when those were written, and it is the one that matters: an anchored line counts as
 * document-backed, and document-backed lines are what let a report say the evidence is strong. So
 * an apology for a file we could not open could raise the confidence of a report about somebody.
 *
 * Half of this is behaviour and half is a sweep, because the defect was a reader that did not ask.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { weCouldNotReadIt, onlyWhatWeCouldRead, WE_COULD_NOT_READ_IT } from './a-document-we-could-not-read-is-not-a-source';

describe('what counts as something we could read', () => {
  it('knows our own note when it sees it', () => {
    expect(weCouldNotReadIt('[Attached: budget.xlsx - could not parse spreadsheet.]')).toBe(true);
    expect(weCouldNotReadIt('  [Attached: scan.pdf - text not extractable...]')).toBe(true);
  });

  it('and leaves a real document alone, including one that mentions an attachment', () => {
    expect(weCouldNotReadIt('Q3 plan. See [Attached: the appendix] for detail.')).toBe(false);
    expect(weCouldNotReadIt('')).toBe(false);
    expect(weCouldNotReadIt(null)).toBe(false);
  });

  it('drops only the unreadable ones, and keeps the order of the rest', () => {
    const kept = onlyWhatWeCouldRead([
      { fileName: 'a.pdf', content: 'the offer letter says 1 October' },
      { fileName: 'b.xlsx', content: `${WE_COULD_NOT_READ_IT} b.xlsx - could not parse spreadsheet.]` },
      { fileName: 'c.docx', content: 'the handover plan' },
    ]);
    expect(kept.map((d) => d.fileName)).toEqual(['a.pdf', 'c.docx']);
  });
});

describe('every reader of document content asks', () => {
  const CODE = (p: string[]) =>
    readFileSync(join(__dirname, '..', ...p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('the anchoring pass, which is the one that can make an apology into evidence', () => {
    const conv = CODE(['conversation', 'conversation.service.ts']);
    /* documentsThatMayBack is the one list both the anchoring pass and the end card read. */
    expect(conv).toMatch(/return onlyWhatWeCouldRead\(docs\);/);
    expect(conv).toMatch(/const \[readable, entries\] = await Promise\.all\(\[\s*this\.documentsThatMayBack\(/);
    /* And it must index the filtered list, or the model's [2] is a different document from ours. */
    expect(conv).not.toMatch(/docs\[[bd]\.document\]/);
  });

  it('and the three that used to ask in their own words now ask in one', () => {
    const docs = CODE(['documents', 'documents.service.ts']);
    expect(docs).not.toMatch(/startsWith\('\[Attached:'\)/);
    expect((docs.match(/weCouldNotReadIt\(/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
