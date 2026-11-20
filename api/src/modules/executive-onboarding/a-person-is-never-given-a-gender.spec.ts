import { AN_ADMIN_WAS_TOLD, ONLY_SHE_CAN_SAY_YES_FOR_OUTSIDERS, PERMISSIONS_NAMES, THANK_YOU_TO_A_TEAM_MEMBER, THAT_ADDRESS_IS_ELSEWHERE } from './the-words';
import { emailToATeamMember, whatsAppToATeamMember, theOffice } from './the-introductions';
import { DRAFT_READY_WHATSAPP, draftReadyEmail, finalEmail, progressFull, progressShort } from '../year-end/the-year-end-words';
import { theGoAheadQuestionWaiting } from './team-introductions';

/**
 * FATIMA ROUND 2, D4: the onboarding reply said "She does not need to register" about a new principal. Groundwork never works out somebody's gender from a name.
 * Every message in these places says the person's name, "you" or "they". Each message is rendered and read, and the one scan that matters is over what a person reads.
 */
const GENDERED = /\b(she|he|her|hers|him|his|herself|himself)\b/i;
const told = AN_ADMIN_WAS_TOLD({ first: 'Rakiya', jobs: ['2026 annual report and presentation', '2026 outstanding matters and 2027 carry-forward register'], email: 'r@x.test', whatsapp: '+2348010000001', introductions: [{ channel: 'email', state: 'sent', reason: null }, { channel: 'whatsapp', state: 'held', reason: 'WhatsApp does not yet let Groundwork write first to this number.' }], permissionsMissing: [PERMISSIONS_NAMES.messaging, PERMISSIONS_NAMES.teamOutreach] });

describe('no message guesses a gender', () => {
  it('the onboarding reply names the new principal', () => {
    expect(told).toContain('I have added Rakiya. Rakiya does not need to register or sign in to anything.');
    expect(told).toContain('Nothing has been sent to Rakiya yet, because the approval to message Rakiya has not been confirmed.');
    expect(told).not.toMatch(GENDERED);
  });

  it('the team introductions, their thank-you, and the questions to the principal', async () => {
    const texts = [
      whatsAppToATeamMember('Rakiya', theOffice(null)).text, emailToATeamMember('Rakiya', theOffice('Abuja office')).text,
      THANK_YOU_TO_A_TEAM_MEMBER('Aminu', 'They', ['the note'], []), THAT_ADDRESS_IS_ELSEWHERE, ONLY_SHE_CAN_SAY_YES_FOR_OUTSIDERS('Rakiya'), ...Object.values(PERMISSIONS_NAMES),
      await theGoAheadQuestionWaiting({ outreachContact: { findMany: async () => [{ name: 'Musa Ibrahim' }] } }, 'u-1') as string,
    ];
    for (const t of texts) expect(t).not.toMatch(GENDERED);
    expect(whatsAppToATeamMember('Rakiya', 'the Abuja office').text).toContain('Rakiya asked me to reach out to you.');
    expect(emailToATeamMember('Rakiya', 'the Abuja office').text).toContain('Rakiya has authorised me to reach out for relevant updates and supporting documents.');
  });

  it('the year-end messages', () => {
    const c: any = { principalFirstName: 'Rakiya', principalName: 'Rakiya Lawal', year: 2026, sections: [], register: [], gaps: [], evidence: [], questions: [], edits: [], shortened: [] };
    const texts = [DRAFT_READY_WHATSAPP('Rakiya', 1), DRAFT_READY_WHATSAPP('Rakiya', 2), draftReadyEmail(c, 1).text, finalEmail(c, 1).text, progressShort('Rakiya', { kind: 'gap', gaps: ['2026-03'], askedOf: null }), progressFull('Rakiya', { kind: 'newer', version: 1 }).text];
    for (const t of texts) expect(t).not.toMatch(GENDERED);
  });
});
