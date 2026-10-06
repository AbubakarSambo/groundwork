/**
 * A PLAN NAMES SOMEBODY WHO IS NOT ON THE CHECK-IN, ON THIS COMPUTER (piece 5, F follow-up).
 *
 * Real: the API, the model (it reads the pasted plan), sign-in, the routes, the database, and the ordinary way a person is added and
 * invited (no email is really sent: the API runs with EMAIL_SENDS_FOR_REAL=false). Wanjiru leads "Sales team, Q3" with Miriam on it.
 * Her plan names Amina Yusuf, who is not on it. Start the API with model access on a local gw_ database first, then:
 *   API=http://localhost:3059/api/v1 DATABASE_URL=... npx ts-node -T journey/a-plan-names-somebody-who-is-not-on-the-check-in.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const API = process.env.API ?? 'http://localhost:3059/api/v1';
const DB_URL = process.env.DATABASE_URL ?? '';
const PW = 'PlanPerson123!';
const stamp = Date.now();

(async () => {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API) || !/@(localhost|127\.0\.0\.1)(:\d+)?\/gw_/.test(DB_URL)) throw new Error('Refusing: a local API and a local gw_ database are required.');
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const checks: { what: string; ok: boolean }[] = [];
  const check = (what: string, ok: boolean, detail?: string) => { checks.push({ what, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${!ok && detail ? `\n        ${detail.slice(0, 700)}` : ''}`); };
  const call = async (p: string, token: string | null, method = 'GET', body?: any) => {
    const res = await fetch(`${API}${p}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text(); let j: any = null; try { j = text ? JSON.parse(text) : null; } catch { /* text */ }
    return { status: res.status, data: j && typeof j === 'object' && 'data' in j ? j.data : j, text };
  };
  const tana = await prisma.organization.create({ data: { name: `Tana ${stamp}`, slug: `tana-${stamp}`, email: `tana.${stamp}@pp.test` } });
  const hash = await bcrypt.hash(PW, 10);
  const make = async (first: string, role: 'ADMIN' | 'LEAD' | 'MEMBER') => {
    const u = await prisma.user.create({ data: { email: `${first.toLowerCase()}.${stamp}@pp.test`, firstName: first, lastName: 'Test', organizationId: tana.id, passwordHash: hash, isEmailVerified: true, role: role as any } });
    await prisma.organizationMembership.upsert({ where: { userId_organizationId: { userId: u.id, organizationId: tana.id } }, create: { userId: u.id, organizationId: tana.id, role: role as any }, update: {} });
    await prisma.person.create({ data: { organizationId: tana.id, sourceSystem: 'seed', externalId: first.toLowerCase(), userName: first.toLowerCase(), displayName: `${first} Test`, givenName: first, familyName: 'Test', email: u.email, linkedUserId: u.id } });
    return u;
  };
  const wanjiru = await make('Wanjiru', 'LEAD'); const miriam = await make('Miriam', 'MEMBER'); const grace = await make('Grace', 'ADMIN');
  const g = await prisma.ground.create({ data: { organizationId: tana.id, initiatorId: wanjiru.id, scenario: 'NEW_PROJECT' as any, moment: 'STARTING' as any, status: 'ACTIVE' as any, label: 'Sales team, Q3', timelineDays: 60, brief: 'Get the Q3 sales pipeline moving.' } as any });
  await prisma.groundParticipant.create({ data: { groundId: g.id, userId: wanjiru.id, email: wanjiru.email, partyType: 'INITIATOR' as any } });
  await prisma.groundParticipant.create({ data: { groundId: g.id, userId: miriam.id, email: miriam.email, partyType: 'PARTICIPANT' as any, nameGiven: 'Miriam' } });
  const tok = async (u: { email: string }) => (await call('/auth/login', null, 'POST', { email: u.email, password: PW })).data?.accessToken as string;
  const T = { wanjiru: await tok(wanjiru), miriam: await tok(miriam), grace: await tok(grace) };
  const peopleOn = () => prisma.groundParticipant.count({ where: { groundId: g.id } });
  const plan = 'Plan for the sales team this quarter.\nAmina Yusuf will take over the Kisumu accounts and call each of them by Friday 10 October.\nMiriam will send the price list by Friday.\nWe review every quote over 1 million with finance before it goes out.';
  const before = await peopleOn();

  console.log('\n==================== THE PLAN IS READ ====================');
  const read = await call(`/grounds/${g.id}/plan/proposals`, T.wanjiru, 'POST', { text: plan });
  const cards = read.data?.proposals ?? [];
  for (const c of cards) console.log(`    [${c.kind}] ${c.says}  (from: "${c.fromThePlan}")${c.note ? `  Note: ${c.note}` : ''}`);
  const person = cards.find((c: any) => c.kind === 'person');
  const aminaCommit = cards.find((c: any) => c.kind === 'commitment' && /Amina/.test(c.says));
  check('Wanjiru reads a card "Add Amina Yusuf to this check-in?" with the plan\'s own words', !!person && /^Add Amina( Yusuf)? to this check-in\?$/.test(person.says) && /Amina/.test(person.fromThePlan), JSON.stringify(cards.map((c: any) => [c.kind, c.says])));
  check('The card says plainly that no address was given and nobody is invited until she says yes', /gives no email address/.test(person?.note ?? '') && /Nobody is invited until you say yes/.test(person?.note ?? ''), person?.note);
  check('Reading wrote no person, and nobody was invited', (await peopleOn()) === before);
  const sorted = await call(`/grounds/${g.id}/plan/proposals/${aminaCommit?.id}/confirm`, T.wanjiru, 'POST', {});
  console.log(`    Wanjiru says yes to Amina's commitment first: ${sorted.status} ${sorted.text.slice(0, 200)}`);
  check('Her commitment cannot be confirmed before she is added, and says so', sorted.status === 400 && /not on this check-in yet/.test(sorted.text), sorted.text);

  console.log('\n==================== WHO MAY ====================');
  for (const [who, t] of [['Miriam, on the check-in', T.miriam], ['Grace, an admin', T.grace]] as const) {
    const r = await call(`/grounds/${g.id}/plan/proposals/${person?.id}/confirm`, t, 'POST', { email: 'amina@kisumu.example' });
    check(`${who} cannot add or invite her (403)`, r.status === 403, `${r.status}`);
  }
  check('Still nobody was added', (await peopleOn()) === before);

  console.log('\n==================== THE YES ====================');
  const noEmail = await call(`/grounds/${g.id}/plan/proposals/${person?.id}/confirm`, T.wanjiru, 'POST', {});
  console.log(`    Yes with no address: ${noEmail.status} ${noEmail.data?.message ?? noEmail.text.slice(0, 200)}`);
  check('A yes with no address is refused with a plain sentence and adds nobody', noEmail.status === 400 && /Type Amina( Yusuf)?'s email address, so Groundwork can invite them/.test(noEmail.text) && (await peopleOn()) === before, noEmail.text);
  /* The ordinary way a person is added refuses until something has been said about what the check-in is for. Here it is the first yes that is asked of it. */
  const early = await call(`/grounds/${g.id}/plan/proposals/${person?.id}/confirm`, T.wanjiru, 'POST', { email: `amina.${stamp}@kisumu.example` });
  console.log(`    A yes before anything has been said about the check-in: ${early.status} ${early.data?.message ?? early.text.slice(0, 220)}`);
  check('The ordinary rule still holds: nobody is invited to a check-in nothing has been said about, the lead reads why, and the card stays waiting', early.status === 400 && /Nobody can be invited yet/.test(early.text) && (await peopleOn()) === before, early.text);
  /* The lead then writes what the check-in is for, as setup asks her to. */
  await prisma.ground.update({ where: { id: g.id }, data: { brief: 'This check-in is for the Q3 sales team. Its job is to get the enterprise pipeline moving, take over the Kisumu accounts, and make sure every large quote is reviewed.' } });
  const yes = await call(`/grounds/${g.id}/plan/proposals/${person?.id}/confirm`, T.wanjiru, 'POST', { email: `amina.${stamp}@kisumu.example` });
  console.log(`    Yes with her address: ${yes.status} wrote ${JSON.stringify(yes.data?.wrote)}`);
  check('The yes with her address adds her, once', yes.status < 300 && (await peopleOn()) === before + 1, yes.text);
  const row = await prisma.groundParticipant.findFirst({ where: { groundId: g.id, email: `amina.${stamp}@kisumu.example` }, select: { partyType: true, nameGiven: true, userId: true } });
  console.log(`    Her row: ${JSON.stringify(row)}`);
  check('She is on the check-in as a person to take part, by the name the plan gave, not yet signed in', row?.partyType === 'PARTICIPANT' && /Amina/.test(row?.nameGiven ?? '') && row?.userId === null, JSON.stringify(row));
  const again = await call(`/grounds/${g.id}/plan/proposals/${person?.id}/confirm`, T.wanjiru, 'POST', { email: `amina.${stamp}@kisumu.example` });
  check('A second yes does nothing more', again.status >= 400 && (await peopleOn()) === before + 1, `${again.status}`);
  const waiting = await call(`/grounds/${g.id}/plan/proposals`, T.wanjiru);
  check('The card is gone from what is waiting', !(waiting.data?.proposals ?? []).some((c: any) => c.kind === 'person'), waiting.text.slice(0, 300));
  const commit = await call(`/grounds/${g.id}/plan/proposals/${aminaCommit?.id}/confirm`, T.wanjiru, 'POST', {});
  console.log(`    Now Amina's commitment: ${commit.status} wrote ${JSON.stringify(commit.data?.wrote)}`);
  check('Now her commitment can be confirmed, and is written about her', commit.status < 300 && commit.data?.wrote?.table === 'GroundCommitment', commit.text);

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length} of ${checks.length} checks passed.${failed.length ? `\nFAILED:\n${failed.map((x) => '  ' + x.what).join('\n')}` : ''}`);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
