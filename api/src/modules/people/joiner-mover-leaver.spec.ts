import { ScimService } from './scim.service';
import { BadRequestException } from '@nestjs/common';

/**
 * THREE CASES, AND ONLY THE FIRST IS EASY.
 *
 * A joiner is a create and works on the first try. A mover and a leaver are where a roster quietly
 * goes wrong, and both failures are silent: nothing errors, a 200 comes back, and the record is
 * wrong in a way nobody looks at until it matters.
 *
 * Every property here was found by driving the running server and reading the record back, not by a
 * test failing - because none of them failed.
 */
function svc(seed: any[] = []) {
  const rows = [...seed];
  const prisma: any = {
    person: {
      findFirst: jest.fn(async ({ where }: any) =>
        rows.find((r) => r.organizationId === where.organizationId && r.sourceSystem === where.sourceSystem && r.externalId === where.externalId) ?? null,
      ),
      findMany: jest.fn(async () => rows),
      create: jest.fn(async ({ data }: any) => { const r = { id: `p${rows.length}`, ...data }; rows.push(r); return r; }),
      update: jest.fn(async ({ where, data }: any) => {
        const r = rows.find((x) => x.id === where.id);
        Object.assign(r, data);
        return r;
      }),
    },
  };
  return { service: new ScimService(prisma), prisma, rows };
}

const FULL = {
  externalId: 'u-8842',
  userName: 'naomi@x.test',
  displayName: 'Naomi Osei',
  name: { givenName: 'Naomi', familyName: 'Osei' },
  emails: [{ value: 'Naomi@X.test', primary: true }],
  title: 'Account Lead',
  timezone: 'Africa/Lagos',
  active: true,
  'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
    department: 'Commercial',
    manager: { value: 'u-100' },
  },
} as any;

describe('a joiner', () => {
  it('is created, with the reporting line and timezone off the enterprise extension', async () => {
    const { service } = svc();
    const { row, created } = await service.upsert('org1', 'idp', FULL);
    expect(created).toBe(true);
    expect(row.managerExternalId).toBe('u-100');
    expect(row.timezone).toBe('Africa/Lagos');
    expect(row.department).toBe('Commercial');
    expect(row.email).toBe('naomi@x.test');
  });

  it('needs an externalId, because that is what makes them the same person next time', async () => {
    const { service } = svc();
    await expect(service.upsert('org1', 'idp', { userName: 'x' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('a mover is not a new person', () => {
  it('a changed manager, title and name update one record', async () => {
    /* THE FAILURE THIS PREVENTS: treating a promotion as a new joiner orphans everything attached
       to the old record and shows the same human on the roster twice. */
    const { service, rows } = svc();
    await service.upsert('org1', 'idp', FULL);
    const { row, created } = await service.upsert('org1', 'idp', {
      ...FULL,
      title: 'Head of Accounts',
      displayName: 'Naomi Osei-Mensah',
      'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': { department: 'Commercial', manager: { value: 'u-200' } },
    } as any);

    expect(created).toBe(false);
    expect(rows).toHaveLength(1);
    expect(row.managerExternalId).toBe('u-200');
    expect(row.title).toBe('Head of Accounts');
  });

  it('identity is the org, the source system and the external id, and nothing else', async () => {
    /* So a person who changes their name, their email and their whole team is still one person. */
    const { service, rows } = svc();
    await service.upsert('org1', 'idp', FULL);
    await service.upsert('org1', 'idp', {
      externalId: 'u-8842', userName: 'n.osei-mensah@x.test',
      emails: [{ value: 'n.osei-mensah@x.test', primary: true }],
    } as any);
    expect(rows).toHaveLength(1);
  });
});

describe('a partial payload does not empty the record', () => {
  it('an omitted field is left alone', async () => {
    /*
     * THE ONE THAT SHIPPED AND WAS CAUGHT BY READING THE RECORD BACK.
     *
     * An IdP sending { externalId, userName, active: false } on deprovisioning - an entirely
     * ordinary payload - wiped the display name, email, title, department, timezone and MANAGER.
     * The manager is the whole of the mover case, destroyed at exactly the moment it matters most,
     * because a departure is when the reporting line is needed for the handover.
     */
    const { service } = svc();
    await service.upsert('org1', 'idp', FULL);
    const { row } = await service.upsert('org1', 'idp', { externalId: 'u-8842', userName: 'naomi@x.test', active: false } as any);

    expect(row.displayName).toBe('Naomi Osei');
    expect(row.managerExternalId).toBe('u-100');
    expect(row.timezone).toBe('Africa/Lagos');
    expect(row.title).toBe('Account Lead');
    expect(row.active).toBe(false);
  });

  it('but an explicit null still clears, because the sender said so', async () => {
    const { service } = svc();
    await service.upsert('org1', 'idp', FULL);
    const { row } = await service.upsert('org1', 'idp', { externalId: 'u-8842', userName: 'naomi@x.test', title: null } as any);
    expect(row.title).toBeNull();
    expect(row.managerExternalId).toBe('u-100');
  });
});

describe('a leaver', () => {
  it('is deactivated, never deleted', async () => {
    /* Their check-ins are the substrate for every finding about the objectives they touched. A hard
       delete guts the record and leaves a set of conclusions about nobody. */
    const { service, rows } = svc();
    await service.upsert('org1', 'idp', FULL);
    await service.upsert('org1', 'idp', { ...FULL, active: false });
    expect(rows).toHaveLength(1);
    expect(rows[0].active).toBe(false);
    expect(rows[0].deactivatedAt).toBeInstanceOf(Date);
  });

  it('keeps the date it FIRST left, across every later resync', async () => {
    /*
     * An IdP re-sends full user records on every sync, so a person deactivated in March arrives as
     * inactive again in April and again in May. Restamping moves the departure forward each time -
     * and the retention window and the handover brief are both measured from it, so a leaver would
     * never age out and their handover would keep regenerating.
     */
    const { service, rows } = svc();
    await service.upsert('org1', 'idp', FULL);
    await service.upsert('org1', 'idp', { ...FULL, active: false });
    const first = rows[0].deactivatedAt;
    await service.upsert('org1', 'idp', { ...FULL, active: false });
    await service.upsert('org1', 'idp', { ...FULL, active: false });
    expect(rows[0].deactivatedAt).toBe(first);
  });

  it('a rehire clears the date rather than leaving them permanently gone', async () => {
    const { service, rows } = svc();
    await service.upsert('org1', 'idp', { ...FULL, active: false });
    await service.upsert('org1', 'idp', { ...FULL, active: true });
    expect(rows[0].active).toBe(true);
    expect(rows[0].deactivatedAt).toBeNull();
  });

  it('the PATCH an IdP actually sends works, in both shapes', async () => {
    const { service, rows } = svc();
    await service.upsert('org1', 'idp', FULL);
    await service.patch('org1', 'idp', 'u-8842', { Operations: [{ op: 'replace', path: 'active', value: false }] });
    expect(rows[0].active).toBe(false);
    await service.patch('org1', 'idp', 'u-8842', { Operations: [{ op: 'replace', value: { active: true } }] });
    expect(rows[0].active).toBe(true);
  });

  it('refuses a PATCH path it does not understand rather than returning 200 and doing nothing', async () => {
    /* A half-implemented PATCH grammar is worse than none: the IdP sends something valid, gets a
       200, and silently nothing happens. */
    const { service } = svc();
    await service.upsert('org1', 'idp', FULL);
    await expect(service.patch('org1', 'idp', 'u-8842', { Operations: [{ op: 'replace', path: 'emails[type eq "work"].value', value: 'x' }] }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('resolving people to subjects', () => {
  it('looks org-wide, not within one source system', async () => {
    /*
     * People come from the identity provider; objectives come from the OKR tool. The id an
     * objective uses for its owner is the IDENTITY system's id, so filtering people by the
     * objective's source system compares an OKR tool's name against an IdP's and resolves nothing,
     * ever. Caught before shipping; it would have reported every owner in the estate as unresolved.
     */
    const { service, prisma } = svc();
    await service.resolve('org1', ['u-1']);
    expect(prisma.person.findMany.mock.calls[0][0].where).toEqual({
      organizationId: 'org1',
      externalId: { in: ['u-1'] },
    });
  });
});
