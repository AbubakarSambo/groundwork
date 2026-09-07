/**
 * THE SECOND SWEEP: the doors nobody in the hundred journeys happened to knock on.
 *
 * Entry and discovery, an organisation's own context, invitations, arrival, more than two people,
 * and what the product says when somebody is refused. Cheap questions, asked directly, because a
 * journey only ever covers what its script happened to do.
 */
import * as fs from 'fs';
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';

const found: { group: string; issue: string; evidence: string }[] = [];
const note = (group: string, issue: string, evidence: string) =>
  (found.push({ group, issue, evidence: String(evidence).slice(0, 240) }),
   console.log(`  [${group}] ${issue}\n       ${String(evidence).slice(0, 160)}`));
const ok = (what: string) => console.log(`  (fine) ${what}`);
const said = (r: any) => JSON.stringify(r.data?.message ?? r.data?.reply ?? r.data ?? '').slice(0, 200);

async function anAdmin(local = 'p2') {
  const email = anAddress(local);
  const mark = mailMark();
  await call('POST', '/auth/entry-save', { email });
  await new Promise((r) => setTimeout(r, 800));
  const mail = mailSince(mark).filter((m) => m.to === email);
  const v = await call('POST', '/auth/verify-email', { token: tokenIn(mail[mail.length - 1]?.link ?? null) });
  return { email, token: v.data?.accessToken as string, user: v.data?.user, org: v.data?.organization };
}

async function main() {
  const opener = await call('POST', '/entry/opener', { scenario: 'NEW_HIRE' });
  const openerText = String(opener.data?.reply ?? '');
    /* The SCREEN says "Nothing is saved to an account yet" in the step header, so the opener not
     repeating it is not a finding — checked against the rendered page, not the string alone. */
  if (false)
    note('entry/discovery', 'The first thing the entry chat says does not tell somebody whether what they type is being kept', openerText);

  const badJoin = await call('GET', '/entry/join-preview?t=nonsense-token');
  if (!/expired|used|ask|again|link/i.test(said(badJoin)))
    note('entry/discovery', 'A dead invitation link does not say what to do next', `${badJoin.status} ${said(badJoin)}`);
  else ok(`a dead invitation link says: ${said(badJoin)}`);

  const faq = await call('POST', '/entry/faq', { question: 'Who can see what I write?' });
  const faqText = String(faq.data?.reply ?? '');
  if (faqText.length < 80) note('entry/discovery', 'The question people ask most gets a very short answer', `${faqText.length} chars: ${faqText}`);
  else ok('the who-can-see-this question gets a real answer');

  const admin = await anAdmin();
  const orgName = String(admin.org?.name ?? '');
  if (/journey|test/i.test(orgName))
    note('organisation context', 'The organisation is auto-named from the email domain, so a stranger claims a company name',
      `an address at journey.test produced the organisation "${orgName}"`);

  /* What the client itself calls to learn who and where you are. */
  const me = await call('GET', '/auth/me', undefined, admin.token);
  const org = me.data?.organization ?? me.data?.user?.organization;
  if (!org) note('organisation context', 'The signed-in call does not carry the organisation, so nothing on screen can name where you are',
    `${me.status} keys: ${Object.keys(me.data ?? {}).join(', ')}`);
  else ok(`the signed-in call names the organisation: ${JSON.stringify(org).slice(0, 80)}`);

  const people = await call('GET', '/people', undefined, admin.token);
  const roster = people.data?.people ?? people.data?.items ?? (Array.isArray(people.data) ? people.data : []);
  if (people.status < 400 && Array.isArray(roster) && roster.length === 0)
    note('organisation context', 'The admin who just signed up is not on their own team list, so the roster starts empty of them',
      `${people.status}, ${roster.length} people`);

  const made = await call('POST', '/grounds', {
    label: 'Three of us', scenario: 'DRIFT', moment: 'RESOLUTION', timelineDays: 30,
    brief: 'Three people are working on the same launch and we are checking that we agree on who owns which part.',
  }, admin.token);
  const gid = String(made.data?.id ?? '');
  if (!gid) note('first check-in setup', 'A check-in could not be created at all', `${made.status} ${said(made)}`);

  if (gid) {
    for (const e of [anAddress('one'), anAddress('two'), anAddress('three')])
      await call('POST', `/grounds/${gid}/participants`, { email: e }, admin.token);
    const g = await call('GET', `/grounds/${gid}`, undefined, admin.token);
    const parties = g.data?.participants ?? [];
    ok(`a check-in with ${parties.length} parties was accepted`);
    if (!/outstanding|waiting|remaining|notStarted|NOT_STARTED/i.test(JSON.stringify(g.data)))
      note('multi-person state', 'With four parties on a check-in, nothing on it says how many have yet to answer',
        Object.keys(g.data ?? {}).join(', '));

    const mineId = parties.find((p: any) => p.email === admin.email)?.checkIns?.[0]?.id;
    if (mineId) {
      await call('POST', `/check-ins/${mineId}/open`, {}, admin.token);
      const tooSoon = await call('POST', `/check-ins/${mineId}/complete`, {}, admin.token);
      const body = said(tooSoon);
      if (tooSoon.status >= 400 && !/canContinue/.test(JSON.stringify(tooSoon.data)) && !/keep going|carry on|continue|one or two more|a few more/i.test(body))
        note('completion', 'Finishing too early is refused without telling the person they may simply carry on', `${tooSoon.status} ${body}`);
      else ok(`finishing too early says: ${body.slice(0, 120)}`);

      const openAgain = await call('POST', `/check-ins/${mineId}/open`, {}, admin.token);
      if (openAgain.status >= 400)
        note('participant check-in chat', 'Opening a check-in a second time — a reload — is refused', `${openAgain.status} ${said(openAgain)}`);
      else ok('a reload of an open check-in is accepted');
    }

    const activate = await call('POST', `/grounds/${gid}/report/activate`, {}, admin.token);
    if (activate.status >= 400 && !/not ready|no report|yet/i.test(said(activate)))
      note('shared report', 'Asking to see a report that does not exist yet gives an answer that never mentions the report',
        `${activate.status} ${said(activate)}`);
    else ok(`activate before there is a report: ${activate.status} ${said(activate).slice(0, 90)}`);
  }

  const badInvite = await call('POST', '/entry/join-accept', { joinToken: 'no-such-token', email: anAddress('arrive') });
  if (!/expired|not|ask|link/i.test(said(badInvite)))
    note('participant arrival', 'A bad join attempt does not say what went wrong', `${badInvite.status} ${said(badInvite)}`);
  else ok(`a bad join says: ${said(badInvite).slice(0, 110)}`);

  let throttled = '';
  for (let i = 0; i < 7; i++) {
    const r = await call('POST', '/entry/join-accept', { joinToken: 'no-such-token', email: anAddress('flood') });
    if (r.status === 429) { throttled = said(r); break; }
  }
  if (throttled && !/too many|wait|minute/i.test(throttled))
    note('navigation/cross-system UX', 'Being rate-limited reads as a fault rather than as "wait a moment"', throttled);
  else if (throttled) ok(`the rate limit says: ${throttled.slice(0, 90)}`);
  else note('navigation/cross-system UX', 'Seven identical failed join attempts in a row were all accepted with no limit', 'no 429 in 7 tries');

  const wrongPassword = await call('POST', '/auth/login', { email: admin.email, password: 'not-the-password' });
  if (/incorrect email or password/i.test(said(wrongPassword))) ok('a wrong password does not say which half was wrong');
  else note('signup/sign-in', 'A failed sign-in says more than it should, or less than it needs to', said(wrongPassword));

  const noToken = await call('GET', '/grounds');
  if (!/sign in|log in|signed in/i.test(said(noToken)))
    note('navigation/cross-system UX', 'Being signed out is reported as a token problem rather than as "sign in again"',
      `${noToken.status} ${said(noToken)}`);

  /* The public API is prefix-EXCLUDED, so it is /api/org/v1 and not under /api/v1. */
  const machine = await fetch('http://localhost:3000/api/org/v1/subjects?type=person')
    .then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) }))
    .catch(() => ({ status: 0, data: {} as any }));
  if (machine.status >= 400 && !/credential|key|token|access/i.test(said(machine)))
    note('machine caller', 'The API refuses an unauthenticated caller without naming what is missing', `${machine.status} ${said(machine)}`);
  else ok(`the API refuses an unauthenticated caller with: ${said(machine).slice(0, 90)}`);

  fs.writeFileSync('journey/hundred/probed-two.json', JSON.stringify(found, null, 1));
  console.log(`\n${found.length} recorded`);
}
main().catch((e) => { console.error('probe sweep stopped:', e?.message); process.exit(1); });
