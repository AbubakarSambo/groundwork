import { EntryService } from './entry.service';
import { GroundworkEvents } from '../../common';

/**
 * THE ANCHOR'S LEAD HAS SAID HER TEAM'S SIZE, BEFORE HER CHECK-IN IS MADE (release check, 8 October 2026).
 *
 * Found on test bed copy a with the free trial on: a lead who came in by the anchor link and left "Organisation name
 * (optional)" blank was signed in, and then every save of her check-in, "Try again" included, was refused with "Your
 * organisation has no plan yet. Choose one on Plan and billing to open a check-in." Nothing had ever asked her team's
 * size, and the anchor's own month is given only once a check-in exists, so it could not help.
 *
 * The anchor is a group of up to 20 people, the lead included: that is the trial's own question. So the save tells
 * billing "fewer" and waits for it before the check-in is made. Billing still decides whether the month applies.
 */
function makeService(switchOn: boolean) {
  const order: string[] = [];
  const said: any[] = [];
  const prisma: any = {
    user: { findUnique: jest.fn(async () => ({ role: 'ADMIN' })) },
    organization: { findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'NAMED_LEADS', checkInsNeedApproval: true })), update: jest.fn(async () => ({})) },
    platformSetting: { findUnique: jest.fn(async () => (switchOn ? { value: { on: true } } : { value: { on: false } })) },
    entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
    groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]), findFirst: jest.fn(async () => ({ id: 'p1' })), update: jest.fn(async () => ({})) },
    roundCompletion: { create: jest.fn(async (a: any) => a.data) },
    checkIn: { count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
    conversationTurn: { createMany: jest.fn(async () => ({ count: 0 })) },
    leadContextNote: { create: jest.fn(async () => ({})) },
    ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ joinToken: 'jt' })) },
  };
  const grounds: any = {
    create: jest.fn(async () => { order.push('the check-in is made'); return { id: 'g-self', joinToken: 'jt' }; }),
    createForLead: jest.fn(),
    addParticipant: jest.fn(async () => ({})),
  };
  const conversation: any = { extractRecordEntries: jest.fn(async () => undefined), extractExpectations: jest.fn(async () => undefined), ensureNextSession: jest.fn(async () => undefined), buildSoloArtifact: jest.fn(async () => undefined) };
  const events: any = {
    emit: jest.fn(),
    emitAsync: jest.fn(async (name: string, payload: any) => {
      if (name !== GroundworkEvents.ORG_SIZE_SAID) return [];
      said.push(payload);
      await new Promise((r) => setTimeout(r, 20));
      order.push('billing has decided the month');
      return [];
    }),
  };
  const service = new EntryService({} as any, prisma, grounds, {} as any, {} as any, conversation, events);
  return { service, order, said };
}
const save = (service: EntryService, scenario: string) =>
  service.commit('org-kibanda', 'user-lead', { groundLabel: 'Help my team understand', scenario, cadence: 'ONE_TIME', cadenceChosen: true, history: [{ role: 'user', content: 'hi' }] as any, report: null, contributors: [] } as any);

describe('the anchor says the team is under the trial size before the check-in is made', () => {
  it('with the anchor on, billing is told "fewer" and has decided before the check-in is made', async () => {
    const { service, order, said } = makeService(true);
    await save(service, 'HELP_TEAM_UNDERSTAND');
    expect(said).toEqual([{ organizationId: 'org-kibanda', said: 'fewer', line: 20 }]);
    expect(order).toEqual(['billing has decided the month', 'the check-in is made']);
  });

  it('with the anchor off, or for any other situation, nothing is said for the lead', async () => {
    const off = makeService(false);
    await save(off.service, 'HELP_TEAM_UNDERSTAND');
    expect(off.said).toEqual([]);
    const other = makeService(true);
    await save(other.service, 'NEW_PROJECT');
    expect(other.said).toEqual([]);
  });
});
