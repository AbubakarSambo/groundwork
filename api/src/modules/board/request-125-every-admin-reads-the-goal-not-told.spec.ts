import { GroundScenario } from '@prisma/client';
import { theyRunThisCheckIn } from './an-untold-goal-is-not-a-board-objective';
import { JUMA, RUKIA, BARAKA, AMINA, SETUP_ADMIN, boardAs, type Setup } from './the-switchboards-sections-harness';

/**
 * REQUEST 125, SECOND PRIVACY REVIEW, FINDING 5 (decisions 3, 5, 48, 56 and 86). Who reads the goal Amina has not told Rukia about.
 * Admins read every board and report (decision 5) and the aims and limits (decision 86.3), and the goal is hidden from "that person"
 * (decisions 48 and 56), so every admin of the organisation reads it, except on a performance plan, a promotion, a renewal or a
 * probation they were not given access to, where they read none of that check-in (decision 5). Rukia, and her colleague Baraka, do not.
 */
const NOT_TOLD = { participantId: 'p-rukia', text: 'Close eight renewals a quarter.', awareness: 'NOT_TOLD', authoredBy: 'lead', createdAt: new Date() };
const objectives = [
  { id: 'o-1', groundId: 'g-1', name: 'Rukia to close 8 renewals per quarter', target: 8, count: 2, prevCount: 1, ownerParticipantId: 'p-rukia', setByParticipantId: 'p-amina', sortOrder: 0, addedAtSession: 1 },
  { id: 'o-2', groundId: 'g-1', name: 'Lead the client conversations fully', target: 3, count: 1, prevCount: 1, ownerParticipantId: 'p-rukia', setByParticipantId: 'p-amina', sortOrder: 1, addedAtSession: 1 },
];
const OKR: Setup = { scenario: GroundScenario.OKR_ALIGNMENT, whoSeesTargets: 'EVERYBODY', objectives, personObjectives: [NOT_TOLD], createdByUserId: 'u-setup' };
const text = (b: any) => JSON.stringify(b);

describe('on the board, every admin of the organisation reads the goal not told', () => {
  it.each([['Amina, the lead', AMINA, true], ['the admin who set it up', SETUP_ADMIN, true], ['Juma, an admin who only reads', JUMA, true], ['Rukia, whom it is about', RUKIA, false], ['Baraka, a colleague', BARAKA, false]] as [string, readonly [string, string], boolean][])('%s', async (_n, who, reads) => {
    const b = await boardAs(OKR, who[0], who[1]);
    expect(text(b).includes('8 renewals')).toBe(reads);
    if (who !== BARAKA) expect(text(b)).toContain('Lead the client conversations fully');
  });

  it('Juma reads none of a renewal he was not given access to, so he reads no goal in it', async () => {
    await expect(boardAs({ ...OKR, scenario: GroundScenario.CONTRACT_RENEWAL }, ...JUMA)).rejects.toThrow();
  });
});

describe('the one rule, theyRunThisCheckIn', () => {
  const checkIn = (more: any = {}) => ({ organizationId: 'org1', scenario: GroundScenario.OKR_ALIGNMENT, initiatorId: 'u-amina', createdByUserId: 'u-setup', participants: [{ userId: 'u-rukia', managingOnly: false }], ...more });
  const admin = (userId: string, organizationId = 'org1') => ({ userId, role: 'ADMIN', organizationId });

  it('lets in the lead, the admin who set it up and every admin of the organisation', () => {
    expect(theyRunThisCheckIn('u-amina', checkIn())).toBe(true);
    expect(theyRunThisCheckIn('u-setup', checkIn())).toBe(true);
    expect(theyRunThisCheckIn(admin('u-juma'), checkIn())).toBe(true);
  });

  it('keeps out the person, a colleague, a lead of the same department, an admin of another organisation and a reader with no role', () => {
    expect(theyRunThisCheckIn({ userId: 'u-rukia', role: 'MEMBER', organizationId: 'org1' }, checkIn())).toBe(false);
    expect(theyRunThisCheckIn({ userId: 'u-baraka', role: 'MEMBER', organizationId: 'org1' }, checkIn())).toBe(false);
    expect(theyRunThisCheckIn({ userId: 'u-joy', role: 'LEAD', organizationId: 'org1' }, checkIn())).toBe(false);
    expect(theyRunThisCheckIn(admin('u-juma', 'org2'), checkIn())).toBe(false);
    expect(theyRunThisCheckIn('u-juma', checkIn())).toBe(false);
  });

  it('keeps out an admin who takes part in it as a person, since it is hidden from that person', () => {
    expect(theyRunThisCheckIn(admin('u-rukia'), checkIn())).toBe(false);
  });

  it('keeps out an admin on a probation, a promotion or a renewal they were not given access to, and lets in one who set it up or was asked to approve it', () => {
    const renewal = checkIn({ scenario: GroundScenario.CONTRACT_RENEWAL });
    expect(theyRunThisCheckIn(admin('u-juma'), renewal)).toBe(false);
    expect(theyRunThisCheckIn(admin('u-setup'), renewal)).toBe(true);
    expect(theyRunThisCheckIn(admin('u-juma'), { ...renewal, status: 'AWAITING_APPROVAL' })).toBe(true);
  });
});
