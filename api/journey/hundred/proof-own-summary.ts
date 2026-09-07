/** Does the person who just finished get their own summary, and how long after? */
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';
(async () => {
  const email = anAddress('own');
  const mark = mailMark();
  await call('POST', '/auth/entry-save', { email });
  await new Promise((r) => setTimeout(r, 800));
  const mail = mailSince(mark).filter((m) => m.to === email);
  const token = (await call('POST', '/auth/verify-email', { token: tokenIn(mail[mail.length - 1]?.link ?? null) })).data.accessToken;
  const g = await call('POST', '/grounds', { label: 'Own summary', scenario: 'NEW_HIRE', moment: 'STARTING', timelineDays: 90,
    brief: 'Somebody starts in two weeks and we are agreeing what the first ninety days produce.' }, token);
  const got = await call('GET', `/grounds/${g.data.id}`, undefined, token);
  const cid = got.data.participants[0].checkIns[0].id;
  await call('POST', `/check-ins/${cid}/open`, {}, token);
  for (const line of [
    'They start on the first of October and I want them owning the delivery board within a month.',
    'The risk is nobody has said who signs off the plan, so it defaults to me and that is what I want to stop.',
    'By ninety days they should run the weekly review without me in the room.',
  ]) await call('POST', `/check-ins/${cid}/messages`, { message: line }, token);
  const t0 = Date.now();
  console.log('finished:', (await call('POST', `/check-ins/${cid}/complete`, {}, token)).status);
  for (let i = 0; i < 15; i++) {
    const a = await call('GET', `/check-ins/${cid}/artifact`, undefined, token);
    if (a.data?.artifact) {
      console.log(`their own summary arrived after ${Math.round((Date.now() - t0) / 1000)}s`);
      console.log('  summary:', String(a.data.artifact.summary).slice(0, 160));
      return;
    }
    if (i === 0) console.log('  straight after finishing:', JSON.stringify(a.data));
    await new Promise((r) => setTimeout(r, 4000));
  }
  console.log('no own summary after 60s');
})();
