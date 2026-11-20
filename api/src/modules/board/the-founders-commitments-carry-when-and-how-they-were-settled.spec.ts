import { GroundScenario, PartyType } from '@prisma/client';
import { person, boardAs, commitment, answered } from './the-switchboards-sections-harness';

/**
 * The founder's weekly said-and-done table counts each commitment by the week it was said and fills a bar only for what a document
 * the person added shows. So each commitment row on the founder's work plan carries the day it was settled and how (SAID, PROVEN or
 * CONFIRMED, as the commitment record holds it), and nothing is worked out here.
 */
const W = { ...person('p-w', 'u-w', 'Wanjiru', 'Kamau', PartyType.INITIATOR), managingOnly: false };
const SETUP: any = {
  scenario: GroundScenario.PULSE_CHECK, people: [W], initiatorId: 'u-w', label: 'Founder’s own check-in', kindOfWork: "founder's own check-in",
  checkIns: [answered('p-w', 1, '2026-09-02T16:00:00Z')],
  commitments: [
    commitment('k-1', 'p-w', 'I will send the data room', { statedInSession: 1, saidWordForWord: true, status: 'DONE', settledBy: 'PROVEN', settledAt: new Date('2026-09-10T10:00:00Z') }),
    commitment('k-2', 'p-w', 'I will hire the engineer', { statedInSession: 1, saidWordForWord: true }),
  ],
  items: [],
};

describe('a founder commitment, as the founder reads it on the work plan', () => {
  it('carries the day it was settled and how, and nothing for one still open', async () => {
    const b: any = await boardAs(SETUP, 'u-w', 'MEMBER');
    const plan = b.workRecords.find((s: any) => s.section === 'Work plan');
    const sent = plan.rows.find((r: any) => r.name === 'send the data room');
    const hire = plan.rows.find((r: any) => r.name === 'hire the engineer');
    expect(sent.fields.Status).toBe('Done');
    expect(sent.settledOn).toBe('2026-09-10');
    expect(sent.settledBy).toBe('PROVEN');
    expect(hire.fields.Status).toBe('Open');
    expect(hire.settledOn).toBeNull();
    expect(hire.settledBy).toBeNull();
  });
});
