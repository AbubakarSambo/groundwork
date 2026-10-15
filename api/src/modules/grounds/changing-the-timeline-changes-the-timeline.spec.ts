import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * CHANGING A GROUND'S TIMELINE USED TO CHANGE NOTHING.
 *
 * `PATCH /grounds/:id` is lead-only and audit-logged, and the admin page calls it. It wrote only
 * `timelineWeeks`, a nullable second column. The value the product actually reads is `timelineDays`:
 * the stall sweep computes its deadline from it, and the engine divides it by the cadence to plan
 * sessions. So a lead who shortened a ground got a working button, an audit entry, an updated screen,
 * and a ground that still ran for exactly as long as before.
 *
 * There was a second defect on top of it. The admin page sent `Math.round(days / 7)`, so any timeline
 * that was not a multiple of seven was silently changed by an edit that might not have been about the
 * timeline at all: 45 days became 42.
 *
 * This is a source-level guard on purpose. The behaviour it protects is a database write inside a
 * method with several other jobs, and the failure mode was not an exception - it was a write to the
 * wrong column, which no unit test of the return value would have noticed.
 */
const SERVICE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const CONTROLLER = readFileSync(join(__dirname, 'grounds.controller.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('changing the timeline', () => {
  it('writes the column the product reads', () => {
    expect(SERVICE).toMatch(/timelineDays: requestedDays/);
  });

  it('keeps the legacy column in step rather than leaving it stale', () => {
    // Anything still reading weeks gets a value derived from days, never the reverse.
    expect(SERVICE).toMatch(/timelineWeeks: goesOnUntilEnded \? null : Math\.max\(1, Math\.round\(requestedDays \/ 7\)\)/);
  });

  it('accepts days, so a timeline that is not whole weeks survives an edit', () => {
    expect(CONTROLLER).toMatch(/timelineDays\?: number/);
  });

  it('still accepts weeks, so nothing already calling it breaks', () => {
    expect(CONTROLLER).toMatch(/timelineWeeks\?: number/);
    expect(SERVICE).toMatch(/dto\.timelineWeeks \* 7/);
  });

  it('and audits the days, which is what actually changed', () => {
    expect(SERVICE).toMatch(/timelineDays: \{ from: \(ground as any\)\.runsUntilEnded \? null : ground\.timelineDays, to: goesOnUntilEnded \? null : requestedDays \}/);
  });

  it('never rounds a proposal to whole weeks before applying it', () => {
    // The internal caller used to send Math.round(proposal.days / 7), applying 42 for a 45-day proposal.
    expect(SERVICE).not.toMatch(/updateTimeline\([^)]*Math\.round\(proposal\.days/);
    expect(SERVICE).toMatch(/updateTimeline\(groundId, requestingUserId, proposal\.untilEnded \? \{ runsUntilEnded: true \} : \{ timelineDays: proposal\.days \}\)/);
  });
});
