/**
 * "The api chat is meant to act exactly like the check-ins on our system, with more, including
 * adding a person."
 *
 * So: from a panel session and nothing else, can somebody open a check-in, be answered by the REAL
 * conversation engine, and add a person to the organisation?
 */
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hit = async (m: string, p: string, b?: any, t?: string) => {
  const r = await fetch(`http://localhost:3000${p}`, { method: m,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: b === undefined ? undefined : JSON.stringify(b) });
  let d: any = null; try { d = await r.json(); } catch {}
  return { status: r.status, data: d?.data ?? d };
};

(async () => {
  const email = anAddress('panel-real');
  const mark = mailMark();
  await call('POST', '/auth/entry-save', { email });
  await settle(900);
  const m = mailSince(mark).filter((x) => x.to === email);
  const admin = (await call('POST', '/auth/verify-email', { token: tokenIn(m[m.length - 1]?.link ?? null) })).data.accessToken as string;

  const cred = await call('POST', '/integrations/credentials', { name: 'panel', sourceSystem: 'panel', scopes: ['graph:write', 'grounds:write'] }, admin);
  await call('POST', '/integrations/credentials/access-request', { whatFor: 'Running the panel as a customer would.' }, admin);
  let tok = { status: 0, data: null as any };
  for (let i = 0; i < 24; i++) {
    tok = await hit('POST', '/api/org/v1/oauth/token', { grant_type: 'client_credentials', client_id: cred.data?.clientId, client_secret: cred.data?.clientSecret });
    if (tok.status === 200 || tok.status === 201) break;
    if (i === 0) console.log('waiting for access to be granted…');
    await settle(5000);
  }
  console.log(`machine token: ${tok.status}`);
  if (tok.status !== 200) return;

  await hit('POST', '/api/org/v1/scim/v2/Users', {
    userName: email, externalId: 'me', name: { givenName: 'A', familyName: 'Lead' },
    emails: [{ value: email, primary: true }], active: true,
  }, tok.data.access_token);

  const cfg = await call('POST', '/integrations/embed', { allowedDomains: ['http://localhost:5173'] }, admin);
  const orgId = (await call('GET', '/auth/me', undefined, admin)).data?.organizationId;
  const crypto = require('crypto');
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const claims = b64({ sub: 'me', org: orgId, iat: now, exp: now + 300 });
  const identity = `${head}.${claims}.${crypto.createHmac('sha256', cfg.data.signingSecret).update(`${head}.${claims}`).digest('base64url')}`;
  const sess = await hit('POST', '/api/org/v1/embed/session', { token: identity });
  const panel = sess.data?.sessionToken;
  console.log(`panel session: ${sess.status}`);
  if (!panel) return;

  /* 1. ADD A PERSON, from the panel. */
  const added = await hit('POST', '/api/org/v1/people', { email: anAddress('added-by-panel'), displayName: 'Ada Byron' }, panel);
  console.log(`\nadd a person from the panel: ${added.status} ${added.data?.externalId ? `(${added.data.externalId})` : JSON.stringify(added.data).slice(0,110)}`);

  /* 2. OPEN A CHECK-IN, from the panel. */
  const opened = await hit('POST', '/api/org/v1/check-ins', {
    label: 'A handover I am leading', scenario: 'ROLE_HANDOVER', moment: 'STARTING', timelineDays: 30,
  }, panel);
  console.log(`open a check-in from the panel: ${opened.status} ${opened.status >= 400 ? JSON.stringify(opened.data).slice(0,150) : ''}`);
  if (opened.status >= 400) return;

  /* 3. AND IS IT THE REAL ENGINE? */
  let mine = await hit('GET', '/api/org/v1/check-ins/mine', undefined, panel);
  console.log(`what is waiting for me: ${mine.status}`);
  console.log(`  ${JSON.stringify(mine.data).slice(0, 200)}`);

  /*
   * A CHECK-IN YOU HAVE JUST OPENED COMES BACK AS A GROUND WAITING ON YOU TO START, not as a
   * check-in - because the named lead has to read the context and say yes before anybody is asked
   * anything. That step is `confirm-lead`, and it is on the panel's own route list for the reason
   * the comment there gives: a machine deciding on somebody's behalf that they have read something
   * and agree with it is the thing it exists to prevent.
   */
  const toStart = (mine.data?.waitingOnYouToStart ?? [])[0];
  if (toStart?.groundId) {
    const confirmed = await hit('POST', `/api/org/v1/grounds/${toStart.groundId}/confirm-lead`, {}, panel);
    console.log(`\nconfirm I am leading it: ${confirmed.status}`);
    mine = await hit('GET', '/api/org/v1/check-ins/mine', undefined, panel);
  }
  const first = (mine.data?.waiting ?? [])[0] ?? (mine.data?.open ?? [])[0];
  const checkInId = first?.checkInId ?? first?.id;
  console.log(`  a check-in of mine: ${checkInId ? 'found' : 'NOT found'}`);
  if (!checkInId) { console.log(`  ${JSON.stringify(mine.data).slice(0,240)}`); return; }

  const openIt = await hit('POST', `/api/org/v1/check-ins/${checkInId}/open`, {}, panel);
  const openingLine = JSON.stringify(openIt.data).slice(0, 220);
  console.log(`\nopen it: ${openIt.status}`);
  console.log(`  it says: ${openingLine}`);

  const said = await hit('POST', `/api/org/v1/check-ins/${checkInId}/messages`,
    { content: 'The handover is to Amir. He starts Monday and nothing is written down yet.' }, panel);
  console.log(`\nanswer in it: ${said.status}`);
  console.log(`  the engine replies: ${JSON.stringify(said.data).slice(0, 260)}`);
})();
