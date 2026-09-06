/**
 * ROTATING A CREDENTIAL USED TO DUPLICATE EVERY PERSON IN THE ORGANISATION.
 *
 * `Person` is keyed on `(organizationId, sourceSystem, externalId)`, and `sourceSystem` was being
 * given the credential's `clientId` — which is freshly random on every issue. So the most ordinary
 * security housekeeping there is changed the identity of everybody, the next sync matched nothing,
 * and a second copy of the whole roster was created with `created: true` on every row. Nothing
 * failed and nothing warned.
 *
 * The first test is that rotation. The rest hold the pieces that make it stay fixed.
 */
import * as fs from 'fs';
import * as path from 'path';
import { CredentialsService } from '../public-api/credentials.service';
import {
  fromTheCredentialName,
  whyThisIsNotASourceSystem,
  whoExistsTwice,
  howItReads,
} from './whose-roster-is-this';

const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

describe('a replaced credential speaks for the same system', () => {
  it('two credentials named the same thing key the roster the same way', () => {
    /* The rotation: revoke "Workday sync", issue "Workday sync". Two different client ids, one
       source system, one roster. */
    expect(fromTheCredentialName('Workday sync')).toBe(fromTheCredentialName('Workday sync'));
    expect(fromTheCredentialName('Workday sync')).toBe('workday-sync');
  });

  it('and it is never the client id, which is what went wrong', () => {
    const source = fromTheCredentialName('Workday sync');
    expect(source).not.toMatch(/^gwc_/);
  });

  it('names that cannot be slugged still key somewhere rather than nowhere', () => {
    /* An empty source system would key every person in the organisation under nothing, which is
       the same collision by a different route. */
    expect(fromTheCredentialName('!!!')).toBe('roster');
    expect(fromTheCredentialName('')).toBe('roster');
  });

  it('refuses a source system somebody cannot type twice', () => {
    expect(whyThisIsNotASourceSystem('Workday Sync')).toContain('lower-case');
    expect(whyThisIsNotASourceSystem('')).toContain('needs a name');
    expect(whyThisIsNotASourceSystem('a')).not.toBeNull();
    expect(whyThisIsNotASourceSystem('workday')).toBeNull();
    expect(whyThisIsNotASourceSystem('our-hris-2')).toBeNull();
  });
});

describe('who exists twice', () => {
  const day = (n: number) => new Date(2026, 0, n);

  it('finds somebody written under two systems', () => {
    const found = whoExistsTwice([
      { externalId: 'e1', sourceSystem: 'gwc_old', createdAt: day(1) },
      { externalId: 'e1', sourceSystem: 'gwc_new', createdAt: day(2) },
      { externalId: 'e2', sourceSystem: 'gwc_old', createdAt: day(1) },
    ]);
    expect(found).toEqual([{ externalId: 'e1', under: ['gwc_old', 'gwc_new'] }]);
  });

  it('oldest first, so whoever decides can see which copy came from the rotation', () => {
    const found = whoExistsTwice([
      { externalId: 'e1', sourceSystem: 'newer', createdAt: day(9) },
      { externalId: 'e1', sourceSystem: 'older', createdAt: day(1) },
    ]);
    expect(found[0].under).toEqual(['older', 'newer']);
  });

  it('is not confused by one system holding somebody twice', () => {
    /* Cannot happen through the unique key, and if it ever did it is not this problem. */
    expect(whoExistsTwice([
      { externalId: 'e1', sourceSystem: 'workday', createdAt: day(1) },
      { externalId: 'e1', sourceSystem: 'workday', createdAt: day(2) },
    ])).toEqual([]);
  });

  it('says nothing is wrong when nothing is', () => {
    expect(howItReads([])).toContain('Nobody in this organisation');
  });

  it('names people rather than counting them, and says what it will not do', () => {
    const said = howItReads([{ externalId: 'e1', under: ['a', 'b'] }]);
    expect(said).toContain('e1');
    expect(said).toContain('Nothing is merged automatically');
  });

  it('and never merges anything itself', () => {
    /* Merging decides which record keeps somebody's objectives and which account is theirs. */
    const source = withoutComments('whose-roster-is-this.ts');
    expect(source).not.toMatch(/delete|deleteMany|update|prisma/i);
  });
});

describe('what the wiring has to keep doing', () => {
  const guard = withoutComments('../public-api/machine-token.guard.ts');
  const controller = withoutComments('../public-api/public-api.controller.ts');
  const credentials = withoutComments('../public-api/credentials.service.ts');
  const scim = withoutComments('scim.service.ts');

  it('SCIM is keyed on the source system, never on the client id', () => {
    for (const call of ['scim.upsert', 'scim.patch', 'scim.get']) {
      const at = controller.indexOf(call);
      if (at === -1) continue;
      const line = controller.slice(at, controller.indexOf(')', at));
      expect(line).not.toContain('clientId');
    }
    expect(controller).toContain('req.machine.sourceSystem');
    expect(controller).not.toContain('req.machine.clientId');
  });

  it('the token carries the system, and an old token falls back to the client id', () => {
    expect(controller).toContain('src: cred.sourceSystem');
    expect(guard).toContain('claims.src ?? claims.sub');
  });

  it('issuing derives one when nobody says, and refuses one nobody could repeat', async () => {
    /* BEHAVIOUR, NOT A MENTION. The first version of this asserted that the file named the
       helper — which stayed true while the value was quietly the client id again. */
    const rows: any[] = [];
    const prisma: any = {
      apiCredential: {
        create: jest.fn(async (a: any) => { rows.push(a.data); return { id: 'c1', ...a.data }; }),
      },
    };
    const service = new CredentialsService(prisma);

    await service.issue('org-a', 'Workday sync', ['graph:write'], 'u1');
    await service.issue('org-a', 'Workday sync', ['graph:write'], 'u1');

    expect(rows[0].sourceSystem).toBe('workday-sync');
    /* The rotation: two issues, two client ids, ONE roster. */
    expect(rows[0].sourceSystem).toBe(rows[1].sourceSystem);
    expect(rows[0].clientId).not.toBe(rows[1].clientId);
    expect(rows[0].sourceSystem).not.toBe(rows[0].clientId);

    /* And two DIFFERENT systems stay different — a constant would satisfy everything above while
       keying an HRIS and a CRM to the same roster, which is the same collision one level up. */
    await service.issue('org-a', 'BambooHR sync', ['graph:write'], 'u1');
    expect(rows[2].sourceSystem).toBe('bamboohr-sync');
    expect(rows[2].sourceSystem).not.toBe(rows[0].sourceSystem);

    await expect(service.issue('org-a', 'x', ['graph:write'], 'u1', [], 'Not A System'))
      .rejects.toThrow(/lower-case/);
  });

  it('and the duplicate read reports rather than repairs', () => {
    const from = scim.indexOf('async whoExistsTwice');
    /* Bounded at the NEXT method, not at a named one — a slice that runs past the end reads
       somebody else's body and asserts nothing about this one. */
    const fn = scim.slice(from, scim.indexOf('\n  async ', from + 10));
    expect(fn).toContain('findMany');
    expect(fn).not.toMatch(/delete|update/);
  });
});
