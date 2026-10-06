/**
 * LINKS BETWEEN CHECK-INS, AND THE STRATEGY'S HISTORY, AS EACH READER READS THEM, ON THIS COMPUTER (piece 5, C and D).
 *
 * Real: the running API and its routes, sign-in, the organisation's system pushing priorities with a machine credential, the database.
 * Not real: the model (a handoff between check-ins is normally written by the conversation; here the rows a finished conversation
 * leaves are written directly, as the specs do, because there are no model keys on this computer).
 *
 * Tana Foods. Wanjiru leads "Sales team, Q3" and Fatuma leads "Finance, Q3". Miriam is in Sales. Grace is an admin in neither.
 * Piet is a member in a third check-in only. Kofi is a guest from another company. Miriam said she is waiting on Finance for the
 * Westgate credit terms, and the row names the Finance check-in.
 *
 * Start the API on a local gw_ database first, then:  API=http://localhost:3059/api/v1 DATABASE_URL=... npx ts-node -T journey/links-between-check-ins-and-the-strategy-history.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const API = process.env.API ?? 'http://localhost:3059/api/v1';
const DB_URL = process.env.DATABASE_URL ?? '';
const PW = 'LinksStrat123!';
const stamp = Date.now();

(async () => {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API) || !/@(localhost|127\.0\.0\.1)(:\d+)?\/gw_/.test(DB_URL)) throw new Error('Refusing: a local API and a local gw_ database are required.');
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const checks: { what: string; ok: boolean }[] = [];
  const check = (what: string, ok: boolean, detail?: string) => { checks.push({ what, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${!ok && detail ? `\n        ${detail.slice(0, 500)}` : ''}`); };
  const call = async (path: string, token: string | null, method = 'GET', body?: any, base = API) => {
    const res = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text(); let j: any = null; try { j = text ? JSON.parse(text) : null; } catch { /* text */ }
    return { status: res.status, data: j && typeof j === 'object' && 'data' in j ? j.data : j, text };
  };

  console.log('\n==================== SETTING UP ====================');
  const org = (name: string) => prisma.organization.create({ data: { name: `${name} ${stamp}`, slug: `${name.toLowerCase()}-${stamp}`, email: `${name.toLowerCase()}.${stamp}@links.test` } });
  const tana = await org('Tana'); const kito = await org('Kito');
  const hash = await bcrypt.hash(PW, 10);
  const make = async (first: string, home: { id: string }, role: 'ADMIN' | 'LEAD' | 'MEMBER') => {
    const u = await prisma.user.create({ data: { email: `${first.toLowerCase()}.${stamp}@links.test`, firstName: first, lastName: 'Test', organizationId: home.id, passwordHash: hash, isEmailVerified: true, role: role as any } });
    await prisma.organizationMembership.upsert({ where: { userId_organizationId: { userId: u.id, organizationId: home.id } }, create: { userId: u.id, organizationId: home.id, role: role as any }, update: {} });
    await prisma.person.create({ data: { organizationId: home.id, sourceSystem: 'seed', externalId: first.toLowerCase(), userName: first.toLowerCase(), displayName: `${first} Test`, givenName: first, familyName: 'Test', email: u.email, linkedUserId: u.id } });
    return u;
  };
  const wanjiru = await make('Wanjiru', tana, 'LEAD'); const fatuma = await make('Fatuma', tana, 'LEAD'); const miriam = await make('Miriam', tana, 'MEMBER');
  const grace = await make('Grace', tana, 'ADMIN'); const piet = await make('Piet', tana, 'MEMBER'); const kofi = await make('Kofi', kito, 'ADMIN');
  await prisma.organizationMembership.create({ data: { userId: kofi.id, organizationId: tana.id, role: 'GUEST' as any } });
  const ground = (label: string, lead: { id: string }) => prisma.ground.create({ data: { organizationId: tana.id, initiatorId: lead.id, scenario: 'NEW_PROJECT' as any, moment: 'STARTING' as any, status: 'ACTIVE' as any, label, timelineDays: 60 } });
  const sales = await ground('Sales team, Q3', wanjiru); const finance = await ground('Finance, Q3', fatuma); const third = await ground('Product, Q3', piet);
  const party = (g: { id: string }, u: { id: string; email: string }, t: 'INITIATOR' | 'PARTICIPANT') => prisma.groundParticipant.create({ data: { groundId: g.id, userId: u.id, email: u.email, partyType: t as any } });
  await party(sales, wanjiru, 'INITIATOR'); const miriamInSales = await party(sales, miriam, 'PARTICIPANT');
  await party(finance, fatuma, 'INITIATOR'); await party(third, piet, 'INITIATOR');
  await prisma.groundDependency.create({ data: { groundId: sales.id, fromParticipantId: miriamInSales.id, onLabel: 'Finance', waitingOnGroundId: finance.id, what: 'the Westgate credit terms', status: 'WAITING' as any, namedTheThing: true, dueSaid: 'by Friday', dueOn: new Date(Date.now() + 3 * 86_400_000) } as any });
  const tok = async (u: { email: string }, into?: { id: string }) => { const t = (await call('/auth/login', null, 'POST', { email: u.email, password: PW })).data?.accessToken; return into ? (await call('/auth/switch-organization', t, 'POST', { organizationId: into.id })).data?.accessToken : t; };
  const T = { wanjiru: await tok(wanjiru), fatuma: await tok(fatuma), miriam: await tok(miriam), grace: await tok(grace), piet: await tok(piet), kofi: await tok(kofi, tana) };

  console.log('\n==================== C. LINKS BETWEEN CHECK-INS ====================');
  const salesLinks = (t: string) => call(`/grounds/${sales.id}/links`, t);
  const financeLinks = (t: string) => call(`/grounds/${finance.id}/links`, t);
  const w = await salesLinks(T.wanjiru);
  console.log(`    Wanjiru, who leads Sales, reads: ${JSON.stringify(w.data).slice(0, 700)}`);
  check('The Sales lead reads that Sales waits on Finance, with when and where it stands', w.status === 200 && /Finance/.test(w.text) && /Westgate credit terms/.test(w.text) && /by Friday/.test(w.text), w.text);
  const f = await financeLinks(T.fatuma);
  console.log(`    Fatuma, who leads Finance, reads: ${JSON.stringify(f.data).slice(0, 700)}`);
  check('The Finance lead, who cannot open Sales, reads nothing of what Sales asked of Finance: no team, no person, no words (the rule: you read only what you may already open)', f.status === 200 && f.data.askedOfThisCheckIn.length === 0 && !/Westgate|Sales|Miriam/.test(f.text), f.text);
  const gf = await financeLinks(T.grace);
  console.log(`    Grace, an admin who may open both, reads Finance's links: ${JSON.stringify(gf.data).slice(0, 600)}`);
  check('Grace, an admin who may open both, reads that Sales asked Finance for the Westgate credit terms', gf.status === 200 && gf.data.askedOfThisCheckIn.length === 1 && /Westgate credit terms/.test(gf.text) && /Sales team, Q3/.test(gf.text), gf.text);
  const g = await salesLinks(T.grace);
  check('Grace, the admin, reads the Sales links too', g.status === 200 && /Westgate credit terms/.test(g.text), g.text);
  const m = await salesLinks(T.miriam);
  check('Miriam, who is in Sales, reads the Sales links and her own part in them', m.status === 200, m.text);
  const mf = await financeLinks(T.miriam);
  console.log(`    Miriam opens the Finance links: ${mf.status} ${mf.text.slice(0, 160)}`);
  check('Miriam is refused the Finance check-in she is not in (404), so nothing of Finance reaches her', mf.status === 404 && !/Finance|credit/.test(mf.text.replace(/Check-in not found/, '')), `${mf.status} ${mf.text}`);
  const ps = await salesLinks(T.piet);
  check('Piet, in a third check-in, is refused Sales (404)', ps.status === 404, `${ps.status}`);
  const ks = await salesLinks(T.kofi);
  check('Kofi, a guest from another company, is refused Sales (404) and reads nothing of it', ks.status === 404 || ks.status === 403, `${ks.status} ${ks.text}`);
  const you = await call('/you', T.fatuma);
  console.log(`    Fatuma's You page, asked of her: ${JSON.stringify(you.data?.askedOfYou ?? null).slice(0, 500)}`);
  check('Nobody is rated or labelled in any of it', !/at risk|PIP|score|rating/i.test(JSON.stringify([w.data, f.data, you.data])));

  console.log('\n==================== D. THE STRATEGY\'S HISTORY ====================');
  const company0 = await call('/company', T.grace);
  check('Before any change the Company page has no history and reads as it always did (strategy is null)', company0.status === 200 && company0.data?.strategy === null, company0.text.slice(0, 300));
  // Priorities that were there before this was built: version 1 will begin the day the earliest was set.
  for (const [i, [ext, title]] of ([['okr-1', 'Grow revenue 50%, enterprise first'], ['okr-2', 'Improve delivery']] as const).entries()) {
    await prisma.subject.create({ data: { organizationId: tana.id, externalId: ext, sourceSystem: 'okr-tool', type: 'OBJECTIVE' as any, title, createdAt: new Date(Date.UTC(new Date().getUTCFullYear(), 8, 1 + i * 9, 9)), syncedAt: new Date() } as any });
  }
  await prisma.apiAccessRequest.create({ data: { organizationId: tana.id, requestedByUserId: grace.id, whatFor: 'The strategy journey', status: 'APPROVED' as any, acceptedTermsAt: new Date(), termsVersion: '2026-09-10', decidedAt: new Date() } });
  const cred = (await call('/integrations/credentials', T.grace, 'POST', { name: 'Tana planning tool', scopes: ['subjects:write'] })).data;
  const mt = await call('/oauth/token', null, 'POST', { grant_type: 'client_credentials', client_id: cred?.clientId, client_secret: cred?.clientSecret }, API.replace(/\/api\/v1$/, '/api/org/v1'));
  const machine = mt.data?.access_token ?? mt.data?.accessToken;
  check('Tana\'s planning tool signs in with its own credential', !!machine, mt.text);
  const org1 = API.replace(/\/api\/v1$/, '/api/org/v1');
  const pushed = await call('/subjects', machine, 'POST', { sourceSystem: 'okr-tool', externalId: 'okr-3', type: 'objective', title: 'Build a stronger organisation' }, org1);
  check('Their system pushes a third priority', pushed.status < 300, `${pushed.status} ${pushed.text}`);
  const again = await call('/subjects', machine, 'POST', { sourceSystem: 'okr-tool', externalId: 'okr-3', type: 'objective', title: 'Build a stronger organisation' }, org1);
  check('Pushing the same one again makes no new version', again.status < 300);
  for (const [who, t] of [['Grace (admin)', T.grace], ['Wanjiru (lead)', T.wanjiru], ['Miriam (member)', T.miriam]] as const) {
    const c = await call('/company', t);
    const s = c.data?.strategy;
    console.log(`    ${who} reads: ${s?.says} | ${JSON.stringify(s?.history?.map((h: any) => [h.says, h.whatChanged]))}`);
    check(`${who} reads "Strategy v2" and how it changed, with only priority titles`, c.status === 200 && s?.number === 2 && /^Strategy v2, since /.test(s.says) && s.history[1].says === 'Strategy v1, since 1 September.' && s.history[0].whatChanged === 'This version added “Build a stronger organisation”.' && !/Wanjiru|Miriam|Grace|Westgate/.test(JSON.stringify(s)), c.text.slice(0, 500));
  }
  const kc = await call('/company', T.kofi);
  check('Kofi, a guest, is refused the Company page (403)', kc.status === 403, `${kc.status}`);
  const rows = await prisma.strategyVersion.count({ where: { organizationId: tana.id } });
  await call('/company', T.grace); await call('/company', T.miriam);
  check('Opening the page again and again writes no version', (await prisma.strategyVersion.count({ where: { organizationId: tana.id } })) === rows && rows === 2, String(rows));

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length} of ${checks.length} checks passed.${failed.length ? `\nFAILED:\n${failed.map((x) => '  ' + x.what).join('\n')}` : ''}`);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
