import { originFromTheFile, looksGeneratedByAModel, COUNTS_AS_A_SOURCE, originLabel } from './what-kind-of-thing-a-document-is';
import { theSessionReport } from '../reports/the-session-report';

describe('documents are not one thing', () => {
  it('the file type decides images and scans', () => {
    expect(originFromTheFile('image/jpeg', 'IMG_2231.jpg')).toBe('photo');
    expect(originFromTheFile('image/png', 'Screenshot 2026-09-09.png')).toBe('screenshot');
    expect(originFromTheFile('application/pdf', 'memo.pdf', { pdfHadNoTextLayer: true })).toBe('scan');
    expect(originFromTheFile('application/pdf', 'memo.pdf')).toBeNull();
    expect(originFromTheFile('text/plain', 'notes.txt', { isConversation: true })).toBe('conversation');
  });
  it('model-written notes read a certain way', () => {
    expect(looksGeneratedByAModel('Here is a summary of the meeting.\n\n**Key points**\n- one\n- two\n- three\n- four\n- five\n- six\n\nIn summary, the team is aligned.')).toBe(true);
    expect(looksGeneratedByAModel('OFFER LETTER. Delivery lead, starting 1 October. Owns the delivery board from week four. Signed A. Bello.')).toBe(false);
  });
  it('generated notes are not a source; everything else is', () => {
    expect(COUNTS_AS_A_SOURCE.has('generated')).toBe(false);
    for (const o of ['typed', 'photo', 'scan', 'screenshot', 'pasted', 'conversation']) expect(COUNTS_AS_A_SOURCE.has(o)).toBe(true);
    expect(originLabel('generated')).toBe('notes written with a model');
    expect(originLabel(null)).toBeNull();
  });
});

describe('a line backed by generated notes does not raise the documented share', () => {
  const base: any = {
    sessionNumber: 1, closed: true, agreements: [], divergences: [], previousEntries: [], previousSharedPicture: null,
    baselineSuccess: null, startingPoint: null, evidence: [], specificityLevel: null,
    answeredThisSession: [{ who: 'A', isYou: true }], everyone: [{ who: 'A', isYou: true }], lastSessionCommitments: [], canFollowThreads: false,
    targets: [], movedOnTargets: null, blocked: 0, waiting: 0, dependencies: [],
  };
  const entries = (backedBy: string | null) => [
    { type: 'COMMITMENT', text: 'I will publish the rota by Friday.', who: 'A', recallBased: false, threadKey: null, backedBy },
    { type: 'WORRY', text: 'Nobody answers at night.', who: 'A', recallBased: true, threadKey: null },
  ];
  it('typed source: 1 of 2 documented', () => {
    const r = theSessionReport({ ...base, entries: entries('typed') });
    expect(r.atAGlance.find((t: any) => t.label === 'How much was said')!.value).toMatch(/50% documented/);
  });
  it('generated notes: still shown as backed, counted as memory', () => {
    const r = theSessionReport({ ...base, entries: entries('generated') });
    expect(r.atAGlance.find((t: any) => t.label === 'How much was said')!.value).toBe('All from memory');
  });
  it('a document from before origins existed still counts', () => {
    const r = theSessionReport({ ...base, entries: entries(null) });
    expect(r.atAGlance.find((t: any) => t.label === 'How much was said')!.value).toMatch(/50% documented/);
  });
});
