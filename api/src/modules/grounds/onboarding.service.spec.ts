import { GateState } from '@prisma/client';
import { OnboardingService } from './onboarding.service';
import { WINDOW_BACKSTOP_DAYS } from './still-finding-their-feet';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/** A fake holding just enough for the exemption rule, which is the thing that matters here. */
function svc(o: {
  assignments?: any[]; tracks?: any[]; statuses?: any[];
} = {}) {
  const prisma: any = {
    roleAssignment: { findMany: async () => o.assignments ?? [], findFirst: async () => (o.assignments ?? [])[0] ?? null },
    onboardingTrack: {
      findMany: async () => o.tracks ?? [],
      findUnique: async ({ where }: any) =>
        (o.tracks ?? []).find((t) => t.roleName === where.organizationId_roleName.roleName) ?? null,
    },
    onboardingStatus: { findMany: async () => o.statuses ?? [] },
  };
  return new OnboardingService(prisma);
}

const track = (roleName: string, gates: any[]) => ({ roleName, name: `${roleName} start`, gates });
const gate = (id: string, required = true) => ({ id, required, key: id, name: id, ordinal: 0, description: null });

describe('who the detectors leave alone', () => {
  it('somebody with a required gate outstanding', async () => {
    const s = svc({
      assignments: [{ personExternalId: 'newbie', roleName: 'Engineer', startedAt: daysAgo(5) }],
      tracks: [track('Engineer', [gate('brief'), gate('first-checkin')])],
      statuses: [],
    });
    expect([...await s.whoIsStillOnboarding('org-a')]).toEqual(['newbie']);
  });

  it('but not once the required gates are closed', async () => {
    const s = svc({
      assignments: [{ personExternalId: 'newbie', roleName: 'Engineer', startedAt: daysAgo(5) }],
      tracks: [track('Engineer', [gate('brief'), gate('optional', false)])],
      statuses: [{ personExternalId: 'newbie', gateId: 'brief', state: GateState.DONE }],
    });
    expect([...await s.whoIsStillOnboarding('org-a')]).toEqual([]);
  });

  it('and a waived gate closes it too', async () => {
    /* Somebody who has done this before elsewhere. Distinct from DONE so "did they actually do it"
       stays answerable, but it closes the window either way. */
    const s = svc({
      assignments: [{ personExternalId: 'newbie', roleName: 'Engineer', startedAt: daysAgo(5) }],
      tracks: [track('Engineer', [gate('brief')])],
      statuses: [{ personExternalId: 'newbie', gateId: 'brief', state: GateState.WAIVED }],
    });
    expect([...await s.whoIsStillOnboarding('org-a')]).toEqual([]);
  });

  it('and nobody is exempt forever on a gate nobody ever marks', async () => {
    /*
     * The person a permanently-open window protects is somebody nobody has looked at in a year,
     * which is the opposite of protection.
     */
    const s = svc({
      assignments: [{ personExternalId: 'forgotten', roleName: 'Engineer', startedAt: daysAgo(WINDOW_BACKSTOP_DAYS + 1) }],
      tracks: [track('Engineer', [gate('brief')])],
      statuses: [],
    });
    expect([...await s.whoIsStillOnboarding('org-a')]).toEqual([]);
  });

  it('and a role with no track set up exempts nobody', async () => {
    /*
     * An absent track means nothing has been asked of them. Treating it as an open-ended exemption
     * would let one unconfigured role suppress every finding about everybody in it - the quietest
     * possible way for a detector to stop working.
     */
    const s = svc({
      assignments: [{ personExternalId: 'someone', roleName: 'Unconfigured', startedAt: daysAgo(1) }],
      tracks: [],
      statuses: [],
    });
    expect([...await s.whoIsStillOnboarding('org-a')]).toEqual([]);
  });

  it('and a PENDING status is not a closed gate', async () => {
    const s = svc({
      assignments: [{ personExternalId: 'newbie', roleName: 'Engineer', startedAt: daysAgo(5) }],
      tracks: [track('Engineer', [gate('brief')])],
      statuses: [{ personExternalId: 'newbie', gateId: 'brief', state: GateState.PENDING }],
    });
    expect([...await s.whoIsStillOnboarding('org-a')]).toEqual(['newbie']);
  });
});
