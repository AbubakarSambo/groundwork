import { GoogleStrategy } from './strategies/google.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

/**
 * GOOGLE SIGN-IN AND SIGN-UP, AS THEY WORK ON THE LIVE PRODUCT.
 *
 * Real Google cannot be reached from a test, so this does what Passport does: the strategy's `validate` is
 * called with the profile Google sends, what it hands to `done` is what the callback receives as `req.user`,
 * and the callback is run against the real service over a stand-in database. Three people:
 *  - somebody already linked to Google (a row with their googleId): signed in, nothing made;
 *  - somebody with the same email but not yet linked: signed in, linked, marked verified, organisation untouched;
 *  - somebody new: an organisation of their own and an admin row, asked to name it.
 * And the three names the server is set up with (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL).
 */

const FRONTEND = 'http://localhost:5173';

function theStrategy(values: Record<string, string | undefined> = {}) {
  return new GoogleStrategy({ get: (k: string) => values[k] } as any);
}

/** What Passport does: call validate with Google's profile and take what is given to `done`. */
async function asPassportCallsIt(strategy: GoogleStrategy, profile: any): Promise<{ err: any; user: any }> {
  return new Promise((resolve) => {
    strategy.validate('access', 'refresh', profile, ((err: any, user: any) => resolve({ err, user })) as any);
  });
}

const googleProfile = (over: any = {}) => ({
  id: 'google-123',
  name: { givenName: 'Hafsah', familyName: 'Jumare' },
  emails: [{ value: 'Hafsah@Example.test', verified: true }],
  ...over,
});

function theWholeDoor(db: { byGoogleId?: any; byEmail?: any }) {
  const made: { users: any[]; orgs: any[]; codes: any[] } = { users: [], orgs: [], codes: [] };
  const prisma: any = {
    user: {
      findFirst: jest.fn(async () => db.byGoogleId ?? null),
      findUnique: jest.fn(async () => db.byEmail ?? null),
      update: jest.fn(async (a: any) => ({ ...db.byEmail, ...a.data, organization: db.byEmail.organization })),
      create: jest.fn(async (a: any) => { made.users.push(a.data); return { id: 'u-new', isActive: true, ...a.data, organization: { id: 'org-new', name: 'x' } }; }),
    },
    organization: {
      create: jest.fn(async (a: any) => { const o = { id: 'org-new', ...a.data }; made.orgs.push(o); return o; }),
      findUnique: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    groundParticipant: { findFirst: jest.fn(async () => null) },
    oAuthExchangeCode: { create: jest.fn(async (a: any) => { made.codes.push(a.data); return a.data; }) },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const auth = new AuthService(
    prisma,
    { sign: () => 'the-session-token' } as any,
    { get: () => undefined } as any,
    { sendMagicLinkEmail: async () => undefined, sendAddPasswordEmail: async () => undefined } as any,
    {} as any, {} as any, { emit: () => undefined } as any,
  );
  const controller = new AuthController(auth, { get: (k: string) => (k === 'google.frontendUrl' ? FRONTEND : undefined) } as any);
  const redirects: string[] = [];
  const res = { redirect: (to: string) => { redirects.push(to); return to; } };
  return { prisma, made, controller, redirects, res };
}

describe('what the server is set up with', () => {
  it('uses GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL, through google.clientId, google.clientSecret and google.callbackUrl', () => {
    const s: any = theStrategy({ 'google.clientId': 'id-1', 'google.clientSecret': 'secret-1', 'google.callbackUrl': 'https://api.example.test/api/v1/auth/google/callback' });
    expect(s._oauth2._clientId).toBe('id-1');
    expect(s._callbackURL).toBe('https://api.example.test/api/v1/auth/google/callback');
  });

  it('and the names are read from the environment, so nothing else needs to be set', () => {
    const { googleConfig } = require('../../config/configuration');
    process.env.GOOGLE_CLIENT_ID = 'env-id';
    process.env.GOOGLE_CLIENT_SECRET = 'env-secret';
    process.env.GOOGLE_CALLBACK_URL = 'https://api.example.test/cb';
    try {
      const read = googleConfig();
      expect(read.clientId).toBe('env-id');
      expect(read.clientSecret).toBe('env-secret');
      expect(read.callbackUrl).toBe('https://api.example.test/cb');
    } finally {
      delete process.env.GOOGLE_CLIENT_ID; delete process.env.GOOGLE_CLIENT_SECRET; delete process.env.GOOGLE_CALLBACK_URL;
    }
  });

  it('GET /auth/methods says Google is on only when both the id and the secret are set', async () => {
    const methodsFor = (values: Record<string, string | undefined>) =>
      new AuthController({} as any, { get: (k: string) => values[k] } as any).methods();
    expect((await methodsFor({ 'google.clientId': 'a', 'google.clientSecret': 'b' })).google).toBe(true);
    expect((await methodsFor({ 'google.clientId': 'a' })).google).toBe(false);
    expect((await methodsFor({})).google).toBe(false);
  });
});

describe('the strategy, as Passport calls it', () => {
  it('hands on the Google id, the address and the name', async () => {
    const { err, user } = await asPassportCallsIt(theStrategy(), googleProfile());
    expect(err).toBeNull();
    expect(user).toEqual({ googleId: 'google-123', email: 'Hafsah@Example.test', firstName: 'Hafsah', lastName: 'Jumare' });
  });

  it('refuses an address Google has not verified', async () => {
    const { err, user } = await asPassportCallsIt(theStrategy(), googleProfile({ emails: [{ value: 'x@example.test', verified: false }] }));
    expect(user).toBe(false);
    expect(err.message).toMatch(/has not verified/);
  });
});

describe('the callback, with the profile the strategy hands on', () => {
  it('signs in somebody already linked to Google, and makes nothing', async () => {
    const door = theWholeDoor({ byGoogleId: { id: 'u1', email: 'hafsah@example.test', googleId: 'google-123', isActive: true, organizationId: 'org1', role: 'ADMIN', organization: { id: 'org1' } } });
    const { user } = await asPassportCallsIt(theStrategy(), googleProfile());
    await door.controller.googleCallback({ user, query: {} }, door.res);
    expect(door.redirects).toHaveLength(1);
    expect(door.redirects[0]).toMatch(new RegExp(`^${FRONTEND}/auth/google/callback\\?code=[0-9a-f]+&new=false&nameOrg=false$`));
    expect(door.prisma.user.create).not.toHaveBeenCalled();
    expect(door.prisma.user.update).not.toHaveBeenCalled();
    expect(door.prisma.organization.create).not.toHaveBeenCalled();
    expect(door.made.codes[0].token).toBe('the-session-token');
  });

  it('signs in somebody with the same address who is not linked yet, links their Google id, and keeps their organisation', async () => {
    const door = theWholeDoor({ byEmail: { id: 'u2', email: 'hafsah@example.test', googleId: null, isActive: true, isEmailVerified: false, organizationId: 'org2', role: 'LEAD', organization: { id: 'org2' } } });
    const { user } = await asPassportCallsIt(theStrategy(), googleProfile());
    await door.controller.googleCallback({ user, query: {} }, door.res);
    /* Looked up by the lower-cased address, whatever case Google sent. */
    expect(door.prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'hafsah@example.test' } }));
    expect(door.prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u2' }, data: { googleId: 'google-123', isEmailVerified: true } }));
    expect(door.prisma.user.create).not.toHaveBeenCalled();
    expect(door.prisma.organization.create).not.toHaveBeenCalled();
    expect(door.redirects[0]).toMatch(/\/auth\/google\/callback\?code=[0-9a-f]+&new=false&nameOrg=false$/);
  });

  it('signs up somebody new: an organisation, an admin row, and a question about what it is called', async () => {
    const door = theWholeDoor({});
    const { user } = await asPassportCallsIt(theStrategy(), googleProfile());
    await door.controller.googleCallback({ user, query: {} }, door.res);
    expect(door.made.orgs).toHaveLength(1);
    expect(door.made.users[0]).toMatchObject({ email: 'hafsah@example.test', googleId: 'google-123', firstName: 'Hafsah', lastName: 'Jumare', role: 'ADMIN', isEmailVerified: true, organizationId: 'org-new' });
    expect(door.redirects[0]).toMatch(/\/auth\/google\/callback\?code=[0-9a-f]+&new=true&nameOrg=true$/);
  });

  it('a person whose account was switched off is sent to the page that says Google did not finish', async () => {
    const door = theWholeDoor({ byGoogleId: { id: 'u3', email: 'hafsah@example.test', googleId: 'google-123', isActive: false, organizationId: 'org1', organization: { id: 'org1' } } });
    const { user } = await asPassportCallsIt(theStrategy(), googleProfile());
    await door.controller.googleCallback({ user, query: {} }, door.res);
    expect(door.redirects).toEqual([`${FRONTEND}/google-failed`]);
  });
});
