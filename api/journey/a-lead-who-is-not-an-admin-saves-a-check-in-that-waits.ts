/**
 * A LEAD WHO IS NOT AN ADMIN SAVES A CHECK-IN THAT WAITS FOR AN ADMIN, ON THIS COMPUTER (known issues B4, B5; screens request 174 items 2 and 3).
 *
 * Real: the API, the model, sign-in, the save (`POST /entry/commit`) with a short setup conversation, the admin's approval, the database.
 * No email is really sent. Nandi leads and is not an admin; Grace is the admin; Wanjiku is the person Nandi names.
 * Start the API with model access on a local gw_ database, then:  API=http://localhost:3059/api/v1 DATABASE_URL=... npx ts-node -T journey/a-lead-who-is-not-an-admin-saves-a-check-in-that-waits.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const API = process.env.API ?? 'http://localhost:3059/api/v1';
const DB_URL = process.env.DATABASE_URL ?? '';
const PW = 'LeadWaits123!';
const stamp = Date.now();

(async () => {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API) || !/@(localhost|127\.0\.0\.1)(:\d+)?\/gw_/.test(DB_URL)) throw new Error('Refusing: a local API and a local gw_ database are required.');
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const checks: { what: string; ok: boolean }[] = [];
  const check = (what: string, ok: boolean, detail?: string) => { checks.push({ what, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${!ok && detail ? `\n        ${detail.slice(0, 900)}` : ''}`); };
  const call = async (p: string, token: string | null, method = 'GET', body?: any) => {
    const t0 = Date.now();
    const res = await fetch(`${API}${p}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text(); let j: any = null; try { j = text ? JSON.parse(text) : null; } catch { /* text */ }
    return { status: res.status, ms: Date.now() - t0, data: j && typeof j === 'object' && 'data' in j ? j.data : j, text };
  };
  const org = await prisma.organization.create({ data: { name: `Kilima ${stamp}`, slug: `kilima-${stamp}`, email: `kilima.${stamp}@lw.test`, checkInsNeedApproval: true } as any });
  const hash = await bcrypt.hash(PW, 10);
  const make = async (first: string, role: 'ADMIN' | 'LEAD' | 'MEMBER') => {
    const u = await prisma.user.create({ data: { email: `${first.toLowerCase()}.${stamp}@lw.test`, firstName: first, lastName: 'Test', organizationId: org.id, passwordHash: hash, isEmailVerified: true, role: role as any } });
    await prisma.organizationMembership.upsert({ where: { userId_organizationId: { userId: u.id, organizationId: org.id } }, create: { userId: u.id, organizationId: org.id, role: role as any }, update: {} });
    await prisma.person.create({ data: { organizationId: org.id, sourceSystem: 'seed', externalId: first.toLowerCase(), userName: first.toLowerCase(), displayName: `${first} Test`, givenName: first, familyName: 'Test', email: u.email, linkedUserId: u.id } });
    return u;
  };
  const nandi = await make('Nandi', 'LEAD'); const grace = await make('Grace', 'ADMIN');
  const tok = async (u: { email: string }) => (await call('/auth/login', null, 'POST', { email: u.email, password: PW })).data?.accessToken as string;
  const T = { nandi: await tok(nandi), grace: await tok(grace) };
  const wanjikuEmail = `wanjiku.${stamp}@lw.test`;

  console.log('\n==================== NANDI SAVES THE CHECK-IN ====================');
  const history = [
    { role: 'assistant', content: 'What would you like to check in on with your team?' },
    { role: 'user', content: 'I want to see how the new estates sales team is doing this quarter. Wanjiku leads the Kilimani sales and I want to know whether the three developers she signed are really moving.' },
    { role: 'assistant', content: 'What would good look like by the end of the quarter?' },
    { role: 'user', content: 'Three developers signed and paying their deposits by the end of November, and Wanjiku knowing which of them is still stuck.' },
    { role: 'assistant', content: 'Who else should be asked?' },
    { role: 'user', content: 'Just Wanjiku for now.' },
  ];
  const t0 = Date.now();
  const saved = await call('/entry/commit', process.env.AS_ADMIN ? T.grace : T.nandi, 'POST', {
    groundLabel: 'Kilimani estates, Q4', setupKey: `lw-${stamp}`, scenario: 'NEW_PROJECT', history,
    brief: 'Nandi wants to see whether the three developers Wanjiku signed are moving, and whether Wanjiku knows which one is stuck.',
    leadsOwnWords: history.filter((h) => h.role === 'user').map((h) => h.content),
    contributors: [{ email: wanjikuEmail, displayName: 'Wanjiku Kamau', context: 'Leads the Kilimani sales.' }],
  });
  console.log(`    The save answered in ${saved.ms} ms with status ${saved.status}: ${JSON.stringify(saved.data).slice(0, 600)}`);
  check('The save answers in well under 45 seconds', saved.status < 300 && saved.ms < 45_000, `${saved.status} ${saved.ms} ms ${saved.text.slice(0, 400)}`);
  const groundId = saved.data?.groundId;
  const ground: any = groundId ? await prisma.ground.findUnique({ where: { id: groundId }, select: { status: true } }) : null;
  console.log(`    The check-in's state: ${ground?.status}`);
  check('The check-in is kept and waits for an admin', ground?.status === 'AWAITING_APPROVAL', String(ground?.status));
  const setupWords = groundId ? await prisma.leadSetupWords.findUnique({ where: { groundId } }) : null;
  check('What Nandi typed in setup is kept for her, and the check-in has her brief', !!setupWords && /three developers/.test(setupWords.text), JSON.stringify(setupWords));
  let aims = 0;
  for (let i = 0; i < 24 && !aims; i++) { aims = groundId ? await prisma.groundObjective.count({ where: { groundId } }) : 0; if (!aims) await new Promise((r) => setTimeout(r, 5000)); }
  console.log(`    Her aims on the check-in (the reading may finish after the save answers): ${aims}`);
  check('The aims she said are on the check-in, whether the save waited for them or they finished after it answered', aims > 0, String(aims));
  const sessions: any[] = groundId ? await prisma.checkIn.findMany({ where: { groundId }, select: { sessionNumber: true, status: true, isSetup: true }, orderBy: { sessionNumber: 'asc' } }) : [];
  const turns = groundId ? await prisma.conversationTurn.count({ where: { checkIn: { groundId } } }) : 0;
  console.log(`    Her sessions: ${JSON.stringify(sessions)}; turns kept: ${turns}`);
  check('Her own first check-in is still hers to do (setup is not her check-in, decided 15 September), and both sessions exist', sessions.length >= 1 && sessions[0].status === 'NOT_STARTED', JSON.stringify({ sessions, turns }));
  console.log(`    What Nandi reads about Wanjiku: waiting=${JSON.stringify(saved.data?.contributors)} failed=${JSON.stringify(saved.data?.failedInvites)} why=${JSON.stringify(saved.data?.whyInvitesFailed)}`);
  const held = (saved.data?.contributors ?? [])[0];
  check('Wanjiku is held, not dropped: the save does not report her invitation as failed, and says she will be invited once an admin accepts', (saved.data?.failedInvites ?? []).length === 0 && held?.waiting === true && held?.waitingBecause === 'waiting_for_approval' && /will be invited as soon as an admin accepts this check-in/.test(held?.saying ?? ''), JSON.stringify(saved.data?.contributors));
  const beforeRow: any = await prisma.groundParticipant.findFirst({ where: { groundId, email: wanjikuEmail }, select: { invitedAt: true, notifiedAt: true } });
  check('Before approval she has been sent nothing', !!beforeRow && beforeRow.invitedAt === null && beforeRow.notifiedAt === null, JSON.stringify(beforeRow));
  const stillWaiting: any = await prisma.ground.findUnique({ where: { id: groundId }, select: { status: true } });
  check('Naming her has not moved the check-in past the approval', stillWaiting?.status === 'AWAITING_APPROVAL', stillWaiting?.status);

  console.log('\n==================== GRACE APPROVES ====================');
  const approved = await call(`/grounds/${groundId}/approve`, T.grace, 'POST', {});
  console.log(`    Grace approves: ${approved.status} ${JSON.stringify(approved.data)}`);
  const after: any = await prisma.groundParticipant.findFirst({ where: { groundId, email: wanjikuEmail }, select: { id: true, invitedAt: true, inviteDeliveryStatus: true, nameGiven: true } });
  console.log(`    Wanjiku's row after approval: ${JSON.stringify(after)}`);
  check('After approval Wanjiku is on the check-in and has been invited, once', !!after && !!after.invitedAt, JSON.stringify(after));
  const sends: any[] = await prisma.$queryRawUnsafe(`select count(*)::int as n from email_logs where to_address = '${wanjikuEmail}'`).catch(() => [{ n: -1 }]);
  console.log(`    Emails recorded to Wanjiku: ${sends[0]?.n}`);
  const g2 = await call(`/grounds/${groundId}`, T.nandi);
  const wording = JSON.stringify(g2.data);
  check('Nothing on the check-in still says it is waiting for an admin', !/waiting for an admin|Nobody can be invited until then/.test(wording), wording.slice(0, 300));

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length} of ${checks.length} checks passed.${failed.length ? `\nFAILED:\n${failed.map((x) => '  ' + x.what).join('\n')}` : ''}`);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
