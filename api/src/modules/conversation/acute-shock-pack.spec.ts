import { GroundScenario, PartyType } from '@prisma/client';
import { buildScenarioPackForParty, SCENARIO_PACKS } from './prompt-library';

/**
 * GW-ACUTE-SHOCK tripwire.
 *
 * ACUTE_SHOCK is a shared-reality pack, the deliberate inverse of
 * CRISIS_ALIGNMENT's decision session: it builds the picture of what actually
 * happened (known versus assumed, at-risk versus apparently at-risk, where
 * reads diverge) and explicitly DEFLECTS decisions. The human texture (how
 * people are carrying it) is required, not excluded.
 *
 * These tests pin the identity probes and boundaries so the pack cannot
 * quietly drift into a decision session or lose its lane markers.
 */
describe('GW-ACUTE-SHOCK: shared-reality pack, not a decision session', () => {
  const initiator = buildScenarioPackForParty(GroundScenario.ACUTE_SHOCK, PartyType.INITIATOR);
  const participant = buildScenarioPackForParty(GroundScenario.ACUTE_SHOCK, PartyType.PARTICIPANT);

  it('is symmetric: both parties get the identical pack (same event hit everyone)', () => {
    expect(initiator).toBe(participant);
    expect(initiator.length).toBeGreaterThan(500);
  });

  it('carries the identity probes no neighbor pack has', () => {
    // known-versus-assumed split (the core probe)
    expect(initiator).toContain('what do you know first-hand, and what are you assuming');
    // inflated-risk probe
    expect(initiator).toContain('what looks at risk but probably is not');
    // who is affected / not yet heard from
    expect(initiator).toContain('who has not been heard from yet');
    // divergence probe
    expect(initiator).toContain('Whose read are you least sure of');
  });

  it('refuses to become a decision session IN THE FIRST ROUND, then sets an objective', () => {
    /**
     * NARROWED FROM "NEVER" TO "NOT YET", and the reason is what the ground is for.
     *
     * The pack used to ban planning outright: "This is NOT a decision session", "no decisions and no
     * plans", "never ask what they would decide". Every end state closed on the picture. So a
     * fortnight of daily check-ins opened because a client had just left could only ever finish by
     * saying everyone agreed on what had happened - whether the client came back was not something
     * the ground could record, and the other thirteen days had nothing to do.
     *
     * The half worth keeping is the sequencing. A recovery built on rumour is worse than no
     * recovery, and an account of a shock is half observation and half repetition - so the
     * known-versus-assumed split has to land before anybody commits to anything. That is now what
     * the deflection protects: the FIRST session, not the whole ground.
     */
    expect(initiator).toContain('FIRST SESSION - THE PICTURE ONLY');
    expect(initiator).toContain('DECISION DEFLECTION, IN THE FIRST SESSION ONLY');
    expect(initiator).toContain('Do not develop the option or weigh options yet');
    // And then it must actually ask for the objective, or the fortnight has nothing to test against.
    expect(initiator).toContain('what are we trying to achieve now');
    expect(initiator).toContain('EVERY LATER SESSION - THE DAILY READ');
  });

  it('includes the human texture CRISIS excludes', () => {
    expect(initiator).toContain('part of the picture, not noise');
    expect(initiator).toContain('How are you carrying this?');
  });

  it('states its lane boundaries against DRIFT and REALIGN_TEAM', () => {
    expect(initiator).toContain('discrete event in the last hours or days');
    expect(initiator).toContain('grew over weeks'); // slow erosion -> DRIFT
    expect(initiator).toContain('only ongoing mis-sync'); // no trigger -> REALIGN_TEAM
  });

  it('is registered in the legacy seed record too', () => {
    expect(SCENARIO_PACKS[GroundScenario.ACUTE_SHOCK]).toBe(initiator);
  });

  it('does not ask any decision question', () => {
    // The classic decision phrasings must not appear as probes.
    expect(initiator).not.toMatch(/what should (we|you) do/i);
    expect(initiator).not.toMatch(/what('| i)s the call/i);
    expect(initiator).not.toContain('stabilised'); // CRISIS's 60-day target frame
  });
});
