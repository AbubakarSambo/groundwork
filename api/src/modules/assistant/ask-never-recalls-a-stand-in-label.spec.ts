import { AssistantService } from './assistant.service';
import { ReportsService } from '../reports/reports.service';

/**
 * DECISION 139, ITEM 1: ASK NEVER RECALLS "PARTICIPANT A".
 *
 * "What came of it" recalls a finished check-in's central question, agreements and differences. They are stored
 * in labels, and the recall read them straight off the row, so a person asking Ask what was agreed would read
 * "Agreed: The price list has been sent by Participant B." This reads the recall as the person who asks it,
 * with the real report door wired in, and then without it (the last-line guard alone).
 */
const WAIRIMU = { id: 'pL', userId: 'u-wairimu', email: 'wairimu@example.test', partyType: 'INITIATOR', createdAt: new Date('2026-09-01T09:00:00Z'), managingOnly: false, nameGiven: null, organisationGiven: null, roleAsDescribed: null, remitAsGiven: null, user: { firstName: 'Wairimu', lastName: 'Njoroge' } };
const KEVIN = { id: 'pA', userId: 'u-kevin', email: 'kevin@example.test', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-01T10:00:00Z'), managingOnly: false, nameGiven: null, organisationGiven: null, roleAsDescribed: null, remitAsGiven: null, user: { firstName: 'Kevin', lastName: 'Odhiambo' } };
const FATUMA = { id: 'pB', userId: 'u-fatuma', email: 'fatuma@example.test', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-01T11:00:00Z'), managingOnly: false, nameGiven: null, organisationGiven: null, roleAsDescribed: null, remitAsGiven: null, user: { firstName: 'Fatuma', lastName: 'Bello' } };

function askAs(person: { email: string; linkedUserId: string; participantId: string }, opts: { door: boolean; sharedAs?: string | null }) {
  const ground = {
    id: 'g1', label: 'WhatsApp ordering pilot', initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true,
    whoSeesTargets: 'EVERYBODY', objectives: [], personObjectives: [],
    participants: [WAIRIMU, KEVIN, FATUMA],
    report: {
      releasedAt: new Date('2026-10-20T17:00:00Z'), sharedAs: opts.sharedAs ?? null,
      centralQuestion: 'What Participant A is waiting for from the initiator and from Participant B.',
      agreements: ['The price list has been sent by Participant B.'],
      divergences: [{ topic: 'The shop list', text: "Participant A's latest update counts 31 shops on the list." }],
    },
  };
  const seed: Record<string, any> = {
    person: { findFirst: jest.fn(async () => ({ email: person.email, linkedUserId: person.linkedUserId })) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: person.participantId, ground }]) },
  };
  const nothingBack = (method: string) => async () => (String(method).endsWith('Many') ? [] : null);
  const prisma: any = new Proxy(seed, { get: (t: any, m: string) => new Proxy(t[m] ?? {}, { get: (x: any, k: string) => x[k] ?? nothingBack(k) }) });
  const reports = opts.door ? new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any) : undefined;
  const nothing: any = {};
  const service = new AssistantService(prisma, nothing, nothing, nothing, nothing, nothing, nothing, nothing, nothing, nothing, nothing, reports as any);
  return (service as any).whatCameOfIt('org1', 'person-1');
}

const A_LABEL = /Participant [A-Z]\b|the initiator/i;

describe('Ask recalls what came of a check-in, with names in and never a stand-in label', () => {
  for (const door of [true, false]) {
    it(`to Kevin, who took part (${door ? 'through the report door' : 'with only the last-line guard'})`, async () => {
      const reply = await askAs({ email: 'kevin@example.test', linkedUserId: 'u-kevin', participantId: 'pA' }, { door });
      const said = JSON.stringify(reply);
      expect(said).toContain('WhatsApp ordering pilot');
      expect(said).not.toMatch(A_LABEL);
      expect(said).toContain('The price list has been sent by Fatuma Bello.');
    });

    it(`to Wairimu, who runs it (${door ? 'through the report door' : 'with only the last-line guard'})`, async () => {
      const reply = await askAs({ email: 'wairimu@example.test', linkedUserId: 'u-wairimu', participantId: 'pL' }, { door });
      const said = JSON.stringify(reply);
      expect(said).not.toMatch(A_LABEL);
      expect(said).toContain('Fatuma Bello');
    });
  }

  it('on a copy shared without names, Kevin is told nobody by name, and no label either', async () => {
    const reply = await askAs({ email: 'kevin@example.test', linkedUserId: 'u-kevin', participantId: 'pA' }, { door: true, sharedAs: 'ANONYMOUS' });
    const said = JSON.stringify(reply);
    expect(said).not.toMatch(A_LABEL);
    expect(said).not.toMatch(/Fatuma|Wairimu/);
  });
});
