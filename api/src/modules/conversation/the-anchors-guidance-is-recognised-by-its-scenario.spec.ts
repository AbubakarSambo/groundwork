import { theAnchorParticipantGuidance, theAnchorMarkOf, theCheckInWasStartedFromTheAnchor, aCheckInStartedFromTheAnchor } from './the-anchor-weekly-check-in';
import { theAnchorBaselineGuidance } from './the-anchor-baseline';

/**
 * DECISION 114. A check-in made through the ordinary set-up with the anchor's scenario is the anchor's even when `startedFrom` is empty. The
 * words the team is asked in (the first session's baseline, then the weekly check-in) must be found for it, as they are for the one the link started.
 */
const BY_LINK = { startedFrom: 'anchor', scenario: 'NEW_PROJECT' };
const BY_SCENARIO = { startedFrom: null, scenario: 'HELP_TEAM_UNDERSTAND' };
const NEITHER = { startedFrom: null, scenario: 'OKR_ALIGNMENT' };
const on = async () => true;

describe('the anchor\'s words for a member, by scenario as by link', () => {
  it('the weekly check-in\'s words are found for a check-in made by scenario, and not for another', async () => {
    const who = (ground: any) => ({ ground, isTheLead: false, sessionNumber: 2 });
    expect((await theAnchorParticipantGuidance(on, undefined, who(BY_SCENARIO)))?.text).toBe((await theAnchorParticipantGuidance(on, undefined, who(BY_LINK)))?.text);
    expect(await theAnchorParticipantGuidance(on, undefined, who(BY_SCENARIO))).not.toBeNull();
    expect(await theAnchorParticipantGuidance(on, undefined, who(NEITHER))).toBeNull();
  });

  it('the first session\'s baseline is found for a check-in made by scenario, and not for another', async () => {
    const who = (ground: any) => ({ ground, isTheLead: false, sessionNumber: 1 });
    expect(await theAnchorBaselineGuidance(on, undefined, who(BY_SCENARIO))).not.toBeNull();
    expect(await theAnchorBaselineGuidance(on, undefined, who(NEITHER))).toBeNull();
  });

  it('the row read for a caller not handed the check-in asks for its scenario too', async () => {
    const findUnique = jest.fn(async () => ({ startedFrom: null, scenario: 'HELP_TEAM_UNDERSTAND' }));
    expect(await theCheckInWasStartedFromTheAnchor({ ground: { findUnique } }, 'g1')).toBe(true);
    expect((findUnique.mock.calls[0] as any)[0].select).toEqual({ startedFrom: true, scenario: true });
  });

  it('the mark passed on to the parts that still ask for startedFrom is "anchor" for either, and what the row held for any other', () => {
    expect([BY_LINK, BY_SCENARIO].map(theAnchorMarkOf)).toEqual(['anchor', 'anchor']);
    expect(theAnchorMarkOf(NEITHER)).toBeNull();
    expect(theAnchorMarkOf({ startedFrom: 'other', scenario: 'NEW_PROJECT' })).toBe('other');
    expect(aCheckInStartedFromTheAnchor(null)).toBe(false);
  });
});
