import * as fs from 'fs';
import * as path from 'path';

/**
 * COACHING IS A PRIVATE MIRROR. IT IS NEVER EVIDENCE AGAINST ANYBODY.
 *
 * A person's coaching state is the most self-incriminating thing in this
 * product. It is a written record of what they were asked to work on and what
 * they did not manage, in their own words, given voluntarily on the
 * understanding that it was for them.
 *
 * If that could ever reach a report, a board, a lead, or a resolution, then:
 *
 *   a firing could be justified with it, which is the ultimate verdict on a
 *   person and the exact thing this product refuses to produce;
 *
 *   and, far more damaging, people would work out that it could. Nobody would
 *   ever answer a coaching question honestly again, and the layer would become
 *   worthless in the same motion that it became dangerous.
 *
 * So the wall is not a policy. It is the absence of a path.
 *
 * THIS TEST READS THE SOURCE, ON PURPOSE. Every other guard here checks
 * behaviour, which proves what the code does today. This one checks that the
 * wiring does not exist at all, which is the thing the work order actually asks
 * for: "if someone reviewing the code could wire the coaching state into a
 * termination justification, the wall is not built right."
 *
 * A behavioural test would pass right up until somebody added the import.
 */

const SRC = path.join(__dirname, '..');

/** Surfaces that must have no way of reaching coaching state. */
const WALLED_OFF = [
  'reports/reports.service.ts',      // the shared report every party reads
  'board/board.service.ts',          // the board, including the lead's view
  'board/reads.ts',                  // the reads shown on it
  'resolution/resolution.service.ts', // where "let them go" is recorded
  'resolution/end-states.ts',
];

/** The things that would mean coaching had leaked into one of them. */
const COACHING_REFERENCES = [
  /\bcoachingState\b/,
  /\bcoaching_states\b/,
  /\bcurrentStep\b/,
  /\bstaircasePosition\b/,
  /\bstepGivenAt\b/,
  /from ['"].*coaching-step['"]/,
];

const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('no path exists from coaching to any shared surface', () => {
  it.each(WALLED_OFF)('%s cannot reach coaching state', (file) => {
    const source = read(file);
    for (const pattern of COACHING_REFERENCES) {
      const hit = source.match(pattern);
      expect({
        file,
        leaked: hit?.[0] ?? null,
      }).toMatchObject({ leaked: null });
    }
  });

  it('the resolution path in particular has no route to it', () => {
    /**
     * Called out separately because this is where a firing is recorded.
     *
     * The lead decides from the report's honest picture of the WORK, which is
     * gap-not-person by construction. They must never decide from a private
     * coaching state, and the product must never be able to present one as the
     * reason. A ground that ends in "let them go" records THE DECISION THE
     * HUMANS MADE, and nothing about how somebody's coaching was going.
     */
    const source = read('resolution/resolution.service.ts');
    expect(source).not.toMatch(/coach/i);
  });
});

describe('the wall is checkable, not just asserted', () => {
  it('would notice an import if somebody added one', () => {
    // Proves this test can fail. Without it, a file that never mentions coaching
    // for unrelated reasons would pass forever and prove nothing.
    const pretend = "import { CoachingState } from '@prisma/client';\nconst x = p.coachingState.currentStep;";
    const found = COACHING_REFERENCES.some((p) => p.test(pretend));
    expect(found).toBe(true);
  });

  it('watches every surface a person other than the subject can see', () => {
    // If a new shared surface is added and not listed here, the wall has a hole
    // nobody is watching. The list is the thing to keep current.
    expect(WALLED_OFF).toContain('reports/reports.service.ts');
    expect(WALLED_OFF).toContain('board/board.service.ts');
    expect(WALLED_OFF).toContain('resolution/resolution.service.ts');
  });
});
