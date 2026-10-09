/**
 * THE SUITES PRIVACY SWEEP, on the test bed (copy a: `SWEEP=a api/journey/sweep/bed.sh up`, then `node api/journey/sweep/the-suites-privacy-sweep.mjs`).
 *
 * It signs in as eight people of Msingi Foods and reads, for each, every route that takes the id of a request, a review or a week of hours
 * (history, one review). A person is let in only if it is theirs, they are the approver for it by the suite's rules (their lead for their team's,
 * finance for a request above the limit), or they are an admin; anyone else is refused. It refuses to pass if anyone else is let in.
 *
 * It needs rows to read, which it finds in the copy's database: the requests, reviews and hours of people in the Sales and Operations teams.
 * Hours and reviews are not in the seed; add a few first (see the note at the end of docs/answers-from-engine.md for 9 October, B-124 and the sweep).
 */
import fs from 'fs';
import { execSync } from 'child_process';

const here = new URL('.', import.meta.url).pathname;
const d = JSON.parse(fs.readFileSync(here + 'the-five-orgs.a.json', 'utf8'));
const org = d.organisations.clientOrg;
const B = 'http://localhost:3201/api/v1';
const sql = (q) => execSync(`psql gw_sweep_a -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim().split('\n').filter(Boolean);
const orgId = sql("select id from organizations where slug='sweep-client-org'")[0];
const readers = ['grace', 'wairimu', 'baraka', 'amani', 'chidi', 'fatuma', 'peter', 'kito'];
const tok = {};
for (const k of readers) {
  const p = org.people.find((x) => x.key === k);
  const r = await fetch(B + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: p.email, password: p.password }) });
  const j = await r.json();
  tok[k] = j.data?.accessToken ?? j.accessToken;
  if (!tok[k]) { console.log(`Could not sign in as ${k} (${r.status}); sign-ins are limited to a few a minute, so wait a minute and run it again.`); process.exit(2); }
}
const status = async (k, path) => (await fetch(B + path, { headers: { authorization: 'Bearer ' + tok[k] } })).status;
const email = (e) => e.split('@')[0];

/* who may read it: the person, their lead, an admin, and finance for spending above the limit */
const mayRead = { amani: ['amani', 'wairimu', 'grace'], chidi: ['chidi', 'wairimu', 'grace'], kito: ['kito', 'baraka', 'grace'], tobi: ['baraka', 'grace'], lerato: ['baraka', 'grace', 'fatuma'], wairimu: ['wairimu', 'grace', 'fatuma'] };
const checks = [];
for (const r of sql(`select r.id||'|'||p.external_id from performance_reviews r join people p on p.external_id=r.person_external_id and p.organization_id=r.organization_id where r.organization_id='${orgId}'`)) {
  const [id, who] = r.split('|');
  for (const tail of ['', '/history']) checks.push([`review of ${who}${tail}`, `/suites/reviews/${id}${tail}`, mayRead[who] ?? []]);
}
for (const r of sql(`select l.id||'|'||u.email from leave_requests l join users u on u.id=l.user_id where l.organization_id='${orgId}' limit 40`)) {
  const [id, who] = r.split('|');
  if (mayRead[email(who)]) checks.push([`leave of ${email(who)} history`, `/suites/leave/requests/${id}/history`, mayRead[email(who)]]);
}
for (const r of sql(`select l.id||'|'||u.email from spend_requests l join users u on u.id=l.user_id where l.organization_id='${orgId}' limit 40`)) {
  const [id, who] = r.split('|');
  if (mayRead[email(who)]) checks.push([`spend of ${email(who)} history`, `/suites/spend/requests/${id}/history`, mayRead[email(who)]]);
}
const monday = sql("select date_trunc('week', now())::date")[0];
for (const who of ['amani', 'kito']) {
  const uid = sql(`select id from users where email='${who}@msingi.test'`)[0];
  checks.push([`hours of ${who} history`, `/suites/time/weeks/${monday}/people/${uid}/history`, mayRead[who]]);
}
let bad = 0;
for (const [what, path, allowed] of checks) {
  const letIn = [];
  for (const k of readers) if ((await status(k, path)) === 200) letIn.push(k);
  const tooMany = letIn.filter((k) => !allowed.includes(k));
  if (tooMany.length) { bad += 1; console.log(`LEAK ${what}: also let in ${tooMany.join(', ')}`); }
  else console.log(`ok   ${what}: ${letIn.join(', ')}`);
}
if (bad) { console.log(`\n${bad} route(s) let in somebody who may not read it.`); process.exit(1); }
console.log(`\nAll ${checks.length} routes let in only the person, their approver and an admin.`);
