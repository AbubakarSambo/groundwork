/** Two people say almost nothing. Does the record say so, rather than calling it Mixed? */
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function signUp(local: string) {
  const email = anAddress(local);
  const mark = mailMark();
  await call('POST', '/auth/entry-save', { email });
  await settle(800);
  const mail = mailSince(mark).filter((m) => m.to === email);
  const v = await call('POST', '/auth/verify-email', { token: tokenIn(mail[mail.length - 1]?.link ?? null) });
  return { email, token: v.data.accessToken as string };
}

(async () => {
  const lead = await signUp('thin');
  const g = await call('POST', '/grounds', {
    label: 'Barely anything', scenario: 'DRIFT', moment: 'RESOLUTION', timelineDays: 30,
    brief: 'Something is off with the handover and we are checking whether we see it the same way.',
  }, lead.token);
  const gid = g.data.id;

  const other = anAddress('thinother');
  const mark = mailMark();
  await call('POST', `/grounds/${gid}/participants`, { email: other }, lead.token);
  await settle(900);
  const invite = mailSince(mark).filter((m) => m.to === other)[0];
  const accepted = await call('POST', '/participants/accept', { token: tokenIn(invite?.link ?? null) });

  /* The floor is 50 characters and two real turns. This clears it and says almost nothing. */
  const barely = ['It has been a bit slow on the handover side lately.', 'Not really, no. That is about it.', 'Nothing else comes to mind, honestly.'];
  for (const who of [{ t: lead.token, e: lead.email }, { t: accepted.data?.accessToken, e: other }]) {
    const got = await call('GET', `/grounds/${gid}`, undefined, who.t);
    const cid = (got.data?.participants ?? []).find((p: any) => p.email === who.e)?.checkIns?.[0]?.id;
    if (!cid) continue;
    await call('POST', `/check-ins/${cid}/open`, {}, who.t);
    for (const a of barely) await call('POST', `/check-ins/${cid}/messages`, { message: a }, who.t);
    const done = await call('POST', `/check-ins/${cid}/complete`, {}, who.t);
    console.log(`${who.e.split('@')[0]} finished: ${done.status} ${done.status >= 400 ? JSON.stringify(done.data?.message ?? '').slice(0, 90) : ''}`);
  }

  for (let i = 0; i < 18; i++) {
    const rep = await call('GET', `/grounds/${gid}/report`, undefined, lead.token);
    if (rep.status === 200 && rep.data?.sharedPicture) {
      const cov = (rep.data.engagement as any)?.coverage;
      console.log(`\ncoverage: ${cov}`);
      console.log(`picture (${String(rep.data.sharedPicture).length} chars): ${String(rep.data.sharedPicture).slice(0, 220)}`);
      console.log(`agreements: ${(rep.data.agreements ?? []).length} | divergences: ${(rep.data.divergences ?? []).length}`);
      return;
    }
    await settle(5000);
  }
  console.log('no report');
})();
