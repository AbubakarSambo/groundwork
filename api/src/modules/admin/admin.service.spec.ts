import { AdminService } from './admin.service';

/**
 * E1 guard: platform-admin bootstrap must be strictly one-time and opt-in.
 * A regression here (firing when unset, or firing again once an admin
 * already exists) would let an env var silently mint a second platform
 * admin - the exact hole POST /admin/add-admin's OTP flow is there to close.
 */
describe('AdminService - platform-admin bootstrap (E1)', () => {
  function buildService(opts: { bootstrapEmail?: string; anyAdminExists?: boolean; matchingUser?: { id: string } | null }) {
    const prisma: any = {
      user: {
        findFirst: jest.fn(async () => (opts.anyAdminExists ? { id: 'existing-admin' } : null)),
        findUnique: jest.fn(async () => opts.matchingUser ?? null),
        update: jest.fn(async (args: any) => ({ id: args.where.id, ...args.data })),
      },
    };
    const config: any = { get: jest.fn(() => opts.bootstrapEmail) };
    const email: any = {};
    return { service: new AdminService(prisma, config, email), prisma };
  }

  it('no-ops when PLATFORM_ADMIN_BOOTSTRAP_EMAIL is unset', async () => {
    const { service, prisma } = buildService({ bootstrapEmail: undefined });
    await service.onApplicationBootstrap();
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('no-ops when a platform admin already exists, even with the env var set', async () => {
    const { service, prisma } = buildService({ bootstrapEmail: 'founder@x.com', anyAdminExists: true });
    await service.onApplicationBootstrap();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('no-ops when no user matches the bootstrap email (does not create one)', async () => {
    const { service, prisma } = buildService({ bootstrapEmail: 'founder@x.com', anyAdminExists: false, matchingUser: null });
    await service.onApplicationBootstrap();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('promotes the matching user to platform admin when no admin exists yet', async () => {
    const { service, prisma } = buildService({ bootstrapEmail: 'founder@x.com', anyAdminExists: false, matchingUser: { id: 'u1' } });
    await service.onApplicationBootstrap();
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { isPlatformAdmin: true } });
  });

  it('lowercases the configured email before lookup', async () => {
    const { service, prisma } = buildService({ bootstrapEmail: 'Founder@X.com', anyAdminExists: false, matchingUser: { id: 'u1' } });
    await service.onApplicationBootstrap();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'founder@x.com' } });
  });
});
