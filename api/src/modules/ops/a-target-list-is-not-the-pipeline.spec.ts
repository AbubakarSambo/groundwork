/**
 * The only way a company joined a target list was the target list it happened to be
 * created in.
 *
 * So the short list of companies getting attention between two dates could not
 * be revised without recreating the record — which is the opposite of what a
 * list of "companies to pay special attention to" is for. It is a list you
 * change.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DEFAULT_GRANTS } from './what-somebody-may-do';
import { OpsCompaniesService } from './ops-companies.service';

const company = { id: 'c1', key: 'northwind', name: 'Northwind' };

const serviceWith = (periods: Array<Record<string, unknown>>) => {
  const writes: Record<string, unknown>[] = [];
  const logged: string[] = [];
  const service = new OpsCompaniesService({
    opsCompany: {
      findUnique: async () => company,
      update: async ({ data }: never) => {
        writes.push(data as Record<string, unknown>);
        return { ...company, ...(data as object) };
      },
    },
    opsPeriod: {
      findUnique: async ({ where }: never) =>
        periods.find((p) => p.key === (where as { key: string }).key) ?? null,
    },
    opsActivity: {
      create: async ({ data }: never) => {
        logged.push((data as { kind: string }).kind);
        return data;
      },
    },
  } as never);
  return { service, writes, logged };
};

const september = { id: 'p1', key: 'september-target-list', name: 'September target list', kind: 'TARGET_LIST' };

describe('putting a company on a target list', () => {
  it('sets the target list it belongs to', async () => {
    const { service, writes } = serviceWith([september]);
    await service.setTargetList('northwind', 'september-target-list', 'me');
    expect(writes[0]).toEqual({ targetListId: 'p1' });
  });

  it('records that somebody did it, so the list has a history', async () => {
    const { service, logged } = serviceWith([september]);
    await service.setTargetList('northwind', 'september-target-list', 'me');
    expect(logged).toContain('company_added_to_target_list');
  });

  it('refuses a quarter, because a company goes on a target list not on the calendar', async () => {
    const { service } = serviceWith([{ ...september, key: 'q4-2026', kind: 'QUARTER', name: 'Q4 2026' }]);
    await expect(service.setTargetList('northwind', 'q4-2026', 'me')).rejects.toThrow(BadRequestException);
  });

  it('says plainly when the period does not exist', async () => {
    const { service } = serviceWith([]);
    await expect(service.setTargetList('northwind', 'nope', 'me')).rejects.toThrow(NotFoundException);
  });
});

describe('taking a company off a target list', () => {
  it('clears the target list and keeps the company', async () => {
    /* A company dropped from a target list is still a company. Deleting the record
       because attention moved elsewhere would lose its whole history. */
    const { service, writes } = serviceWith([september]);
    const left = await service.setTargetList('northwind', null, 'me');
    expect(writes[0]).toEqual({ targetListId: null });
    expect(left).toMatchObject({ key: 'northwind', name: 'Northwind' });
  });

  it('records the removal separately, not as another addition', async () => {
    const { service, logged } = serviceWith([september]);
    await service.setTargetList('northwind', null, 'me');
    expect(logged).toEqual(['company_removed_from_target_list']);
  });
});

describe('who may say who is on a target list', () => {
  /**
   * FOUND BY CLICKING IT. The route was `sales:write`, so the CEO — who holds
   * `periods:write` and can start a target list — got "This needs sales:write" when
   * she tried to put a company on the one she had just started. She has given
   * `sales:write` away on purpose, and taking it back to fix this would hand her
   * the whole pipeline to solve a question about one list.
   *
   * Curating a target list is its own decision, so it is its own grant.
   */
  const SOURCE = readFileSync(join(__dirname, 'ops-target-companies.controller.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('is a capability of its own, not the pipeline write', () => {
    const route = SOURCE.slice(SOURCE.indexOf("@Patch('companies/:key/target-list')"));
    expect(route.slice(0, 200)).toContain("@NeedsOps('target-companies:curate')");
  });

  it('is held by the person who sets the target list dates', () => {
    expect(DEFAULT_GRANTS.CEO).toContain('target-companies:curate');
    expect(DEFAULT_GRANTS.CEO).toContain('periods:write');
  });

  it('and by the people who run the pipeline', () => {
    expect(DEFAULT_GRANTS.SALES_MARKETING).toContain('target-companies:curate');
  });

  it('but not by a contributor, who brings companies rather than schedules them', () => {
    expect(DEFAULT_GRANTS.CONTRIBUTOR).not.toContain('target-companies:curate');
  });

  it('and it does not carry the pipeline with it', () => {
    /* The whole point: holding this must not mean holding sales:write. */
    expect(DEFAULT_GRANTS.CEO).not.toContain('sales:write');
  });
});
