/**
 * Sixteen documents were attached across the hundred-journey run and one report of a hundred and
 * forty-five mentioned a document at all. The synthesis prompt gets a count; the person who
 * attached a contract gets no sign it was ever read.
 */
import * as fs from 'fs';
import * as path from 'path';
import { DocumentVisibility } from '@prisma/client';
import { whatThisRecordRestsOn, nothingRestsOnADocument } from './what-this-record-rests-on';

const doc = (over: Partial<Parameters<typeof whatThisRecordRestsOn>[0][number]> = {}) => ({
  id: 'd1', fileName: 'offer-letter.pdf', participantId: 'p1',
  visibility: DocumentVisibility.OWN, assessed: true, ...over,
});
const labels = new Map([['p1', 'The manager'], ['p2', 'The new starter']]);
const ask = (docs: any[], reader: any) => whatThisRecordRestsOn(docs, reader, labels, true);

describe('what this record rests on', () => {
  it('names a document back to the person who attached it', () => {
    const out = ask([doc()], { participantId: 'p1', isLead: false });
    expect(out.documents).toEqual([{ fileName: 'offer-letter.pdf', whose: 'you attached this', read: true }]);
  });

  it('says plainly when nothing read it, which is a state somebody is entitled to know about', () => {
    const out = ask([doc({ assessed: false })], { participantId: 'p1', isLead: false });
    expect(out.documents[0].read).toBe(false);
  });

  it('does not name somebody else\'s own evidence, and counts it instead', () => {
    const out = ask([doc({ participantId: 'p2' })], { participantId: 'p1', isLead: false });
    expect(out.documents).toEqual([]);
    expect(out.otherPartiesHave).toBe(1);
  });

  it('names an OPEN document to both sides, with whose it is', () => {
    const out = ask([doc({ participantId: 'p2', visibility: DocumentVisibility.OPEN })], { participantId: 'p1', isLead: false });
    expect(out.documents[0].whose).toBe('The new starter attached this');
  });

  it('keeps a CLOSED document to the lead', () => {
    const closed = [doc({ participantId: 'p1', visibility: DocumentVisibility.CLOSED })];
    expect(ask(closed, { participantId: 'p2', isLead: false }).documents).toEqual([]);
    expect(ask(closed, { participantId: 'p2', isLead: true }).documents).toHaveLength(1);
  });

  it('shows a reader their own document only, when context is off', () => {
    const docs = [doc({ participantId: 'p2', visibility: DocumentVisibility.OPEN }), doc({ id: 'd2', participantId: 'p1' })];
    const out = whatThisRecordRestsOn(docs, { participantId: 'p1', isLead: false }, labels, false);
    expect(out.documents).toHaveLength(1);
    expect(out.otherPartiesHave).toBe(1);
  });

  it('falls back to a role rather than a name it does not have', () => {
    const out = ask([doc({ participantId: 'unknown', visibility: DocumentVisibility.OPEN })], { participantId: 'p1', isLead: false });
    expect(out.documents[0].whose).toBe('A party attached this');
  });

  it('says something rather than nothing when no document was attached', () => {
    expect(nothingRestsOnADocument()).toMatch(/what people said/i);
  });
});

describe('and the report carries it on both branches', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('is attached to the forming report and to the released one', () => {
    expect((src.match(/restsOn: await this\.whatItRestsOn\(/g) ?? []).length).toBe(2);
  });

  it('and asks canSeeDocument rather than re-deciding visibility', () => {
    const helper = fs.readFileSync(path.join(__dirname, 'what-this-record-rests-on.ts'), 'utf8');
    expect(helper).toContain("from '../documents/who-can-see-a-document'");
    expect(helper).not.toMatch(/visibility === /);
  });
});
