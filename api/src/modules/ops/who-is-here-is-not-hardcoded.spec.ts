/**
 * "DO NOT HARD CODE THE NAMES. IF JAMES OR SAHAR OR ADAM CHOOSE NOT TO TAKE THE
 * ROLE, OR IF WE SWITCH ROLES, THEN WE CAN PUT THE RIGHT PEOPLE."
 *
 * Two things were wrong, and only one of them was visible.
 *
 * The visible one: there was no way to change what somebody does. A person
 * could be added, granted, revoked and marked as gone — but their role was
 * fixed at the moment they were created, so switching two people's jobs meant
 * deleting one of them.
 *
 * The invisible one: the seed re-asserted `displayName` and `functionalRole` on
 * every run. So a role changed on the team page was silently put back the next
 * time the seed ran, and the person who changed it would find it changed back
 * with nothing to say why. The same shape as the target list that used to be
 * re-dated by the seed.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { OpsPeopleService } from './ops-people.service';
import { DEFAULT_GRANTS, everyRole, WHAT_A_ROLE_IS_CALLED } from './what-somebody-may-do';

const stripped = (file: string) =>
  readFileSync(join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('the seed', () => {
  const SEED = stripped('seed-the-foundations.ts');

  it('names no human and creates nobody: the team is data', () => {
    /* 10 Sep 2026, "no hard coding": the seed used to carry six people by name. Now it asks the
       table who holds a role and skips what has no holder yet. */
    for (const name of ['Hafsah', 'Sahar', 'James', 'Adam', 'Nate', 'Abubakar']) {
      expect(SEED).not.toContain(name);
    }
    expect(SEED).not.toMatch(/opsPerson\.(create|upsert)\(/);
    expect(SEED).toMatch(/holderOf\(/);
  });

  it('does not put a changed role or name back', () => {
    expect(SEED).not.toMatch(/update: \{[^}]*functionalRole/);
    expect(SEED).not.toMatch(/update: \{[^}]*displayName/);
  });
});

describe('the roles', () => {
  it('are one list, read from the grants they key on', () => {
    expect(everyRole().map((r) => r.role)).toEqual(Object.keys(DEFAULT_GRANTS));
  });

  it('each carry a name somebody would use', () => {
    for (const { role, label } of everyRole()) {
      expect(label).toBe(WHAT_A_ROLE_IS_CALLED[role]);
      expect(label).not.toMatch(/_/);
    }
  });

  it('name no human anywhere', () => {
    /* A role says what somebody does. Who does it is a row. */
    const source = stripped('what-somebody-may-do.ts');
    for (const name of ['Hafsah', 'Sahar', 'James', 'Adam', 'Nate', 'Abubakar']) {
      expect(source).not.toContain(name);
    }
  });
});

const serviceFor = (person: Record<string, unknown>) => {
  const writes: Record<string, unknown>[] = [];
  const grants: Array<{ capability: string }> = [];
  const service = new OpsPeopleService({
    opsPerson: {
      findUnique: async () => person,
      update: async ({ data }: never) => {
        writes.push(data as Record<string, unknown>);
        return { ...person, ...(data as object) };
      },
    },
    opsGrant: {
      createMany: async ({ data }: never) => {
        const rows = data as Array<{ capability: string }>;
        grants.push(...rows);
        return { count: rows.length };
      },
    },
  } as never);
  return { service, writes, grants };
};

const sahar = { id: 'p1', key: 'sahar', displayName: 'Sahar', functionalRole: 'SALES_MARKETING' };

describe('changing what somebody does', () => {
  it('changes the role', async () => {
    const { service, writes } = serviceFor(sahar);
    await service.changeRole('sahar', 'PRODUCT_TECH_LEAD');
    expect(writes[0]).toEqual({ functionalRole: 'PRODUCT_TECH_LEAD' });
  });

  it('gives them what the new role comes with', async () => {
    const { service, grants } = serviceFor(sahar);
    await service.changeRole('sahar', 'PRODUCT_TECH_LEAD');
    expect(grants.map((g) => g.capability)).toEqual([...DEFAULT_GRANTS.PRODUCT_TECH_LEAD]);
  });

  it('takes nothing away, and says so', async () => {
    /*
     * Whether she keeps sales:write when she takes over product is a decision
     * somebody should make on purpose. Stripping it here would make it a side
     * effect of a dropdown.
     */
    const { service } = serviceFor(sahar);
    const result = await service.changeRole('sahar', 'PRODUCT_TECH_LEAD');
    expect(result.says).toMatch(/Nothing was taken away/);
  });

  it('says what they were, so the change is readable afterwards', async () => {
    const { service } = serviceFor(sahar);
    expect(await service.changeRole('sahar', 'TECH')).toMatchObject({
      was: 'SALES_MARKETING',
      functionalRole: 'TECH',
    });
  });

  it('refuses a role that does not exist', async () => {
    const { service } = serviceFor(sahar);
    await expect(service.changeRole('sahar', 'FOUNDER' as never)).rejects.toThrow(BadRequestException);
  });
});
