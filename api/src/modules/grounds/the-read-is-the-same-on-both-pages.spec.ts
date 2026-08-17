import { readFileSync } from 'fs';
import { join } from 'path';
import { alignmentRead } from './grounds.service';

/**
 * THE GROUND PAGE SAID "NO READ YET" ABOUT A REPORT THE LIST HAD ALREADY SUMMARISED.
 *
 * Found by opening one ground as its lead: the grounds list printed "4 agreed, 2 still open" on the
 * row, and clicking that row produced "No read yet" in the corner of the ground itself. Same ground,
 * same client helper, one screen apart.
 *
 * The client was not at fault and neither was the helper. `alignmentRead` COUNTS
 * `report.agreements` and `report.divergences`, and the single-ground query selected neither - so it
 * could only ever return null. The list query fetched them, which is why only one of the two pages
 * could tell the truth.
 *
 * Two things this pins, because the fix was got wrong once on the way:
 *
 *   1. The fields are selected in the method that actually SERVES the endpoint. The first attempt
 *      patched a different lookup and the API kept returning null - the only reason the mistake was
 *      caught was checking the payload instead of trusting the edit.
 *   2. Both lookups have them. `get()` falls back to a second query for a participant whose org
 *      differs from the ground's, and a cross-org party deserves the same read as everybody else.
 */
const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
const GET = SRC.slice(SRC.indexOf('async get(id: string'), SRC.indexOf('async getSessionProgress('));

describe('the counted fields are fetched wherever the read is computed', () => {
  it('both report lookups that feed the read select agreements and divergences', () => {
    /**
     * Narrowed to the selects that carry `releasedAt` - those are the ones whose report object is
     * handed to `alignmentRead`. A first version asserted this of EVERY report select in the method
     * and failed on `{ centralQuestion: true }`, an unrelated read that has no business carrying
     * agreement counts. A guard that demands the wrong thing everywhere is not stricter, just wrong.
     */
    const feeding = (GET.match(/report: \{ select: \{[^}]*\} \}/g) ?? []).filter(x => x.includes('releasedAt: true'));
    expect(feeding.length).toBeGreaterThanOrEqual(2);
    for (const s of feeding) {
      expect(s).toContain('agreements: true');
      expect(s).toContain('divergences: true');
    }
  });

  it('and get() is the method the controller calls, not a neighbour of it', () => {
    /** The exact mistake made once already: fixing a lookup the endpoint never reaches. */
    /**
     * Comments stripped FIRST. The first version matched a long comment that quotes `@Get(':id')`
     * while explaining a routing-order bug, sliced from there, and never reached the decorator -
     * the same mistake as pinning a comment instead of code.
     */
    const controller = readFileSync(join(__dirname, 'grounds.controller.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const handler = controller.slice(controller.indexOf("@Get(':id')"));
    expect(handler.slice(0, 400)).toMatch(/this\.grounds\.get\(id,/);
  });

  it('the read is still computed from the report on this path', () => {
    expect(GET).toMatch(/alignmentRead\(\(ground as any\)\.report\)/);
  });
});

describe('alignmentRead itself, so the counting is not the thing that breaks', () => {
  it('counts both sides', () => {
    expect(alignmentRead({ agreements: [1, 2, 3, 4], divergences: [1, 2] })).toEqual({ agreed: 4, open: 2 });
  });

  it('returns null when there is genuinely nothing to report', () => {
    /** Not zero. "0 agreed, 0 open" printed on a ground nobody has finished would be a claim. */
    expect(alignmentRead({ agreements: [], divergences: [] })).toBeNull();
    expect(alignmentRead(null)).toBeNull();
    expect(alignmentRead(undefined)).toBeNull();
  });

  it('and treats a missing field as empty rather than throwing', () => {
    /**
     * The shape this defect actually produced: a report object present, but selected without those
     * columns. It must degrade to null, which is what "No read yet" honestly means, rather than
     * crashing the ground page.
     */
    expect(alignmentRead({} as any)).toBeNull();
    expect(alignmentRead({ agreements: 'nope' } as any)).toBeNull();
    expect(alignmentRead({ agreements: [1], divergences: undefined })).toEqual({ agreed: 1, open: 0 });
  });
});
