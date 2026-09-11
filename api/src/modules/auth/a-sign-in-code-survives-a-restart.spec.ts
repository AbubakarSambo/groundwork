import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * A SIGN-IN CODE SURVIVES A RESTART, AND A SECOND INSTANCE.
 *
 * The Google callback hands the browser a sixty-second code in place of the JWT. It lived in a Map
 * inside one process, so a deploy between callback and redirect - or a second instance taking the
 * redeem - said "Invalid or expired exchange code" to somebody who had done nothing wrong. Two
 * service instances sharing one store stand in for two processes here.
 */
function aStore() {
  const rows = new Map<string, { id: string; code: string; token: string; expiresAt: Date }>();
  let n = 0;
  const prisma: any = {
    oAuthExchangeCode: {
      create: jest.fn(async ({ data }: any) => { const row = { id: `r${++n}`, ...data }; rows.set(data.code, row); return row; }),
      findUnique: jest.fn(async ({ where }: any) => rows.get(where.code) ?? null),
      deleteMany: jest.fn(async ({ where }: any) => {
        const hit = [...rows.values()].find((r) => r.id === where.id);
        if (!hit) return { count: 0 };
        rows.delete(hit.code);
        return { count: 1 };
      }),
    },
  };
  return { prisma, rows };
}
const anInstance = (prisma: any) => new AuthService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);

describe('the exchange code', () => {
  it('written by one instance is redeemed by another, once', async () => {
    const { prisma } = aStore();
    const a = anInstance(prisma);
    const b = anInstance(prisma);
    const code = await a.createOAuthExchangeCode('jwt-1');
    await expect(b.redeemOAuthExchangeCode(code)).resolves.toEqual({ accessToken: 'jwt-1' });
    await expect(b.redeemOAuthExchangeCode(code)).rejects.toThrow(BadRequestException);
  });

  it('tells a wrong code from a slow one', async () => {
    const { prisma, rows } = aStore();
    const svc = anInstance(prisma);
    await expect(svc.redeemOAuthExchangeCode('never-issued')).rejects.toThrow('not a sign-in code we issued');
    const code = await svc.createOAuthExchangeCode('jwt-2');
    rows.get(code)!.expiresAt = new Date(Date.now() - 1);
    await expect(svc.redeemOAuthExchangeCode(code)).rejects.toThrow('has expired');
    /* And an expired code is gone once it has been tried, not left to be tried again. */
    expect(rows.has(code)).toBe(false);
  });

  it('is a row with a minute to live', async () => {
    const { prisma, rows } = aStore();
    const before = Date.now();
    const code = await anInstance(prisma).createOAuthExchangeCode('jwt-3');
    const row = rows.get(code)!;
    expect(row.expiresAt.getTime() - before).toBeGreaterThanOrEqual(AuthService.AN_EXCHANGE_CODE_LASTS_MS - 50);
    expect(row.expiresAt.getTime() - before).toBeLessThanOrEqual(AuthService.AN_EXCHANGE_CODE_LASTS_MS + 1000);
  });
});
