import { readFileSync } from 'fs';
import { join } from 'path';
import { RecordEntryType } from '@prisma/client';
import { theSessionReport } from './the-session-report';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SRC = join(__dirname, '..');

/**
 * A LEAD READ "NOTHING SPECIFIC ENOUGH TO RECORD CAME OUT OF IT" ON THE ROUND THE WORK LANDED.
 *
 * Found by running a lead's own path end to end with a workplan and two targets. Three people
 * delivered a quarter's plan; the closing report said that about two of them, and its "Progress and
 * priorities" section said nobody had stated what they were working towards.
 *
 * The lines were in the record: "All forty migrated by Friday", "We are at 180 teams through
 * onboarding", "Finance signed off on the 5th". They had been typed SUCCESS_DEFINITION, which the
 * per-person view deliberately hides - that type is what good would LOOK like, and printing it as
 * though somebody had done it was an older bug with its own fix.
 *
 * The model was cornered rather than wrong. There was no type for a thing that HAPPENED, so the
 * same sentence came back COMMITMENT in one round and SUCCESS_DEFINITION in the next. On a product
 * whose job is tracking whether a plan is being followed, progress had nowhere to live.
 */
const said = (type: RecordEntryType, text: string, who: string | null) =>
  ({ type, text, who, recallBased: false, threadKey: null });

const report = (entries: any[]) =>
  theSessionReport({
    sessionNumber: 3, closed: true, agreements: [], divergences: [],
    entries, previousEntries: [], evidence: [],
    answeredThisSession: [{ who: 'Tomi', isYou: false }],
    ofPeople: 1, answered: 1,
  } as any);

describe('a thing that happened has somewhere to go', () => {
  it('the record can say it at all', () => {
    expect(Object.values(RecordEntryType)).toContain('PROGRESS');
  });

  it('and it reaches the person\'s own lines, which is where it was lost', () => {
    const r = report([said(RecordEntryType.PROGRESS, 'All forty migrated by Friday.', 'Tomi')]);
    const tomi = r.whatEachPersonSaid.find((p: any) => p.who === 'Tomi')!;
    expect(tomi.lines).toContain('All forty migrated by Friday.');
    /* And the empty-state line is absent, because it is not empty. That sentence about somebody who
       delivered the quarter is the whole reason this file exists. */
    expect((tomi as any).saying).toBeUndefined();
  });

  it('and into the section named after it', () => {
    const r = report([said(RecordEntryType.PROGRESS, 'We are at 180 teams through onboarding.', 'Tomi')]);
    const progress = r.sections.find((s: any) => s.title === 'Progress and priorities')!;
    expect(progress.items.map((i: any) => i.text)).toContain('We are at 180 teams through onboarding.');
  });

  it('what happened comes before what somebody means to do', () => {
    const r = report([
      said(RecordEntryType.INTENT, 'I am picking up the migration next.', 'Tomi'),
      said(RecordEntryType.PROGRESS, 'All forty migrated by Friday.', 'Tomi'),
    ]);
    const progress = r.sections.find((s: any) => s.title === 'Progress and priorities')!;
    expect(progress.items[0].text).toBe('All forty migrated by Friday.');
  });

  it('and the slots that ask what happened accept it', () => {
    /*
     * "What has happened since what they said last time" and "where it actually landed" are the two
     * slots literally asking for this. Without it a person who said "all forty are migrated" still
     * read as not having answered, and would be asked again.
     */
    const OWES = strip(readFileSync(join(SRC, 'conversation/what-every-check-in-owes.ts'), 'utf8'));
    for (const slot of ['since-then', 'where-it-landed']) {
      const at = OWES.indexOf(`id: '${slot}'`);
      expect(at).toBeGreaterThan(-1);
      expect(OWES.slice(at, at + 320)).toContain('T.PROGRESS');
    }
  });
});
