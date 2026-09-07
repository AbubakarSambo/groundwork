/**
 * Adding an address to a check-in used to make it a member of your organisation, and put it on
 * your bill. Driven end to end: does the outsider get queued, is the check-in actually refused,
 * do they stay off the seat count, and does approval let them in?
 */
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hit = async (method: string, path: string, body?: any, bearer?: string) => {
  const r = await fetch(`http://localhost:3000/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let d: any = null; try { d = await r.json(); } catch {}
  return { status: r.status, data: d?.data ?? d };
};

(async () => {
  /* An org with an admin. The admin is the one who must answer the queue. */
  const adminEmail = anAddress('door-admin');
  let mark = mailMark();
  await call('POST', '/auth/entry-save', { email: adminEmail });
  await settle(900);
  const m = mailSince(mark).filter((x) => x.to === adminEmail);
  const v = await call('POST', '/auth/verify-email', { token: tokenIn(m[m.length - 1]?.link ?? null) });
  const admin = v.data.accessToken as string;

  const seatsBefore = (await hit('GET', '/billing/summary', undefined, admin)).data?.people?.count ?? null;

  const g = await call('POST', '/grounds', {
    label: 'A door test', scenario: 'DRIFT', moment: 'RESOLUTION', timelineDays: 30,
    brief: 'Checking whether an outsider added to a check-in becomes a member of the organisation.',
  }, admin);
  const gid = g.data.id;

  /* THE ADMIN adds them, which is its own approval - so this one must NOT be queued. */
  const byAdmin = anAddress('added-by-admin');
  mark = mailMark();
  await call('POST', `/grounds/${gid}/participants`, { email: byAdmin }, admin);
  await settle(1000);
  const inviteA = mailSince(mark).filter((x) => x.to === byAdmin)[0];
  const acceptedA = await call('POST', '/participants/accept', { token: tokenIn(inviteA?.link ?? null) });
  const tokenA = acceptedA.data?.accessToken;
  const gotA = await call('GET', `/grounds/${gid}`, undefined, tokenA);
  const cidA = (gotA.data?.participants ?? []).find((p: any) => p.email === byAdmin)?.checkIns?.[0]?.id;
  const openA = await call('POST', `/check-ins/${cidA}/open`, {}, tokenA);
  console.log(`added by an ADMIN -> open their check-in: ${openA.status} (200/201 = walked straight in, correct)`);

  /* An admin is not subject to the queue, by the same principle as who-may-open-a-check-in.ts:
     they are the approver. So to reach the queue we need a NON-admin doing the inviting - which
     also needs this org to let members open check-ins at all. */
  const opened = await hit('PATCH', '/users/organization/check-ins', { whoMayOpen: 'EVERYONE', needsApproval: false }, admin);
  console.log(`letting members open check-ins here: ${opened.status}`);

  /* Now a member who is not an admin adds somebody. That one has to wait. */
  const leadEmail = anAddress('door-lead');
  mark = mailMark();
  await call('POST', `/grounds/${gid}/participants`, { email: leadEmail }, admin);
  await settle(1000);
  const li = mailSince(mark).filter((x) => x.to === leadEmail)[0];
  const leadAccepted = await call('POST', '/participants/accept', { token: tokenIn(li?.link ?? null) });
  const leadToken = leadAccepted.data?.accessToken;

  const g2 = await call('POST', '/grounds', {
    label: 'A check-in a member runs', scenario: 'DRIFT', moment: 'RESOLUTION', timelineDays: 30,
    brief: 'A member of the org, not an admin, inviting somebody from outside it.',
  }, leadToken);
  const gid2 = g2.data?.id;
  console.log(`a MEMBER creates a check-in: ${g2.status}${gid2 ? '' : ' :: ' + JSON.stringify(g2.data).slice(0, 120)}`);
  if (!gid2) return;

  const outsider = anAddress('outsider');
  mark = mailMark();
  await call('POST', `/grounds/${gid2}/participants`, { email: outsider }, leadToken);
  await settle(1200);
  const oi = mailSince(mark).filter((x) => x.to === outsider)[0];
  const accepted = await call('POST', '/participants/accept', { token: tokenIn(oi?.link ?? null) });
  const outsiderToken = accepted.data?.accessToken;
  console.log(`\noutsider accepts: ${accepted.status}`);

  const adminsToldCount = mailSince(mark).filter((x) => x.to === adminEmail && /waiting to be let into/i.test(x.subject)).length;
  console.log(`  admin told somebody is waiting: ${adminsToldCount > 0 ? 'yes' : 'NO'}`);

  const got = await call('GET', `/grounds/${gid2}`, undefined, outsiderToken);
  const cid = (got.data?.participants ?? []).find((p: any) => p.email === outsider)?.checkIns?.[0]?.id;
  const tryOpen = await call('POST', `/check-ins/${cid}/open`, {}, outsiderToken);
  console.log(`  they try to open their check-in: ${tryOpen.status} (403 is the gate)`);
  console.log(`    it says: ${JSON.stringify(tryOpen.data?.message ?? '').slice(0, 110)}`);
  const spoke = await call('POST', `/check-ins/${cid}/messages`, { message: 'Trying to get in anyway.' }, outsiderToken);
  console.log(`  and to answer without opening: ${spoke.status} (403 too, or the gate has a hole)`);

  const waiting = await hit('GET', '/users/waiting', undefined, admin);
  console.log(`\nthe admin's queue: ${waiting.status} with ${Array.isArray(waiting.data) ? waiting.data.length : '?'} waiting`);
  const row = Array.isArray(waiting.data) ? waiting.data.find((r: any) => r.email === outsider) : null;
  if (row) console.log(`  ${row.email} | added by ${row.addedBy} | for "${row.forCheckIn}"`);

  /* Seats read from the endpoint the billing page uses, not a guessed path. */
  const seatsWhileWaiting = (await hit('GET', '/billing/state', undefined, admin)).data?.people?.count
    ?? (await hit('GET', '/billing', undefined, admin)).data?.people?.count ?? null;
  console.log(`  PAUSED with them still waiting - check the database now.`);
  await settle(9000);

  /* And the answer. */
  const approved = row ? await hit('POST', `/users/waiting/${row.id}/approve`, {}, admin) : { status: 0, data: null };
  console.log(`\napprove: ${approved.status}`);
  const openedAfter = await call('POST', `/check-ins/${cid}/open`, {}, outsiderToken);
  console.log(`  they open their check-in now: ${openedAfter.status} (200/201 = let in)`);
  const seatsAfter = (await hit('GET', '/billing/summary', undefined, admin)).data?.people?.count ?? null;
  console.log(`\nseats: before=${seatsBefore} whileWaiting=${seatsWhileWaiting} afterApproval=${seatsAfter}`);
  console.log(`  (whileWaiting must be lower than afterApproval, or a queued person is being billed for)`);
  const twice = row ? await hit('POST', `/users/waiting/${row.id}/approve`, {}, admin) : { status: 0 };
  console.log(`  answering it a second time: ${twice.status} (400 expected)`);
})();
