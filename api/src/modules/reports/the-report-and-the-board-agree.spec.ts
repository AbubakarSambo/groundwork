import * as fs from 'fs';
import * as path from 'path';
import { FAMILY_SECTIONS, BoardFamily } from '../board/board-families';

/**
 * THE FOUR READS EXISTED, AND NOT ON THE THING PEOPLE OPEN.
 *
 * "The report where we have people's names and where they are and also risk, similar to what is in
 * the home page, and how aligned and specific things are, is completely absent. The board is also
 * sparse."
 *
 * Both halves had the same cause. `quickRead` - open differences, movement on targets, what is
 * blocked, how much is document-backed - is exactly what the product's own front page shows when
 * it shows a report. It lived on the board only, and the ONBOARDING family, which is what a
 * new-hire check-in gets, was the one family that did not include it. So on the check-in she was
 * looking at, the four reads were on no surface at all.
 *
 * They are computed from the same rows in both places, which is the part worth guarding: two
 * surfaces disagreeing about how many differences are open is worse than one of them not saying.
 */
const service = fs
  .readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

describe('the four reads', () => {
  it('are on the report, computed from the rows the board reads', () => {
    /* Through the one owner of the session's counts, which the board reads too. */
    /* With the reader, so the movement counts only the targets they may read (review of 1 October 2026). */
    expect(service).toMatch(/whatThisSessionHolds\(this\.prisma, groundId, sessionNumber, \{\s*participantId: me\?\.id \?\? null,\s*isLead: viewerIsLead,\s*(?:\/\*[^]*?\*\/\s*)?(?:runsIt: [^\n]*,\s*)?(?:\/\*[^]*?\*\/\s*)?colleaguesWordsWalled:/);
    expect(service).toContain('movedOnTargets: held.movedOnTargets');
    expect(service).toContain('blocked: held.blocked');
  });

  it('and are on the onboarding board, which is where they were missing', () => {
    expect(FAMILY_SECTIONS[BoardFamily.ONBOARDING]).toContain('quickRead');
  });

  it('but still not on an evaluation board, which is deliberate', () => {
    /* A "how are they doing at a glance" strip on a board about whether somebody keeps their job
       is a scoreboard on a person. That omission has a reason; onboarding's did not. */
    expect(FAMILY_SECTIONS[BoardFamily.EVALUATION]).not.toContain('quickRead');
  });
});

describe('the order things are read in', () => {
  it('reads who answered before the section that groups by person', () => {
    /*
     * THIS SHIPPED BROKEN FOR ONE RUN AND ONLY THE BROWSER FOUND IT. `answeredIds` sat with the
     * reveal rows further down while the per-person section above it read the same set, so every
     * request threw "Cannot access 'answeredIds' before initialization". TypeScript cannot see it -
     * a `const` used above its line is a runtime temporal-dead-zone error, not a type error - and
     * every unit test passed, because they call the pure assembler rather than this read.
     */
    const answered = service.indexOf('const answeredIds = new Set(');
    const usedBy = service.indexOf('answeredThisSession: ground.participants');
    expect(answered).toBeGreaterThan(-1);
    expect(usedBy).toBeGreaterThan(-1);
    expect(answered).toBeLessThan(usedBy);
  });
});
