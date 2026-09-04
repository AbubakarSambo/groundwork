/**
 * SCIM accepted a person with no email, returned 201, and the failure appeared
 * three calls later.
 *
 * `POST /scim/v2/Users` with `{ externalId, userName: "sahar@example.com",
 * displayName }` stored no email at all, because the SCIM shape puts addresses
 * in `emails[]`. Nothing went wrong until opening a check-in, which refused
 * with "that person has no email address here" - a true sentence about a call
 * made three steps earlier, with nothing pointing back at it. An integrator's
 * first instinct is that the check-in endpoint is broken.
 *
 * Found by walking the whole path as a customer for the first time, not by
 * reading either endpoint.
 *
 * THE FIX MUST NOT REINTRODUCE THE OLDER BUG. The service already has a rule
 * that absent is not null, written after a minimal deprovisioning push wiped
 * every field including the reporting line. A userName that is an email
 * therefore FILLS an empty address and never replaces one - otherwise the next
 * `{ externalId, userName, active: false }` swaps a real address for a login
 * handle, which is the same destruction wearing a different hat.
 */
import { ScimService } from './scim.service';

const ORG = 'org1';

function serviceWith(existing: { id: string; email: string | null } | null) {
  const writes: Record<string, unknown>[] = [];
  const prisma = {
    person: {
      findFirst: async () => (existing ? { ...existing, active: true, deactivatedAt: null, managerExternalId: null } : null),
      update: async ({ data }: never) => {
        writes.push(data as Record<string, unknown>);
        return { id: 'p1', ...(data as object) };
      },
      create: async ({ data }: never) => {
        writes.push(data as Record<string, unknown>);
        return { id: 'p1', ...(data as object) };
      },
    },
  } as never;
  return { service: new ScimService(prisma), writes };
}

describe('a userName that is an email address', () => {
  it('becomes the email when the person has none', async () => {
    const { service, writes } = serviceWith(null);
    await service.upsert(ORG, 'idp', {
      externalId: 'sahar',
      userName: 'sahar@example.test',
      displayName: 'Sahar',
    });
    expect(writes[0].email).toBe('sahar@example.test');
  });

  it('and is lower-cased, like every other address here', async () => {
    const { service, writes } = serviceWith(null);
    await service.upsert(ORG, 'idp', { externalId: 'x', userName: 'Sahar@Example.TEST' });
    expect(writes[0].email).toBe('sahar@example.test');
  });

  it('but never replaces an address the record already has', async () => {
    /**
     * The deprovisioning push every identity provider sends is
     * `{ externalId, userName, active: false }`. If that overwrote the email,
     * a real address would become a login handle at exactly the moment somebody
     * leaves - which is when the record matters most.
     */
    const { service, writes } = serviceWith({ id: 'p1', email: 'sahar.real@company.test' });
    await service.upsert(ORG, 'idp', { externalId: 'sahar', userName: 'sahar@login.corp', active: false });
    expect(writes[0].email).toBeUndefined();
  });

  it('and never overrides an address sent explicitly in the same push', async () => {
    const { service, writes } = serviceWith(null);
    await service.upsert(ORG, 'idp', {
      externalId: 'sahar',
      userName: 'sahar@login.corp',
      emails: [{ value: 'sahar.real@company.test', primary: true }],
    });
    expect(writes[0].email).toBe('sahar.real@company.test');
  });
});

describe('a userName that is not an email', () => {
  it('is left alone, and the person keeps having no email', async () => {
    /* A bare login handle is not an address, and inventing one would be worse
       than the absence - it would match nobody, silently, for ever. */
    const { service, writes } = serviceWith(null);
    await service.upsert(ORG, 'idp', { externalId: 'sahar', userName: 'sahar' });
    expect(writes[0].email).toBeUndefined();
  });

  it.each(['sahar', 'sahar@', '@example.test', 'sahar@example', 'two words@example.test'])(
    '"%s" is not treated as an address',
    async (userName) => {
      const { service, writes } = serviceWith(null);
      await service.upsert(ORG, 'idp', { externalId: 'x', userName });
      expect(writes[0].email).toBeUndefined();
    },
  );

  it('and an unusual but real address still counts, because the test is loose on purpose', async () => {
    /* A stricter check that rejected a real address would put us back where we
       started: a person with no email and a failure three calls later. */
    const { service, writes } = serviceWith(null);
    await service.upsert(ORG, 'idp', { externalId: 'x', userName: "o'brien+tag@sub.domain.co.uk" });
    expect(writes[0].email).toBe("o'brien+tag@sub.domain.co.uk");
  });
});
