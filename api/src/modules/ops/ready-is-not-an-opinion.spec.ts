/**
 * "Product ready" must not be typeable over the gaps that say it is not.
 *
 * Target companies board's readiness count is the number the CEO looks at to decide
 * whether September worked. Without this rule, somebody moves a use case to
 * PRODUCT_READY while three written-down gaps sit underneath it unchanged: the
 * count goes up, the gaps stay open, and the board is now reporting an opinion.
 *
 * Clearing a gap is allowed. Declaring it gone while it is still written down
 * is not — the difference is that clearing it is a claim somebody made on the
 * record.
 */
import { ForbiddenException } from '@nestjs/common';
import { OpsBuildService } from './ops-build.service';

type UseCaseRow = {
  id: string;
  title: string;
  companyId: string;
  productGap: string | null;
  uxGap: string | null;
  technicalGap: string | null;
};

const useCase: UseCaseRow = {
  id: 'u1',
  title: 'Quarterly check-in for 40 care staff',
  companyId: 'c1',
  productGap: 'No way to run one across 40 people',
  uxGap: 'Phone layout breaks below 360px',
  technicalGap: null,
};

function serviceFor(row: Partial<UseCaseRow> = {}) {
  const merged = { ...useCase, ...row };
  const written: Record<string, unknown>[] = [];
  const prisma = {
    opsClientUseCase: {
      findUnique: async () => merged,
      update: async ({ data }: never) => {
        written.push(data as Record<string, unknown>);
        return { ...merged, ...(data as object) };
      },
    },
    opsActivity: { create: async () => ({}) },
  } as never;
  return { service: new OpsBuildService(prisma), written };
}

describe('a use case with a gap recorded', () => {
  it('cannot be declared ready', async () => {
    const { service } = serviceFor();
    await expect(service.setReadiness('u1', 'PRODUCT_READY', {}, 'p1')).rejects.toThrow(ForbiddenException);
  });

  it('and the refusal names which gaps, so it is actionable', async () => {
    const { service } = serviceFor();
    await expect(service.setReadiness('u1', 'PRODUCT_READY', {}, 'p1')).rejects.toThrow(
      /product and a ux gap/,
    );
  });

  it('is still refused when only one of two is cleared', async () => {
    const { service } = serviceFor();
    await expect(service.setReadiness('u1', 'PRODUCT_READY', { uxGap: null }, 'p1')).rejects.toThrow(
      /product gap/,
    );
  });

  it('but may move to any other readiness while the gap stands', async () => {
    const { service } = serviceFor();
    await expect(service.setReadiness('u1', 'IN_PROGRESS', {}, 'p1')).resolves.toBeDefined();
  });

  it('and becomes ready once the gaps are actually cleared', async () => {
    const { service, written } = serviceFor();
    await service.setReadiness('u1', 'PRODUCT_READY', { productGap: null, uxGap: null }, 'p1');
    expect(written[0]).toMatchObject({ productReadiness: 'PRODUCT_READY', productGap: null, uxGap: null });
  });

  it('and a technical gap counts the same as the other two', async () => {
    const { service } = serviceFor({ productGap: null, uxGap: null, technicalGap: 'Their SSO is SAML 1.1' });
    await expect(service.setReadiness('u1', 'PRODUCT_READY', {}, 'p1')).rejects.toThrow(/technical gap/);
  });
});
