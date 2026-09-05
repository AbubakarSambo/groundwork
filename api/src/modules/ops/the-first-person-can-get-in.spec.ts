/**
 * THE OPS SYSTEM HAD NO DOOR.
 *
 * Every route under `/ops` is guarded by a capability, a capability comes from a
 * grant, a grant belongs to an OpsPerson, and an OpsPerson is linked to an
 * account only from `/ops/people` — which is itself behind `people:admin`. So
 * the first person could never get in, and the back office answered "This is not
 * your system" to the person who owns it. `linkAccount` had existed on the
 * service for the whole time with no route pointing at it.
 *
 * Reported as: "I clicked platform ops but I can't get to my own view. I can't
 * see targets, crm, requests, moat."
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OpsDoorService } from './the-door-into-the-ops-system';

const stripped = (file: string) =>
  readFileSync(join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('where the door is', () => {
  const CONTROLLER = stripped('ops-door.controller.ts');

  it('is guarded by the platform-admin list, not by an ops capability', () => {
    /* The gate cannot be the thing being opened. */
    expect(CONTROLLER).toContain('PlatformAdminGuard');
    expect(CONTROLLER).not.toContain('NeedsOps');
  });

  it('still requires being signed in', () => {
    expect(CONTROLLER).toContain('JwtAuthGuard');
  });

  it('lives inside the ops system, so no product module imports across the line', () => {
    /*
     * The obvious home was beside the rest of the admin console. That would have
     * been a product module importing `ops/`, which
     * `the-boundary-that-must-not-move.spec.ts` refuses. A route path is not an
     * import, so it answers on /admin/ops from in here.
     */
    expect(CONTROLLER).toContain("@Controller('admin/ops')");
  });
});

const doorOver = (
  people: Array<Record<string, unknown>>,
  users: Array<{ id: string; email: string }>,
) => {
  const writes: Array<Record<string, unknown>> = [];
  const service = new OpsDoorService({
    opsPerson: {
      findMany: async () => people,
      findUnique: async ({ where }: never) => {
        const w = where as { key?: string; userId?: string };
        return (
          people.find((p) => (w.key ? p.key === w.key : p.userId === w.userId)) ?? null
        );
      },
      update: async ({ data }: never) => {
        writes.push(data as Record<string, unknown>);
        return {};
      },
    },
    user: {
      findMany: async () => users,
      findUnique: async ({ where }: never) =>
        users.find((u) => u.email === (where as { email: string }).email) ?? null,
    },
  } as never);
  return { service, writes };
};

const hafsah = { id: 'p1', key: 'hafsah', displayName: 'Hafsah Jumare', functionalRole: 'CEO', active: true, userId: null };

describe('how things stand', () => {
  it('says plainly when nobody can open it', async () => {
    const { service } = doorOver([hafsah], []);
    const state = await service.howThingsStand();
    expect(state.isSetUp).toBe(true);
    expect(state.nobodyCanOpenIt).toBe(true);
  });

  it('says it is not set up at all when there is no team', async () => {
    const { service } = doorOver([], []);
    const state = await service.howThingsStand();
    expect(state.isSetUp).toBe(false);
  });

  it('shows the address, never the user id, because an id cannot be checked by eye', async () => {
    const { service } = doorOver(
      [{ ...hafsah, userId: 'u1' }],
      [{ id: 'u1', email: 'hafsah.jumare@coamana.com' }],
    );
    const state = await service.howThingsStand();
    expect(state.people[0].linkedAccount).toBe('hafsah.jumare@coamana.com');
    expect(state.nobodyCanOpenIt).toBe(false);
  });

  it('and an inactive person does not count as somebody who can open it', async () => {
    const { service } = doorOver(
      [{ ...hafsah, userId: 'u1', active: false }],
      [{ id: 'u1', email: 'gone@coamana.com' }],
    );
    expect((await service.howThingsStand()).nobodyCanOpenIt).toBe(true);
  });
});

describe('connecting an account', () => {
  const users = [{ id: 'u1', email: 'hafsah.jumare@coamana.com' }];

  it('writes the link', async () => {
    const { service, writes } = doorOver([hafsah], users);
    await service.link('hafsah', 'hafsah.jumare@coamana.com');
    expect(writes[0]).toEqual({ userId: 'u1' });
  });

  it('matches however they typed it, because addresses are stored lowercased', async () => {
    const { service, writes } = doorOver([hafsah], users);
    await service.link('hafsah', '  Hafsah.Jumare@Coamana.com ');
    expect(writes[0]).toEqual({ userId: 'u1' });
  });

  it('says the account has to exist first, rather than inventing one', async () => {
    const { service } = doorOver([hafsah], users);
    await expect(service.link('hafsah', 'nobody@coamana.com')).rejects.toThrow(NotFoundException);
    await expect(service.link('hafsah', 'nobody@coamana.com')).rejects.toThrow(/sign up and verify/);
  });

  it('refuses an address that already opens the system as somebody else, by name', async () => {
    const taken = [
      { ...hafsah, userId: 'u1' },
      { id: 'p2', key: 'sahar', displayName: 'Sahar', functionalRole: 'SALES_MARKETING', active: true, userId: null },
    ];
    const { service } = doorOver(taken, users);
    await expect(service.link('sahar', 'hafsah.jumare@coamana.com')).rejects.toThrow(
      /already Hafsah Jumare's account/,
    );
  });

  it('needs an address at all', async () => {
    const { service } = doorOver([hafsah], users);
    await expect(service.link('hafsah', '')).rejects.toThrow(BadRequestException);
  });

  it('says plainly when there is no such person', async () => {
    const { service } = doorOver([hafsah], users);
    await expect(service.link('nobody', 'hafsah.jumare@coamana.com')).rejects.toThrow(NotFoundException);
  });
});

describe('disconnecting an account', () => {
  it('removes the way in and keeps the person', async () => {
    const { service, writes } = doorOver(
      [{ ...hafsah, userId: 'u1' }],
      [{ id: 'u1', email: 'hafsah.jumare@coamana.com' }],
    );
    await service.unlink('hafsah');
    expect(writes[0]).toEqual({ userId: null });
  });
});
