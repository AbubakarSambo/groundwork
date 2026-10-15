import { readFileSync } from 'fs';
import { join } from 'path';
import { NOT_HELD_FOR_A_SEAT } from './held-for-a-seat';

/*
 * Row 5: somebody waiting for the organisation to let them in cannot open or answer a check-in yet, so no sweep
 * sends them a reminder, a nudge or a "your report is ready". The sweeps leave them out through the same filter
 * that leaves out somebody held for a seat.
 */
describe('nobody waiting to be let into the organisation is sent a reminder', () => {
  it('the sweeps\' filter leaves out both somebody held for a seat and somebody waiting for the organisation', () => {
    expect(NOT_HELD_FOR_A_SEAT).toEqual({ awaitingSeat: false, user: { awaitingOrgApproval: false } });
  });

  it('every sweep in the cron that writes to people uses the filter', () => {
    const src = readFileSync(join(__dirname, '../grounds/grounds.cron.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src.match(/\.\.\.NOT_HELD_FOR_A_SEAT/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
