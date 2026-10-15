/**
 * "I am super admin so not sure why I see this."
 *
 * The platform-admin list and the ops team were two lists, and the reasoning
 * was that running the platform and being on this company's team are different
 * jobs. In a company this size they are not: the platform-admin list is short,
 * every addition needs an existing admin and an emailed code, and the effect of
 * keeping them apart was that the person who owns the company had to connect
 * her own account before she could open her own back office — and having done
 * it on one account, was refused on another.
 *
 * Decided 2026-09-05: one list.
 */
import { OpsPeopleService } from './ops-people.service';
import {
  GRANTS_FOR_A_PLATFORM_ADMIN,
  ROLE_FOR_A_PLATFORM_ADMIN,
  keyForAccount,
  nameForAccount,
} from './a-platform-admin-is-on-the-team';
import { DEFAULT_GRANTS } from './what-somebody-may-do';

describe('the key made from an address', () => {
  it('is the local part, readable', () => {
    expect(keyForAccount('hafsah.ops@myground.work')).toBe('hafsah-ops');
  });

  it('drops the domain, so moving domains does not make a second person', () => {
    expect(keyForAccount('hafsah.ops@myground.work')).toBe(keyForAccount('hafsah.ops@coamana.com'));
  });

  it('never comes out empty, because an empty key is a broken route', () => {
    expect(keyForAccount('@nowhere.test')).toBe('admin');
  });
});

describe('what to call them', () => {
  it('is their name when the account carries one', () => {
    expect(nameForAccount({ email: 'a@b.test', firstName: 'Hafsah', lastName: 'Jumare' })).toBe(
      'Hafsah Jumare',
    );
  });

  it('and "Someone" when it does not, never the address (Hafsah, 6 October), rather than a blank on every board', () => {
    expect(nameForAccount({ email: 'a@b.test' })).toBe('Someone');
  });
});

const serviceOver = (people: Array<Record<string, unknown>>) => {
  const created: Record<string, unknown>[] = [];
  const linked: Record<string, unknown>[] = [];
  const service = new OpsPeopleService({
    opsPersonAccount: { findUnique: async () => null },
    opsPerson: {
      findUnique: async ({ where }: never) => {
        const w = where as { userId?: string; key?: string };
        return (
          people.find((p) => (w.userId ? p.userId === w.userId : p.key === w.key)) ?? null
        );
      },
      create: async ({ data }: never) => {
        created.push(data as Record<string, unknown>);
        return {
          id: 'new',
          key: (data as { key: string }).key,
          displayName: (data as { displayName: string }).displayName,
          functionalRole: (data as { functionalRole: string }).functionalRole,
          grants: GRANTS_FOR_A_PLATFORM_ADMIN.map((capability) => ({ capability })),
        };
      },
      update: async ({ data }: never) => {
        linked.push(data as Record<string, unknown>);
        return {};
      },
    },
  } as never);
  return { service, created, linked };
};

const admin = {
  id: 'u1',
  email: 'hafsah.ops@myground.work',
  firstName: 'Hafsah',
  lastName: 'Jumare',
  isPlatformAdmin: true,
};

describe('a platform admin who is not on the team', () => {
  it('is admitted', async () => {
    const { service } = serviceOver([]);
    const identity = await service.identify(admin);
    expect(identity).not.toBeNull();
    expect(identity!.key).toBe('hafsah-ops');
    expect(identity!.displayName).toBe('Hafsah Jumare');
  });

  it('carries the address, because without it they do not exist to Groundwork', async () => {
    /*
     * Left null at first, and invisible until somebody opened the assistant:
     * `peopleFrom` skips anybody with no email, so the person is never pushed,
     * no Person is created in the organisation, and the panel answers
     * `visible: false` about somebody plainly on the team.
     */
    const { service, created } = serviceOver([]);
    await service.identify(admin);
    expect(created[0]).toMatchObject({ email: 'hafsah.ops@myground.work' });
  });

  it('gets a real record, because half this system points at a person', async () => {
    /* An identity with no row behind it would break every attribution,
       commitment and approval the moment it did anything. */
    const { service, created } = serviceOver([]);
    await service.identify(admin);
    expect(created[0]).toMatchObject({ key: 'hafsah-ops', userId: 'u1', functionalRole: ROLE_FOR_A_PLATFORM_ADMIN });
  });

  it('gets the grants of that role, written as rows like everybody else', async () => {
    const { service, created } = serviceOver([]);
    const identity = await service.identify(admin);
    expect(identity!.capabilities).toEqual([...DEFAULT_GRANTS.CEO]);
    expect((created[0] as { grants: { create: unknown[] } }).grants.create).toHaveLength(
      DEFAULT_GRANTS.CEO.length,
    );
  });

  it('and it is said out loud, not done quietly', async () => {
    const { service } = serviceOver([]);
    const said: string[] = [];
    (service as unknown as { logger: { warn: (m: string) => void } }).logger = {
      warn: (m: string) => said.push(m),
    };
    await service.identify(admin);
    expect(said.join(' ')).toMatch(/platform admin and was not on the team/);
  });
});

describe('somebody who is not a platform admin', () => {
  it('is refused exactly as before', async () => {
    const { service, created } = serviceOver([]);
    expect(await service.identify({ ...admin, isPlatformAdmin: false })).toBeNull();
    expect(created).toEqual([]);
  });

  it('and so is a caller with no account at all', async () => {
    const { service } = serviceOver([]);
    expect(await service.identify(undefined)).toBeNull();
  });
});

describe('a platform admin whose record already exists', () => {
  const existing = {
    id: 'p1',
    key: 'hafsah-ops',
    displayName: 'Hafsah Jumare',
    functionalRole: 'CEO',
    active: true,
    userId: null,
    grants: [{ capability: 'ceo:board' }],
  };

  it('is linked to it rather than duplicated', async () => {
    const { service, created, linked } = serviceOver([existing]);
    const identity = await service.identify(admin);
    expect(created).toEqual([]);
    expect(linked[0]).toEqual({ userId: 'u1' });
    expect(identity!.personId).toBe('p1');
  });

  it('keeps the grants that record already had, not the defaults', async () => {
    /* Grants are rows. Somebody who had a capability revoked must not get it
       back by signing in again. */
    const { service } = serviceOver([existing]);
    const identity = await service.identify(admin);
    expect(identity!.capabilities).toEqual(['ceo:board']);
  });
});

describe('somebody taken off the team on purpose', () => {
  it('stays off, platform admin or not', async () => {
    /*
     * Deactivating clears userId, so the next arrival looks like a first
     * arrival. Without the key check it would be re-admitted on every sign-in
     * and "remove them" would mean nothing.
     */
    const { service, created } = serviceOver([
      { id: 'p1', key: 'hafsah-ops', displayName: 'Hafsah', functionalRole: 'CEO', active: false, userId: null, grants: [] },
    ]);
    expect(await service.identify(admin)).toBeNull();
    expect(created).toEqual([]);
  });

  it('and a linked-but-inactive record is refused too', async () => {
    const { service } = serviceOver([
      { id: 'p1', key: 'hafsah-ops', displayName: 'Hafsah', functionalRole: 'CEO', active: false, userId: 'u1', grants: [] },
    ]);
    expect(await service.identify(admin)).toBeNull();
  });
});

/**
 * ONE HUMAN, ONE ROW — as far as an address can prove it.
 *
 * Found by the one board rather than by a test: the team list showed "Hafsah"
 * and "Hafsah Jumare" as two active people, because the seeded record carried
 * one address and she signed in with another. The key is made from the local
 * part, so two addresses made two keys and the key check matched neither.
 */
describe('admitting somebody who already has a record', () => {
  const source = require('fs')
    .readFileSync(require('path').join(__dirname, 'ops-people.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('looks for their address before falling back to a key made from it', () => {
    const byEmail = source.indexOf('where: { email:');
    const byKey = source.indexOf('where: { key },');
    expect(byEmail).toBeGreaterThan(-1);
    expect(byEmail).toBeLessThan(byKey);
  });

  it('and never matches on the name, which would merge two different people', () => {
    /* Merging the wrong two people silently reassigns somebody's contribution,
       which is the one mistake this system exists to make impossible. */
    expect(source).not.toMatch(/where: \{ displayName:/);
    expect(source).not.toMatch(/displayName: \{ (contains|startsWith|equals|mode)/);
  });
});
