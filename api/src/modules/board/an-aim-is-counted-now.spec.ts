import * as fs from 'fs';
import * as path from 'path';
import { theCountFromTheDeals, whatASalesAimCounts, type ADealOnRecord } from './a-sales-aim-is-counted-from-the-deals';
import { theAimsCountedNow } from './an-aim-is-counted-now';

jest.mock('./the-collections-record', () => ({ ...jest.requireActual('./the-collections-record'), theCollectionsTypeFor: jest.fn(async () => ({ type: 'invoices or fee notes', billWord: 'fee note' })) }));
jest.mock('./the-collections-board.service', () => ({
  ...jest.requireActual('./the-collections-board.service'),
  theBillsOnRecord: jest.fn(async () => [
    { id: 'b1', kind: 'fee note', name: 'FN-005', stage: 'Paid', ownerParticipantId: 'p-njeri', dueAt: null, createdAt: '2026-10-20', proof: [{ readAs: 'payment', shows: null, on: '2026-11-10' }], saidIn: [],
      fields: { Amount: 'KES 480,000', _stages: [{ stage: 'Paid', on: '2026-11-10T09:00:00Z', by: 'board' }] } },
    { id: 'b2', kind: 'fee note', name: 'FN-006', stage: 'Paid', ownerParticipantId: 'p-njeri', dueAt: null, createdAt: '2026-10-20', proof: [], saidIn: [],
      fields: { Amount: 'KES 240,000', _stages: [{ stage: 'Paid', on: '2026-11-24T09:00:00Z', by: 'board' }] } },
    { id: 'b3', kind: 'fee note', name: 'FN-004', stage: 'Paid', ownerParticipantId: 'p-njeri', dueAt: null, createdAt: '2026-10-01', proof: [], saidIn: [],
      fields: { Amount: 'KES 100,000', _stages: [{ stage: 'Paid', on: '2026-10-28T09:00:00Z', by: 'board' }] } },
  ]),
}));

/**
 * ONE COUNT FOR EACH AIM, ON EVERY PAGE (fix plan, pattern 1; quarter test, 28 October 2026). Kevin's You page read "You have 51 so far" on
 * 20 November and his My work "21 of 30" on 4 December; Faith read "0 sold" on one page and "You have 2 of 7" on the next; Joseph read
 * "4 over your target" while his 15 units waited for proof. The whole pattern is any page reading a number stored earlier, or counting
 * the deals by a rule of its own. These tests hold the one counter, its month, and that every page goes through it.
 */
const ZONE = 'Africa/Nairobi';
const STAGES = ['New', 'Talking', 'Quoted', 'Won'];
const deal = (name: string, units: number, wonOn: string, more: Partial<ADealOnRecord> = {}): ADealOnRecord => ({
  id: name, name, stage: 'Won', ownerParticipantId: 'p-faith', fields: { units: String(units) }, firstOnRecordAt: new Date(`${wonOn}T08:00:00Z`),
  proven: true, paid: true, paidOn: new Date(`${wonOn}T09:00:00Z`), ...more,
});

describe('an aim is counted from the deals, in its own month', () => {
  const deals = [deal('Juja Hardware', 3, '2026-10-28'), deal('Bahari Cafe', 2, '2026-11-06'), deal('Soko Mart', 4, '2026-12-02')];

  it('reads the month an aim names, and a month said as "a month" or "monthly"', () => {
    expect(whatASalesAimCounts('7 units in November')).toMatchObject({ counts: 'units', window: 'month', month: 11 });
    expect(whatASalesAimCounts('Sell 30 units a month')).toMatchObject({ counts: 'units', window: 'month', month: null });
    expect(whatASalesAimCounts('Units sold by 30 October')).toMatchObject({ counts: 'units', window: null });
    expect(whatASalesAimCounts('November sales of 20 units')).toMatchObject({ window: 'month', month: 11 });
    expect(whatASalesAimCounts('Sell 120 water dispensers')).toMatchObject({ window: null });
  });

  it('"7 units in November" counts only what was won in November, read in December', () => {
    const c = theCountFromTheDeals({ name: '7 units in November', ownerParticipantId: 'p-faith' }, deals, STAGES, new Date('2026-12-11T15:00:00Z'), ZONE);
    expect(c?.count).toBe(2);
  });

  it('"30 units a month" counts this month only', () => {
    const c = theCountFromTheDeals({ name: 'Sell 30 units a month', ownerParticipantId: 'p-faith' }, deals, STAGES, new Date('2026-12-11T15:00:00Z'), ZONE);
    expect(c?.count).toBe(4);
  });

  it('an aim with no month counts every deal won', () => {
    const c = theCountFromTheDeals({ name: 'Sell 120 water dispensers', ownerParticipantId: 'p-faith' }, deals, STAGES, new Date('2026-12-11T15:00:00Z'), ZONE);
    expect(c?.count).toBe(9);
  });
});

describe('every page reads an aim’s number through the one counter', () => {
  const src = (f: string) => fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('My work, the You page, the board and the listener all count through an-aim-is-counted-now', () => {
    expect(src('./my-work.ts')).toMatch(/withTheirCountNow\(/);
    expect(src('../grounds/your-board.service.ts')).toMatch(/withTheirCountNow\(/);
    expect(src('./board.service.ts')).toMatch(/theAimsCountedNow\(/);
    expect(src('./board.listener.ts')).toMatch(/theAimsCountedNow\(/);
  });

  it('nothing else counts the aims from the deals by itself', () => {
    const allowed = new Set(['an-aim-is-counted-now.ts', 'a-sales-aim-is-counted-from-the-deals.ts', 'the-weekly-report.service.ts', 'a-question-is-answered-from-the-documents.ts']);
    const root = path.join(__dirname, '..');
    const offenders: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) walk(f);
        else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts') && !allowed.has(e.name) && /theAimsTheDealsCount\(/.test(fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''))) offenders.push(path.relative(root, f));
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});

describe('a collections aim is counted from the bills paid', () => {
  it('"Collect KES 720,000 in November" is the November bills paid, the same number the collections report counts', async () => {
    const counted = await theAimsCountedNow({}, { id: 'g-fees', organizationId: null, kindOfWork: 'a law firm matter' },
      [{ id: 'a1', name: 'Collect KES 720,000 in November', ownerParticipantId: 'p-njeri' }], new Date('2026-12-11T12:00:00Z'), { zone: 'Africa/Nairobi' });
    expect(counted.get('a1')).toMatchObject({ count: 720000, proven: 480000 });
  });
});
