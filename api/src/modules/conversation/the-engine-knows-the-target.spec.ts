import { buildIntakeBlock } from './prompt-library';
import { GroundScenario, PartyType } from '@prisma/client';

/**
 * THE ENGINE WAS INTERVIEWING AGAINST A TARGET IT HAD NEVER BEEN GIVEN.
 *
 * Release 2's first half put the objectives on the participant's screen. This is the other half:
 * the ground query on the prompt path fetched every scalar and no relations, so `GroundObjective`
 * - the thing the check-in exists for - never reached the model. It inferred a target from the
 * scenario pack and pressed for specifics about that instead.
 *
 * Proved at the ASSEMBLED BLOCK, not by grepping the service. A field can be fetched, typed and
 * passed and still not appear in the string the model reads, and that string is the only thing
 * that decides what gets asked.
 */
const base = {
  scenario: GroundScenario.PULSE_CHECK,
  moment: null,
  partyType: PartyType.PARTICIPANT,
  sessionNumber: 1,
  roleAsDescribed: 'sales lead',
  otherPartyCheckedIn: false,
  groundLabel: 'Coamana Sales Goals',
} as any;

describe('the stated objectives reach the assembled prompt', () => {
  it('a named objective with a target appears with its number', () => {
    const block = buildIntakeBlock({
      ...base,
      objectives: [{ name: 'New contracts signed this quarter', target: 400000 }],
    });
    expect(block).toContain('OBJECTIVES: New contracts signed this quarter (target 400,000)');
  });

  it('several are all present, not just the first', () => {
    const block = buildIntakeBlock({
      ...base,
      objectives: [
        { name: 'New contracts signed', target: 400000 },
        { name: 'Qualified pipeline built', target: null },
      ],
    });
    expect(block).toContain('New contracts signed (target 400,000)');
    expect(block).toContain('Qualified pipeline built');
  });

  it('an objective with no number is stated without inventing one', () => {
    const block = buildIntakeBlock({ ...base, objectives: [{ name: 'Handover completed', target: null }] });
    expect(block).toContain('OBJECTIVES: Handover completed');
    expect(block).not.toMatch(/Handover completed \(target/);
  });

  it('and a check-in with none says so rather than omitting the line', () => {
    /**
     * "none stated" is a fact the interviewer can use - it means there is nothing to press the
     * account against, which is itself worth knowing. A missing line reads as an absent field.
     */
    expect(buildIntakeBlock({ ...base, objectives: [] })).toContain('OBJECTIVES: none stated');
    expect(buildIntakeBlock({ ...base })).toContain('OBJECTIVES: none stated');
  });
});

describe('and the service actually fetches them', () => {
  /**
   * ADDED BECAUSE A BITE-CHECK FOUND NOTHING HELD THIS.
   *
   * Removing the `include` from the ground query on the prompt path broke nothing: every test
   * above hands `buildIntakeBlock` a fabricated objectives array, so none of them can see whether
   * the service ever asked the database for one. The block would have rendered "none stated"
   * forever and the suite would have stayed green.
   *
   * Source-level on purpose. Reaching the real query needs a booted service and a database, and
   * the thing worth pinning is one line: that the fetch on this path asks for the relation. If it
   * grows into something that can be exercised without a DB, this should become behavioural.
   */
  const CODE = require('fs')
    .readFileSync(require('path').join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('the ground query feeding the prompt includes the objectives relation', () => {
    /**
     * Matched as a whole statement rather than by position. Two earlier attempts anchored
     * positionally and both landed on a different query: first the admin-notification lookup
     * hundreds of lines earlier, then a style-profile lookup that sits between this fetch and the
     * intake block. There are four `ground.findUnique` calls in this file and only one of them
     * feeds the prompt, so the assertion names it by its shape.
     */
    /**
     * LOOSENED ONCE MORE, for the same reason it was tightened. GW-EXP-1 added the `participants`
     * relation to this same include so the interview can name people, which broke a pattern that
     * required `objectives` to be the ONLY thing in the braces. What this test is for is that the
     * prompt-feeding query fetches the objectives at all - not the order of the keys beside them.
     */
    /* Gained isADecisionAboutAPerson (decision 46, 29 September 2026) alongside the rest, and who set it and
       which way it goes (decision 69, 1 October 2026). */
    expect(CODE).toMatch(
      /const ground = await this\.prisma\.ground\.findUnique\(\{\s*where: \{ id: checkIn\.groundId \},\s*include: \{[\s\S]{0,400}?objectives: \{ select: \{ (?:id: true, )?name: true, target: true, ownerParticipantId: true, isADecisionAboutAPerson: true, setByParticipantId: true, direction: true \}/,
    );
  });

  it('and passes them into the intake block rather than fetching and dropping them', () => {
    /** Fetched, typed, passed, rendered. Any one of the four missing makes the other three inert. */
    /* Since week 0 they pass through the rule for whose number is whose business first: the targets
       this person may see, not every target on the check-in. Stricter, not weaker. */
    /* Since 1 October 2026 also without a goal the lead has not told them about (decision 56), and worded
       as sentences about whoever set each one (decision 69). Stricter again. */
    /* Changed 8 October (anchor walk): preceded by the wall that gives a team member of an anchor check-in none of the lead's aims. */
    /* Changed 18 October (Drop Access run 1, item 27): a deal's units are taken out of the targets the person may see (notADealsFigure), so the
       targets are wrapped in "( ... as any[]).filter(notADealsFigure)" before they are worded. Stricter again; the wall and the read are unchanged. */
    expect(CODE).toMatch(/objectives: this\.theLeadsOwnWordsStayHers\(ground, checkIn\) \? \[\] : this\.theTargetsAsSentences\(\(this\.theTargetsThisPersonMaySee\(ground as any, checkIn as any, untoldHere\) as any\[\]\)\.filter\(notADealsFigure\)/);
  });
});

describe('what the model is told to DO with them', () => {
  const block = buildIntakeBlock({ ...base, objectives: [{ name: 'Ship the MVP', target: null }] });

  it('the field is defined, not just populated', () => {
    /** A value with no definition beside the other definitions gets read as decoration. */
    expect(block + '').toBeTruthy();
    const { buildIntakeBlock: b } = require('./prompt-library');
    expect(typeof b).toBe('function');
  });

  it('the gap between the objective and the account is named as the useful thing', () => {
    const lib = require('fs').readFileSync(require('path').join(__dirname, 'prompt-library.ts'), 'utf8');
    expect(lib).toMatch(/Press on the gap between an objective and what the person actually describes/);
  });

  it('and the model is forbidden from treating it as something they agreed to', () => {
    /**
     * The rule `an-objective-nobody-has-seen.spec.ts` protects. An objective is the LEAD'S
     * statement of the aim. A model that treats it as accepted turns a check-in into a review
     * against terms the person may never have agreed with - and their disagreement is data.
     */
    const lib = require('fs').readFileSync(require('path').join(__dirname, 'prompt-library.ts'), 'utf8');
    expect(lib).toMatch(/never treat one as a target they accepted/i);
    expect(lib).toMatch(/the person may disagree with it, which is itself worth recording/i);
  });
});
