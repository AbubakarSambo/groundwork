import { readFileSync } from 'fs';
import { join } from 'path';
import { theGoodNewsIn, whatTheRecordAlreadyHolds } from './what-the-record-already-holds';

/** Task 2.4, week 3: the check-in starts from what they said last time, and good news first. */
describe('good news first, when there is some', () => {
  const rows = [
    { text: 'Kariuki Butchery paid on Monday', type: 'PROGRESS' },
    { text: 'The machine has not arrived', type: 'PROGRESS' },
    { text: 'I will call Green Mart on Friday', type: 'COMMITMENT' },
    { text: 'Two approvals are still waiting on the committee', type: 'PROGRESS' },
  ];

  it('takes only what happened, and not what went badly', () => {
    expect(theGoodNewsIn(rows)).toEqual(['Kariuki Butchery paid on Monday']);
  });

  it('asks the opener to say it back first, as a fact, in their words', () => {
    const block = whatTheRecordAlreadyHolds({
      targets: [], inTheWay: [], now: new Date(),
      saidLastTime: rows.map((r) => r.text),
      wentWellLastTime: theGoodNewsIn(rows),
    });
    expect(block).toContain('GOOD NEWS FROM LAST TIME');
    expect(block).toContain('- "Kariuki Butchery paid on Monday"');
    expect(block).toContain('Do not praise it');
    expect(block.indexOf('GOOD NEWS')).toBeLessThan(block.indexOf('WHAT THIS PERSON SAID LAST TIME'));
  });

  it('says nothing when there is no good news', () => {
    const block = whatTheRecordAlreadyHolds({ targets: [], inTheWay: [], now: new Date(), saidLastTime: ['The machine has not arrived'], wentWellLastTime: [] });
    expect(block).not.toContain('GOOD NEWS');
  });

  it('is given to the opener only, never to every turn', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toContain('wentWellLastTime: how?.forTheOpener ? theGoodNewsIn(lastTimeRows as any[]) : []');
  });
});
