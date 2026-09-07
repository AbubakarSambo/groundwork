/** Queue an outsider and stop. The seat claim is only true if the flag is set while they wait. */
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hit = async (m: string, p: string, b?: any, t?: string) => {
  const r = await fetch(`http://localhost:3000/api/v1${p}`, { method: m,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: b === undefined ? undefined : JSON.stringify(b) });
  let d: any = null; try { d = await r.json(); } catch {}
  return { status: r.status, data: d?.data ?? d };
};

(async () => {
  const adminEmail = anAddress('stop-admin');
  let mark = mailMark();
  await call('POST', '/auth/entry-save', { email: adminEmail });
  await settle(900);
  const m = mailSince(mark).filter((x) => x.to === adminEmail);
  const admin = (await call('POST', '/auth/verify-email', { token: tokenIn(m[m.length - 1]?.link ?? null) })).data.accessToken as string;
  await hit('PATCH', '/users/organization/check-ins', { whoMayOpen: 'EVERYONE', needsApproval: false }, admin);

  const g = await call('POST', '/grounds', { label: 'Left in the queue', scenario: 'DRIFT', moment: 'RESOLUTION',
    timelineDays: 30, brief: 'Somebody is queued and nobody answers, which is the state that has to be right.' }, admin);

  const member = anAddress('stop-member');
  mark = mailMark();
  await call('POST', `/grounds/${g.data.id}/participants`, { email: member }, admin);
  await settle(1000);
  const mi = mailSince(mark).filter((x) => x.to === member)[0];
  const memberToken = (await call('POST', '/participants/accept', { token: tokenIn(mi?.link ?? null) })).data?.accessToken;

  const g2 = await call('POST', '/grounds', { label: 'A member invites an outsider', scenario: 'DRIFT', moment: 'RESOLUTION',
    timelineDays: 30, brief: 'The outsider must be queued, and must not be counted on anybody plan.' }, memberToken);

  const outsider = anAddress('left-waiting');
  mark = mailMark();
  await call('POST', `/grounds/${g2.data.id}/participants`, { email: outsider }, memberToken);
  await settle(1200);
  const oi = mailSince(mark).filter((x) => x.to === outsider)[0];
  await call('POST', '/participants/accept', { token: tokenIn(oi?.link ?? null) });
  console.log(`queued and left: ${outsider}`);
})();
