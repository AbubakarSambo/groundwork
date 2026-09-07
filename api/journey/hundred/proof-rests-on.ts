/** Does a document somebody attaches now reach the record they are shown? Driven, not read. */
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';

(async () => {
  const email = anAddress('rests');
  const mark = mailMark();
  await call('POST', '/auth/entry-save', { email });
  await new Promise((r) => setTimeout(r, 800));
  const mail = mailSince(mark).filter((m) => m.to === email);
  const v = await call('POST', '/auth/verify-email', { token: tokenIn(mail[mail.length - 1]?.link ?? null) });
  const token = v.data.accessToken;

  const g = await call('POST', '/grounds', {
    label: 'Rests on', scenario: 'NEW_HIRE', moment: 'STARTING', timelineDays: 90,
    brief: 'Somebody starts in two weeks and the offer letter says what was agreed.',
  }, token);
  const gid = g.data.id;

  const form = new FormData();
  form.append('file', new Blob(['Offer letter. Base 90,000. Starts 1 October. Reports to the delivery lead.'],
    { type: 'text/plain' }), 'offer-letter.txt');
  form.append('consentConfirmed', 'true');
  const up = await fetch(`http://localhost:3000/api/v1/grounds/${gid}/documents`, {
    method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form,
  });
  console.log('attached:', up.status);

  const got = await call('GET', `/grounds/${gid}`, undefined, token);
  const cid = got.data.participants[0].checkIns[0].id;
  await call('POST', `/check-ins/${cid}/open`, {}, token);
  for (const line of [
    'They start on the first of October and the offer letter is attached — it says what we agreed on scope.',
    'The risk is nobody has said who signs off the plan, so it defaults to me and that is what I want to stop.',
    'By ninety days they should be running the weekly review without me in the room.',
  ]) await call('POST', `/check-ins/${cid}/messages`, { message: line }, token);
  console.log('finished:', (await call('POST', `/check-ins/${cid}/complete`, {}, token)).status);

  for (let i = 0; i < 12; i++) {
    const rep = await call('GET', `/grounds/${gid}/report`, undefined, token);
    if (i === 0 || i === 11) console.log(`  look ${i}: ${rep.status} ${JSON.stringify(rep.data?.message ?? '').slice(0, 110)}`);
    if (rep.status === 200) {
      console.log('report ->', JSON.stringify(rep.data?.restsOn, null, 1));
      return;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  console.log('the report never arrived');
})();
