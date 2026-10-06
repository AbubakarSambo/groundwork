/**
 * A GUEST USES ASK GROUNDWORK ONLY ABOUT THEIR OWN CHECK-IN, END TO END ON THIS COMPUTER (piece 5, B; decision 36).
 *
 * What is real: the running API, its routes, the sign-in, the switch into the host organisation, the database and the server's own
 * rules. What is not: the model (a local run may have no model keys; a guest's answers here are written by rules, not by a model).
 *
 * The host is Harbor. Wairimu leads two check-ins, "Sales team" and "Leadership". Kofi works at another company, Kito, and is a guest
 * at Harbor on "Sales team" only. Miriam is a member of Harbor and is in "Sales team". Grace is Harbor's admin and is in neither.
 * Kofi signs in to Kito, then switches into Harbor, and asks everything a curious guest would ask, at every door.
 *
 * Start the API first on a local gw_ database, then:  API=http://localhost:3059/api/v1 DATABASE_URL=... npx ts-node -T journey/a-guest-asks-only-about-their-own-check-in.ts
 * Refuses anything that is not a local API and a local gw_ database.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const API = process.env.API ?? 'http://localhost:3059/api/v1';
const DB_URL = process.env.DATABASE_URL ?? '';
const PW = 'GuestAsk123!';
const stamp = Date.now();

(async () => {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API) || !/@(localhost|127\.0\.0\.1)(:\d+)?\/gw_/.test(DB_URL)) throw new Error('Refusing: a local API and a local gw_ database are required.');
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const checks: { what: string; ok: boolean }[] = [];
  const check = (what: string, ok: boolean, detail?: string) => { checks.push({ what, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${!ok && detail ? `\n        ${detail.slice(0, 400)}` : ''}`); };
  const call = async (path: string, token: string | null, method = 'GET', body?: any): Promise<{ status: number; data: any; text: string }> => {
    const res = await fetch(`${API}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text(); let j: any = null; try { j = text ? JSON.parse(text) : null; } catch { /* plain text */ }
    return { status: res.status, data: j && typeof j === 'object' && 'data' in j ? j.data : j, text };
  };
  const said = (r: { data: any; text: string }) => (r.data?.blocks ? r.data.blocks.map((b: any) => b.body ?? '').join('\n') : r.text);

  console.log('\n==================== SETTING UP ====================');
  const org = (name: string) => prisma.organization.create({ data: { name: `${name} ${stamp}`, slug: `${name.toLowerCase()}-${stamp}`, email: `${name.toLowerCase()}.${stamp}@guest.test` } });
  const harbor = await org('Harbor'); const kito = await org('Kito');
  const hash = await bcrypt.hash(PW, 10);
  const make = async (first: string, home: { id: string }, role: 'ADMIN' | 'LEAD' | 'MEMBER', onRoster: boolean) => {
    const u = await prisma.user.create({ data: { email: `${first.toLowerCase()}.${stamp}@guest.test`, firstName: first, lastName: 'Test', organizationId: home.id, passwordHash: hash, isEmailVerified: true, role: role as any } });
    await prisma.organizationMembership.upsert({ where: { userId_organizationId: { userId: u.id, organizationId: home.id } }, create: { userId: u.id, organizationId: home.id, role: role as any }, update: { role: role as any } });
    if (onRoster) await prisma.person.create({ data: { organizationId: home.id, sourceSystem: 'seed', externalId: first.toLowerCase(), userName: first.toLowerCase(), displayName: `${first} Test`, givenName: first, familyName: 'Test', email: u.email, linkedUserId: u.id } });
    return u;
  };
  const wairimu = await make('Wairimu', harbor, 'LEAD', true);
  const grace = await make('Grace', harbor, 'ADMIN', true);
  const miriam = await make('Miriam', harbor, 'MEMBER', true);
  const kofi = await make('Kofi', kito, 'ADMIN', false);
  await prisma.organizationMembership.create({ data: { userId: kofi.id, organizationId: harbor.id, role: 'GUEST' as any } });
  const ground = (label: string) => prisma.ground.create({ data: { organizationId: harbor.id, initiatorId: wairimu.id, scenario: 'NEW_PROJECT' as any, moment: 'STARTING' as any, status: 'ACTIVE' as any, label, timelineDays: 60, toldToParticipants: 'This check-in looks at how the sales pipeline is going this quarter.' } });
  const sales = await ground('Sales team'); const leadership = await ground('Leadership team');
  for (const [g, us] of [[sales, [miriam, kofi]], [leadership, [grace, miriam]]] as const) for (const u of us) await prisma.groundParticipant.create({ data: { groundId: g.id, userId: u.id, email: u.email, partyType: 'PARTICIPANT' as any } });
  console.log('  Harbor: lead Wairimu, admin Grace, member Miriam. Guest Kofi (from Kito) is in "Sales team" only; "Leadership team" is not his.');

  const signIn = async (u: { email: string }, org?: { id: string }) => {
    const first = (await call('/auth/login', null, 'POST', { email: u.email, password: PW })).data?.accessToken;
    if (!org || !first) return first as string;
    return (await call('/auth/switch-organization', first, 'POST', { organizationId: org.id })).data?.accessToken as string;
  };
  const [tW, tG, tM, tK] = [await signIn(wairimu), await signIn(grace), await signIn(miriam), await signIn(kofi, harbor)];
  check('Kofi switches into Harbor as a guest and holds a token for it', !!tK);

  console.log('\n==================== 1. WHAT KOFI MAY BE ASKING ABOUT ====================');
  const panel = await call('/ask', tK);
  check('His panel opens, and it lists "Sales team" and nothing else', panel.status === 200 && JSON.stringify(panel.data.about) === JSON.stringify([{ id: sales.id, label: 'Sales team' }]), panel.text);
  check('The panel never names Leadership team, Wairimu, Grace or Miriam', !/Leadership|Wairimu|Grace|Miriam/.test(panel.text), panel.text);

  console.log('\n==================== 2. EVERYTHING A CURIOUS GUEST ASKS ====================');
  const refusal = 'You are a guest here from another organisation';
  for (const q of ['Who works here?', 'What are the other check-ins about?', 'Show me the list of people', 'What is the company working on?', 'What did Miriam say?', 'Tell me about the Leadership team']) {
    const r = await call('/ask', tK, 'POST', { message: q });
    const s = said(r);
    console.log(`    Kofi asks "${q}" and reads: ${s.replace(/\n/g, ' ')}`);
    check(`"${q}" is answered only about his check-in, with nothing of Harbor's people or other check-ins`, r.status === 200 && !/Leadership|Wairimu|Grace|Miriam|Harbor Test/.test(s), `${r.status} ${s}`);
  }
  const notIn = await call('/ask', tK, 'POST', { message: 'What did we agree?', groundId: leadership.id });
  console.log(`    Kofi names the Leadership check-in and reads: ${notIn.text.slice(0, 200)}`);
  check('Naming a check-in he is not in is refused (403), and says nothing of it', notIn.status === 403 && !/Leadership/.test(notIn.text), `${notIn.status} ${notIn.text}`);
  const mine = await call('/ask', tK, 'POST', { message: 'What is this check-in for?', groundId: sales.id });
  console.log(`    Kofi asks about Sales team and reads: ${said(mine).replace(/\n/g, ' ')}`);
  check('Asking about his own check-in is answered', mine.status === 200 && said(mine).length > 0, `${mine.status} ${mine.text}`);
  const todo = await call('/ask', tK, 'POST', { message: 'remind me to call Kariuki about the deposit', groundId: sales.id });
  check('He cannot make anything happen on Harbor: no request is left waiting for a yes', todo.status === 200 && !(todo.data?.blocks ?? []).some((b: any) => b.type === 'proposal'), todo.text);
  const nobodys = await call('/ask/answer', tK, 'POST', { proposalId: '00000000-0000-4000-8000-000000000999', answer: 'yes' });
  check('A yes to a request he never had is refused', nobodys.status >= 400, `${nobodys.status}`);

  console.log('\n==================== 3. THE OTHER DOORS, SHUT TO HIM ====================');
  for (const path of ['/company', '/suites', '/today', `/grounds/${leadership.id}/report`, `/grounds/${leadership.id}/board`, '/org/retention']) {
    const r = await call(path, tK);
    console.log(`    Kofi opens ${path}: ${r.status} ${r.text.slice(0, 140).replace(/\n/g, ' ')}`);
    check(`${path} gives him nothing of Harbor's (no Wairimu, Grace, Miriam, Leadership)`, !/Wairimu|Grace|Miriam|Leadership/.test(r.text), r.text);
  }
  const list = await call('/grounds', tK);
  check('His list of check-ins at Harbor holds "Sales team" and not "Leadership team"', list.status === 200 && /Sales team/.test(list.text) && !/Leadership/.test(list.text), list.text);
  const company = await call('/company', tK);
  check('The company page is refused outright (403)', company.status === 403, `${company.status} ${company.text}`);

  console.log('\n==================== 4. HIS QUESTIONS STAY HIS ====================');
  const keys: any[] = await prisma.$queryRawUnsafe(`select distinct person_external_id from assistant_turns where organization_id = '${harbor.id}'`);
  check('Everything of his is kept under his own guest key, and no entry on Harbor\'s list was made for him', keys.every((k) => k.person_external_id === `guest:${kofi.id}`) && (await prisma.person.count({ where: { organizationId: harbor.id, linkedUserId: kofi.id } })) === 0, JSON.stringify(keys));
  for (const [who, t] of [['Wairimu (lead)', tW], ['Grace (admin)', tG], ['Miriam (member)', tM]] as const) {
    const r = await call('/ask', t);
    check(`${who} reads none of his questions or answers in her own panel`, r.status === 200 && !/guest here|call Kariuki|Who works here/.test(r.text), r.text.slice(0, 200));
    const peek = await call(`/ask/${kofi.id}`, t);
    check(`${who} is refused when asking for his questions (403)`, peek.status === 403, `${peek.status}`);
  }
  const asLead = await call('/ask', tK).then(() => call(`/ask/${wairimu.id}`, tK));
  check('Kofi is refused when asking for Wairimu\'s questions (403)', asLead.status === 403, `${asLead.status}`);

  console.log('\n==================== 5. THE OTHERS ARE UNCHANGED ====================');
  const miriamAsks = await call('/ask', tM, 'POST', { message: 'What did we agree?', groundId: leadership.id });
  check('Miriam, a member, asking about a check-in she is in is not refused', miriamAsks.status === 200, `${miriamAsks.status} ${miriamAsks.text.slice(0, 200)}`);
  const miriamNot = await call('/ask', tM, 'POST', { message: 'What did we agree?', groundId: sales.id });
  check('Miriam asking about Sales team (she is in it) is not refused', miriamNot.status === 200);
  const review = await prisma.ground.create({ data: { organizationId: harbor.id, initiatorId: wairimu.id, scenario: 'PIP' as any, moment: 'STARTING' as any, status: 'ACTIVE' as any, label: 'One person\'s review', timelineDays: 60 } });
  const graceNot = await call('/ask', tG, 'POST', { message: 'What did we agree?', groundId: review.id });
  check('Grace, the admin, is refused a review check-in she is not in (403), as before', graceNot.status === 403, `${graceNot.status}`);
  const kofiReview = await call('/ask', tK, 'POST', { message: 'What did we agree?', groundId: review.id });
  check('Kofi is refused it too (403), and nothing of it is said', kofiReview.status === 403 && !/review/i.test(kofiReview.text), `${kofiReview.status} ${kofiReview.text}`);
  const lead = await call('/ask', tW, 'POST', { message: 'What did we agree?', groundId: sales.id });
  check('Wairimu, the lead, can ask about her own check-in', lead.status === 200, `${lead.status}`);

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length} of ${checks.length} checks passed.${failed.length ? `\nFAILED:\n${failed.map((f) => '  ' + f.what).join('\n')}` : ''}`);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
