import { EmbedService } from './embed.service';
import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';

/**
 * NOTHING, NOT A DISABLED LAUNCHER.
 *
 * Three ways to be out of scope - we have never heard of this person, they have left, their
 * department is one the customer excluded - and they all return the same answer. A launcher that
 * appears and refuses tells somebody they are being kept out of something, which is a conversation
 * the customer did not ask us to start on their behalf.
 *
 * It also means the response cannot be used to learn who exists. An attacker holding a valid token
 * for one person cannot enumerate a roster by changing `sub`, because "no such person" and "not for
 * you" are indistinguishable. Driven against the running server, where an unknown id and a Legal
 * department both answered `visible: false`.
 */
const SECRET = 'gwe_secret';
const ORG = 'org-a';
const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');

function token(sub: string, org = ORG) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64({ alg: 'HS256', typ: 'JWT' });
  const p = b64({ sub, org, iat: now, exp: now + 120 });
  return `${h}.${p}.${createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`;
}

function svc(opts: { config?: any; person?: any } = {}) {
  const prisma: any = {
    embedConfig: {
      /* Keyed on the org the token CLAIMS, which is how the real lookup now works: the claim
         selects which key the signature is checked against. */
      findUnique: jest.fn(async ({ where }: any) =>
        opts.config === null || where.organizationId !== ORG
          ? null
          : { signingSecret: SECRET, outOfScopeDepartments: ['Legal'], placement: 'floating', ...opts.config },
      ),
    },
    person: { findFirst: jest.fn(async () => opts.person ?? null) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
    subject: { count: jest.fn(async () => 5), findMany: jest.fn(async () => []) },
  };
  const jwt: any = { signAsync: jest.fn(async () => 'session-token') };
  return new EmbedService(prisma, jwt);
}

const inScope = { id: 'p1', externalId: 'u-1', displayName: 'Naomi Osei', userName: 'naomi', active: true, department: 'Commercial' };

describe('out of scope sees nothing', () => {
  it('a person in scope gets a session', async () => {
    const r: any = await svc({ person: inScope }).session(token('u-1'));
    expect(r.visible).toBe(true);
    expect(r.sessionToken).toBe('session-token');
  });

  it('somebody we have never heard of gets the same answer as somebody excluded', async () => {
    const unknown: any = await svc({ person: null }).session(token('u-nobody'));
    const excluded: any = await svc({ person: { ...inScope, department: 'Legal' } }).session(token('u-1'));
    expect(unknown).toEqual({ visible: false });
    expect(excluded).toEqual({ visible: false });
  });

  it('somebody who has left is out of scope too', async () => {
    const r: any = await svc({ person: { ...inScope, active: false } }).session(token('u-1'));
    expect(r).toEqual({ visible: false });
  });

  it('and an invisible answer carries nothing else at all', async () => {
    /* No name, no reason, no tier. Everything extra is something to reason about from outside. */
    const r: any = await svc({ person: null }).session(token('u-x'));
    expect(Object.keys(r)).toEqual(['visible']);
  });

  it('refuses a token claiming an organisation whose key it was not signed with', async () => {
    /* The claim selects the lock. Claiming somebody else's organisation means being checked against
       their secret, which this token was not signed with. */
    const s = svc({ person: inScope });
    await expect(s.session(token('u-1', 'other-org'))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('gives the same answer for an unknown organisation as for a bad signature', async () => {
    /* Otherwise the handshake tells anybody which organisations exist here. */
    const s = svc({ config: null, person: inScope });
    await expect(s.session(token('u-1'))).rejects.toThrow(/was not accepted/i);
  });

  /*
   * A test that said "says so plainly when the embed was never set up" lived here and was right
   * while this endpoint took a machine credential: the caller had already proved which organisation
   * they were, so a helpful message cost nothing. Now that a browser calls it, a distinct answer
   * for "no such setup" would tell anybody which organisations exist here. Superseded by the
   * same-answer test above, deliberately.
   */
});

describe('the panel never opens blank', () => {
  /*
   * THESE MOVED OFF THE HANDSHAKE, DELIBERATELY. The handshake's response is read by the HOST page -
   * the customer's own application - and it only needs to know whether to render. The person's
   * name, their opening line and the state of their systems belong to the PANEL, which fetches them
   * with the session token it was given. Handing them to the host would put somebody's name into a
   * page they are merely visiting.
   */
  const svcWithPerson = () => {
    const s = svc({ person: inScope });
    (s as any).prisma.person.findFirst = jest.fn(async () => inScope);
    return s;
  };

  it('the handshake tells the host page only what it needs to render', async () => {
    const r: any = await svc({ person: inScope }).session(token('u-1'));
    expect(r.visible).toBe(true);
    expect(r.opening).toBeUndefined();
    expect(r.person).toBeUndefined();
    expect(r.freshness).toBeUndefined();
  });

  it('always carries an opening line and something to tap', async () => {
    /*
     * "How can I help" is a tax on somebody when the answer is already in this response, and a box
     * a person does not know what to say to is where every product of this kind dies.
     */
    const r: any = await svcWithPerson().openingFor('org-a', 'p1');
    expect(r.opening.line.length).toBeGreaterThan(10);
    expect(r.opening.suggestions.length).toBeGreaterThan(0);
    expect(r.opening.source).toBeTruthy();
  });

  it('says it is still reading while a quiet period is running', async () => {
    /* Rather than answering confidently about work it has only just been handed. */
    const s = svcWithPerson();
    (s as any).prisma.detectionQuietPeriod.findMany = jest.fn(async () => [{ endsAt: new Date(Date.now() + 86_400_000) }]);
    const r: any = await s.openingFor('org-a', 'p1');
    expect(r.opening.source).toBe('quiet_period');
  });

  it('admits when nothing is connected instead of pretending to know things', async () => {
    const s = svcWithPerson();
    (s as any).prisma.subject.count = jest.fn(async () => 0);
    const r: any = await s.openingFor('org-a', 'p1');
    expect(r.opening.source).toBe('nothing_connected');
  });

  it("returns nothing for a person who is not in this organisation", async () => {
    const s = svc({ person: inScope });
    (s as any).prisma.person.findFirst = jest.fn(async () => null);
    expect(await s.openingFor('org-a', 'p-someone-else')).toEqual({ opening: null, freshness: [] });
  });
});
