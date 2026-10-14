import { theFigureAsWritten } from './a-number-keeps-its-unit';
import { theContextWeHave } from './what-a-document-holds';
import { aDocumentReadItemByItem } from './a-document-read-item-by-item';

/** B-014: Wairimu's plan said "Discount ceiling: 5%", and it came back as "at or under 5". */
const PLAN = 'Coast sales plan\nDiscount ceiling: 5%. Nobody agrees a larger discount without Wairimu.\nCoast revenue target: KES 4.5 million by the end of the quarter.\nNew shops: 15 a week.';

describe('a number keeps the unit and symbol the document gave it', () => {
  it('finds each figure exactly as written', () => {
    expect(theFigureAsWritten(5, PLAN, 'Discount ceiling')).toBe('5%');
    expect(theFigureAsWritten(4500000, PLAN, 'Coast revenue target')).toBe('KES 4.5 million');
    expect(theFigureAsWritten(15, PLAN, 'New shops')).toBeNull();
  });

  it('and the plan is said back with them', () => {
    const said = theContextWeHave({
      fileName: 'Coast sales plan',
      forEverybody: [
        { what: 'Discount ceiling', target: 5, kind: 'not to exceed', asWritten: theFigureAsWritten(5, PLAN, 'Discount ceiling') },
        { what: 'coast revenue', target: 4500000, kind: 'to reach', asWritten: theFigureAsWritten(4500000, PLAN, 'Coast revenue target') },
        { what: 'new shops a week', target: 15, kind: 'to reach', asWritten: theFigureAsWritten(15, PLAN, 'New shops') },
      ],
      forOnePerson: [], dates: [], unmatched: [],
    } as any)!;
    expect(said).toContain('Discount ceiling must stay at or under 5% for everyone in this check-in.');
    expect(said).toContain('For everyone in this check-in, the target for coast revenue is KES 4.5 million.');
    expect(said).toContain('For everyone in this check-in, the target for new shops a week is 15.');
  });

  it('and the item-by-item page says it too', () => {
    const r: any = aDocumentReadItemByItem({ fileName: 'p', forEverybody: [{ what: 'Discount ceiling', target: 5, kind: 'not to exceed', asWritten: '5%' }], forOnePerson: [], dates: [], unmatched: [] } as any);
    const texts = JSON.stringify(r);
    expect(texts).toContain('Discount ceiling must stay at or under 5% for everyone in this check-in.');
    expect(texts).toContain('At most 5%');
  });
});

/** Pilots, 13 October 2026, problem 3: the fee note gave its currency once, in the column's heading. */
const FEE_NOTE = 'FEE NOTE No. MC/2026/118\nItem \tAmount (KES)\nInstruction fee, defence \t350,000.00\nSubtotal \t403,250.00\nTotal due \t466,450.00\nPayment within 30 days. A 2.5% late payment charge per month applies after 30 days.';

describe('a figure under a column that names its currency keeps that currency', () => {
  it('reads the total due with its currency, as written', () => {
    expect(theFigureAsWritten(466450, FEE_NOTE, 'Total due')).toBe('KES 466,450.00');
    expect(theFigureAsWritten(2.5, FEE_NOTE, 'late payment charge per month')).toBe('2.5%');
  });

  it('and the say-back carries it', () => {
    const said = theContextWeHave({
      fileName: 'fee-note-MC-2026-118.pdf',
      forEverybody: [{ what: 'Total due', target: 466450, kind: 'to reach', by: 'within 30 days', asWritten: theFigureAsWritten(466450, FEE_NOTE, 'Total due') }],
      forOnePerson: [], dates: [], unmatched: [],
    } as any)!;
    expect(said).toContain('For everyone in this check-in, the target for Total due is KES 466,450.00 within 30 days.');
  });
});
