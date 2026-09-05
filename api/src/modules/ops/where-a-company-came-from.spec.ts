/**
 * "ADD GOOGLE FOR STARTUPS NETWORK AS ONE OF THE ATTRIBUTIONS AND WHO BROUGHT
 * IT IN, AND THEN THE COMPANIES ASSOCIATED WITH THAT NETWORK. SO THIS JUSTIFIES
 * ATTRIBUTION."
 *
 * The justification is a count: a network is worth attributing to precisely
 * because it produced more than one company. `sourceType` was free text, so
 * "Google for Startups", "google for startups network" and "GFS" were three
 * sources and the count was never available.
 *
 * A NETWORK IS NOT A PERSON, AND BOTH ARE RECORDED. Somebody brought the
 * relationship; the network brought the companies. Kept apart so both can be
 * true without either swallowing the other.
 */
import { BadRequestException } from '@nestjs/common';
import { OpsCompaniesService } from './ops-companies.service';
import {
  WHERE_COMPANIES_COME_FROM,
  isAKnownSource,
  whyThisSourceIsNotEnough,
} from './where-a-company-came-from';

describe('the ways a company reaches us', () => {
  it('include the network by name, so it can be counted', () => {
    expect(WHERE_COMPANIES_COME_FROM.map((s) => s.key)).toContain('NETWORK_GOOGLE_FOR_STARTUPS');
  });

  it('keep a door open for reality', () => {
    /* A closed list that refuses reality gets everything filed under whichever
       option is nearest — worse than free text, because it looks like data. */
    expect(isAKnownSource('OTHER')).toBe(true);
  });

  it('refuse a source nobody agreed on', () => {
    expect(isAKnownSource('gfs')).toBe(false);
  });
});

describe('a source that says nothing', () => {
  it('is refused when it is "another network"', () => {
    expect(whyThisSourceIsNotEnough('NETWORK_OTHER', '')).toMatch(/Say which one/);
  });

  it('is refused when it is "something else"', () => {
    expect(whyThisSourceIsNotEnough('OTHER', null)).toMatch(/count, not a source/);
  });

  it('is accepted once it is named', () => {
    expect(whyThisSourceIsNotEnough('NETWORK_OTHER', 'Acumen fellows')).toBeNull();
  });

  it('and a source that carries its own meaning needs no detail', () => {
    expect(whyThisSourceIsNotEnough('NETWORK_GOOGLE_FOR_STARTUPS', null)).toBeNull();
    expect(whyThisSourceIsNotEnough('INBOUND', null)).toBeNull();
  });
});

const service = () =>
  new OpsCompaniesService({
    opsCompany: { findUnique: async () => ({ id: 'c1', key: 'penda', name: 'Penda' }) },
    opsPerson: { findUnique: async () => ({ id: 'p1', key: 'sahar', displayName: 'Sahar' }) },
    opsAttribution: { findUnique: async () => null, create: async ({ data }: never) => data },
    opsActivity: { create: async () => ({}) },
  } as never);

describe('recording where a company came from', () => {
  it('takes a source from the list', async () => {
    await expect(
      service().attribute({
        companyKey: 'penda',
        contributorKey: 'sahar',
        sourceType: 'NETWORK_GOOGLE_FOR_STARTUPS',
      }),
    ).resolves.toMatchObject({ sourceType: 'NETWORK_GOOGLE_FOR_STARTUPS' });
  });

  it('refuses one that is not, rather than storing a fourth spelling', async () => {
    await expect(
      service().attribute({ companyKey: 'penda', contributorKey: 'sahar', sourceType: 'GFS' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses a network nobody named', async () => {
    await expect(
      service().attribute({ companyKey: 'penda', contributorKey: 'sahar', sourceType: 'NETWORK_OTHER' }),
    ).rejects.toThrow(/Say which one/);
  });
});
