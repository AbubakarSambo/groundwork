import { PartyType } from '@prisma/client';
import { ReportsService } from './reports.service';

/**
 * IN AN ANCHOR CHECK-IN, THE LEAD'S AIMS ARE IN NO REPORT SENTENCE A TEAM MEMBER READS (decision 96, item 8; release check,
 * 8 October 2026).
 *
 * On test bed copy a, Amina set up "Help my team understand" saying "we threw away 20% of bread because orders weren't
 * checked" (what she is seeing today, which stays hers). The set-up made an aim of it. Juma, on her team, opened his session
 * report and read, in `finding`, `sharedPicture`, `picture` and `pictureLines`: "The objective, in the lead's own words, is
 * "The team checks orders before baking to reduce the 20 percent of bread that gets thrown away", and nobody in this check-in
 * has a number of their own against it." The model had already been kept from her aims (4eb427e2); the report was not.
 *
 * Read here through the real door every session report, round and against-success read is served through.
 */
const AMINA = 'u-amina', JUMA = 'u-juma';
const AIM = 'The team checks orders before baking to reduce the 20 percent of bread that gets thrown away';
const FINDING = `The objective, in the lead's own words, is "${AIM}", and nobody in this check-in has a number of their own against it.`;
const person = (id: string, userId: string, partyType: PartyType, first: string, t: number) => ({
  id, userId, email: `${id}@x.test`, partyType, createdAt: new Date(2026, 9, 8, 0, t), nameGiven: null, organisationGiven: null,
  roleAsDescribed: null, remitAsGiven: null, user: { firstName: first, lastName: '' },
});

function service(startedFrom: string | null, scenario: string) {
  const prisma: any = {
    ground: {
      findUnique: async () => ({
        initiatorId: AMINA, organizationId: 'org1', createdByUserId: AMINA, whoSeesTargets: 'EVERYBODY', scenario, startedFrom,
        peersVisibleToEachOther: true,
        participants: [person('p-amina', AMINA, PartyType.INITIATOR, 'Amina', 0), person('p-juma', JUMA, PartyType.PARTICIPANT, 'Juma', 1)],
        objectives: [{ name: AIM, ownerParticipantId: null, target: 20 }],
        report: { sharedAs: null },
      }),
    },
    user: { findUnique: async ({ where }: any) => ({ role: where.id === AMINA ? 'ADMIN' : 'MEMBER', organizationId: 'org1' }) },
    organizationMembership: { findFirst: async () => null, findMany: async () => [] },
    personObjective: { findMany: async () => [] },
    groundDocument: { findMany: async () => [] },
    person: { findFirst: async () => null, findMany: async () => [] },
  };
  const svc: any = Object.create(ReportsService.prototype);
  svc.prisma = prisma;
  svc.logger = { log: () => undefined, warn: () => undefined, error: () => undefined };
  return svc;
}
const served = () => ({ sessionNumber: 1, finding: { text: FINDING }, sharedPicture: FINDING, pictureLines: [{ text: FINDING }, { text: 'Juma said the shops on his round owe for three weeks.' }] });
const said = (o: unknown) => JSON.stringify(o);

describe("an anchor check-in: the lead's aims stay hers in the report", () => {
  it('Juma, on her team, reads none of them, and still reads the rest', async () => {
    const out = await service('anchor', 'HELP_TEAM_UNDERSTAND').whatTheLeadHasNotShared('g1', JUMA, 'org1', served());
    expect(said(out)).not.toMatch(/20 percent|thrown away|in the lead's own words/);
    expect(said(out)).toContain('owe for three weeks');
  });

  it('Amina, who runs it, reads her aim', async () => {
    const out = await service('anchor', 'HELP_TEAM_UNDERSTAND').whatTheLeadHasNotShared('g1', AMINA, 'org1', served());
    expect(said(out)).toContain('20 percent');
  });

  it('a check-in that is not the anchor is unchanged for a member', async () => {
    const out = await service(null, 'OKR_ALIGNMENT').whatTheLeadHasNotShared('g1', JUMA, 'org1', served());
    expect(said(out)).toContain('20 percent');
  });
});
