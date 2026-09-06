import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CredentialsService } from './credentials.service';

/**
 * ROTATING A CREDENTIAL BY HAND HAD A TRAP IN IT.
 *
 * There is no rotate and there should not be: the secret is hashed the moment it is made, so
 * nothing can hand back a new one for an existing pair. Rotating is issue, deploy, revoke.
 *
 * The trap is that the roster is keyed on the credential's source system, which is derived from
 * its NAME when nobody says otherwise. So a replacement called "Workday sync (new)" is a different
 * system, and the next sync creates a second copy of every person — the duplication that was fixed
 * this morning, walking back in through the front door of the console.
 */
function service(rows: any[] = []) {
  const store = [...rows];
  const prisma: any = {
    apiCredential: {
      findFirst: jest.fn(async ({ where }: any) => store.find((r) => r.clientId === where.clientId) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `c${store.length + 1}`, revokedAt: null, replacedByClientId: null, ...data };
        store.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = store.find((r) => r.id === where.id);
        Object.assign(row, data);
        return row;
      }),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
  };
  return { service: new CredentialsService(prisma), store, prisma };
}

const live = (over: any = {}) => ({
  id: 'c1',
  clientId: 'gwc_original',
  name: 'Workday sync',
  scopes: ['graph:write'],
  sourceSystem: 'workday-sync',
  boundToPersonExternalIds: ['e1'],
  revokedAt: null,
  replacedByClientId: null,
  ...over,
});

describe('replacing a credential', () => {
  it('the successor speaks for the same system, whatever anybody types', () => {
    /* The whole reason this exists rather than "issue another one and remember the name". */
    const { service: s, store } = service([live()]);
    return s.replace('org-a', 'gwc_original', 'u1').then(() => {
      const made = store[1];
      expect(made.sourceSystem).toBe('workday-sync');
      expect(made.clientId).not.toBe('gwc_original');
    });
  });

  it('including one whose source system is nothing like its name', async () => {
    /*
     * THE CASE THAT MATTERS, and the one my first version of this test could not see: every
     * credential issued before the source system was split from the client id was backfilled with
     * its own client id, because that is what its people were written under. Re-deriving from the
     * name would give "workday-sync" and orphan the entire roster it has been pushing for months.
     */
    const { service: s2, store } = service([live({ sourceSystem: 'gwc_1a04a0f4fb387c54' })]);
    await s2.replace('org-a', 'gwc_original', 'u1');
    expect(store[1].sourceSystem).toBe('gwc_1a04a0f4fb387c54');
  });

  it('and carries the scopes and the fence, so it is the same integration', async () => {
    const { service: s, store } = service([live()]);
    await s.replace('org-a', 'gwc_original', 'u1');
    expect(store[1].scopes).toEqual(['graph:write']);
    expect(store[1].boundToPersonExternalIds).toEqual(['e1']);
    expect(store[1].name).toBe('Workday sync');
  });

  it('does NOT revoke the old one, because the integration is still using it', async () => {
    /* Between issuing and deploying there is a person going away to change a config file. Cutting
       the old one off here makes every rotation an outage, which is why nobody rotates. */
    const { service: s, store } = service([live()]);
    await s.replace('org-a', 'gwc_original', 'u1');
    expect(store[0].revokedAt).toBeNull();
  });

  it('but marks it, so the page can ask for the second step', async () => {
    const { service: s, store } = service([live()]);
    const issued: any = await s.replace('org-a', 'gwc_original', 'u1');
    expect(store[0].replacedByClientId).toBe(issued.clientId);
    expect(issued.replaces).toBe('gwc_original');
    expect(issued.says).toContain('revoke the old one');
  });

  it('refuses to replace one that is already revoked', async () => {
    const { service: s } = service([live({ revokedAt: new Date() })]);
    await expect(s.replace('org-a', 'gwc_original', 'u1')).rejects.toThrow(BadRequestException);
  });

  it('and refuses to replace one twice, naming what took over', async () => {
    const { service: s } = service([live({ replacedByClientId: 'gwc_second' })]);
    await expect(s.replace('org-a', 'gwc_original', 'u1')).rejects.toThrow(/gwc_second/);
  });

  it('and one that is not there at all', async () => {
    const { service: s } = service([]);
    await expect(s.replace('org-a', 'gwc_nothing', 'u1')).rejects.toThrow(NotFoundException);
  });

  it('hands the secret back once, like every other issue', async () => {
    const { service: s } = service([live()]);
    const issued: any = await s.replace('org-a', 'gwc_original', 'u1');
    expect(issued.clientSecret).toMatch(/^gws_/);
  });
});
