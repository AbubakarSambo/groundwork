/**
 * A company nobody has asked about must not fall out of the count.
 *
 * "Seven of ten are product ready" is only true if the other three are named.
 * Written as "ready" and "has a use case that is not ready", a company with no
 * use case recorded at all satisfies neither test and quietly leaves the board:
 * the shortfall shrinks, and the company most at risk — the one nobody has
 * looked at — is the one that disappears.
 *
 * This asserts the partition rather than either number, so it holds however the
 * readiness rules change.
 */
import { OpsTargetCompaniesService } from './ops-target-companies.service';

const period = {
  id: 'per1',
  key: 'sept-2026-target-list',
  name: 'September target list',
  startsOn: new Date('2026-09-01'),
  endsOn: new Date('2026-09-30'),
  goal: null,
};

function serviceOver(companies: unknown[]) {
  const prisma = {
    opsPeriod: { findUnique: async () => period },
    opsCompany: { findMany: async () => companies },
  } as never;
  return new OpsTargetCompaniesService(prisma, { get: async () => 'READY' } as never);
}

const company = (name: string, useCases: Array<{ productReadiness: string }>) => ({
  id: name,
  key: name,
  name,
  stage: 'LINED_UP',
  ownerPersonId: null,
  nextAction: 'something',
  nextActionDueAt: null,
  blockerSummary: null,
  attributions: [],
  commercialOpportunities: [],
  useCases: useCases.map((u, i) => ({
    title: `use case ${i}`,
    productReadiness: u.productReadiness,
    productGap: null,
    uxGap: null,
    technicalGap: null,
  })),
  deployments: [],
});

describe('every company is either ready or named as not ready', () => {
  it('counts a ready one as ready and names nobody', async () => {
    const board = await serviceOver([company('Ready Co', [{ productReadiness: 'PRODUCT_READY' }])]).board('x');
    expect(board.counts.productReady).toBe(1);
    expect(board.counts.notProductReady).toEqual([]);
  });

  it('names one with a gap', async () => {
    const board = await serviceOver([company('Gap Co', [{ productReadiness: 'GAP_IDENTIFIED' }])]).board('x');
    expect(board.counts.productReady).toBe(0);
    expect(board.counts.notProductReady.map((r) => r.name)).toEqual(['Gap Co']);
  });

  it('names one nobody has asked about, rather than losing it', async () => {
    const board = await serviceOver([company('Unasked Co', [])]).board('x');
    expect(board.counts.productReady).toBe(0);
    expect(board.counts.notProductReady.map((r) => r.name)).toEqual(['Unasked Co']);
    expect(board.counts.notProductReady[0].why[0]).toMatch(/No use case recorded/);
  });

  it('and the two sides always add up to every company on the board', async () => {
    const board = await serviceOver([
      company('Ready Co', [{ productReadiness: 'PRODUCT_READY' }]),
      company('Gap Co', [{ productReadiness: 'GAP_IDENTIFIED' }]),
      company('Unasked Co', []),
      company('Half Co', [{ productReadiness: 'PRODUCT_READY' }, { productReadiness: 'REVIEWING' }]),
    ]).board('x');

    expect(board.counts.productReady + board.counts.notProductReady.length).toBe(board.counts.total);
  });
});
