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

/**
 * `suggestions.thresholds` had a reader and no writer (a-setting-has-a-way-to-be-set.spec.ts, week
 * 10). This is that writer: refuses anything that is not the documented shape, and, like
 * coaching_live and the correction window, upserts the platform_settings row.
 *
 * Two of these tests changed for decision 61 (30 September 2026), and say why in place:
 *   - "reads as empty when nothing has been set" used to be true for every verdict, support
 *     included. Decision 61 sets a real default for support from day one (thresholds.ts,
 *     DEFAULT_SUGGESTION_THRESHOLDS); a database with no row at all now reads that default back,
 *     not `{}`. In practice a migration seeds the row so this case should not arise, but the read
 *     falls back to it properly if it ever does.
 *   - Every read now carries `labels`, the plain words for `keptBelow` and `overPeriods` that the
 *     admin page shows instead of the field names (decision 61: "'over periods' is called 'at
 *     least this many settled commitments'").
 */
describe('AdminService - suggestion thresholds (week 10 writer)', () => {
  function buildService(storedValue?: unknown) {
    const prisma: any = {
      platformSetting: {
        findUnique: jest.fn(async () => (storedValue === undefined ? null : { value: storedValue })),
        upsert: jest.fn(async (args: any) => ({ key: args.where.key, value: args.create.value })),
      },
    };
    return { service: new AdminService(prisma, {} as any, {} as any), prisma };
  }

  const LABELS = {
    keptBelow: 'Suggest extra support when fewer than this share of commitments were kept',
    overPeriods: 'At least this many settled commitments',
  };

  it('reads the decision 61 default when there is no row at all: support is set from the start, everything else is empty', async () => {
    const { service } = buildService();
    expect(await service.getSuggestionThresholds()).toEqual({
      thresholds: { support: { keptBelow: 0.5, overPeriods: 6 } },
      labels: LABELS,
    });
  });

  it('reads an empty row exactly as an admin left it, not the default: a row that exists is never overwritten by a default', async () => {
    const { service } = buildService({});
    expect(await service.getSuggestionThresholds()).toEqual({ thresholds: {}, labels: LABELS });
  });

  it('reads back what was stored', async () => {
    const { service } = buildService({ support: { keptBelow: 0.6, overPeriods: 4 } });
    expect(await service.getSuggestionThresholds()).toEqual({
      thresholds: { support: { keptBelow: 0.6, overPeriods: 4 } },
      labels: LABELS,
    });
  });

  it('writes a valid set of thresholds', async () => {
    const { service, prisma } = buildService();
    const thresholds = { support: { keptBelow: 0.6, overPeriods: 4 }, exit: { keptBelow: 0.3, overPeriods: 6 } };
    const result = await service.setSuggestionThresholds(thresholds, 'admin-1');
    expect(result).toEqual({ thresholds });
    expect(prisma.platformSetting.upsert).toHaveBeenCalledWith({
      where: { key: 'suggestions.thresholds' },
      create: { key: 'suggestions.thresholds', value: thresholds, updatedBy: 'admin-1' },
      update: { value: thresholds, updatedBy: 'admin-1' },
    });
  });

  it('refuses a bad shape with a plain sentence, and writes nothing', async () => {
    const { service, prisma } = buildService();
    await expect(service.setSuggestionThresholds({ support: { keptBelow: 0 } }, 'admin-1')).rejects.toThrow(
      /keptBelow.*overPeriods/is,
    );
    expect(prisma.platformSetting.upsert).not.toHaveBeenCalled();
  });

  it('refuses an unknown verdict key', async () => {
    const { service, prisma } = buildService();
    await expect(service.setSuggestionThresholds({ retire: { keptBelow: 0.6, overPeriods: 4 } }, 'admin-1')).rejects.toThrow();
    expect(prisma.platformSetting.upsert).not.toHaveBeenCalled();
  });
});
