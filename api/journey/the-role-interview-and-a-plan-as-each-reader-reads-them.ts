/**
 * THE ROLE INTERVIEW, AND SETTING UP FROM A PLAN, AS EACH READER READS THEM, ON THIS COMPUTER (piece 5, E and F).
 *
 * Real: the running API and its routes, sign-in, Ask Groundwork's role interview (no model words it), the role map, the plan's proposals
 * as the lead reads, confirms and puts them off, and the rows each confirm writes. Not real: the model. Reading a pasted plan into
 * proposals needs one, and there are no model keys on this computer, so the proposals a plan would give are written as the stored rows
 * the reader leaves (the specs run that reading with a model double and check every quote). Everything after that is the real route.
 *
 * Tana Foods. Wanjiru leads "Sales team, Q3". Miriam is a Sales rep in it. Grace is an admin. Piet is a colleague in neither.
 * Start the API on a local gw_ database first, then:  API=http://localhost:3059/api/v1 DATABASE_URL=... npx ts-node -T journey/the-role-interview-and-a-plan-as-each-reader-reads-them.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const API = process.env.API ?? 'http://localhost:3059/api/v1';
const DB_URL = process.env.DATABASE_URL ?? '';
const PW = 'RolePlan123!';
const stamp = Date.now();

(async () => {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API) || !/@(localhost|127\.0\.0\.1)(:\d+)?\/gw_/.test(DB_URL)) throw new Error('Refusing: a local API and a local gw_ database are required.');
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const checks: { what: string; ok: boolean }[] = [];
  const check = (what: string, ok: boolean, detail?: string) => { checks.push({ what, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${!ok && detail ? `\n        ${detail.slice(0, 600)}` : ''}`); };
  const call = async (path: string, token: string | null, method = 'GET', body?: any) => {
    const res = await fetch(`${API}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text(); let j: any = null; try { j = text ? JSON.parse(text) : null; } catch { /* text */ }
    return { status: res.status, data: j && typeof j === 'object' && 'data' in j ? j.data : j, text };
  };
  const said = (r: { data: any; text: string }) => (r.data?.blocks ? r.data.blocks.map((b: any) => b.body ?? b.summary ?? '').join(' ') : r.text);

  console.log('\n==================== SETTING UP ====================');
  const tana = await prisma.organization.create({ data: { name: `Tana ${stamp}`, slug: `tana-${stamp}`, email: `tana.${stamp}@roleplan.test` } });
  const hash = await bcrypt.hash(PW, 10);
  const make = async (first: string, role: 'ADMIN' | 'LEAD' | 'MEMBER', title: string | null) => {
    const u = await prisma.user.create({ data: { email: `${first.toLowerCase()}.${stamp}@roleplan.test`, firstName: first, lastName: 'Test', organizationId: tana.id, passwordHash: hash, isEmailVerified: true, role: role as any } });
    await prisma.organizationMembership.upsert({ where: { userId_organizationId: { userId: u.id, organizationId: tana.id } }, create: { userId: u.id, organizationId: tana.id, role: role as any }, update: {} });
    await prisma.person.create({ data: { organizationId: tana.id, sourceSystem: 'seed', externalId: first.toLowerCase(), userName: first.toLowerCase(), displayName: `${first} Test`, givenName: first, familyName: 'Test', email: u.email, title, linkedUserId: u.id } });
    return u;
  };
  const wanjiru = await make('Wanjiru', 'LEAD', 'Sales lead'); const miriam = await make('Miriam', 'MEMBER', 'Sales rep'); const grace = await make('Grace', 'ADMIN', 'Head of operations'); const piet = await make('Piet', 'MEMBER', 'Sales rep');
  const sales = await prisma.ground.create({ data: { organizationId: tana.id, initiatorId: wanjiru.id, scenario: 'NEW_PROJECT' as any, moment: 'STARTING' as any, status: 'ACTIVE' as any, label: 'Sales team, Q3', timelineDays: 60 } });
  await prisma.groundParticipant.create({ data: { groundId: sales.id, userId: wanjiru.id, email: wanjiru.email, partyType: 'INITIATOR' as any } });
  const miriamIn = await prisma.groundParticipant.create({ data: { groundId: sales.id, userId: miriam.id, email: miriam.email, partyType: 'PARTICIPANT' as any, nameGiven: 'Miriam' } });
  const tok = async (u: { email: string }) => (await call('/auth/login', null, 'POST', { email: u.email, password: PW })).data?.accessToken as string;
  const T = { wanjiru: await tok(wanjiru), miriam: await tok(miriam), grace: await tok(grace), piet: await tok(piet) };

  console.log('\n==================== E. THE ROLE INTERVIEW ====================');
  const on = await call('/suites/roles', T.grace, 'PUT', { on: true, answers: {} });
  check('Grace, an admin, switches the role map on', on.status < 300, `${on.status} ${on.text}`);
  const board0 = await call('/suites/roles/board', T.grace);
  console.log(`    Grace reads the role map before: ${board0.status} ${board0.text.slice(0, 400)}`);
  const sentByLead = await call('/suites/roles/interview', T.wanjiru, 'POST', { personId: 'miriam', roleName: 'Sales rep' });
  check('A lead who is not an admin cannot send the role interview (403)', sentByLead.status === 403, `${sentByLead.status} ${sentByLead.text}`);
  const sentByMember = await call('/suites/roles/interview', T.piet, 'POST', { personId: 'miriam' });
  check('A colleague cannot send it either (403)', sentByMember.status === 403, `${sentByMember.status}`);
  const sent = await call('/suites/roles/interview', T.grace, 'POST', { personId: 'miriam', roleName: 'Sales rep' });
  console.log(`    Grace sends it to Miriam: ${sent.status} ${JSON.stringify(sent.data)}`);
  check('Grace, an admin, sends it to Miriam for Sales rep', sent.status < 300 && sent.data?.sent?.length === 1, sent.text);
  const again = await call('/suites/roles/interview', T.grace, 'POST', { personId: 'miriam', roleName: 'Sales rep' });
  console.log(`    Grace sends it again: ${JSON.stringify(again.data?.notSent)}`);
  check('Sending it twice says plainly that it is already waiting', /already has the role interview waiting/.test(again.text), again.text);
  const start = await call('/ask', T.miriam, 'POST', { message: 'start' });
  console.log(`    Miriam says "start" in Ask Groundwork and reads: ${said(start)}`);
  check('Miriam reads the first question, in plain words', /What do you own in your job as Sales rep\?/.test(said(start)), start.text);
  const a1 = await call('/ask', T.miriam, 'POST', { message: 'My own customers and their deals' });
  const a2 = await call('/ask', T.miriam, 'POST', { message: 'What discount I give up to 10 percent' });
  const a3 = await call('/ask', T.miriam, 'POST', { message: 'The Sales lead and Operations for stock' });
  const a4 = await call('/ask', T.miriam, 'POST', { message: 'The customers I sign, for their first delivery' });
  console.log(`    Her next questions: ${[a1, a2, a3].map(said).join(' || ')}`);
  console.log(`    After her fourth answer she reads: ${said(a4)}`);
  check('All four are said back in her own words, and she is asked to save them', /You said you own/.test(said(a4)) && /Shall I save this for the role map\?/.test(said(a4)), a4.text);
  const proposal = (a4.data?.blocks ?? []).find((b: any) => b.type === 'proposal');
  const beforeYes = await prisma.$queryRawUnsafe<any[]>(`select count(*)::int as n from role_interview_answers where organization_id = '${tana.id}'`);
  check('Nothing is written before her yes', beforeYes[0].n === 0, JSON.stringify(beforeYes));
  const yes = await call('/ask/answer', T.miriam, 'POST', { proposalId: proposal?.proposalId ?? proposal?.id, answer: 'yes' });
  console.log(`    Miriam says yes and reads: ${said(yes)}`);
  check('After her yes she reads that it is about the job and not about her', /about the job and not about you/.test(said(yes)), yes.text);
  const rows = await prisma.$queryRawUnsafe<any[]>(`select owns, decides, depends_on from role_interview_answers where organization_id = '${tana.id}'`);
  check('Exactly one row is written, with her words as typed', rows.length === 1 && /my own customers and their deals/i.test(JSON.stringify(rows[0])), JSON.stringify(rows));
  const board1 = await call('/suites/roles/board', T.grace);
  console.log(`    Grace reads the role map now: ${JSON.stringify((board1.data?.roles ?? board1.data)?.filter?.((r: any) => /Sales rep/.test(r.name ?? r.role ?? '')) ?? board1.text.slice(0, 400)).slice(0, 500)}`);
  check('The role map shows what a Sales rep owns, from her answer, for the admin', /own customers and their deals/i.test(board1.text), board1.text.slice(0, 500));
  const lead = await call('/suites/roles/board', T.wanjiru); const colleague = await call('/suites/roles/board', T.piet);
  check('A lead who is not an admin and a colleague are refused the role map (403)', lead.status === 403 && colleague.status === 403, `${lead.status} ${colleague.status}`);
  const mine = await call('/suites/roles/interview/mine', T.miriam); const piets = await call('/suites/roles/interview/mine', T.piet);
  check('Miriam reads her own answers; Piet reads none of them', mine.status === 200 && /own customers/i.test(mine.text) && !/own customers/i.test(piets.text), `${mine.text.slice(0, 200)} | ${piets.text.slice(0, 200)}`);

  console.log('\n==================== F. SETTING UP FROM A PLAN ====================');
  const plan = 'Goal: 12 qualified enterprise deals by 30 September. Miriam owns the Westgate account. Miriam will send the price list by Friday. We review every quote over 1 million with finance. Ask Miriam which accounts have a buying process. Still to decide: whether to open Kisumu.';
  const mk = (kind: string, says: string, fields: any, from: string) => prisma.planProposal.create({ data: { groundId: sales.id, createdByUserId: wanjiru.id, kind, says, fields, fromThePlan: from } });
  const p = {
    goal: await mk('goal', 'The goal for qualified enterprise deals is 12 by 30 September.', { what: 'qualified enterprise deals', number: 12, date: '30 September' }, '12 qualified enterprise deals by 30 September'),
    role: await mk('role', 'Miriam is responsible for the Westgate account.', { personName: 'Miriam', participantId: miriamIn.id, what: 'the Westgate account' }, 'Miriam owns the Westgate account'),
    commitment: await mk('commitment', 'Miriam will send the price list by Friday.', { personName: 'Miriam', participantId: miriamIn.id, what: 'send the price list', date: 'Friday' }, 'Miriam will send the price list by Friday'),
    rule: await mk('rule', 'We review every quote over 1 million with finance.', { what: 'we review every quote over 1 million with finance' }, 'We review every quote over 1 million with finance'),
    question: await mk('question', 'Groundwork will ask Miriam: which accounts have a buying process?', { personName: 'Miriam', participantId: miriamIn.id, what: 'which accounts have a buying process?' }, 'Ask Miriam: which accounts have a buying process?'),
    decision: await mk('decision', 'It is not decided yet whether to open Kisumu.', { what: 'whether to open Kisumu' }, 'Still to decide: whether to open Kisumu'),
    invented: await mk('goal', 'The goal for new accounts is 40.', { what: 'new accounts', number: 40 }, 'We want a team of four by the end of the year'),
  };
  void plan;
  const waitingLead = await call(`/grounds/${sales.id}/plan/proposals`, T.wanjiru);
  console.log(`    Wanjiru reads waiting proposals: ${(waitingLead.data?.proposals ?? waitingLead.data ?? []).map?.((x: any) => `[${x.kind}] ${x.says}`).join(' | ')}`);
  check('The lead reads each proposal as its own card, with the exact words of the plan it came from', waitingLead.status === 200 && JSON.stringify(waitingLead.data).includes('Westgate') && JSON.stringify(waitingLead.data).includes('fromThePlan'), waitingLead.text.slice(0, 500));
  const notSaid = await call(`/grounds/${sales.id}/plan/proposals/${p.invented.id}/confirm`, T.wanjiru, 'POST', { direction: 'AIM' });
  console.log(`    A stored proposal whose number is not in its own quote is confirmed: ${notSaid.status} ${notSaid.text.slice(0, 160)}`);
  check('A proposal whose words are not really in the plan is refused at the yes, and nothing is written ("nothing proposed that nobody said")', notSaid.status === 400 && /not in the plan/.test(notSaid.text), notSaid.text);
  for (const [who, t] of [['Miriam, who is in the check-in', T.miriam], ['Grace, an admin', T.grace], ['Piet, a colleague in neither', T.piet]] as const) {
    const r = await call(`/grounds/${sales.id}/plan/proposals`, t); const c = await call(`/grounds/${sales.id}/plan/proposals/${p.role.id}/confirm`, t, 'POST', {});
    console.log(`    ${who} reads the proposals: ${r.status} ${r.text.slice(0, 120)} | tries to confirm: ${c.status}`);
    check(`${who} cannot read the proposals or confirm one`, r.status >= 400 && c.status >= 400, `${r.status} ${c.status}`);
  }
  const before = await prisma.$queryRawUnsafe<any[]>(`select (select count(*) from ground_objectives where ground_id = '${sales.id}')::int as goals, (select count(*) from ground_commitments where ground_id = '${sales.id}')::int as commitments, (select count(*) from ground_context_items where ground_id = '${sales.id}')::int as items`);
  check('Nothing is written until she confirms (no goal, commitment or note exists yet)', before[0].goals === 0 && before[0].commitments === 0 && before[0].items === 0, JSON.stringify(before));
  const out: any = {};
  out.goal = await call(`/grounds/${sales.id}/plan/proposals/${p.goal.id}/confirm`, T.wanjiru, 'POST', { direction: 'AIM' });
  for (const k of ['role', 'commitment', 'rule', 'question', 'decision'] as const) out[k] = await call(`/grounds/${sales.id}/plan/proposals/${p[k].id}/confirm`, T.wanjiru, 'POST', {});
  console.log(`    Wanjiru confirms each: ${Object.entries(out).map(([k, v]: any) => `${k} ${v.status} wrote ${JSON.stringify(v.data?.wrote)}`).join(' | ')}`);
  check('Each yes writes exactly one thing, in the place it belongs', Object.values(out).every((v: any) => v.status < 300 && v.data?.wrote?.id), JSON.stringify(Object.entries(out).map(([k, v]: any) => [k, v.status, v.status >= 300 ? v.text.slice(0, 200) : ''])));
  const dup = await call(`/grounds/${sales.id}/plan/proposals/${p.goal.id}/confirm`, T.wanjiru, 'POST', { direction: 'AIM' });
  check('A second yes to the same one is refused and writes nothing more', dup.status >= 400, `${dup.status}`);
  const after = await prisma.$queryRawUnsafe<any[]>(`select (select count(*) from ground_objectives where ground_id = '${sales.id}')::int as goals, (select count(*) from ground_commitments where ground_id = '${sales.id}')::int as commitments, (select count(*) from ground_context_items where ground_id = '${sales.id}')::int as items`);
  check('So there is one target, one commitment and three notes (a rule, a question for Miriam, a decision)', after[0].goals === 1 && after[0].commitments === 1 && after[0].items === 3, JSON.stringify(after));
  const q = await prisma.groundContextItem.findFirst({ where: { groundId: sales.id, kind: 'QUESTION_FOR_PERSON' as any } });
  check('The question for Miriam is kept for the lead, word for word, and is not asked of her yet', q?.audience === 'LEAD_ONLY' && /buying process/.test(q?.text ?? ''), JSON.stringify(q));
  const role = await prisma.groundParticipant.findUnique({ where: { id: miriamIn.id }, select: { roleAsDescribed: true } });
  check('Miriam\'s role on this check-in is the lead\'s plan\'s own words', /Westgate account/.test(role?.roleAsDescribed ?? ''), JSON.stringify(role));
  const asked = await call('/ask', T.miriam, 'POST', { message: 'What did I commit to?', groundId: sales.id });
  console.log(`    Miriam asks "What did I commit to?" and reads: ${said(asked).slice(0, 300)}`);

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length} of ${checks.length} checks passed.${failed.length ? `\nFAILED:\n${failed.map((x) => '  ' + x.what).join('\n')}` : ''}`);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
