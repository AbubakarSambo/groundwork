/**
 * "Why is there no document uploader for context in the chat." Because the API had no route to
 * take one. Driven: does the new one attach a document to a check-in, from a panel session only?
 */
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  /* Re-runs reuse the org approved below by hand; the address stays stable so the approval sticks. */
  const email = anAddress('doc-api');
  const mark = mailMark();
  await call('POST', '/auth/entry-save', { email });
  await settle(900);
  const m = mailSince(mark).filter((x) => x.to === email);
  const admin = (await call('POST', '/auth/verify-email', { token: tokenIn(m[m.length - 1]?.link ?? null) })).data.accessToken as string;

  /* A check-in of our own, so there is something to attach to. */
  const g = await call('POST', '/grounds', {
    label: 'A document through the API', scenario: 'DRIFT', moment: 'RESOLUTION', timelineDays: 30,
    brief: 'Checking that a panel built on the published API can attach a document to a check-in.',
  }, admin);
  const got = await call('GET', `/grounds/${g.data.id}`, undefined, admin);
  const mine = (got.data?.participants ?? []).find((p: any) => p.email === email);
  const checkInId = mine?.checkIns?.[0]?.id;
  console.log(`a check-in to attach to: ${checkInId ? 'yes' : 'NO'}`);
  if (!checkInId) return;

  /* THE PANEL'S OWN HANDSHAKE. Nothing here uses a browser session. */
  const cred = await call('POST', '/integrations/credentials',
    { name: 'panel', sourceSystem: 'panel', scopes: ['subjects:write', 'graph:write'] }, admin);
  const req = await call('POST', '/integrations/credentials/access-request', { whatFor: 'Attaching a document from our own panel.' }, admin);
  console.log(`asked for access: ${req.status}`);

  const post = async (path: string, body: any, bearer?: string) => {
    const r = await fetch(`http://localhost:3000${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
      body: JSON.stringify(body),
    });
    let d: any = null; try { d = await r.json(); } catch {}
    return { status: r.status, data: d?.data ?? d };
  };
  /* Access is asked for, not automatic - so this waits for somebody to answer rather than
     assuming. That refusal is the gate working, and a probe that treated it as a failure would be
     testing the wrong thing. */
  let tok = { status: 0, data: null as any };
  for (let i = 0; i < 24; i++) {
    tok = await post('/api/org/v1/oauth/token', {
      grant_type: 'client_credentials', client_id: cred.data?.clientId, client_secret: cred.data?.clientSecret,
    });
    if (tok.status === 200 || tok.status === 201) break;
    if (i === 0) console.log(`waiting for access to be granted (${tok.status})…`);
    await settle(5000);
  }
  console.log(`machine token: ${tok.status}`);
  if (tok.status !== 200 && tok.status !== 201) {
    console.log(`  ${JSON.stringify(tok.data).slice(0, 140)}`);
    return;
  }

  /*
   * REGISTER THE PERSON, THE WAY A CUSTOMER'S DIRECTORY SYNC DOES.
   *
   * SCIM, not /subjects - and getting this wrong is instructive rather than embarrassing. A subject
   * is a THING people work on; a person is a person. Sending a person to /subjects returns 200 and
   * the panel then answers `{ visible: false }`, because there is no such person to be visible to.
   * The published sequence says this in its first line: "Tell us who your people are. Everything
   * after this refers to them."
   */
  /*
   * The directory entry carries the address they sign in with. A person nobody has ever signed in
   * as gets the product's own refusal - "Nobody has signed in with that address yet, so there is
   * no account to open their check-in as" - which is correct and is not what this probe is for.
   */
  const person = await post('/api/org/v1/scim/v2/Users', {
    userName: email,
    externalId: 'p1',
    name: { givenName: 'A', familyName: 'Person' },
    emails: [{ value: email, primary: true }],
    active: true,
  }, tok.data.access_token);
  console.log(`person registered: ${person.status}`);

  /*
   * AND THE PANEL HANDSHAKE, WHICH IS THE POINT OF THE WHOLE EXERCISE.
   *
   * The customer turns the panel on, gets a signing secret, and their own SERVER mints a short
   * assertion about who is logged in. Groundwork verifies it and hands back a session. There is no
   * Groundwork password for an end user anywhere in this - their login is the only login.
   */
  const cfg = await call('POST', '/integrations/embed', { allowedDomains: ['http://localhost:5173'] }, admin);
  const secret = cfg.data?.signingSecret;
  console.log(`embed configured: ${cfg.status}${secret ? '' : ' (no secret returned)'}`);
  if (!secret) { console.log(`  ${JSON.stringify(cfg.data).slice(0, 200)}`); return; }

  const crypto = require('crypto');
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const orgId = (await call('GET', '/auth/me', undefined, admin)).data?.organizationId
    ?? (await call('GET', '/users/me', undefined, admin)).data?.organizationId;
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const claims = b64({ sub: 'p1', org: orgId, iat: now, exp: now + 120 });
  const sig = crypto.createHmac('sha256', secret).update(`${head}.${claims}`).digest('base64url');
  const identity = `${head}.${claims}.${sig}`;

  const sess = await post('/api/org/v1/embed/session', { token: identity });
  console.log(`panel session: ${sess.status}`);
  const panelToken = sess.data?.sessionToken;
  if (!panelToken) { console.log(`  ${JSON.stringify(sess.data).slice(0, 200)}`); return; }

  /* And the upload, with no browser session at all. */
  const form = new FormData();
  form.append('file', new Blob(['The handover plan. Two weeks, three owners, one date.'], { type: 'text/plain' }), 'plan.txt');
  const up = await fetch(`http://localhost:3000/api/org/v1/check-ins/${checkInId}/documents`, {
    method: 'POST', headers: { Authorization: `Bearer ${panelToken}` }, body: form,
  });
  const upBody = await up.json().catch(() => null);
  console.log(`\nattach a document over the API: ${up.status}`);
  console.log(`  ${JSON.stringify(upBody?.data ?? upBody).slice(0, 200)}`);

  /* And with nothing. */
  const none = await fetch(`http://localhost:3000/api/org/v1/check-ins/${checkInId}/documents`, { method: 'POST', body: new FormData() });
  console.log(`  with no panel session: ${none.status} (401 expected)`);
})();
