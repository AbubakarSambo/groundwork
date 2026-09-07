
/**
 * THE QUESTIONS THE RUNS DID NOT ANSWER, ASKED DIRECTLY.
 *
 * A journey shows whether somebody got there. These ask the things somebody wonders on the way:
 * can I find this again, does anybody tell me it is ready, what happens if I do it twice, what am
 * I looking at. Each probe is one question, driven through the routes a person's browser calls.
 */
import * as fs from 'fs';
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';

const found: { group: string; issue: string; evidence: string }[] = [];
const note = (group: string, issue: string, evidence: string) => {
  found.push({ group, issue, evidence: evidence.slice(0, 220) });
  console.log(`  [${group}] ${issue}\n       ${evidence.slice(0, 150)}`);
};
const ok = (what: string) => console.log(`  (fine) ${what}`);

async function anAdmin() {
  const email = anAddress('probe');
  const mark = mailMark();
  await call('POST', '/auth/entry-save', { email });
  await new Promise((r) => setTimeout(r, 700));
  const mail = mailSince(mark).filter((m) => m.to === email);
  const verified = await call('POST', '/auth/verify-email', { token: tokenIn(mail[mail.length - 1]?.link ?? null) });
  if (!verified.data?.accessToken) console.log('  !! verify-email:', verified.status, JSON.stringify(verified.data).slice(0,300), '| link:', mail[mail.length-1]?.link);
  return { email, token: verified.data?.accessToken as string, name: verified.data?.user?.firstName };
}

async function main() {
  console.log('probing what a person would wonder:\n');

  // 1 ── the name in the greeting
  const admin = await anAdmin();
  if (!admin.name) note('signup/sign-in', 'An account is created with no first name, so every email opens "Hi ,"',
    `the account made from an address alone has firstName ${JSON.stringify(admin.name)}`);
  else ok('the account has a name to greet');

  // 2 ── what the list shows before anything has happened
  const emptyList = await call('GET', '/grounds', undefined, admin.token);
  const rows = emptyList.data?.grounds ?? emptyList.data?.items ?? (Array.isArray(emptyList.data) ? emptyList.data : []);
  if (Array.isArray(rows) && rows.length === 0) ok('a new organisation opens on an empty list');

  // 3 ── a check-in, and whether the list says anything useful about it
  const made = await call('POST', '/grounds', {
    label: 'Probe check-in', scenario: 'NEW_HIRE', moment: 'STARTING', timelineDays: 90,
    brief: 'We are agreeing what the first ninety days should produce and who is responsible for what.',
  }, admin.token);
  const groundId = String(made.data?.id ?? '');
  if (!groundId) { console.log('  !! could not create a check-in:', made.status, JSON.stringify(made.data).slice(0, 300)); return; }
  const other = anAddress('probeother');
  const beforeInvite = mailMark();
  await call('POST', `/grounds/${groundId}/participants`, { email: other }, admin.token);

  const list = await call('GET', '/grounds', undefined, admin.token);
  const all = list.data?.grounds ?? list.data?.items ?? (Array.isArray(list.data) ? list.data : []);
  const mine = all.find((g: any) => g.id === groundId);
  if (mine && !/waiting|await|not started|yet/i.test(JSON.stringify(mine))) {
    note('navigation/cross-system UX', 'The list of check-ins does not say what a check-in is waiting for',
      `the row carries: ${Object.keys(mine).slice(0, 12).join(', ')}`);
  }

  // 4 ── inviting the same person twice
  const again = await call('POST', `/grounds/${groundId}/participants`, { email: other }, admin.token);
  const invites = mailSince(beforeInvite).filter((m) => m.to === other && /invited you/i.test(m.subject));
  if (again.status < 400 && !again.data?.alreadyInvited) {
    note('participants', 'Inviting the same person twice is accepted without saying they were already invited',
      `second invite answered ${again.status}; ${invites.length} invitations reached them`);
  } else if (again.data?.alreadyInvited) {
    ok(`a second invitation says so: "${String(again.data.saying).slice(0, 90)}"`);
  }

  // 5 ── a typo'd address
  const typo = await call('POST', `/grounds/${groundId}/participants`, { email: 'not-an-address' }, admin.token);
  const said = JSON.stringify(typo.data?.message ?? typo.data);
  if (/must be an email/.test(said)) {
    note('first check-in setup', 'A mistyped address is refused with a validation string rather than a sentence', said);
  }

  // 6 ── an address that is already on the check-in as the organiser
  const self = await call('POST', `/grounds/${groundId}/participants`, { email: admin.email }, admin.token);
  note('participants', 'Adding yourself as the other party is answered with', `${self.status} ${JSON.stringify(self.data?.message ?? '').slice(0, 90)}`);

  // 7 ── the report before anybody has checked in
  const early = await call('GET', `/grounds/${groundId}/report`, undefined, admin.token);
  if (early.status === 404) {
    note('shared report', 'Before anybody has answered, the report page says "Report not found"',
      `${early.status} ${JSON.stringify(early.data?.message ?? '')}`);
  }

  // 8 ── what a person who is not on it sees
  const stranger = await anAdmin();
  const peek = await call('GET', `/grounds/${groundId}`, undefined, stranger.token);
  const peekReport = await call('GET', `/grounds/${groundId}/report`, undefined, stranger.token);
  ok(`somebody not on the check-in gets ${peek.status} for the check-in and ${peekReport.status} for its report`);
  if (peek.status === 403 && peekReport.status === 404) {
    note('trust/privacy UX', 'A stranger is told a check-in exists but is forbidden, and told its report does not exist — two different answers about the same thing',
      `check-in ${peek.status}, report ${peekReport.status}`);
  }

  // 10 ── the same message twice, deliberately (BEFORE the ceiling probe uses up the turns)
  const partyListFirst = await call('GET', `/grounds/${groundId}`, undefined, admin.token);
  const myCheckIn = (partyListFirst.data?.participants ?? []).find((p: any) => p.email === admin.email)?.checkIns?.[0]?.id;
  if (myCheckIn) {
    await call('POST', `/check-ins/${myCheckIn}/open`, {}, admin.token);
    const line = 'The same sentence, sent twice because the first one seemed to hang.';
    await call('POST', `/check-ins/${myCheckIn}/messages`, { message: line }, admin.token);
    const twice = await call('POST', `/check-ins/${myCheckIn}/messages`, { message: line }, admin.token);
    const transcript = await call('GET', `/check-ins/${myCheckIn}/transcript`, undefined, admin.token);
    const turns: any[] = transcript.data?.turns ?? transcript.data?.messages ?? [];
    const n = turns.filter((t: any) => String(t.content ?? '').trim() === line).length;
    if (n > 1) note('completion', 'The same answer sent twice is stored twice, with nothing collapsing it',
      `sent twice, second answered ${twice.status}, the record holds it ${n} times`);
    else ok(`the same answer sent twice is in the record ${n} time (second press answered ${twice.status})`);
  }

  // 9 ── the 20-turn ceiling
  if (myCheckIn) {
    let hitTheCeiling = '';
    for (let i = 0; i < 22; i++) {
      const r = await call('POST', `/check-ins/${myCheckIn}/messages`, { message: `Answer number ${i + 1}, said properly and at some length so it counts as a real answer about the work.` }, admin.token);
      if (r.status >= 400) { hitTheCeiling = `at turn ${i + 1}: ${r.status} ${JSON.stringify(r.data?.message ?? '').slice(0, 110)}`; break; }
    }
    if (hitTheCeiling) note('participant check-in chat', 'There is a ceiling on how much somebody may say, and it arrives as a refusal', hitTheCeiling);
    else ok('twenty-two answers were all accepted');
  }

  fs.writeFileSync('journey/hundred/probed.json', JSON.stringify(found, null, 1));
  console.log(`\n${found.length} recorded`);
}
main();
