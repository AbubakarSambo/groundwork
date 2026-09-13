import { readFileSync } from 'fs';
import { join } from 'path';
import { call, mailMark, mailSince, tokenIn, anAddress } from '../hundred/harness';

/**
 * THE GATE, AS IT WAS ACTUALLY DEFINED.
 *
 * "The gate is the conversation has to be worthwhile and make sense from start to close. The
 * reports have to make sense. You can set targets and upload a workplan to the context tab to guide
 * the conversation and what's reported on the board, same with a contract. The goal is for the lead
 * to be happy about where everything has gone and to feel like they are getting the information
 * they need and tracking what they need accurately."
 *
 * The 23-scenario run is not that. It asserts fields are present - seven real defects passed 1,715
 * of its checks - and it never uploads a document or sets a target, so the two things named above
 * as central to the gate have never been exercised end to end in it.
 *
 * THIS SCRIPT DOES NOT JUDGE. It drives a lead's actual path and prints what a person reads at
 * every stage, in order. The judging is a person reading the output, which is the only thing that
 * can answer "would the lead be happy with this".
 *
 * ONE SCRIPT, ON PURPOSE. The invitations are sent BY the entry commit, so a second process cannot
 * find them: the mailbox mark has to be taken before the commit that sends them. Splitting this in
 * two cost a whole run.
 *
 *   npx ts-node -T journey/the-real-gate/run.ts
 */
const now = () => new Date().toISOString().slice(11, 19);
const log = (s = '') => process.stdout.write(s ? `${now()}  ${s}\n` : '\n');
const show = (title: string, body: unknown) => {
  log(''); log(`──────── ${title}`);
  const t = typeof body === 'string' ? body : JSON.stringify(body, null, 1);
  for (const line of String(t ?? '').split('\n')) process.stdout.write(`          ${line}\n`);
};
const settle = (ms = 900) => new Promise((r) => setTimeout(r, ms));
const API = 'http://localhost:3000/api/v1';

const BRIEF = 'We are shipping the onboarding rewrite this quarter and I want to know each week whether the plan is actually being followed and where it is stuck.';

const TOMI = [
  ['The build is on track for the 14th. I have the migration scoped behind it.',
   'What I am waiting on is legal clearing the migration email. I asked last Tuesday and have heard nothing.'],
  ['Build shipped on the 12th, two days early. Migration started Monday.',
   'Legal came back and cleared it. Nine of the forty teams are migrated.'],
  ['All forty migrated by Friday. Support had three tickets out of forty.', 'Nothing outstanding from me.'],
];
const ZAINAB = [
  ['Pricing page draft is done. I cannot put it live because finance have not signed off the price points.',
   'I chased finance twice, last Thursday and again on Monday.'],
  ['Finance signed off on the 5th, so pricing went live on the 7th as planned.',
   'The launch email is written and goes out with the migration.'],
  ['Launch email went out. We are at 180 teams through onboarding.', 'Nothing is blocking me.'],
];
const ADA = [
  [],
  ['Both cleared. Pricing is live and migration has started, so the plan is holding.',
   'I want to know we will make 200 by the 31st.'],
  ['We landed it. 200 teams through, and support contact stayed low.', 'Nothing outstanding.'],
];

async function uploadToContext(groundId: string, token: string, file: string, note: string) {
  const body = new FormData();
  body.append('file', new Blob([readFileSync(join(__dirname, file), 'utf8')], { type: 'text/plain' }), file);
  body.append('consentConfirmed', 'true');
  body.append('uploaderNote', note);
  const r = await fetch(`${API}/grounds/${groundId}/documents`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  return { status: r.status, data: await r.json().catch(() => null) };
}

async function aRound(token: string, checkInId: string, answers: string[], who: string) {
  await call('POST', `/check-ins/${checkInId}/open`, undefined, token);
  const said: string[] = [];
  const NUDGES = ['That is the whole picture from my side this round.', 'No other blockers I can name right now.',
    'Nobody else is waiting on me as far as I know.', 'That is everything I have for you.'];
  for (const a of answers) {
    const r = await call('POST', `/check-ins/${checkInId}/messages`, { message: a }, token);
    said.push(`${who}: ${a}\n  -> ${String(r.data?.reply ?? '(no reply)').replace(/\n/g, '\n     ')}`);
  }
  for (let i = 0; i <= NUDGES.length; i += 1) {
    const done = await call('POST', `/check-ins/${checkInId}/complete`, undefined, token);
    if (done.status < 300) return said;
    if (i === NUDGES.length) break;
    const r = await call('POST', `/check-ins/${checkInId}/messages`, { message: NUDGES[i] }, token);
    said.push(`${who}: ${NUDGES[i]}\n  -> ${String(r.data?.reply ?? '(no reply)').replace(/\n/g, '\n     ')}`);
  }
  said.push(`${who}: (THE ROUND WOULD NOT CLOSE)`);
  return said;
}

(async () => {
  const opener = await call('POST', '/entry/opener', { scenario: 'WORKPLAN_BUDGET' });
  show('THE ENTRY CHAT — what a lead meets first', opener.data?.reply);
  const history: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'assistant', content: String(opener.data?.reply ?? '') }];
  for (const line of [BRIEF, 'Three of us. Ada running it, Tomi on engineering, Zainab on marketing.', 'Weekly, for three weeks.']) {
    history.push({ role: 'user', content: line });
    const r = await call('POST', '/entry/chat', { messages: history, scenario: 'WORKPLAN_BUDGET' });
    history.push({ role: 'assistant', content: String(r.data?.reply ?? '') });
    show(`LEAD SAID: ${line}`, r.data?.reply);
  }

  const email = anAddress('lead');
  const signUp = mailMark();
  await call('POST', '/auth/entry-save', { email, draft: { payload: { situation: BRIEF }, history } });
  await settle();
  const link = mailSince(signUp).filter((m) => m.to === email).map((m) => m.link).filter(Boolean).pop();
  if (!link) { log('NO SIGN-UP EMAIL'); process.exit(1); }
  const LEAD = (await call('POST', '/auth/verify-email', { token: tokenIn(link) })).data?.accessToken;

  const read = await call('POST', '/entry/report', { messages: history, scenario: 'WORKPLAN_BUDGET', groundLabel: 'The onboarding rewrite' });
  show('THE REPORT AT THE END OF THE ENTRY CHAT', read.data?.report);

  const people = [
    { email: anAddress('tomi'), who: 'TOMI', role: 'Engineering', say: TOMI },
    { email: anAddress('zainab'), who: 'ZAINAB', role: 'Marketing', say: ZAINAB },
  ];
  /* The mark goes BEFORE the commit, because the commit is what sends the invitations. */
  const invites = mailMark();
  const committed = await call('POST', '/entry/commit', {
    groundLabel: 'The onboarding rewrite', scenario: 'WORKPLAN_BUDGET', history,
    reportSummary: read.data?.report ?? undefined, roleAsDescribed: 'Chief of staff',
    contributors: people.map((p) => ({ email: p.email })),
  }, LEAD);
  const GROUND = String(committed.data?.groundId ?? '');
  if (!GROUND) { show('COMMIT FAILED', committed.raw); process.exit(1); }
  log(`ground ${GROUND}`);

  const up = await uploadToContext(GROUND, LEAD, 'the-workplan.txt', 'This is the plan we are working to. The weekly number is at the bottom.');
  show('THE WORKPLAN, UPLOADED TO CONTEXT', up.data?.data ?? up.data);
  const docs = await call('GET', `/grounds/${GROUND}/documents`, undefined, LEAD);
  /* `name`, not `fileName`: that is what the list returns (toDocShape), and looking for the wrong
     one cost a whole run - the workplan stayed private and the test became a different test. */
  const plan = (Array.isArray(docs.data) ? docs.data : docs.data?.documents ?? []).find((d: any) => String(d.name ?? d.fileName).includes('workplan'));
  if (!plan) { show('COULD NOT FIND THE WORKPLAN BACK', docs.data); }
  else {
    const v = await call('PATCH', `/grounds/${GROUND}/documents/${plan.id}/visibility`, { visibility: 'OPEN' }, LEAD);
    log(`shared the workplan with the team -> ${v.status}`);
  }

  for (const [name, target] of [['Teams through onboarding', 200], ['Teams migrated', 40]] as [string, number][]) {
    log(`target "${name}" -> ${(await call('POST', `/grounds/${GROUND}/board/objectives`, { name, target }, LEAD)).status}`);
  }

  await settle(1500);
  for (const p of people) {
    const l = mailSince(invites).filter((m) => m.to === p.email).map((m) => m.link).filter(Boolean).pop();
    if (!l) { log(`NO INVITATION for ${p.who}`); continue; }
    /*
     * With their name, then their role as a separate press.
     *
     * `accept` takes a name and nothing else - sending roleAsDescribed with it is refused whole by
     * the validation pipe, which is right and cost me a run. The role is its own PATCH because it
     * is set from the panel, by a person, after they are in.
     */
    const firstName = p.who[0] + p.who.slice(1).toLowerCase();
    const acc = await call('POST', '/participants/accept', { token: tokenIn(l), firstName });
    (p as any).token = acc.data?.accessToken ?? null;
    if (!(p as any).token) log(`  accept refused: ${acc.status} ${JSON.stringify(acc.raw).slice(0, 160)}`);
    const pid = ((await call('GET', `/grounds/${GROUND}`, undefined, LEAD)).data?.participants ?? [])
      .find((x: any) => x.email === p.email)?.id;
    if (pid) await call('PATCH', `/participants/${pid}`, { roleAsDescribed: p.role }, LEAD);
    log(`${p.who} in -> ${(p as any).token ? 'yes' : 'NO'}`);
  }

  const g0 = await call('GET', `/grounds/${GROUND}`, undefined, LEAD);
  const parties = g0.data?.participants ?? [];
  const leadId = parties.find((x: any) => x.partyType === 'INITIATOR')?.id;
  const idFor = (e: string) => parties.find((x: any) => x.email === e)?.id;

  for (let round = 1; round <= 3; round += 1) {
    log(''); log(`════════════════════════════════════ ROUND ${round}`);
    const fresh = await call('GET', `/grounds/${GROUND}`, undefined, LEAD);
    const rows = (fresh.data?.checkIns ?? []).filter((c: any) => c.sessionNumber === round && !c.isSetup);
    for (const c of rows) {
      const isLead = c.participantId === leadId;
      const p = people.find((x) => idFor(x.email) === c.participantId);
      const tok = isLead ? LEAD : (p as any)?.token;
      const answers = isLead ? ADA[round - 1] : (p?.say[round - 1] ?? []);
      if (!tok) { log(`no way in for participant ${c.participantId}`); continue; }
      if (c.status === 'COMPLETED') { log(`${isLead ? 'ADA' : p?.who} round ${round} was already closed by setup`); continue; }
      if (!answers.length) { log(`${isLead ? 'ADA' : p?.who} has nothing scripted for round ${round}`); continue; }
      show(`ROUND ${round} — ${isLead ? 'ADA (lead)' : p?.who}'s conversation`, (await aRound(tok, c.id, answers, isLead ? 'ADA' : String(p?.who))).join('\n\n'));
    }
    log('waiting for the round to be written up...');
    await settle(30000);
    show(`ROUND ${round} — THE SHARED REPORT, as the lead reads it`, (await call('GET', `/grounds/${GROUND}/report/session/${round}`, undefined, LEAD)).data);
    show(`ROUND ${round} — THE BOARD`, (await call('GET', `/grounds/${GROUND}/board`, undefined, LEAD)).data);
  }
  log(''); log(`DONE. ground ${GROUND}`);
})();
