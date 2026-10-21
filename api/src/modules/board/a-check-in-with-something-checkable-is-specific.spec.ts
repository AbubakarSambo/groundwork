import { myWorkFrom } from './my-work';
import { readTheTurns } from '../conversation/the-specificity-read';

/**
 * A CHECK-IN WITH SOMETHING IN IT THAT CAN BE CHECKED IS SPECIFIC ON MY WORK (engine test, Drop Access, "Sales team, Q4").
 *
 * Kevin, Tuesday 13 October, on WhatsApp: "Kilele Hotel payment proof is on its way, just sent it in the chat. QJK4TL2MX9." and
 * "Savannah Cafe - I sent them the price list this morning. Jane wants 6 units, so I sent a quote for 30k." His My work said
 * "0 of 6 were specific", while the board read the same rounds as checkable. Read as Kevin is served his page.
 */
const KEVINS_TUESDAY = [
  'Hey team! Kilele Hotel payment proof is on its way, just sent it in the chat. QJK4TL2MX9.',
  'Good question! Savannah Cafe - I sent them the price list this morning. Jane wants 6 units, so I sent a quote for 30k. Waiting to hear back.',
  'I sent the quote via WhatsApp. I can forward the chat if needed for proof.',
  "Forwarding the chat now for Savannah Cafe. With Kilele's 40 units, I'm at 40 already! So I'm ahead of target for the month.",
  'Hopefully by tomorrow! Just waiting for Jane to confirm.',
  "I'll follow up with Jane first thing tomorrow morning to see if she's reviewed the quote.",
];
const at = (s: string) => new Date(s);

describe("Kevin's check-ins on his own My work", () => {
  const read = readTheTurns(KEVINS_TUESDAY, false);
  it('his Tuesday has something in it that can be checked', () => {
    expect(read.dimensions.checkable).toBe('specific');
  });
  it('so three such check-ins are three of three specific', () => {
    const checkIns = [1, 2, 3].map((n) => ({ id: `k${n}`, sessionNumber: n, status: 'COMPLETED', availableFrom: at(`2026-10-1${n + 1}T05:00:00Z`), createdAt: at('2026-10-12T05:00:00Z'), completedAt: at(`2026-10-1${n + 1}T11:00:00Z`), specificityLevel: read.level, specificityDimensions: read.dimensions }));
    const page: any = myWorkFrom({
      reader: 'self', person: { participantId: 'p-kevin', name: 'Kevin Omondi', firstName: 'Kevin' }, leadFirst: 'Grace', kindOfWork: 'sales team',
      items: [], commitments: [], waitsOnThem: [], raised: [], othersChase: [], credits: [], checkIns, ownLines: [], patterns: [], teamCoaching: [], helpWith: null, target: null,
      now: at('2026-10-15T18:30:00Z'), timeZone: 'Africa/Nairobi',
    } as any, 'Sales team, Q4');
    const quality = page.performing.behaviours.find((b: any) => b.name === 'Check-in quality');
    expect(quality.happened).toContain('3 of 3 were specific.');
  });
});
