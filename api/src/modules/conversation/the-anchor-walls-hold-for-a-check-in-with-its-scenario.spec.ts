import { ConversationService } from './conversation.service';
import { withoutTheLeadsSetUpForAMember } from '../grounds/the-leads-set-up-is-the-leads-in-the-anchor';

/**
 * DECISION 114, THE WALLS. A check-in made through the ordinary set-up with the anchor's scenario has `startedFrom` empty unless something
 * wrote it. The lead's own words (what she is carrying, her aims) are hers alone in an anchor check-in; that must hold for it too.
 */
const ground = (over: any) => ({
  label: 'Help my team understand', brief: 'You are carrying the delivery team and you see them stop at the handover.', toldToParticipants: null,
  startedFrom: null, scenario: 'HELP_TEAM_UNDERSTAND', objectives: [{ name: 'They would ask whether the client is happy', target: null, ownerParticipantId: null, isADecisionAboutAPerson: false, setByParticipantId: 'p0', direction: null }], ...over,
});
const briefFor = (g: any, reader: any) => (ConversationService.prototype as any).briefFor.call(Object.create(ConversationService.prototype), g, reader, []);

describe('what a member reads of the lead\'s words, in a check-in made by scenario', () => {
  it('is none of her brief and none of her aims, as for one the link started', () => {
    const member = { participantId: 'p1', isLead: false };
    for (const g of [ground({}), ground({ startedFrom: 'anchor', scenario: 'NEW_PROJECT' })]) {
      const out = briefFor(g, member);
      expect(out.objectives).toEqual([]);
      expect(JSON.stringify(out)).not.toMatch(/carrying the delivery team|stop at the handover|client is happy/);
    }
  });
  it('is still her own whole set-up for the lead, and an ordinary check-in is not walled', () => {
    expect(JSON.stringify(briefFor(ground({}), { participantId: 'p0', isLead: true }))).toMatch(/client is happy/);
    expect(JSON.stringify(briefFor(ground({ scenario: 'OKR_ALIGNMENT' }), { participantId: 'p1', isLead: false }))).toMatch(/client is happy/);
  });
});

describe('the check-in page and the board, for a member', () => {
  const page = { objectives: [{ name: 'her aim' }], subjectsToCover: ['x'], whatACompleteAnswerHolds: 'y' };
  it('hold none of the lead\'s set-up when the check-in is the anchor\'s by its scenario', () => {
    const out = withoutTheLeadsSetUpForAMember(page, { startedFrom: null, scenario: 'HELP_TEAM_UNDERSTAND', runsIt: false });
    expect(out.objectives).toEqual([]);
    expect(out.subjectsToCover).toBeNull();
    expect(out.whatACompleteAnswerHolds).toBeNull();
  });
  it('are whole for whoever runs it, and for another scenario', () => {
    expect(withoutTheLeadsSetUpForAMember(page, { startedFrom: null, scenario: 'HELP_TEAM_UNDERSTAND', runsIt: true })).toBe(page);
    expect(withoutTheLeadsSetUpForAMember(page, { startedFrom: null, scenario: 'OKR_ALIGNMENT', runsIt: false })).toBe(page);
  });
});
