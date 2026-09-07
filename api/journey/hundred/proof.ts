import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';
(async () => {
  const email = anAddress('proof');
  const mark = mailMark();
  await call('POST', '/auth/entry-save', { email });
  await new Promise((r) => setTimeout(r, 800));
  const mail = mailSince(mark).filter((m) => m.to === email);
  const v = await call('POST', '/auth/verify-email', { token: tokenIn(mail[mail.length - 1]?.link ?? null) });
  const token = v.data.accessToken;
  const g = await call('POST', '/grounds', { label: 'Proof', scenario: 'NEW_HIRE', moment: 'STARTING', timelineDays: 90,
    brief: 'One person answering, so every party is finished the moment they are.' }, token);
  const gid = g.data.id;
  const got = await call('GET', `/grounds/${gid}`, undefined, token);
  const cid = got.data.participants[0].checkIns[0].id;
  await call('POST', `/check-ins/${cid}/open`, {}, token);
  for (const line of [
    'They start on the first of October and I want them owning the delivery board within a month.',
    'The risk is nobody has said who signs off the plan, so it defaults to me and that is what I am trying to stop.',
    'By ninety days they should run the weekly review without me in the room.',
  ]) await call('POST', `/check-ins/${cid}/messages`, { message: line }, token);
  const fin = await call('POST', `/check-ins/${cid}/complete`, {}, token);
  console.log('finished:', fin.status);
  for (const wait of [0, 3000, 3000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    const rep = await call('GET', `/grounds/${gid}/report`, undefined, token);
    console.log(`  report -> ${rep.status}: ${JSON.stringify(rep.data?.message ?? '(a report)').slice(0, 130)}`);
  }
})();
