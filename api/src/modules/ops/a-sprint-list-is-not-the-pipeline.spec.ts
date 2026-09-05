/**
 * The only way a company joined a sprint was the sprint it happened to be
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

const company = { id: 'c1', key: 'afrimash', name: 'Afrimash' };

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

const september = { id: 'p1', key: 'september-sprint', name: 'September sprint', kind: 'SPRINT' };

describe('putting a company on a sprint', () => {
  it('sets the sprint it belongs to', async () => {
    const { service, writes } = serviceWith([september]);
    await service.setSprint('afrimash', 'september-sprint', 'me');
    expect(writes[0]).toEqual({ sprintPeriodId: 'p1' });
  });

  it('records that somebody did it, so the list has a history', async () => {
    const { service, logged } = serviceWith([september]);
    await service.setSprint('afrimash', 'september-sprint', 'me');
    expect(logged).toContain('company_added_to_sprint');
  });

  it('refuses a quarter, because a company goes on a sprint not on the calendar', async () => {
    const { service } = serviceWith([{ ...september, key: 'q4-2026', kind: 'QUARTER', name: 'Q4 2026' }]);
    await expect(service.setSprint('afrimash', 'q4-2026', 'me')).rejects.toThrow(BadRequestException);
  });

  it('says plainly when the period does not exist', async () => {
    const { service } = serviceWith([]);
    await expect(service.setSprint('afrimash', 'nope', 'me')).rejects.toThrow(NotFoundException);
  });
});

describe('taking a company off a sprint', () => {
  it('clears the sprint and keeps the company', async () => {
    /* A company dropped from a sprint is still a company. Deleting the record
       because attention moved elsewhere would lose its whole history. */
    const { service, writes } = serviceWith([september]);
    const left = await service.setSprint('afrimash', null, 'me');
    expect(writes[0]).toEqual({ sprintPeriodId: null });
    expect(left).toMatchObject({ key: 'afrimash', name: 'Afrimash' });
  });

  it('records the removal separately, not as another addition', async () => {
    const { service, logged } = serviceWith([september]);
    await service.setSprint('afrimash', null, 'me');
    expect(logged).toEqual(['company_removed_from_sprint']);
  });
});

describe('who may say who is on a sprint', () => {
  /**
   * FOUND BY CLICKING IT. The route was `sales:write`, so the CEO — who holds
   * `periods:write` and can start a sprint — got "This needs sales:write" when
   * she tried to put a company on the one she had just started. She has given
   * `sales:write` away on purpose, and taking it back to fix this would hand her
   * the whole pipeline to solve a question about one list.
   *
   * Curating a sprint is its own decision, so it is its own grant.
   */
  const SOURCE = readFileSync(join(__dirname, 'ops-sprint.controller.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('is a capability of its own, not the pipeline write', () => {
    const route = SOURCE.slice(SOURCE.indexOf("@Patch('companies/:key/sprint')"));
    expect(route.slice(0, 200)).toContain("@NeedsOps('sprint:curate')");
  });

  it('is held by the person who sets the sprint dates', () => {
    expect(DEFAULT_GRANTS.CEO).toContain('sprint:curate');
    expect(DEFAULT_GRANTS.CEO).toContain('periods:write');
  });

  it('and by the people who run the pipeline', () => {
    expect(DEFAULT_GRANTS.SALES_MARKETING).toContain('sprint:curate');
  });

  it('but not by a contributor, who brings companies rather than schedules them', () => {
    expect(DEFAULT_GRANTS.CONTRIBUTOR).not.toContain('sprint:curate');
  });

  it('and it does not carry the pipeline with it', () => {
    /* The whole point: holding this must not mean holding sales:write. */
    expect(DEFAULT_GRANTS.CEO).not.toContain('sales:write');
  });
});
