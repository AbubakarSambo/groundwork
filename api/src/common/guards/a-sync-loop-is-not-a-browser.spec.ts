/**
 * A ROSTER SYNC COULD NOT FINISH.
 *
 * One throttler covered everything at sixty a minute keyed by IP. SCIM is one person per call, so
 * a company of four hundred people got 429s partway through their first sync — and a 429 reads as
 * "your integration is broken". Two properties have to hold together: an integration gets a real
 * allowance, and nothing else does.
 */
import { ASyncLoopIsNotABrowser, A_MACHINE_MAY_MAKE_PER_MINUTE } from './a-sync-loop-is-not-a-browser';

function makeGuard(verify: (t: string) => any) {
  const jwt: any = { verifyAsync: async (t: string) => verify(t) };
  const guard = new ASyncLoopIsNotABrowser({} as any, {} as any, {} as any, jwt);
  /* The parent decides everything else; we only care what this class hands it. */
  const seen: any[] = [];
  (Object.getPrototypeOf(Object.getPrototypeOf(guard)) as any).handleRequest = async (props: any) => {
    seen.push(props);
    return true;
  };
  (guard as any).getRequestResponse = () => ({ req: (guard as any)._req, res: {} });
  return { guard, seen, at: (headers: any) => ((guard as any)._req = { headers }) };
}

const props = { context: {} as any, limit: 60, ttl: 60_000, throttler: { name: 'global' } as any, blockDuration: 0, getTracker: async () => 'ip:1.2.3.4', generateKey: () => 'k' };

describe('a sync loop is not a browser', () => {
  it('gives a verified machine credential an allowance a sync can finish in', async () => {
    const { guard, seen, at } = makeGuard(() => ({ typ: 'machine', sub: 'client-abc' }));
    at({ authorization: 'Bearer real.machine.token' });
    await (guard as any).handleRequest(props);
    expect(seen[0].limit).toBe(A_MACHINE_MAY_MAKE_PER_MINUTE);
  });

  it('and counts it per credential, not per address', async () => {
    const { guard, seen, at } = makeGuard(() => ({ typ: 'machine', sub: 'client-abc' }));
    at({ authorization: 'Bearer real.machine.token' });
    await (guard as any).handleRequest(props);
    expect(await seen[0].getTracker({}, {})).toBe('credential:client-abc');
  });

  it('leaves a person on the ordinary limit, keyed the ordinary way', async () => {
    const { guard, seen, at } = makeGuard(() => { throw new Error('no token'); });
    at({});
    await (guard as any).handleRequest(props);
    expect(seen[0].limit).toBe(60);
    expect(await seen[0].getTracker({}, {})).toBe('ip:1.2.3.4');
  });

  it('refuses to grant a SESSION token an integration\'s allowance', async () => {
    /* Both are signed with the same secret. Without the `typ` check, a logged-in browser would buy
       itself ten times the rate limit by holding a valid token — which every browser does. */
    const { guard, seen, at } = makeGuard(() => ({ sub: 'a-person', org: 'o1' }));
    at({ authorization: 'Bearer a.session.token' });
    await (guard as any).handleRequest(props);
    expect(seen[0].limit).toBe(60);
  });

  it('and refuses an UNVERIFIED claim of being a machine', async () => {
    /* This guard runs before anything has authenticated the request, so trusting the claims would
       let anybody buy the higher limit by asserting typ: machine. */
    const { guard, seen, at } = makeGuard(() => { throw new Error('bad signature'); });
    at({ authorization: 'Bearer forged.machine.token' });
    await (guard as any).handleRequest(props);
    expect(seen[0].limit).toBe(60);
  });

  it('never narrows a route that deliberately allows more', async () => {
    const { guard, seen, at } = makeGuard(() => ({ typ: 'machine', sub: 'client-abc' }));
    at({ authorization: 'Bearer real.machine.token' });
    await (guard as any).handleRequest({ ...props, limit: A_MACHINE_MAY_MAKE_PER_MINUTE + 500 });
    expect(seen[0].limit).toBe(A_MACHINE_MAY_MAKE_PER_MINUTE + 500);
  });

  it('ignores a header that is not a bearer token', async () => {
    const { guard, seen, at } = makeGuard(() => ({ typ: 'machine', sub: 'client-abc' }));
    at({ authorization: 'Basic dXNlcjpwYXNz' });
    await (guard as any).handleRequest(props);
    expect(seen[0].limit).toBe(60);
  });

  it('and a machine token with no subject, which cannot be counted', async () => {
    const { guard, seen, at } = makeGuard(() => ({ typ: 'machine' }));
    at({ authorization: 'Bearer no.sub.token' });
    await (guard as any).handleRequest(props);
    expect(seen[0].limit).toBe(60);
  });
});
