import { OpsPeopleService, NOT_YET_ON_THE_ROSTER } from './ops-people.service';
import { GRANTS_FOR_A_PLATFORM_ADMIN, ROLE_FOR_A_PLATFORM_ADMIN } from './a-platform-admin-is-on-the-team';

/**
 * THE ROSTER IS NOT WRITTEN BY A READ.
 *
 * A platform admin is on the team - decided 2026-09-05, and kept. But identify() ran on every /ops
 * request, GETs included, and the first GET wrote the OpsPerson row and the CEO grants. The roster
 * is meant to be the record of who is on the team; a read should not add to it (fix plan A15, as
 * the audit corrected it). A read gets the same identity held in memory; the walk-in and the first
 * write put the row down.
 */
const admin = { id: 'u-admin', email: 'Founder@ours.example', firstName: 'Ada', lastName: 'Nwosu', isPlatformAdmin: true };

function serviceWithNobody() {
  const created: unknown[] = [];
  const updated: unknown[] = [];
  const service = new OpsPeopleService({
    opsPersonAccount: { findUnique: async () => null },
    opsPerson: {
      findUnique: async () => null,
      create: async ({ data }: any) => { created.push(data); return { id: 'p1', key: data.key, displayName: data.displayName, functionalRole: data.functionalRole, grants: GRANTS_FOR_A_PLATFORM_ADMIN.map((capability) => ({ capability })) }; },
      update: async ({ data }: any) => { updated.push(data); return {}; },
    },
  } as never);
  return { service, created, updated };
}

describe('a platform admin with no row', () => {
  it('reading the back office is identified from memory and nothing is written', async () => {
    const { service, created, updated } = serviceWithNobody();
    const identity = await service.identify(admin, { admit: false });
    expect(identity).not.toBeNull();
    expect(identity!.personId).toBe(NOT_YET_ON_THE_ROSTER);
    expect(identity!.functionalRole).toBe(ROLE_FOR_A_PLATFORM_ADMIN);
    expect(identity!.capabilities).toEqual([...GRANTS_FOR_A_PLATFORM_ADMIN]);
    expect(identity!.displayName).toBe('Ada Nwosu');
    expect(created).toEqual([]);
    expect(updated).toEqual([]);
  });

  it('walking in, or writing anything, puts them on the roster - the decision of 5 September stands', async () => {
    const { service, created } = serviceWithNobody();
    const identity = await service.identify(admin, { admit: true });
    expect(identity!.personId).toBe('p1');
    expect(created).toHaveLength(1);
  });

  it('and identify() with no option still admits, so every existing caller behaves as before', async () => {
    const { service, created } = serviceWithNobody();
    await service.identify(admin);
    expect(created).toHaveLength(1);
  });

  it('somebody who is not a platform admin is nobody either way', async () => {
    const { service } = serviceWithNobody();
    expect(await service.identify({ ...admin, isPlatformAdmin: false }, { admit: false })).toBeNull();
    expect(await service.identify({ ...admin, isPlatformAdmin: false })).toBeNull();
  });
});
