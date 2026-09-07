/**
 * The invitation says somebody can simply ignore it. Driven end to end: does the mail carry a way
 * out, does the link work with no account, and does the reminder then stop?
 */
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const email = anAddress('chased');
  let mark = mailMark();
  await call('POST', '/auth/entry-save', { email });
  await settle(900);
  const got = mailSince(mark).filter((m) => m.to === email);
  const v = await call('POST', '/auth/verify-email', { token: tokenIn(got[got.length - 1]?.link ?? null) });
  const lead = v.data.accessToken as string;

  const g = await call('POST', '/grounds', {
    label: 'Being chased', scenario: 'DRIFT', moment: 'RESOLUTION', timelineDays: 30,
    brief: 'Checking whether an invited person who wants nothing to do with this can make it stop.',
  }, lead);
  const gid = g.data.id;

  const invitee = anAddress('wouldrathernot');
  mark = mailMark();
  await call('POST', `/grounds/${gid}/participants`, { email: invitee }, lead);
  await settle(1200);
  const invite = mailSince(mark).filter((m) => m.to === invitee)[0];
  /* The harness keeps only the FIRST link per mail, and the way out is deliberately the last
     thing on the page. So the raw log is where this one is read from. */
  const log = require('fs').readFileSync('/tmp/gw-api.log', 'utf8').slice(mark);
  const stop = log.match(/(https?:\/\/\S*stop-reminders\/[A-Za-z0-9_-]+)/);
  console.log(`invitation arrived: ${invite ? 'yes' : 'no'}`);
  console.log(`  carries a way to stop: ${stop ? 'yes' : 'NO'}`);
  if (!stop) { console.log('  (nothing else to test)'); return; }

  const token = stop[1].split('/stop-reminders/')[1];
  /* No account, no session, no password - which is the whole point. */
  const pressed = await fetch(`http://localhost:3000/api/v1/stop-reminders/${token}`);
  /* Responses are wrapped as { success, data } - the page reading `says` off the top level was a
     real bug this probe found. */
  const said = (await pressed.json().catch(() => null))?.data;
  console.log(`  pressing it with no account: ${pressed.status} :: ${JSON.stringify(said?.says ?? '').slice(0, 130)}`);

  const again = await fetch(`http://localhost:3000/api/v1/stop-reminders/${token}`);
  const twice = (await again.json())?.data;
  console.log(`  pressing it twice: ${again.status} :: ${JSON.stringify(twice?.says ?? '').slice(0, 70)}`);

  /* THE CONTROL. Without somebody who did NOT press the link, a zero below proves only that
     invitees are never chased at all - which would make the fix look like it worked while doing
     nothing. */
  const control = anAddress('happytobechased');
  await call('POST', `/grounds/${gid}/participants`, { email: control }, lead);
  await settle(1200);

  /* And now the thing it is for: does a reminder still go out to them? */
  mark = mailMark();
  /* The reminder is asked for per CHECK-IN, by the lead, on their own. */
  const mine = await call('GET', `/grounds/${gid}`, undefined, lead);
  const myCheckIn = (mine.data?.participants ?? []).find((p: any) => p.email === email)?.checkIns?.[0]?.id;
  const nudged = await call('POST', `/check-ins/${myCheckIn}/remind`, {}, lead);
  await settle(1500);
  const since = mailSince(mark);
  const chased = since.filter((m) => m.to === invitee);
  const controlChased = since.filter((m) => m.to === control);
  console.log(`asking the lead's reminder to run: ${nudged.status}`);
  console.log(`  mail to somebody who asked us to stop: ${chased.length} (0 is the fix)`);
  console.log(`  mail to somebody who did not ask:     ${controlChased.length} (must be > 0 or the test is empty)`);
  if (chased.length) console.log(`  the one that should not exist said: ${JSON.stringify(chased[0].subject)}`);
})();
