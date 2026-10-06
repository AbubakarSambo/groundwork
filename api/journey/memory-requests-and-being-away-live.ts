/**
 * THE LIVE CHECK OF MEMORY, REQUESTS THROUGH CHAT, AND BEING AWAY (item 6 of Hafsah's list, weeks
 * 20 to 24 in docs/weekly-plan.md). It drives the real API through Ask Groundwork, as each person,
 * and prints what each of them reads, word for word, and the rows that were saved.
 *
 *  1. Memory (week 20): a lead tells Ask Groundwork something to keep; it is kept only on a yes; it is
 *     used as context later; nobody else reads it.
 *  2. Leave (weeks 20, 21): a person asks for leave in chat; it is said back and sent on a yes; the
 *     approver (their line manager, or an admin where there is none) is told on Today and approves;
 *     the dates reach the check-in.
 *  3. Hours (week 21) and spending (week 22, checked against the budget and the rule before the yes).
 *  4. Being away (week 23): while on leave the person is not waited on, gets no reminders, and nothing
 *     is counted against them; the lead reads the week 23 sentences.
 *  5. A guest (week 24) asks Ask Groundwork within their own check-in only, and is refused outside it.
 *
 * Two things are not driven through the API, and say so where they are printed: the weekly report is
 * built by the code the API runs when a check-in completes (no check-in is completed live here, so it
 * is built from seeded rows), and the check-in's instructions are shown by the function the
 * conversation calls to add what the organisation keeps. Everything else is the running API.
 *
 * It prints; a person judges. Local API and local gw_ test database only. No real email is sent: the
 * API sends mail only with EMAIL_SENDS_FOR_REAL set, and every address here is on .test.
 *   DATABASE_URL=postgresql://hafsahjumare@localhost:5432/gw_pw9_1786222102 npx ts-node -T journey/memory-requests-and-being-away-live.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { TheWeeklyReportService } from '../src/modules/reports/the-weekly-report.service';
import { keptForTheOrganisation } from '../src/modules/knowledge/organisation-memory';
import { whatTheOrganisationKeepsBlock } from '../src/modules/knowledge/what-the-organisation-keeps';

const API = process.env.API ?? 'http://localhost:3000/api/v1';
const DB_URL = process.env.DATABASE_URL ?? '';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API) || !/@(localhost|127\.0\.0\.1)(:\d+)?\/gw_/.test(DB_URL)) {
  console.error('Refusing: a local API and a local gw_ test database only.');
  process.exit(1);
}
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
const PW = 'MemoryLeaveAway123!';
const stamp = Date.now();
const DAY = 86_400_000;

async function http(path: string, o: { method?: string; body?: any; token?: string } = {}): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    method: o.method ?? (o.body !== undefined ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) },
    ...(o.body !== undefined ? { body: JSON.stringify(o.body) } : {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) return { refused: res.status, message: json?.message ?? text.slice(0, 300) };
  return json && typeof json === 'object' && 'success' in json && 'data' in json ? json.data : json;
}

const say = (who: string, what: string) => console.log(`  ${who} reads:\n${String(what).split('\n').map((l) => `      ${l}`).join('\n')}`);
const heading = (t: string) => console.log(`\n==================== ${t} ====================`);
const sub = (t: string) => console.log(`\n--- ${t}`);
const textOf = (r: any) => (r?.blocks ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');

interface Someone { first: string; last: string; userId: string; token: string; email: string; externalId: string }

/** What Ask Groundwork says back, and the proposal it carries, if any. */
async function ask(p: Someone, message: string, extra: Record<string, unknown> = {}) {
  console.log(`  ${p.first} types: "${message}"`);
  const r = await http('/ask', { token: p.token, body: { message, ...extra } });
  if (r?.refused) { say(p.first, `REFUSED ${r.refused}: ${r.message}`); return { r, proposal: null as any }; }
  const proposal = (r?.blocks ?? []).find((b: any) => b.type === 'proposal') ?? null;
  /* As the panel draws it: each text block as a bubble (an empty one too), then the say-back under it unless a text block already says it. */
  const bubbles = (r?.blocks ?? []).filter((b: any) => b.type === 'text').map((b: any) => (b.body === '' ? '[an empty bubble]' : b.body));
  if (proposal && !bubbles.includes(proposal.summary)) bubbles.push(proposal.summary);
  say(p.first, `${bubbles.join('\n')}${r?.lane ? `\n[lane ${r.lane}, written by ${r.composedBy}]` : ''}`);
  if (proposal) console.log(`      [buttons: Yes / No]`);
  return { r, proposal };
}

async function answer(p: Someone, proposal: any, yesNo: 'yes' | 'no') {
  console.log(`  ${p.first} presses ${yesNo === 'yes' ? 'Yes' : 'No'}.`);
  const r = await http('/ask/answer', { token: p.token, body: { proposalId: proposal.proposalId, answer: yesNo } });
  say(p.first, r?.refused ? `REFUSED ${r.refused}: ${r.message}` : textOf(r));
  return r;
}

/** What Today says to this reader, only the items about approving, and anything else in one line each. */
async function today(p: Someone, onlyApprovals = false) {
  const r = await http('/today', { token: p.token });
  if (r?.refused) return say(p.first, `Today: REFUSED ${r.refused}: ${r.message}`);
  const needs: any[] = r?.needs ?? [];
  const shown = onlyApprovals ? needs.filter((n) => String(n.key ?? '').startsWith('approve-')) : needs;
  if (!shown.length) return say(p.first, `Today${onlyApprovals ? ' (anything to approve)' : ''}: nothing.`);
  say(p.first, `Today:\n${shown.map((n) => `${n.title}${n.detail ? ` ${n.detail}` : ''}${n.action ? `  [${n.action.label} -> ${n.action.to}]` : ''}`).join('\n')}`);
}

async function company(p: Someone) {
  const r = await http('/company', { token: p.token });
  if (r?.refused) return say(p.first, `Company page: REFUSED ${r.refused}: ${r.message}`);
  if (!('whatWeKeep' in (r ?? {}))) return say(p.first, 'Company page: no "What we keep" section (the field is absent).');
  const w = r.whatWeKeep;
  say(p.first, `Company page, "What we keep":\n${w.readBy}\n${(w.items ?? []).map((i: any) => `${i.kind}: "${i.says}" (${i.source})`).join('\n') || '(no items)'}`);
}

const rows = (label: string, list: any[]) =>
  console.log(`  Saved, ${label}: ${list.length ? '' : 'none'}${list.map((r) => `\n      ${JSON.stringify(r).slice(0, 320)}`).join('')}`);

async function main() {
  heading('SETTING UP');
  /* The guest's own organisation. */
  const home = await prisma.organization.create({ data: { name: `Ouma Agencies ${stamp}`, slug: `ouma-${stamp}`, email: `office.${stamp}@ouma.test` } });
  const org = await prisma.organization.create({ data: { name: `Baridi Foods ${stamp}`, slug: `baridi-${stamp}`, email: `office.${stamp}@baridi.test` } });

  const make = async (first: string, last: string, role: 'ADMIN' | 'LEAD' | 'MEMBER', orgId: string, person?: { department?: string; manager?: string }) => {
    const email = `${first.toLowerCase()}.${stamp}@${orgId === home.id ? 'ouma' : 'baridi'}.test`;
    const user = await prisma.user.create({
      data: { email, organizationId: orgId, firstName: first, lastName: last, passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true, role } as any,
    });
    await prisma.organizationMembership.create({ data: { userId: user.id, organizationId: orgId, role: role as any } });
    const externalId = `staff-${first.toLowerCase()}-${stamp}`;
    if (orgId === org.id) {
      await prisma.person.create({
        data: {
          organizationId: orgId, externalId, sourceSystem: 'hr-directory', userName: email, displayName: `${first} ${last}`,
          givenName: first, familyName: last, email, linkedUserId: user.id, active: true,
          department: person?.department ?? null, managerExternalId: person?.manager ?? null,
        },
      });
    }
    const login = await http('/auth/login', { body: { email, password: PW } });
    if (!login?.accessToken) throw new Error(`${first} could not sign in: ${JSON.stringify(login).slice(0, 200)}`);
    return { first, last, userId: user.id, token: login.accessToken as string, email, externalId } as Someone;
  };

  const grace = await make('Grace', 'Achieng', 'ADMIN', org.id, { department: 'Management' });
  const wairimu = await make('Wairimu', 'Njoroge', 'LEAD', org.id, { department: 'Sales' });
  const amani = await make('Amani', 'Wekesa', 'MEMBER', org.id, { department: 'Sales', manager: wairimu.externalId });
  const chidi = await make('Chidi', 'Okeke', 'MEMBER', org.id, { department: 'Sales', manager: wairimu.externalId });
  const baraka = await make('Baraka', 'Mutua', 'MEMBER', org.id, { department: 'Operations' });
  const peter = await make('Peter', 'Ouma', 'ADMIN', home.id);
  console.log(`  Baridi Foods: Grace (admin), Wairimu (lead, line manager of Amani and Chidi), Amani, Chidi (Sales), Baraka (Operations, no line manager).`);
  console.log(`  Ouma Agencies: Peter, who joins one Baridi check-in as a guest.`);

  /* Grace switches the three suites on, as an admin does on the Suites page. */
  const on = async (key: string, answers: Record<string, unknown>) => {
    const r = await http(`/suites/${key}`, { method: 'PUT', token: grace.token, body: { on: true, answers } });
    console.log(`  Grace switches on ${key}: ${r?.refused ? `REFUSED ${r.refused}: ${r.message}` : 'on'}`);
  };
  await on('leave', { days: 21, approver: 'Their manager' });
  await on('time', { clients: ['Atlas', 'Lakeside'], approver: 'Their manager' });
  await on('spend', { currency: 'KES', limit: 20000, above: grace.userId });
  const budget = await http('/suites/spend/budgets', { method: 'PUT', token: grace.token, body: { team: 'Sales', amount: 38000 } });
  console.log(`  Grace sets the Sales budget for this month to KES 38,000: ${budget?.refused ? `REFUSED ${budget.refused}: ${budget.message}` : 'set'}`);

  /* Wairimu's check-in, with Amani, Chidi, Baraka and the guest Peter on it. */
  let ground = await http('/grounds', {
    token: wairimu.token,
    body: { label: 'Sales team, Q4', scenario: 'OKR_ALIGNMENT', moment: 'STARTING', cadence: 'WEEKLY', timelineDays: 84,
      brief: 'This check-in follows the sales team through the fourth quarter: the pipeline, the renewals with Harbor Foods and Green Mart, and how each person is getting on with their customers.' },
  });
  if (!ground?.id) throw new Error(`the check-in was not created: ${JSON.stringify(ground).slice(0, 300)}`);
  if (ground.status === 'AWAITING_APPROVAL') {
    const ok = await http(`/grounds/${ground.id}/approve`, { token: grace.token, body: {} });
    console.log(`  Grace accepts Wairimu's check-in: ${ok?.refused ? `REFUSED ${ok.refused}: ${ok.message}` : 'accepted'}`);
  }
  const groundId = ground.id as string;
  const join = async (p: Someone, roleAsDescribed: string) => {
    const added = await http(`/grounds/${groundId}/participants`, { token: wairimu.token, body: { email: p.email, roleAsDescribed } });
    if (added?.refused) throw new Error(`${p.first} was not added: ${JSON.stringify(added).slice(0, 300)}`);
    const row = await prisma.groundParticipant.findFirst({ where: { groundId, email: p.email } });
    /* Accepting the invitation, as the person who clicks it while signed in. */
    if (row?.inviteToken) await http('/participants/accept', { token: p.token, body: { token: row.inviteToken, firstName: p.first, lastName: p.last } });
    let now = await prisma.groundParticipant.findUnique({ where: { id: row!.id } });
    if (!now?.userId) now = await prisma.groundParticipant.update({ where: { id: row!.id }, data: { userId: p.userId } });
    return now!.id;
  };
  const amaniPid = await join(amani, 'Sales');
  const chidiPid = await join(chidi, 'Sales');
  const barakaPid = await join(baraka, 'Deliveries');
  const peterPid = await join(peter, 'Distributor');
  /* The organisation is on the free plan, so Peter is held for a seat; Grace makes room for him, as an admin does. */
  const held = await prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId: peter.userId, organizationId: org.id } } });
  if (held?.heldForASeat) {
    await prisma.organizationMembership.update({ where: { id: held.id }, data: { heldForASeat: false } });
    await prisma.groundParticipant.update({ where: { id: peterPid }, data: { awaitingSeat: false } });
    console.log('  Peter was held for a seat; room is made for him (written here, as the seat is not what this checks).');
  }
  const peterHere = await prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId: peter.userId, organizationId: org.id } } });
  console.log(`  Wairimu's check-in "Sales team, Q4" has Amani, Chidi, Baraka and Peter. Peter's membership here: ${peterHere?.role ?? 'none'}.`);
  const switched = await http('/auth/switch-organization', { token: peter.token, body: { organizationId: org.id } });
  if (switched?.accessToken) peter.token = switched.accessToken;
  else console.log(`  Peter could not switch to Baridi Foods: ${JSON.stringify(switched).slice(0, 200)}`);

  // ---------------------------------------------------------------------------------------------
  heading('1. MEMORY (WEEK 20)');
  sub('Wairimu opens Ask Groundwork from inside her check-in and says two things true of the whole company');
  await ask(wairimu, '', { groundId, openedFrom: 'check_in_setup' });
  const good = await ask(wairimu, 'Good means every renewal is signed before the old contract ends.', { groundId, openedFrom: 'check_in_setup' });
  if (good.proposal) await answer(wairimu, good.proposal, 'yes');
  const first = await ask(wairimu, 'Every quote over 1 million shillings needs Grace’s sign-off before it goes to a customer.', { groundId, openedFrom: 'check_in_setup' });
  if (first.proposal) await answer(wairimu, first.proposal, 'no');
  rows('organisation memory after the no', await prisma.organizationMemory.findMany({ where: { organizationId: org.id }, select: { kind: true, text: true, status: true } }));
  const second = await ask(wairimu, 'Every quote over 1 million shillings needs Grace’s sign-off before it goes to a customer.', { groundId, openedFrom: 'check_in_setup' });
  if (second.proposal) await answer(wairimu, second.proposal, 'yes');
  rows('organisation memory after the yes', await prisma.organizationMemory.findMany({ where: { organizationId: org.id }, select: { kind: true, text: true, status: true, sourceLine: true, keptAt: true } }));

  sub('Later: the same question to Ask Groundwork, from each person');
  for (const p of [wairimu, grace, chidi]) await ask(p, 'How do we get a quote signed off?');

  sub('What a later check-in is given (the function the conversation calls to add it to its instructions)');
  say('The model, never a person', whatTheOrganisationKeepsBlock(await keptForTheOrganisation(prisma as any, org.id)) || '(nothing)');

  sub('The Company page, for each person');
  for (const p of [wairimu, grace, chidi, amani]) await company(p);
  sub("Chidi tries to read Wairimu's questions to Ask Groundwork");
  const peek = await http(`/ask/${wairimu.userId}`, { token: chidi.token });
  say('Chidi', peek?.refused ? `REFUSED ${peek.refused}: ${peek.message}` : JSON.stringify(peek).slice(0, 300));

  // ---------------------------------------------------------------------------------------------
  heading('2. LEAVE (WEEKS 20 AND 21)');
  const longAgo = new Date(Date.now() - 2 * DAY);
  const until = new Date(Date.now() + 1 * DAY);
  const asSaid = (d: Date) => `${d.getUTCDate()} ${d.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' })}`;
  sub('Amani asks for leave that covers today (her line manager is Wairimu)');
  const amaniLeave = await ask(amani, `I need leave from ${asSaid(longAgo)} to ${asSaid(until)} ${until.getUTCFullYear()}.`);
  if (amaniLeave.proposal) await answer(amani, amaniLeave.proposal, 'yes');
  sub('Baraka asks for leave next week (he has no line manager, so an admin approves)');
  const barakaLeave = await ask(baraka, 'I need next Thursday and Friday off.');
  if (barakaLeave.proposal) await answer(baraka, barakaLeave.proposal, 'yes');
  sub('Days that cannot be read without guessing, and a no');
  await ask(chidi, 'I need Monday and Wednesday off next week.');
  await ask(chidi, 'I need leave today and tomorrow.');
  const chidiNo = await ask(chidi, 'I want leave on 20 October.');
  if (chidiNo.proposal) await answer(chidi, chidiNo.proposal, 'no');
  rows('leave requests', (await prisma.leaveRequest.findMany({ where: { organizationId: org.id }, select: { userId: true, startsOn: true, endsOn: true, status: true, kind: true } }))
    .map((r) => ({ who: [amani, baraka, chidi].find((p) => p.userId === r.userId)?.first, from: r.startsOn.toISOString().slice(0, 10), to: r.endsOn.toISOString().slice(0, 10), status: r.status })));

  sub('Who is told on Today');
  for (const p of [wairimu, grace, chidi, amani, baraka]) await today(p, true);
  sub('Each person tries to approve; only the approver can (the same request the leave board sends)');
  const approveLeave = async (p: Someone, whose: Someone) => {
    const req = await prisma.leaveRequest.findFirst({ where: { organizationId: org.id, userId: whose.userId, status: 'waiting' } });
    if (!req) return console.log(`  No waiting request from ${whose.first}.`);
    const r = await http(`/suites/leave/requests/${req.id}/approve`, { token: p.token, body: {} });
    console.log(`  ${p.first} approves ${whose.first}'s leave: ${r?.refused ? `REFUSED ${r.refused}: ${r.message}` : 'approved'}`);
  };
  await approveLeave(chidi, amani);
  await approveLeave(grace, amani);
  await approveLeave(wairimu, amani);
  await approveLeave(wairimu, baraka);
  await approveLeave(grace, baraka);
  sub("What a colleague can open of anybody's leave");
  const cb = await http('/suites/leave/board', { token: chidi.token });
  say('Chidi', `The leave board: ${cb?.refused ? `REFUSED ${cb.refused}: ${cb.message}` : JSON.stringify(cb).slice(0, 300)}`);
  const cm = await http('/suites/leave/mine', { token: chidi.token });
  say('Chidi', `His own leave: ${JSON.stringify(cm).slice(0, 300)}`);
  const mine = await http('/suites/leave/mine', { token: amani.token });
  say('Amani', `Her own leave: ${JSON.stringify(mine).slice(0, 400)}`);

  // ---------------------------------------------------------------------------------------------
  heading('3. HOURS (WEEK 21) AND SPENDING (WEEK 22)');
  sub('Baraka gives his hours');
  const hours = await ask(baraka, 'I did 6 hours on Atlas today.');
  if (hours.proposal) await answer(baraka, hours.proposal, 'yes');
  await ask(baraka, 'I did 3 hours on Zebra yesterday.');
  sub('Chidi asks to spend, within the budget, then over the rule, then in another currency');
  const fits = await ask(chidi, 'Can I spend KES 12,000 on fuel for the Kisumu trip?');
  if (fits.proposal) await answer(chidi, fits.proposal, 'yes');
  const over = await ask(chidi, 'I want to spend 30,000 on a stand for the Nairobi show.');
  if (over.proposal) await answer(chidi, over.proposal, 'no');
  await ask(chidi, 'I spent USD 50 on taxis to the Westlands shops.');
  sub("What a colleague can open of anybody's hours or spending");
  for (const path of ['/suites/time/board', '/suites/spend/board']) {
    const r = await http(path, { token: amani.token });
    say('Amani', `${path}: ${r?.refused ? `REFUSED ${r.refused}: ${r.message}` : JSON.stringify(r).slice(0, 300)}`);
  }
  rows('hours', await prisma.timeEntry.findMany({ where: { organizationId: org.id }, select: { client: true, onDay: true, minutes: true } }));
  rows('requests to spend', await prisma.spendRequest.findMany({ where: { organizationId: org.id }, select: { amount: true, what: true, team: true, status: true } }));
  sub('Who is told on Today');
  for (const p of [wairimu, grace, chidi, amani]) await today(p, true);
  sub('The approvers decide');
  const sp = await prisma.spendRequest.findFirst({ where: { organizationId: org.id, status: 'waiting' } });
  if (sp) {
    for (const p of [grace, wairimu]) {
      const r = await http(`/suites/spend/requests/${sp.id}/approve`, { token: p.token, body: {} });
      console.log(`  ${p.first} approves Chidi's request to spend: ${r?.refused ? `REFUSED ${r.refused}: ${r.message}` : 'approved'}`);
    }
  }
  const timeBoard = await http('/suites/time/board', { token: grace.token });
  const week = JSON.stringify(timeBoard).match(/"weekOf":"(\d{4}-\d{2}-\d{2})"/)?.[1];
  if (week) {
    for (const p of [wairimu, grace]) {
      const r = await http(`/suites/time/weeks/${week}/people/${baraka.userId}/approve`, { token: p.token, body: {} });
      console.log(`  ${p.first} approves Baraka's hours: ${r?.refused ? `REFUSED ${r.refused}: ${r.message}` : 'approved'}`);
    }
  } else console.log(`  The time sheets board as Grace: ${JSON.stringify(timeBoard).slice(0, 300)}`);
  rows('assistant proposals (what was said back, and what came of it)', (await prisma.assistantProposal.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: 'asc' }, select: { kind: true, state: true, summary: true } })));

  // ---------------------------------------------------------------------------------------------
  heading('4. BEING AWAY (WEEK 23)');
  const act = await http(`/grounds/${groundId}/activate`, { token: grace.token, body: {} });
  console.log(`  Grace opens the check-in: ${act?.refused ? `REFUSED ${act.refused}: ${act.message}` : 'opened'}`);
  const checkIns = await prisma.checkIn.findMany({ where: { groundId, isSetup: false }, select: { id: true, participantId: true, sessionNumber: true, status: true } });
  console.log(`  Check-ins open: ${checkIns.length}`);

  sub('The check-in page, for each person (whoIsAway and the count)');
  for (const p of [wairimu, chidi, amani, grace, peter]) {
    const g = await http(`/grounds/${groundId}`, { token: p.token });
    if (g?.refused) { say(p.first, `REFUSED ${g.refused}: ${g.message}`); continue; }
    const sp2 = g?.sessionProgress;
    console.log(`      [${p.first} is shown on the check-in: ${(g?.participants ?? []).map((x: any) => x?.user?.firstName ?? x?.nameGiven ?? x?.label ?? '?').join(', ')}; peersVisibleEffective ${g?.peersVisibleEffective}]`);
    say(p.first, `${(g?.whoIsAway ?? []).map((w: any) => w.says).join('\n') || '(no line about anybody away)'}\n[count: ${sp2 ? `${sp2.completed} of ${sp2.total} have answered; waiting on ${sp2.missingParticipantIds?.length ?? '?'}` : 'none'}]`);
  }
  sub('The board, for each person');
  for (const p of [wairimu, chidi, amani]) {
    const b = await http(`/grounds/${groundId}/board`, { token: p.token });
    say(p.first, b?.refused ? `REFUSED ${b.refused}: ${b.message}` : (b?.whoIsAway ?? []).map((w: any) => w.says).join('\n') || `(no line about anybody away; renders ${b?.renders}, whoIsAway ${'whoIsAway' in (b ?? {}) ? 'served empty' : 'not served'}${b?.message ? `, ${b.message}` : ''})`);
  }
  sub('Today, for Wairimu and for Amani while she is away');
  await today(wairimu);
  await today(amani);

  sub('Reminders: Wairimu presses "Remind" on the round');
  const anyCheckIn = checkIns.find((c) => c.participantId === chidiPid) ?? checkIns[0];
  if (anyCheckIn) {
    const r = await http(`/check-ins/${anyCheckIn.id}/remind`, { token: wairimu.token, body: {} });
    say('Wairimu', r?.refused ? `REFUSED ${r.refused}: ${r.message}` : JSON.stringify(r));
    const nudged = await prisma.groundParticipant.findMany({ where: { groundId }, select: { id: true, lastNudgedAt: true } });
    const name = (id: string) => ({ [amaniPid]: 'Amani', [chidiPid]: 'Chidi', [barakaPid]: 'Baraka', [peterPid]: 'Peter' } as Record<string, string>)[id] ?? 'Wairimu';
    rows('who was nudged', nudged.map((n) => ({ who: name(n.id), nudged: !!n.lastNudgedAt })));
  }

  sub("Commitments: Amani kept one, and one fell due while she was on leave and was settled not done");
  const settledAt = new Date(Date.now() - 1 * DAY);
  await prisma.groundCommitment.createMany({
    data: [
      { groundId, participantId: amaniPid, text: 'Send Green Mart the price list', status: 'DONE', source: 'CHECK_IN', createdAt: new Date(Date.now() - 9 * DAY), settledAt: new Date(Date.now() - 6 * DAY) },
      { groundId, participantId: amaniPid, text: 'Visit Harbor Foods about the renewal', status: 'NOT_DONE', source: 'CHECK_IN', whenSaid: 'by Wednesday', createdAt: new Date(Date.now() - 3 * DAY), settledAt },
    ] as any,
  });
  const you = await http('/you', { token: amani.token });
  say('Amani', `Her You board: ${JSON.stringify(you?.keptLately ?? you?.kept ?? you?.commitmentsKept ?? Object.keys(you ?? {})).slice(0, 400)}`);

  sub('The weekly report (built by the code the API runs when a check-in completes; Chidi has checked in, Amani is away)');
  const chidiCheckIn = checkIns.find((c) => c.participantId === chidiPid);
  if (chidiCheckIn) {
    await prisma.checkIn.update({ where: { id: chidiCheckIn.id }, data: { status: 'COMPLETED', startedAt: new Date(Date.now() - 3600_000), completedAt: new Date() } as any });
    await prisma.recordEntry.createMany({
      data: [
        { checkInId: chidiCheckIn.id, participantId: chidiPid, type: 'COMMITMENT', text: 'I will call Harbor Foods on Friday about the renewal.' },
        { checkInId: chidiCheckIn.id, participantId: chidiPid, type: 'PROGRESS', text: 'I visited Green Mart and left the new price list.' },
      ] as any,
    }).catch((e: any) => console.log(`  (record rows not written: ${String(e?.message).slice(0, 200)})`));
  }
  await new TheWeeklyReportService(prisma as any).build(groundId);
  for (const p of [wairimu, amani, chidi, grace]) {
    const w = await http(`/grounds/${groundId}/report/week`, { token: p.token });
    if (w?.refused) { say(p.first, `REFUSED ${w.refused}: ${w.message}`); continue; }
    say(p.first, [
      w.heading, w.whatThisIs,
      ...(w.inNumbers ?? []).map((n: any) => n.says),
      ...(w.eachPerson ?? []).map((e: any) => e.says ?? e),
      ...(w.acrossTheTeam ?? []),
    ].filter(Boolean).join('\n') || w.saying);
  }
  sub('Suggestions, as Wairimu');
  const sugg = await http(`/grounds/${groundId}/suggestions`, { token: wairimu.token });
  say('Wairimu', sugg?.refused ? `REFUSED ${sugg.refused}: ${sugg.message}` : JSON.stringify(sugg).slice(0, 400));

  // ---------------------------------------------------------------------------------------------
  heading('5. A GUEST (WEEK 24)');
  for (const m of [
    'What is this check-in for?',
    'Who reads what I say?',
    'What did I say?',
    'What did Amani say?',
    'When does a delivery count here?',
    'I need next Thursday and Friday off.',
    'I did 4 hours on Atlas today.',
    'Can I spend KES 5,000 on fuel for the Kisumu trip?',
  ]) await ask(peter, m);
  await company(peter);
  await today(peter);
  rows("Peter's questions, kept under his own key only", await prisma.assistantTurn.findMany({ where: { organizationId: org.id, personExternalId: { contains: peter.userId } }, select: { role: true, lane: true } }).catch(() => []));
  rows('anything Peter asked for, sent to a suite', [
    ...(await prisma.leaveRequest.findMany({ where: { userId: peter.userId } })),
    ...(await prisma.timeEntry.findMany({ where: { userId: peter.userId } })),
    ...(await prisma.spendRequest.findMany({ where: { userId: peter.userId } })),
  ]);
  const onList = await prisma.person.findFirst({ where: { organizationId: org.id, linkedUserId: peter.userId } });
  console.log(`  Is Peter on Baridi Foods' list of people? ${onList ? 'yes' : 'no'}`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
