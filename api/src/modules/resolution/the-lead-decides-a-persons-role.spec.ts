import { GroundScenario } from '@prisma/client';
import { closingNeedsEveryone, LEAD_DECIDES, END_STATES } from './end-states';

/**
 * NOBODY SHOULD BE ASKED TO AGREE TO THEIR OWN DISMISSAL.
 *
 * Every ground closed the same way: both parties pick an end state, and it
 * closes only when they pick the SAME one. For two cofounders that is exactly
 * right, and the original comment in end-states.ts said as much - neither of
 * them has authority over the other, and a partnership dispute that one person
 * can close alone would be a worse product.
 *
 * On a new hire ground it was indefensible. Seen live, on a real twelve-session
 * ground: the new hire's own screen listed
 *
 *     Keep the hire | Restructure the role | Let them go
 *
 * with "0 of 2 people have answered" beneath it and his name in the list. He was
 * being invited to select his own exit, and until he picked the same option as
 * his manager the ground could not close - so he also held a veto over an
 * employment decision that was never his to make. Both directions wrong at once.
 *
 * What changed is only WHO DECIDES. He still sees the options, still sees the
 * ground closing, still gives his own account, still corrects his own record,
 * and his account still stands beside his manager's in the report. He is no
 * longer handed a button asking him to consent to his own exit.
 *
 * The list of scenarios is deliberately short. Getting this wrong toward
 * "everyone must agree" only stalls a ground; getting it wrong toward "the lead
 * decides" takes away somebody's say.
 */

describe('grounds where one person is the subject', () => {
  it('lets the lead decide a new hire ground', () => {
    // THE REGRESSION: the hire had to agree before this could close.
    expect(closingNeedsEveryone(GroundScenario.NEW_HIRE)).toBe(false);
  });

  it('lets the lead decide a performance plan', () => {
    expect(closingNeedsEveryone(GroundScenario.PIP)).toBe(false);
  });

  it('covers the other grounds about one person standing', () => {
    for (const s of [
      GroundScenario.NEW_MANAGER,
      GroundScenario.NEW_ADVISOR,
      GroundScenario.CONTRACT_RENEWAL,
      GroundScenario.RECOGNITION,
    ]) {
      expect({ scenario: s, needsEveryone: closingNeedsEveryone(s) })
        .toMatchObject({ needsEveryone: false });
    }
  });
});

describe('grounds between peers still need everyone', () => {
  it('keeps both cofounders in the decision', () => {
    // The reason the shared model existed. A partnership one person can dissolve
    // alone is worse than one that stalls.
    expect(closingNeedsEveryone(GroundScenario.NEW_COFOUNDER)).toBe(true);
  });

  it('keeps a team realignment shared', () => {
    expect(closingNeedsEveryone(GroundScenario.REALIGN_TEAM)).toBe(true);
  });

  it('keeps a board strategy ground shared', () => {
    expect(closingNeedsEveryone(GroundScenario.BOARD_STRATEGY)).toBe(true);
  });

  it('defaults every other scenario to needing everyone', () => {
    // The safe direction. Anything not explicitly listed stays shared.
    for (const scenario of Object.keys(END_STATES) as GroundScenario[]) {
      if (LEAD_DECIDES.has(scenario)) continue;
      expect({ scenario, needsEveryone: closingNeedsEveryone(scenario) })
        .toMatchObject({ needsEveryone: true });
    }
  });

  it('does not quietly grow: the lead-decides list is exactly these six', () => {
    // A tripwire on the list itself. Adding a scenario here removes somebody's
    // say in how their ground ends, and that should never happen by accident.
    expect([...LEAD_DECIDES].sort()).toEqual([
      GroundScenario.CONTRACT_RENEWAL,
      GroundScenario.NEW_ADVISOR,
      GroundScenario.NEW_HIRE,
      GroundScenario.NEW_MANAGER,
      GroundScenario.PIP,
      GroundScenario.RECOGNITION,
    ].sort());
  });
});

describe('the subject still sees what is coming', () => {
  it('keeps the full list of end states on a lead-decides ground', () => {
    // Being closed out without warning would be its own harm. The options are
    // still published for the ground; only the choosing changed.
    const states = END_STATES[GroundScenario.NEW_HIRE].map((s) => s.value);
    expect(states).toContain('KEEP');
    expect(states).toContain('EXIT');
    expect(states.length).toBeGreaterThan(2);
  });
});
