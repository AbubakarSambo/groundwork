/**
 * THE THIRD SWEEP: one person's own copy, documents, where somebody wants to be told, and the
 * hand-off to a lead. None of the hundred journeys asked these, so none of them could answer.
 */
import * as fs from 'fs';
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';

const found: { group: string; issue: string; evidence: string }[] = [];
const note = (group: string, issue: string, evidence: string) =>
  (found.push({ group, issue, evidence: String(evidence).slice(0, 240) }),
   console.log(`  [${group}] ${issue}\n       ${String(evidence).slice(0, 150)}`));
const ok = (w: string) => console.log(`  (fine) ${w}`);
const said = (r: any) => JSON.stringify(r.data?.message ?? r.data ?? '').slice(0, 180);

async function anAdmin(local = 'p3') {
  const email = anAddress(local);
  const mark = mailMark();
  await call('POST', '/auth/entry-save', { email });
  await new Promise((r) => setTimeout(r, 800));
  const mail = mailSince(mark).filter((m) => m.to === email);
  const v = await call('POST', '/auth/verify-email', { token: tokenIn(mail[mail.length - 1]?.link ?? null) });
  return { email, token: v.data?.accessToken as string };
}

async function main() {
  const admin = await anAdmin();
  const made = await call('POST', '/grounds', {
    label: 'Sweep three', scenario: 'NEW_HIRE', moment: 'STARTING', timelineDays: 90,
    brief: 'Somebody is starting in two weeks and we are agreeing what the first ninety days should produce.',
  }, admin.token);
  const gid = String(made.data?.id ?? '');
  if (!gid) { note('first check-in setup', 'A check-in could not be created', said(made)); return; }

  const g = await call('GET', `/grounds/${gid}`, undefined, admin.token);
  const mine = (g.data?.participants ?? []).find((p: any) => p.email === admin.email);
  const checkInId = mine?.checkIns?.[0]?.id;

  // ── DOCUMENTS ────────────────────────────────────────────────────────
  /* Multipart, because that is what the upload control sends. */
  const form = new FormData();
  form.append('file', new Blob([
    'Offer letter. Base salary 90,000. Start date 1 October. Reports to the delivery lead. Probation 3 months.',
  ], { type: 'text/plain' }), 'offer-letter.txt');
  form.append('consentConfirmed', 'true');
  const doc = await fetch(`http://localhost:3000/api/v1/grounds/${gid}/documents`, {
    method: 'POST', headers: { authorization: `Bearer ${admin.token}` }, body: form,
  }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) }))
    .catch(() => ({ status: 0, data: {} as any }));
  if (doc.status >= 400) note('documents', 'A document could not be attached to a check-in at all', `${doc.status} ${said(doc)}`);
  else {
    /* The API wraps everything in { success, data }, so read through it. */
    const d = (doc.data as any)?.data ?? doc.data ?? {};
    if (!('visibility' in d)) note('documents', 'An attached document comes back with no visibility on it, so nobody can tell who will see it', Object.keys(d).join(', '));
    else ok(`an attached document says its visibility: ${d.visibility}`);
    const list = await call('GET', `/grounds/${gid}/documents`, undefined, admin.token);
    const rows = list.data?.documents ?? (Array.isArray(list.data) ? list.data : []);
    if (Array.isArray(rows) && rows.length && !/assessment|read|summary/i.test(JSON.stringify(rows[0])))
      note('documents', 'A document sits on the check-in with nothing saying whether it was read or what was taken from it', Object.keys(rows[0]).join(', '));
  }

  // ── WHERE SOMEBODY WANTS TO BE TOLD ──────────────────────────────────
  const where = await call('GET', '/integrations/workspace', undefined, admin.token);
  if (where.status >= 400)
    note('notifications', 'There is nowhere to say how you want to be told, so email is the only channel and nobody chose it', `${where.status} ${said(where)}`);
  else ok(`a person can say where they want to be told: ${said(where).slice(0, 90)}`);

  // ── ONE PERSON'S OWN COPY ────────────────────────────────────────────
  if (checkInId) {
    await call('POST', `/check-ins/${checkInId}/open`, {}, admin.token);
    for (const line of [
      'They start on the first of October and I want them owning the delivery board by the end of the first month.',
      'The risk is that nobody has said who signs off the plan, so it will sit with me by default and that is the thing I am trying to stop.',
      'By ninety days I want them running the weekly review without me in the room, and the offer letter is attached.',
    ]) await call('POST', `/check-ins/${checkInId}/messages`, { message: line }, admin.token);
    const done = await call('POST', `/check-ins/${checkInId}/complete`, {}, admin.token);
    ok(`finishing answered ${done.status}`);

    const own = await call('GET', `/check-ins/${checkInId}/artifact`, undefined, admin.token);
    if (own.status >= 400)
      note('individual report', 'A person cannot read the summary of their own check-in', `${own.status} ${said(own)}`);
    else {
      const text = JSON.stringify(own.data);
      const empty = !own.data?.artifact || text.length < 60;
      if (empty)
        note('individual report', 'A finished check-in has no summary of its own: the person who just answered for ten minutes is handed nothing until everybody else has answered too',
          `${own.status} ${text.slice(0, 80)}`);
      else {
        if (!/attach|document|offer letter/i.test(text))
          note('individual report', 'A summary does not mention the document the person attached and referred to in their own answer', `${text.length} characters, no mention`);
        if (!/next|then|after/i.test(text))
          note('individual report', 'A summary does not say what happens next', text.slice(0, 120));
      }
    }

    const transcript = await call('GET', `/check-ins/${checkInId}/transcript`, undefined, admin.token);
    const turns = transcript.data?.turns ?? [];
    const asked = turns.filter((t: any) => t.role === 'AI').map((t: any) => String(t.content ?? ''));
    if (asked.some((a: string) => /\?[^?]*\?[^?]*\?/.test(a)))
      note('participant check-in chat', 'A single reply asks three or more questions at once', asked.find((a: string) => /\?[^?]*\?[^?]*\?/.test(a))!.slice(0, 150));
    else ok('no reply asked three questions at once');
    const longest = Math.max(0, ...asked.map((a: string) => a.length));
    if (longest > 900) note('participant check-in chat', 'A reply runs past 900 characters, which is a wall of text on a phone', `longest reply ${longest} characters`);
  }

  // ── HANDING IT TO A LEAD ─────────────────────────────────────────────
  const leadEmail = anAddress('lead');
  const beforeLead = mailMark();
  const handed = await call('POST', '/grounds/for-lead', {
    leadEmail, leadName: 'A Lead',
    leadRemit: 'Runs delivery, and owns the plan this new starter is joining.',
    label: 'Handed over', scenario: 'NEW_HIRE', moment: 'STARTING', timelineDays: 90,
    brief: 'Setting this up for the delivery lead to run with their own new starter.',
    participants: [{ email: anAddress('theirs') }],
  }, admin.token);
  if (handed.status >= 400) {
    note('lead hand-off', 'Setting a check-in up for somebody else to run was refused', `${handed.status} ${said(handed)}`);
  } else {
    await new Promise((r) => setTimeout(r, 900));
    const toLead = mailSince(beforeLead).filter((m) => m.to === leadEmail);
    if (!toLead.length) note('lead hand-off', 'The lead a check-in was handed to is not emailed about it', 'no mail reached them');
    else if (!/you|your|run|lead/i.test(toLead[0].subject))
      note('lead hand-off', 'The email to the lead does not say the check-in is now theirs to run', toLead[0].subject);
    else ok(`the lead is told: "${toLead[0].subject}"`);
  }

  fs.writeFileSync('journey/hundred/probed-three.json', JSON.stringify(found, null, 1));
  console.log(`\n${found.length} recorded`);
}
main().catch((e) => { console.error('sweep three stopped:', e?.message); process.exit(1); });
