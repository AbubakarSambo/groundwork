import { readFileSync } from 'fs';
import { join } from 'path';
import { liftedRunIn, liftsInReport, withoutLiftedSentences, withholdLiftsIn, stringsIn } from './said-in-its-own-words';

/**
 * A REPORT SAYS IT IN ITS OWN WORDS, IN EVERY FIELD, WHETHER IT IS FORMING OR RELEASED.
 *
 * The shared picture was checked for a lifted run of somebody's words; the agreements and
 * divergences were not, and the report is on a screen while it forms. Now every prose field is
 * checked at synthesis, the model is asked to restate what it lifted, and a run that survives that
 * has its sentence withheld - the sentence, never the report, and never a rewrite of a claim by us.
 */
const THEIRS = [
  '[VERIFIABILITY:HIGH] We agreed the March deadline with the supplier and then it moved to May without anybody telling me.',
  'I have chased the invoice three times and the finance team say it is with legal.',
].map((t) => t.replace(/^\[VERIFIABILITY:\w+\] /, ''));

describe('finding their words', () => {
  it('a run of eight words is a lift, however it is punctuated or cased', () => {
    /* The earliest eight-word run it meets; which one is not the point. */
    expect(liftedRunIn('Then It Moved To May Without Anybody Telling Me, which is a fact.', THEIRS)).toMatch(/moved to may without anybody telling/);
  });

  it('seven words is coincidence', () => {
    expect(liftedRunIn('It moved to May without anybody telling anyone.', THEIRS)).toBeNull();
  });

  it('looks in every prose field, however nested, and names where', () => {
    const report = {
      sharedPicture: 'Two things settled and one open.',
      agreements: ['The deadline was agreed with the supplier and then it moved to May without anybody telling me.'],
      divergences: [{ topic: 'Invoice', sides: [{ says: 'They have chased the invoice three times and the finance team say it is with legal.' }] }],
    };
    expect(liftsInReport(report, THEIRS).map((l) => l.path)).toEqual(['agreements[0]', 'divergences[0].sides[0].says']);
  });

  it('a report in its own words has no lifts', () => {
    expect(liftsInReport({ sharedPicture: 'The deadline slipped once and an invoice is unpaid.', agreements: ['Both describe a slipped date.'], divergences: [] }, THEIRS)).toEqual([]);
  });

  it('strings are gathered from arrays and objects alike', () => {
    expect(stringsIn('d', [{ a: 'x', b: ['y', { c: 'z' }] }]).map((s) => s.path)).toEqual(['d[0].a', 'd[0].b[0]', 'd[0].b[1].c']);
  });
});

describe('the last resort', () => {
  it('withholds the sentence that carries a lift and keeps the rest', () => {
    const out = withoutLiftedSentences('The deadline slipped. They said it moved to May without anybody telling me here. The invoice is unpaid.', THEIRS);
    expect(out).toEqual({ text: 'The deadline slipped. The invoice is unpaid.', withheld: 1 });
  });

  it('through a nested field, counting what went', () => {
    const cut = withholdLiftsIn([{ says: 'Fine. It moved to May without anybody telling me though.' }, { says: 'Clear.' }], THEIRS);
    expect(cut.withheld).toBe(1);
    expect(cut.value).toEqual([{ says: 'Fine.' }, { says: 'Clear.' }]);
  });
});

describe('at synthesis', () => {
  const CODE = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('the fault check covers every field, not the picture alone', () => {
    expect(CODE).toMatch(/for \(const lift of liftsInReport\(r as any, theirWords\)\)/);
    expect(CODE).not.toMatch(/const liftedRunIn = \(picture: string\)/);
  });

  it('a surviving lift is restated once and then its sentence is withheld, in the same pass that forms the report', () => {
    const at = CODE.indexOf('const stillLifted = liftsInReport(result as any, theirWords);');
    expect(at).toBeGreaterThan(0);
    const block = CODE.slice(at, at + 2200);
    expect(block).toMatch(/said in your own words/);
    expect(block).toMatch(/withholdLiftsIn\(\(result as any\)\[field\], theirWords\)/);
  });
});
