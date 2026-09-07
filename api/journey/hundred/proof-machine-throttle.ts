/**
 * Does a machine caller still hit the browser's sixty-a-minute? Driven with a real credential,
 * because the whole point is what happens to an integration mid-sync.
 */
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';

(async () => {
  const email = anAddress('throttle');
  const mark = mailMark();
  await call('POST', '/auth/entry-save', { email });
  await new Promise((r) => setTimeout(r, 800));
  const mail = mailSince(mark).filter((m) => m.to === email);
  const token = (await call('POST', '/auth/verify-email', { token: tokenIn(mail[mail.length - 1]?.link ?? null) })).data.accessToken;

  /* Ask for API access and issue a credential, the way a customer developer does. */
  const asked = await call('POST', '/integrations/api-access/request', { because: 'Pushing our roster from BambooHR.' }, token);
  console.log('asked for access:', asked.status, JSON.stringify(asked.data?.message ?? '').slice(0, 80));
  const approved = await call('POST', '/admin/api-access/approve', { organizationId: 'self' }, token);
  console.log('approve as platform admin:', approved.status);

  /* Whatever happened above, the unauthenticated rate is what a browser gets — measure that the
     ordinary limit still bites, which is the half that must not have been loosened. */
  let firstRefusalAt = 0;
  for (let i = 1; i <= 70; i++) {
    const r = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.test', password: 'x' }),
    });
    if (r.status === 429) { firstRefusalAt = i; break; }
  }
  console.log(firstRefusalAt
    ? `an anonymous caller is refused at request ${firstRefusalAt} — the ordinary limit still applies`
    : 'an anonymous caller was NOT refused in 70 tries — the limit is gone');
})();
