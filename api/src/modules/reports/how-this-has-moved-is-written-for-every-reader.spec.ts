import { ReportsService } from './reports.service';
import { labelsForParties } from './party-labels';

/**
 * HOW THIS HAS MOVED IS WRITTEN FOR EVERY READER, NOT TO THE LEAD. Screens request 66.
 *
 * `moved[].says` was reworded by a pass that speaks to one person as "you", so a round's opening
 * came back as "You have received answers from all three people." and was served to everybody,
 * Amani and Juma included. It is now the round's own opening sentence, written in labels for several
 * readers, with each label turned into the person's name on the way out, the same for every
 * reader. This reads `rounds()` as the lead, each participant and an admin who only reads.
 */
const PEOPLE = [
  { id: 'p-lead', userId: 'u-rukia', partyType: 'INITIATOR', managingOnly: true, createdAt: new Date('2026-09-01T09:00:00Z'), email: 'r@x.test', nameGiven: null, organisationGiven: null, roleAsDescribed: null, user: { firstName: 'Rukia', lastName: 'Mwangi' } },
  { id: 'p-amani', userId: 'u-amani', partyType: 'PARTICIPANT', managingOnly: false, createdAt: new Date('2026-09-01T10:00:00Z'), email: 'a@x.test', nameGiven: null, organisationGiven: null, roleAsDescribed: null, user: { firstName: 'Amani', lastName: 'Kariuki' } },
  { id: 'p-juma', userId: 'u-juma', partyType: 'PARTICIPANT', managingOnly: false, createdAt: new Date('2026-09-01T11:00:00Z'), email: 'j@x.test', nameGiven: null, organisationGiven: null, roleAsDescribed: null, user: { firstName: 'Juma', lastName: 'Otieno' } },
];

function serviceFor(role: string) {
  const labels = labelsForParties(PEOPLE as any);
  const L = (id: string) => labels.get(id)!;
  const picture = `${L('p-lead')} has accounts from ${L('p-amani')} and ${L('p-juma')} this round. Both describe the stock count as late.`;
  const ground = {
    organizationId: 'org-1', initiatorId: 'u-rukia', scenario: 'OKR_ALIGNMENT', whoSeesTargets: 'EVERYBODY', peersVisibleToEachOther: true,
    report: { releasedAt: new Date('2026-09-23') }, participants: PEOPLE, objectives: [],
  };
  /* What the wording pass sent back when it was used here: the same claim, spoken to one person. */
  const respond = jest.fn(async () => `You have accounts from ${L('p-amani')} and ${L('p-juma')} this round.\n`);
  const s = Object.create(ReportsService.prototype) as any;
  s.anthropic = { respond };
  s.logger = { warn: jest.fn() };
  s.prisma = {
    user: { findUnique: async () => ({ role, organizationId: 'org-1', awaitingOrgApproval: false }) },
    ground: { findUnique: async () => JSON.parse(JSON.stringify(ground)) },
    reportRound: { findMany: async () => [{ sessionNumber: 1, round: 1, sharedPicture: picture, divergences: [], takenAt: new Date('2026-09-22') }] },
    groundDocument: { findMany: async () => [] },
    wordedLine: { findUnique: async () => null, upsert: async () => ({}) },
  };
  return { s, respond };
}

const says = async (userId: string, role = 'MEMBER') => {
  const { s, respond } = serviceFor(role);
  const out = await s.rounds('g-1', userId, 'org-1');
  return { line: out.moved[0].says as string, respond };
};

describe('what each round led with', () => {
  it('is never sent through the wording pass that speaks to one person', async () => {
    const { line, respond } = await says('u-amani');
    expect(respond).not.toHaveBeenCalled();
    expect(line).not.toMatch(/^You /);
  });

  /* The same sentence, with names, for every reader: the one they read in that round's picture. */
  const SAME = 'Rukia Mwangi has accounts from Amani Kariuki and Juma Otieno this round.';
  it.each([
    ['the lead', 'u-rukia', 'MEMBER'],
    ['Amani', 'u-amani', 'MEMBER'],
    ['Juma', 'u-juma', 'MEMBER'],
    ['an admin who only reads', 'u-grace', 'ADMIN'],
  ])('reads, for %s, as that round\'s picture said it, with names', async (_who, userId, role) => {
    const { line } = await says(userId, role);
    expect(line).toBe(SAME);
    expect(line).not.toMatch(/\b(you|your)\b|Participant|the initiator/i);
  });
});
