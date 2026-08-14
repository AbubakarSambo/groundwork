import { readFileSync } from 'fs';
import { join } from 'path';
import { canShowMovement } from '../grounds/an-objective-belongs-to-a-person';

/**
 * THE GATE THAT KEEPS THE REPORT FROM INVENTING AN ARC.
 *
 * `GroundBaselineEntry` now has a writer and a panel. The last step is the report, and it is the step
 * where getting it wrong does real damage: "here is where this started, here is where it is now" is
 * the most persuasive sentence a report can make, and off a single session it is not true. One
 * session is a POSITION. The distance between two descriptions is a movement.
 *
 * So the report reads the starting point through `canShowMovement` rather than printing it whenever
 * it exists, and the render has no rule of its own - an early report simply has no field to draw.
 */
const SERVICE = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8');
const CODE = SERVICE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PAGE = readFileSync(join(__dirname, '../../../../client/src/pages/report/ReportPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('the rule itself', () => {
  const start = { text: 'Her access to the finance system is not set up', capturedAtSession: 1 };

  it('one completed session is a position, not a movement', () => {
    expect(canShowMovement(start, 1)).toBe(false);
  });

  it('a second session is what makes the comparison honest', () => {
    expect(canShowMovement(start, 2)).toBe(true);
  });

  it('and with nothing recorded there is nothing to move from', () => {
    expect(canShowMovement(null, 5)).toBe(false);
  });
});

describe('the report asks before it answers', () => {
  it('the starting point is only attached behind the gate', () => {
    expect(CODE).toMatch(/if \(\s*canShowMovement\(/);
    expect(CODE).toMatch(/out\.whereThisStarted = startedRows\.map/);
  });

  it('and the gate is fed the real session count, not the row count', () => {
    /**
     * The count that matters is COMPLETED sessions. An abandoned second check-in is not a second
     * description of anything, and counting it would let a half-finished session unlock the arc.
     */
    expect(CODE).toMatch(/checkIn\.aggregate\(\{ where: \{ groundId, status: 'COMPLETED' \}/);
    expect(CODE).toMatch(/sessionsDone\._max\.sessionNumber \?\? 0/);
  });

  it('the page renders what it is given and decides nothing', () => {
    /**
     * Asserted as an absence as well as a presence. If the render ever grew its own condition, the
     * server's refusal could be worked around in the client, which is the failure this pins.
     */
    expect(PAGE).toMatch(/startedAt && startedAt\.length > 0 &&/);
    expect(PAGE).toMatch(/startedAt=\{\(report as any\)\.whereThisStarted\}/);
    expect(PAGE).not.toMatch(/canShowMovement/);
  });
});
