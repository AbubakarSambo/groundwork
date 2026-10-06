/**
 * EVERYTHING THE OLD CONTEXT CHAT DOES, DONE THROUGH ASK GROUNDWORK, SIDE BY SIDE, ON THIS COMPUTER (piece 5, G).
 *
 * The same words are said twice, on two check-ins that start identical: once through the old setup chat on the check-in page
 * (`POST /grounds/:id/context-chat` and its confirm, and the typed-in routes), and once through Ask Groundwork with
 * `release.contextInAskGroundwork` switched on. Then the rows each one wrote are read out of the database and set side by side.
 * Real: the API, the model, the database. The switch is written in this local database only, and the old chat is not switched off.
 *
 * Tana Foods. Wanjiru leads; Grace is an admin; Miriam and Piet are people in each check-in. Start the API (with model access)
 * on a local gw_ database first, then:  API=http://localhost:3059/api/v1 DATABASE_URL=... npx ts-node -T journey/context-through-ask-side-by-side-with-the-old-chat.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const API = process.env.API ?? 'http://localhost:3059/api/v1';
const DB_URL = process.env.DATABASE_URL ?? '';
const PW = 'ContextAsk123!';
const stamp = Date.now();

(async () => {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API) || !/@(localhost|127\.0\.0\.1)(:\d+)?\/gw_/.test(DB_URL)) throw new Error('Refusing: a local API and a local gw_ database are required.');
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const checks: { what: string; ok: boolean }[] = [];
  const check = (what: string, ok: boolean, detail?: string) => { checks.push({ what, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${!ok && detail ? `\n        ${detail.slice(0, 900)}` : ''}`); };
  const call = async (p: string, token: string | null, method = 'GET', body?: any, form?: FormData) => {
    const res = await fetch(`${API}${p}`, { method, headers: { ...(form ? {} : { 'content-type': 'application/json' }), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: form ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const text = await res.text(); let j: any = null; try { j = text ? JSON.parse(text) : null; } catch { /* text */ }
    return { status: res.status, data: j && typeof j === 'object' && 'data' in j ? j.data : j, text };
  };
  const said = (r: { data: any; text: string }) => (r.data?.blocks ? r.data.blocks.map((b: any) => b.body ?? b.summary ?? '').filter(Boolean).join(' / ') : (r.data?.reply ?? r.data?.proposal?.say ?? r.text)).toString();
  const proposalOf = (r: { data: any }) => (r.data?.blocks ?? []).find((b: any) => b.type === 'proposal');

  console.log('\n==================== SETTING UP ====================');
  const tana = await prisma.organization.create({ data: { name: `Tana ${stamp}`, slug: `tana-${stamp}`, email: `tana.${stamp}@ctx.test` } });
  const hash = await bcrypt.hash(PW, 10);
  const make = async (first: string, role: 'ADMIN' | 'LEAD' | 'MEMBER') => {
    const u = await prisma.user.create({ data: { email: `${first.toLowerCase()}.${stamp}@ctx.test`, firstName: first, lastName: 'Test', organizationId: tana.id, passwordHash: hash, isEmailVerified: true, role: role as any } });
    await prisma.organizationMembership.upsert({ where: { userId_organizationId: { userId: u.id, organizationId: tana.id } }, create: { userId: u.id, organizationId: tana.id, role: role as any }, update: {} });
    await prisma.person.create({ data: { organizationId: tana.id, sourceSystem: 'seed', externalId: first.toLowerCase(), userName: first.toLowerCase(), displayName: `${first} Test`, givenName: first, familyName: 'Test', email: u.email, linkedUserId: u.id } });
    return u;
  };
  const wanjiru = await make('Wanjiru', 'LEAD'); const grace = await make('Grace', 'ADMIN'); const miriam = await make('Miriam', 'MEMBER'); const piet = await make('Piet', 'MEMBER');
  const tok = async (u: { email: string }) => (await call('/auth/login', null, 'POST', { email: u.email, password: PW })).data?.accessToken as string;
  const T = { wanjiru: await tok(wanjiru), grace: await tok(grace), miriam: await tok(miriam) };
  const makeGround = async (label: string, lead: { id: string }) => {
    const g = await prisma.ground.create({ data: { organizationId: tana.id, initiatorId: lead.id, scenario: 'NEW_PROJECT' as any, moment: 'STARTING' as any, status: 'ACTIVE' as any, label, timelineDays: 60, brief: 'Get the Q3 sales pipeline moving.' } as any });
    await prisma.groundParticipant.create({ data: { groundId: g.id, userId: lead.id, email: `${label}@x.test`.replace(/[^a-z0-9@.]/gi, '').toLowerCase() || 'l@x.test', partyType: 'INITIATOR' as any } }).catch(() => undefined);
    for (const u of [miriam, piet]) await prisma.groundParticipant.create({ data: { groundId: g.id, userId: u.id, email: u.email, partyType: 'PARTICIPANT' as any, nameGiven: u.firstName } });
    return g;
  };
  const pair = async (name: string, lead = wanjiru) => ({ old: await makeGround(`${name} (old chat)`, lead), ask: await makeGround(`${name} (Ask)`, lead) });
  const snapshot = async (groundId: string) => {
    const ps = await prisma.groundParticipant.findMany({ where: { groundId }, select: { id: true, nameGiven: true, roleAsDescribed: true } });
    const nm = (id: string | null) => ps.find((p) => p.id === id)?.nameGiven ?? null;
    const items = (await prisma.groundContextItem.findMany({ where: { groundId }, orderBy: { createdAt: 'asc' } })).map((i) => `${i.kind} | ${i.audience} | ${i.text} | about ${nm(i.aboutParticipantId)}${i.exactQuestion ? ` | asks "${i.exactQuestion}" confirmed ${!!i.questionConfirmedAt}` : ''}${i.closedAt ? ' | closed' : ''}`);
    const notes = (await prisma.leadContextNote.findMany({ where: { groundId }, orderBy: { createdAt: 'asc' } })).map((n) => `NOTE | ${n.audience} | ${n.text} | about ${nm(n.participantId)}`);
    const goals = (await prisma.groundObjective.findMany({ where: { groundId } })).map((o: any) => `GOAL | ${o.name} | ${o.target ?? ''} | ${nm(o.ownerParticipantId)}`);
    const commits = (await prisma.groundCommitment.findMany({ where: { groundId } })).map((c: any) => `COMMITMENT | ${c.text} | ${nm(c.participantId)}`);
    const expects = (await prisma.personObjective.findMany({ where: { groundId } })).map((o: any) => `EXPECTATION | ${nm(o.participantId)} | ${o.text}`);
    const baselines = (await prisma.groundBaseline.findMany({ where: { groundId } })).map((b: any) => `BASELINE | ${String(b.successLooksLike ?? '').slice(0, 120)}`);
    const roles = ps.filter((p) => p.roleAsDescribed).map((p) => `ROLE | ${p.nameGiven} | ${p.roleAsDescribed}`);
    return [...items, ...notes, ...goals, ...commits, ...expects, ...baselines, ...roles].sort();
  };
  const same = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);
  const show = (who: string, how: string, rows: string[]) => console.log(`    ${who}, through ${how}, wrote ${rows.length} row${rows.length === 1 ? '' : 's'}:\n${rows.map((r) => `      - ${r}`).join('\n') || '      (nothing)'}`);

  // The switch, in this local database only. Before it, Ask does not take context (proved separately in the run log).
  await prisma.platformSetting.upsert({ where: { key: 'release.contextInAskGroundwork' }, create: { key: 'release.contextInAskGroundwork', value: { on: false } as any, updatedBy: 'ctx-journey' }, update: { value: { on: false } as any } });
  const g0 = await makeGround('Switch off', wanjiru);
  const off = await call('/ask', T.wanjiru, 'POST', { message: 'decision: we will drop the pilot', groundId: g0.id });
  console.log(`    With the switch OFF, Wanjiru asks Ask Groundwork to add a decision and reads: ${said(off)}`);
  check('With the switch off Ask does not take context, and the old chat still answers', !/added|Is that right/i.test(said(off)) && (await call(`/grounds/${g0.id}/context-chat`, T.wanjiru, 'POST', { history: [] })).status === 201, said(off));
  await prisma.platformSetting.update({ where: { key: 'release.contextInAskGroundwork' }, data: { value: { on: true } as any } });
  console.log('  The switch is now ON in this local database. The old chat is left exactly as it was.');

  const oldYes = async (groundId: string, token: string, said1: string) => {
    const first = await call(`/grounds/${groundId}/context-chat`, token, 'POST', { history: [{ role: 'user', content: said1 }] });
    const done = await call(`/grounds/${groundId}/context-chat/confirm`, token, 'POST', { said: said1, history: [{ role: 'user', content: said1 }, { role: 'assistant', content: first.data?.proposal?.say ?? '' }] });
    return { first, done };
  };
  const askYes = async (groundId: string, token: string, said1: string, openedFrom?: 'check_in_setup') => {
    const first = await call('/ask', token, 'POST', { message: said1, groundId, ...(openedFrom ? { openedFrom } : {}) });
    const p = proposalOf(first);
    const done = p ? await call('/ask/answer', token, 'POST', { proposalId: p.proposalId, answer: 'yes' }) : null;
    return { first, p, done };
  };

  console.log('\n==================== 1. THE SETUP DOOR: OPENING THE CONVERSATION ====================');
  const door = await pair('Door');
  const oldDoor = await call(`/grounds/${door.old.id}/context-chat`, T.wanjiru, 'POST', { history: [] });
  const askDoor = await call('/ask', T.wanjiru, 'POST', { message: '', groundId: door.ask.id, openedFrom: 'check_in_setup' });
  console.log(`    Wanjiru opens the old chat and reads: ${said(oldDoor).slice(0, 400)}`);
  console.log(`    Wanjiru opens Ask from inside the check-in and reads: ${said(askDoor).slice(0, 400)}`);
  check('Both open on a first question about what is missing, and write nothing', oldDoor.status < 300 && askDoor.status < 300 && said(oldDoor).length > 20 && said(askDoor).length > 20 && (await snapshot(door.old.id)).length === 0 && (await snapshot(door.ask.id)).length === 0, `${said(oldDoor)} || ${said(askDoor)}`);

  console.log('\n==================== 2. A LINE OF CONTEXT (DECISION, WAY OF WORKING, STRATEGY, NOTE) ====================');
  const line = await pair('Line');
  await call(`/grounds/${line.old.id}/context`, T.wanjiru, 'POST', { kind: 'DECISION', text: 'we will drop the pilot' });
  const askLine = await askYes(line.ask.id, T.wanjiru, 'decision: we will drop the pilot');
  console.log(`    Through Ask, Wanjiru says "decision: we will drop the pilot" and reads: ${said(askLine.first)} ... after yes: ${askLine.done ? said(askLine.done) : '(no yes asked)'}`);
  const l1 = await snapshot(line.old.id); const l2 = await snapshot(line.ask.id);
  show('Wanjiru', 'the old typed-in line', l1); show('Wanjiru', 'Ask', l2);
  check('The same line is written, with the same kind and who reads it', l1.length === 1 && same(l1, l2), `${l1} | ${l2}`);

  console.log('\n==================== 3. A LEAD\'S PRIVATE NOTE ====================');
  const note = await pair('Note');
  await call(`/grounds/${note.old.id}/lead-context`, T.wanjiru, 'POST', { text: 'keeps missing the Friday call', audience: 'LEAD_ONLY', participantId: (await prisma.groundParticipant.findFirst({ where: { groundId: note.old.id, userId: miriam.id } }))?.id });
  const askNote = await askYes(note.ask.id, T.wanjiru, 'private note about Miriam: keeps missing the Friday call');
  console.log(`    Through Ask: ${said(askNote.first)} ... after yes: ${askNote.done ? said(askNote.done) : '(no yes asked)'}`);
  const n1 = await snapshot(note.old.id); const n2 = await snapshot(note.ask.id);
  show('Wanjiru', 'the old lead-context route', n1); show('Wanjiru', 'Ask', n2);
  check('The same private note about Miriam is written, for the lead alone', n1.length === 1 && same(n1, n2) && /LEAD_ONLY/.test(n1[0]), `${n1} | ${n2}`);
  const miriamReads = await call(`/grounds/${note.ask.id}/context`, T.miriam);
  check('Miriam, who is in the check-in, reads none of the note', !/Friday call/.test(miriamReads.text), miriamReads.text.slice(0, 300));

  console.log('\n==================== 4. A PASTE OF PLAN AND NOTES (THE SETUP CONVERSATION READS IT) ====================');
  const paste = await pair('Paste');
  const dump = 'The team is the enterprise sales team and this is our plan for the quarter. Our goal this quarter is 12 qualified enterprise deals by 30 September. Miriam will send the price list by Friday. We review every quote over 1 million with finance before it goes out, and that is how we work. It is not decided yet whether we open Kisumu, and we will settle that in October. Ask Miriam which accounts actually have a buying process, because nobody has checked. Our strategy is to win enterprise customers first and small shops second.';
  const o = await oldYes(paste.old.id, T.wanjiru, dump);
  console.log(`    Old chat raw: ${JSON.stringify(o.first.data).slice(0, 900)}`);
  console.log(`    Old chat says back: ${said(o.first).slice(0, 700)}`);
  const a = await askYes(paste.ask.id, T.wanjiru, dump, 'check_in_setup');
  console.log(`    Ask says back: ${said(a.first).slice(0, 700)}`);
  console.log(`    After her yes, Ask says: ${a.done ? said(a.done).slice(0, 300) : '(none)'}`);
  const p1 = await snapshot(paste.old.id); const p2 = await snapshot(paste.ask.id);
  show('Wanjiru', 'the old chat', p1); show('Wanjiru', 'Ask', p2);
  check('Both write something from the paste, and nothing before the yes', p1.length > 0 && p2.length > 0, `${p1.length} ${p2.length}`);
  /* The model reads a paste afresh each time, so its own wording of a line varies from one reading to the next. So a third check-in is read through the old chat a second time, as a control, and what is compared is what KIND of thing was written, for whom, and who reads it. */
  const control = await makeGround('Paste (old chat, again)', wanjiru);
  await oldYes(control.id, T.wanjiru, dump);
  const p3 = await snapshot(control.id);
  show('Wanjiru', 'the old chat a second time (the control)', p3);
  const kindOf = (rows: string[]) => new Set(rows.map((r) => r.split(' | ').filter((x, i) => i === 0 || /^(LEAD_ONLY|EVERYONE)$/.test(x) || x.startsWith('about ')).join(' | ') + (r.startsWith('GOAL') ? ` | ${r.split(' | ')[2]}` : '')));
  const [kOld, kOld2, kAsk] = [kindOf(p1), kindOf(p3), kindOf(p2)];
  const onlyAsk = [...kAsk].filter((k) => !kOld.has(k) && !kOld2.has(k)); const onlyOld = [...new Set([...kOld, ...kOld2])].filter((k) => !kAsk.has(k));
  console.log(`    Kinds written by Ask and by neither old run: ${JSON.stringify(onlyAsk)}\n    Kinds written by an old run and not by Ask: ${JSON.stringify(onlyOld)}\n    Kinds the two old runs do not share: ${JSON.stringify([...kOld].filter((k) => !kOld2.has(k)).concat([...kOld2].filter((k) => !kOld.has(k))))}`);
  check('Every kind of thing Ask wrote, the old chat wrote too, on the same people; and nothing the old chat wrote in both of its runs is missing from Ask', onlyAsk.length === 0 && [...kOld].filter((k) => kOld2.has(k) && !kAsk.has(k)).length === 0, JSON.stringify({ onlyAsk, onlyOld }));

  console.log('\n==================== 5. A QUESTION FOR A PERSON ====================');
  const qp = await pair('Question');
  const qWords = 'Ask Miriam which accounts actually have a buying process';
  const qo = await oldYes(qp.old.id, T.wanjiru, qWords);
  const oldItems = await call(`/grounds/${qp.old.id}/questions-for-people`, T.wanjiru);
  console.log(`    Old chat: ${said(qo.first).slice(0, 300)} | questions for people now: ${JSON.stringify(oldItems.data).slice(0, 400)}`);
  const qa = await askYes(qp.ask.id, T.wanjiru, qWords);
  console.log(`    Ask: ${said(qa.first).slice(0, 300)} ... after yes: ${qa.done ? said(qa.done).slice(0, 300) : '(none)'}`);
  const q1 = await snapshot(qp.old.id); const q2 = await snapshot(qp.ask.id);
  show('Wanjiru', 'the old chat', q1); show('Wanjiru', 'Ask', q2);
  check('Ask keeps the short sentence as one question for Miriam, word for word, about her; the old chat did not take it as a question: it asked what kind of thing it was, and a blind yes made it an expectation of her (the old chat takes questions only inside a longer paste, compared in part 4)', q2.length === 1 && /QUESTION_FOR_PERSON \| LEAD_ONLY/.test(q2[0]) && /about Miriam/.test(q2[0]) && /Which accounts actually have a buying process\?/.test(q2[0]), `${q1} | ${q2}`);

  console.log('\n==================== 6. A DOCUMENT ====================');
  const doc = await pair('Document');
  const docText = 'Q3 sales plan. Target: 12 enterprise deals by 30 September. Miriam owns the Westgate account. Decision: we will not open Kisumu this quarter. Rule: every quote over 1 million is reviewed by finance.';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-')); const file = path.join(dir, 'q3-plan.txt'); fs.writeFileSync(file, docText);
  const upload = async (g: { id: string }) => { const f = new FormData(); f.append('file', new Blob([docText], { type: 'text/plain' }), 'q3-plan.txt'); f.append('consentConfirmed', 'true'); return call(`/grounds/${g.id}/documents`, T.wanjiru, 'POST', undefined, f); };
  const up1 = await upload(doc.old); const up2 = await upload(doc.ask);
  console.log(`    The same file is added to both: ${up1.status}, ${up2.status}`);
  await new Promise((r) => setTimeout(r, 15000));
  const oldDocChat = await call(`/grounds/${doc.old.id}/context-chat`, T.wanjiru, 'POST', { history: [] });
  console.log(`    Old chat after the document: ${said(oldDocChat).slice(0, 600)}`);
  /* The document is read in the background, so ask again until it has been read (up to about two minutes). */
  let askDoc = await askYes(doc.ask.id, T.wanjiru, 'I have just added the document to this check-in', undefined);
  for (let i = 0; i < 8 && !askDoc.p; i++) { await new Promise((r) => setTimeout(r, 15000)); askDoc = await askYes(doc.ask.id, T.wanjiru, 'I have just added the document to this check-in', undefined); }
  console.log(`    Ask after "I have just added the document": ${said(askDoc.first).slice(0, 700)}`);
  console.log(`    After her yes: ${askDoc.done ? said(askDoc.done).slice(0, 300) : '(none)'}`);
  const d2 = await snapshot(doc.ask.id);
  show('Wanjiru', 'Ask, reading the whole document', d2);
  check('Through Ask, the document is said back and read, and the yes writes rows (the old chat says back its numbers only)', up1.status < 300 && up2.status < 300 && !!askDoc.p && d2.length > 0, said(askDoc.first));

  console.log('\n==================== 7. WHO MAY: A LEAD, AN ADMIN, A PERSON IN THE CHECK-IN ====================');
  const who = await pair('Who');
  const graceOld = await call(`/grounds/${who.old.id}/context-chat`, T.grace, 'POST', { history: [] });
  const graceAsk = await call('/ask', T.grace, 'POST', { message: 'decision: we will drop the pilot', groundId: who.ask.id, openedFrom: 'check_in_setup' });
  console.log(`    Grace, an admin, on a check-in whose lead is still here. Old chat: ${graceOld.status} ${graceOld.text.slice(0, 160)} | Ask: ${graceAsk.status} ${said(graceAsk).slice(0, 200)}`);
  check('An admin is refused the setup chat on a check-in its lead still runs, in both', graceOld.status === 403 && !proposalOf(graceAsk) && (await snapshot(who.ask.id)).length === 0, `${graceOld.status} ${said(graceAsk)}`);
  const left = await pair('Lead left'); await prisma.user.update({ where: { id: wanjiru.id }, data: { isActive: false } });
  const graceOld2 = await call(`/grounds/${left.old.id}/context-chat`, T.grace, 'POST', { history: [] });
  const graceAsk2 = await askYes(left.ask.id, T.grace, 'decision: we will drop the pilot');
  await prisma.user.update({ where: { id: wanjiru.id }, data: { isActive: true } });
  console.log(`    Once the lead has left: old chat ${graceOld2.status}; Ask says: ${said(graceAsk2.first).slice(0, 200)}`);
  check('Once the lead has left, an admin may set it up, in both', graceOld2.status < 300 && !!graceAsk2.p, `${graceOld2.status} ${said(graceAsk2.first)}`);
  const mOld = await call(`/grounds/${who.old.id}/context-chat`, T.miriam, 'POST', { history: [] });
  const mAsk = await call('/ask', T.miriam, 'POST', { message: 'decision: we will drop the pilot', groundId: who.ask.id, openedFrom: 'check_in_setup' });
  console.log(`    Miriam, in the check-in. Old chat: ${mOld.status}; Ask: ${mAsk.status} ${said(mAsk).slice(0, 200)}`);
  check('A person in the check-in is refused the old chat, and Ask writes nothing for her', mOld.status === 403 && !proposalOf(mAsk) && (await snapshot(who.ask.id)).length === 0, `${mOld.status} ${said(mAsk)}`);

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length} of ${checks.length} checks passed.${failed.length ? `\nFAILED:\n${failed.map((x) => '  ' + x.what).join('\n')}` : ''}`);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
