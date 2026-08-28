import { EmbedService } from './embed.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
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
      findUnique: jest.fn(async () =>
        opts.config === null ? null : { signingSecret: SECRET, outOfScopeDepartments: ['Legal'], placement: 'floating', ...opts.config },
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
    const r: any = await svc({ person: inScope }).session(ORG, token('u-1'));
    expect(r.visible).toBe(true);
    expect(r.sessionToken).toBe('session-token');
  });

  it('somebody we have never heard of gets the same answer as somebody excluded', async () => {
    const unknown: any = await svc({ person: null }).session(ORG, token('u-nobody'));
    const excluded: any = await svc({ person: { ...inScope, department: 'Legal' } }).session(ORG, token('u-1'));
    expect(unknown).toEqual({ visible: false });
    expect(excluded).toEqual({ visible: false });
  });

  it('somebody who has left is out of scope too', async () => {
    const r: any = await svc({ person: { ...inScope, active: false } }).session(ORG, token('u-1'));
    expect(r).toEqual({ visible: false });
  });

  it('and an invisible answer carries nothing else at all', async () => {
    /* No name, no reason, no tier. Everything extra is something to reason about from outside. */
    const r: any = await svc({ person: null }).session(ORG, token('u-x'));
    expect(Object.keys(r)).toEqual(['visible']);
  });

  it('refuses before it looks anybody up when the token is bad', async () => {
    const s = svc({ person: inScope });
    await expect(s.session(ORG, token('u-1', 'other-org'))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('says so plainly when the embed was never set up', async () => {
    await expect(svc({ config: null }).session(ORG, token('u-1'))).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('the panel never opens blank', () => {
  it('always carries an opening line and something to tap', async () => {
    /*
     * "How can I help" is a tax on somebody when the answer is already in this response, and a box
     * a person does not know what to say to is where every product of this kind dies.
     */
    const r: any = await svc({ person: inScope }).session(ORG, token('u-1'));
    expect(r.opening.line.length).toBeGreaterThan(10);
    expect(r.opening.suggestions.length).toBeGreaterThan(0);
    expect(r.opening.source).toBeTruthy();
  });

  it('says it is still reading while a quiet period is running', async () => {
    /* Rather than answering confidently about work it has only just been handed. */
    const s = svc({ person: inScope });
    (s as any).prisma.detectionQuietPeriod.findMany = jest.fn(async () => [{ endsAt: new Date(Date.now() + 86_400_000) }]);
    const r: any = await s.session(ORG, token('u-1'));
    expect(r.opening.source).toBe('quiet_period');
  });

  it('admits when nothing is connected instead of pretending to know things', async () => {
    const s = svc({ person: inScope });
    (s as any).prisma.subject.count = jest.fn(async () => 0);
    const r: any = await s.session(ORG, token('u-1'));
    expect(r.opening.source).toBe('nothing_connected');
  });
});
