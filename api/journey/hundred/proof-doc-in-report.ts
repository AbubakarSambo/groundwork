/**
 * Does a document everybody can see now reach the shared record by NAME? Two parties, one OPEN
 * document, both answering, then read the report.
 */
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
  const lead = await signUp('docrep');
  const g = await call('POST', '/grounds', {
    label: 'The ninety days', scenario: 'NEW_HIRE', moment: 'STARTING', timelineDays: 90,
    brief: 'Somebody starts in two weeks and the offer letter says what we agreed on scope and sign-off.',
  }, lead.token);
  const gid = g.data.id;

  /* An OPEN document: a brief everybody works from. */
  const form = new FormData();
  form.append('file', new Blob([
    'OFFER LETTER. Delivery lead, starting 1 October. Owns the delivery board from week four. ' +
    'Sign-off on the quarterly plan sits with the head of delivery, not with the new starter.',
  ], { type: 'text/plain' }), 'offer-letter.txt');
  form.append('consentConfirmed', 'true');
  form.append('uploaderNote', 'This is the version we both signed.');
  const up = await fetch(`http://localhost:3000/api/v1/grounds/${gid}/documents`, {
    method: 'POST', headers: { authorization: `Bearer ${lead.token}` }, body: form,
  }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) }));
  console.log('attached:', up.status, '| who can see it:', JSON.stringify((up.data as any)?.data?.whoCanSeeIt ?? '(not said)'));

  const docId = (up.data as any)?.data?.id;
  const opened = await call('PATCH', `/grounds/${gid}/documents/${docId}/visibility`, { visibility: 'OPEN' }, lead.token);
  console.log('made open:', opened.status, JSON.stringify(opened.data?.whoCanSeeIt ?? opened.data?.visibility ?? ''));

  const other = anAddress('docother');
  const beforeInvite = mailMark();
  await call('POST', `/grounds/${gid}/participants`, { email: other }, lead.token);
  await settle(900);
  const invite = mailSince(beforeInvite).filter((m) => m.to === other)[0];
  const accepted = await call('POST', '/participants/accept', { token: tokenIn(invite?.link ?? null) });

  const answers = [
    'They start on the first of October and I want them owning the delivery board by week four.',
    'The risk is that sign-off on the quarterly plan drifts to me by default, and the offer letter says it sits with the head of delivery.',
    'By ninety days they should be running the weekly review without me in the room.',
  ];
  for (const who of [{ t: lead.token, e: lead.email }, { t: accepted.data?.accessToken, e: other }]) {
    const got = await call('GET', `/grounds/${gid}`, undefined, who.t);
    const cid = (got.data?.participants ?? []).find((p: any) => p.email === who.e)?.checkIns?.[0]?.id;
    if (!cid) { console.log('no check-in for', who.e); continue; }
    await call('POST', `/check-ins/${cid}/open`, {}, who.t);
    for (const a of answers) await call('POST', `/check-ins/${cid}/messages`, { message: a }, who.t);
    console.log('finished', who.e.split('@')[0], (await call('POST', `/check-ins/${cid}/complete`, {}, who.t)).status);
  }

  for (let i = 0; i < 20; i++) {
    const rep = await call('GET', `/grounds/${gid}/report`, undefined, lead.token);
    if (rep.status === 200 && rep.data?.sharedPicture) {
      const text = JSON.stringify(rep.data);
      const named = /offer-letter/i.test(text);
      const mentionsDoc = /document|offer letter|attached/i.test(text);
      console.log(`\nreport arrived. names the file: ${named} | mentions a document: ${mentionsDoc}`);
      console.log('restsOn:', JSON.stringify(rep.data.restsOn));
      const m = text.match(/[^"]{0,120}(offer.letter|document)[^"]{0,160}/i);
      if (m) console.log('in the record:', m[0].slice(0, 260));
      return;
    }
    await settle(5000);
  }
  console.log('the report never arrived');
})();
