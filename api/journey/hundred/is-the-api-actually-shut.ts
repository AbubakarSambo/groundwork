/**
 * "Our connect page content/APIs are not hidden behind request access."
 *
 * The page is readable and a key can be issued before anybody asks. The question is whether
 * that means the API is OPEN. Driven, not read: sign up, issue a credential, and try to use it.
 */
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const email = anAddress('apigate');
  const mark = mailMark();
  await call('POST', '/auth/entry-save', { email });
  await settle(900);
  const mail = mailSince(mark).filter((m) => m.to === email);
  const v = await call('POST', '/auth/verify-email', { token: tokenIn(mail[mail.length - 1]?.link ?? null) });
  const token = v.data.accessToken as string;

  const issued = await call('POST', '/integrations/credentials',
    { name: 'probe', sourceSystem: 'probe', scopes: ['subjects:write','graph:write'] }, token);
  console.log(`issue a key with nobody's approval: ${issued.status}`);
  const clientId = issued.data?.clientId, secret = issued.data?.clientSecret;
  console.log(`  clientId: ${clientId ? 'yes' : 'no'} | secret shown once: ${secret ? 'yes' : 'no'}`);

  const hit = async (method: string, path: string, body?: any, bearer?: string) => {
    const r = await fetch(`http://localhost:3000${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let d: any = null; try { d = await r.json(); } catch { /* no body */ }
    return { status: r.status, data: d };
  };
  const exchange = await hit('POST', '/api/org/v1/oauth/token',
    { grant_type: 'client_credentials', client_id: clientId, client_secret: secret });
  console.log(`  refusal names the ASK, not a plan: ${JSON.stringify(exchange.data?.says ?? exchange.data?.message ?? '').slice(0,180)}`);
  console.log(`exchange it for a token: ${exchange.status} ${JSON.stringify(exchange.data?.message ?? exchange.data?.says ?? '').slice(0, 150)}`);

  /* And the data routes themselves, with no machine token at all. */
  for (const [method, path, body] of [
    ['POST', '/api/org/v1/subjects', { type: 'person', externalId: 'x', displayName: 'X' }],
    ['GET', '/api/org/v1/subjects', undefined],
    ['GET', '/api/org/v1/how-to-connect', undefined],
  ] as [any, string, any][]) {
    const r = await hit(method, path, body);
    console.log(`${method} ${path} with no token: ${r.status}`);
    /* And with the customer's OWN session token, which is not a machine token. */
    const s = await hit(method, path, body, token);
    console.log(`${method} ${path} with a logged-in session: ${s.status}`);
  }
})();
