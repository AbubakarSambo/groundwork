import { RecordEntryType } from '@prisma/client';
import { theSessionReport } from './the-session-report';

/**
 * YOUR OWN ROW HOLDS YOUR OWN LINES (review, 29 September 2026).
 *
 * Session report 3, read as Femi: his own row said "Answered, and nothing specific enough to record
 * came out of it." while seven of his lines were on record and the lead read a real summary of them.
 * The read names the reader's own lines the way it names everybody's, and the row looked them up
 * under an empty name. Read here as Femi, as the lead, and as a colleague.
 */
const line = (text: string, who: string | null) => ({ type: RecordEntryType.PROGRESS, text, who, recallBased: true, threadKey: null });
const FEMIS = ['I closed the Kaduna facility on 12 September.', 'Two more files are with credit.'];
const report = (answered: { who: string; isYou: boolean }[], who: string | null) =>
  theSessionReport({
    sessionNumber: 3, closed: true, agreements: [], divergences: [],
    entries: FEMIS.map((t) => line(t, who)), previousEntries: [], evidence: [],
    answeredThisSession: answered, ofPeople: 2, answered: 2,
  } as any);

describe("a person's own row on the session report", () => {
  it('as Femi, his row has his lines and never says nothing came out of it', () => {
    const r = report([{ who: 'Femi Bello', isYou: true }], 'Femi Bello');
    const own = r.whatEachPersonSaid.find((p: any) => p.isYou)!;
    expect(own.lines).toEqual(FEMIS);
    expect((own as any).saying).toBeUndefined();
    expect(JSON.stringify(own)).not.toMatch(/nothing specific enough to record/);
  });

  it('and where a read leaves his own lines unnamed, they are still his', () => {
    const own = report([{ who: 'Femi Bello', isYou: true }], null).whatEachPersonSaid.find((p: any) => p.isYou)!;
    expect(own.lines).toEqual(FEMIS);
  });

  it('as the lead, and as a colleague after release, the row is the same lines', () => {
    for (const r of [report([{ who: 'Femi Bello', isYou: false }], 'Femi Bello')]) {
      expect(r.whatEachPersonSaid[0].lines).toEqual(FEMIS);
    }
  });

  it('somebody who really said nothing still reads the plain line', () => {
    const r = report([{ who: 'Femi Bello', isYou: true }, { who: 'Ngozi Eze', isYou: false }], 'Femi Bello');
    const ngozi = r.whatEachPersonSaid.find((p: any) => p.who === 'Ngozi Eze')!;
    expect((ngozi as any).saying).toBe('This person has answered, and nothing specific enough to record came out of it.');
  });
});
