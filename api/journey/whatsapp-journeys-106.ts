/*
 * DECISIONS 106 AND 107 ON WHATSAPP, THROUGH THE LOCAL WEBHOOK (5 October, night). Run by whatsapp-journeys.ts
 * after the other journeys, with the same recorder, signing and database.
 *
 * 15. Several check-ins open, the first message to a number, "Connect WhatsApp", one number for one person,
 *     STOP from a first-contact number, and spending said without "spend".
 * 16. How a check-in ends on WhatsApp, for every kind: Groundwork says it is done and the person writes
 *     "finish"; "finish" written early; and stopping halfway (the reminder, the half-hour warning, the
 *     clock's close). What the person and the lead receive is printed word for word, for the run log.
 *
 * Time is moved by moving the record back, as the other journeys do. The clock's close is the two calls the
 * sweep makes, for the one check-in (tellThemTheClockClosedIt, then closeByTheClock), so the sweep does not
 * close every stale session in the copied database.
 */
import { tellThemTheClockClosedIt } from '../src/modules/whatsapp/a-check-in-left-halfway';

export async function decision106(c: any): Promise<void> {
  const { make, signIn, prisma, api, outbox, since, says, writes, received, check, log, heading, cron, wairimu, grace, chidi, orgs, waitQuiet } = c;
  const bodyOf = (s: any) => s.text as string;
  const firstContact = (inner: string) => `This is Groundwork, writing for ${orgs.on.name}. ${inner} Not you? Reply STOP.`;
  await signIn(wairimu); await signIn(grace);

  const makeGround = async (label: string, people: any[], extra: Record<string, unknown> = {}) => {
    const g = await api('/grounds', { token: wairimu.token, body: { label, scenario: 'OKR_ALIGNMENT', moment: 'STARTING', cadence: 'WEEKLY', timelineDays: 84, brief: `This check-in is about ${label}: what moved this week, what is stuck, and what each person needs.`, ...extra } });
    if (!g?.id) throw new Error(`"${label}" was not created: ${JSON.stringify(g).slice(0, 300)}`);
    if (g.status === 'AWAITING_APPROVAL') await api(`/grounds/${g.id}/approve`, { token: grace.token, body: {} });
    for (const p of people) {
      await api(`/grounds/${g.id}/participants`, { token: wairimu.token, body: { email: p.email, roleAsDescribed: 'Sales' } });
      const row = await prisma.groundParticipant.findFirst({ where: { groundId: g.id, email: p.email } });
      if (!row?.userId) await prisma.groundParticipant.update({ where: { id: row!.id }, data: { userId: p.userId } });
    }
    return g.id as string;
  };

  // ==============================================================================================
  heading('15. TWO CHECK-INS OPEN, THE FIRST MESSAGE TO A NUMBER, CONNECT WHATSAPP, AND ONE NUMBER');
  const hana = await make('Hana', 'Wanjiru', 'MEMBER', orgs.on, 'kito', { department: 'Sales', manager: wairimu.externalId });
  await signIn(hana);
  const user = await prisma.user.findUnique({ where: { id: hana.userId }, select: { phoneNumber: true } });
  log(`  Hana's number is only on the roster (${hana.phone}); her sign-in has ${user?.phoneNumber ? 'one' : 'none'}.`);

  const me1 = await api('/auth/me', { token: hana.token });
  log(`  Before Hana writes, her own profile carries: ${JSON.stringify(me1?.connectWhatsApp)}`);
  check('Hana\'s own profile offers "Connect WhatsApp", opening WhatsApp with Hi typed to Groundwork\'s number', me1?.connectWhatsApp?.says === 'Connect WhatsApp' && /^https:\/\/wa\.me\/\d+\?text=Hi$/.test(me1?.connectWhatsApp?.link ?? ''), JSON.stringify(me1?.connectWhatsApp));

  const pipeline = await makeGround('Pipeline review', [hana], { cadence: 'WEEKLY' });
  const visits = await makeGround('Store visits', [hana], { cadence: 'DAILY' });
  const pipelineCi = await prisma.checkIn.findFirst({ where: { groundId: pipeline, participant: { email: hana.email } } });
  const visitsCi = await prisma.checkIn.findFirst({ where: { groundId: visits, participant: { email: hana.email } } });
  const t1 = await api(`/check-ins/${pipelineCi.id}/transcript`, { token: hana.token });
  check('Her own check-in read offers it too', t1?.connectWhatsApp?.says === 'Connect WhatsApp', JSON.stringify(t1?.connectWhatsApp));
  const asLead = await api(`/check-ins/${pipelineCi.id}/transcript`, { token: wairimu.token });
  const asAdmin = await api(`/check-ins/${pipelineCi.id}/transcript`, { token: grace.token });
  check('Her lead and an admin cannot read her check-in at all, so neither is served her link', !!asLead?.refused && !!asAdmin?.refused && !JSON.stringify(asLead).includes('wa.me') && !JSON.stringify(asAdmin).includes('wa.me'), JSON.stringify({ lead: asLead?.refused, admin: asAdmin?.refused }));
  const leadMe = await api('/auth/me', { token: wairimu.token });
  log(`  Wairimu's own profile carries: ${JSON.stringify(leadMe?.connectWhatsApp)} (her own link, because she has never written either; never Hana's).`);

  const announced = outbox.length;
  await cron.sendSessionReadyNotificationsInner();
  await waitQuiet(1000);
  const notices = received(hana, announced);
  check('The first message ever sent to Hana\'s roster number names the organisation and ends "Not you? Reply STOP."', notices.length === 2 && notices[0].template === 'groundwork_first_contact' && notices[0].text.startsWith(`This is Groundwork, writing for ${orgs.on.name}. Hi Hana, your check-in for `) && notices[0].text.endsWith(' Not you? Reply STOP.'), JSON.stringify(notices.map(bodyOf)));
  check('The second is the ordinary opening notice, with nothing added', notices.length === 2 && notices[1].template === 'checkin_open' && !/Not you\?/.test(notices[1].text), JSON.stringify(notices.map(bodyOf)));

  /* She writes in cold, with two open: one at a time, the one closing soonest first (Store visits is daily). */
  const cold = await says(hana, 'Hi');
  check('Writing in cold with two open, she is told both and starts with the one closing soonest, with no numbered list', cold.text.startsWith('You have two check-ins open: "Store visits" and "Pipeline review". Let\'s start with "Store visits".\n\nStore visits, session 1.') && !/Reply with the number/.test(cold.text), cold.text);
  const me2 = await api('/auth/me', { token: hana.token });
  const t2 = await api(`/check-ins/${pipelineCi.id}/transcript`, { token: hana.token });
  check('Once she has written, "Connect WhatsApp" is gone from both her reads', me2?.connectWhatsApp === null && t2?.connectWhatsApp === null, JSON.stringify({ me: me2?.connectWhatsApp, transcript: t2?.connectWhatsApp }));

  /* She replies to the Pipeline review notice (WhatsApp sends the notice's id as the reply's context). */
  const pipelineNotice = await prisma.whatsAppSend.findFirst({ where: { checkInId: pipelineCi.id, kind: { startsWith: 'checkin-open' }, providerMessageId: { not: null } } });
  const replied = await writes(hana, { type: 'text', text: { body: 'START' }, context: { id: pipelineNotice?.providerMessageId } }, 'replies START to the Pipeline review notice');
  check('A reply to the Pipeline review notice goes straight to Pipeline review', replied.text.startsWith('Pipeline review, session 1.'), replied.text);
  const sw = await says(hana, 'switch');
  check('"switch" gives the numbered list, the one place Groundwork cannot tell', /^You have more than one check-in open\. Which is this for\? Reply with the number\./.test(sw.text), sw.text);
  await says(hana, '2');

  /* Spending asked for without the word "spend". */
  const sp = await says(hana, 'I need 15,000 shillings approved for fuel for the van this week.');
  check('"I need 15,000 shillings approved for fuel for the van this week." is offered as a spending request', sp.text === 'Shall I treat this as a spending request?', sp.text);
  await says(hana, 'no');

  /* Finishing one offers the next. */
  const answers = ['I visited six stores this week, four in Westlands and two in Kilimani.', 'Two of them want the new price list before they reorder.', 'I will send them the price list on Monday.', 'Nothing else is stuck, and I have everything I need.', 'That is everything for today.'];
  let fin: any = null;
  for (const a of answers) {
    await says(hana, a);
    fin = await says(hana, 'finish');
    if (/Your check-in is complete and on record/.test(fin.text)) break;
  }
  /* Open now: a next session made for next week is not open yet (run 6 counted it, and the check failed on a correct message). */
  const open = await prisma.checkIn.findMany({ where: { participant: { email: hana.email }, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] }, OR: [{ availableFrom: null }, { availableFrom: { lte: new Date() } }] }, select: { groundId: true } });
  const nextLabel = open.some((o: any) => o.groundId === pipeline) ? 'Pipeline review' : 'Store visits';
  check('Finishing one offers the next', !!fin && fin.text.startsWith('Your check-in is complete and on record. Your report follows in a moment.') && fin.text.includes(`You also have "${nextLabel}" open. Reply START when you are ready to begin it.`), fin?.text);

  /* One number for one person: an admin changes Hana's number on her sign-in, and her roster entry follows; a clash is refused. */
  const newNumber = `+25479${String(Date.now()).slice(-7)}`;
  const changed = await api(`/users/${hana.userId}`, { method: 'PATCH', token: grace.token, body: { phoneNumber: newNumber } });
  const roster = await prisma.person.findUnique({ where: { id: hana.personId }, select: { phone: true } });
  check('An admin changes Hana\'s number on her sign-in, and her roster entry follows', !changed?.refused && roster?.phone === newNumber, JSON.stringify({ changed: changed?.refused ?? 'ok', roster: roster?.phone }));
  await prisma.user.update({ where: { id: chidi.userId }, data: { phoneNumber: chidi.phone } }).catch(() => undefined);
  const clash = await api(`/users/${hana.userId}`, { method: 'PATCH', token: grace.token, body: { phoneNumber: chidi.phone } });
  check('Chidi\'s number cannot be put on Hana\'s sign-in, and the admin is told why in a sentence', clash?.refused === 400 && clash?.message === 'This number is already used by another Groundwork sign-in, so it cannot be saved here. Check the number, or ask that person to remove it from their Settings first.', JSON.stringify(clash));
  await api(`/users/${hana.userId}`, { method: 'PATCH', token: grace.token, body: { phoneNumber: hana.phone } });

  /* STOP from a number reached for the first time. */
  const imani = await make('Imani', 'Achieng', 'MEMBER', orgs.on, 'kito', { department: 'Sales', manager: wairimu.externalId });
  const imaniGround = await makeGround('Imani\'s week', [imani]);
  const imaniFrom = outbox.length;
  await cron.sendSessionReadyNotificationsInner();
  await waitQuiet(800);
  const toImani = received(imani, imaniFrom);
  check('Imani\'s first message names the organisation and says "Not you? Reply STOP."', toImani.length === 1 && toImani[0].text === firstContact('Hi Imani, your check-in for Imani\'s week is open. It takes about five minutes, and you can answer right here. Reply START to begin.'), JSON.stringify(toImani.map(bodyOf)));
  const stop = await says(imani, 'STOP');
  check('STOP is answered in Hafsah\'s words, which say decisions still come by email', stop.text === 'Stopped. Nothing more comes to this number from Groundwork unless you reply START. Your check-ins are still in Groundwork. Leave and spending decisions still reach you by email.', stop.text);
  await prisma.checkIn.updateMany({ where: { groundId: imaniGround }, data: { createdAt: new Date(Date.now() - 8 * c.DAY) } });
  const afterStop = outbox.length;
  await cron.sendWhatsAppRemindersInner(new Date());
  await waitQuiet(800);
  check('After STOP, the morning job writes nothing to that number', since(afterStop).filter((s: any) => s.to === imani.phone).length === 0, JSON.stringify(since(afterStop).filter((s: any) => s.to === imani.phone).map(bodyOf)));

  /* A leave decision for Imani, who said STOP: it reaches her by email. */
  const leave = await prisma.leaveRequest.create({ data: { organizationId: orgs.on.id, userId: imani.userId, startsOn: new Date('2026-11-09'), endsOn: new Date('2026-11-10'), status: 'waiting' } as any }).catch((e: any) => ({ error: e?.message }));
  if ((leave as any)?.id) {
    const decided = await api(`/suites/leave/requests/${(leave as any).id}/approve`, { method: 'POST', token: wairimu.token, body: {} });
    await waitQuiet(1000);
    /* A local run does not write a sent mail to the notifications table (it logs "[DEV EMAIL]"); the record of who was told says it went by email. */
    const told = await prisma.suiteEvent.findFirst({ where: { toUserId: imani.userId, kind: 'told' }, orderBy: { at: 'desc' } }).catch(() => null);
    log(`  Wairimu approves Imani's leave (${decided?.refused ? `refused ${decided.refused}: ${decided.message}` : 'ok'}). Imani was told by: ${JSON.stringify(told?.basis ?? null)}`);
    check('The decision on a stopped number\'s leave reaches her by email', (told?.basis as any)?.message === 'request-decided:email', JSON.stringify(told?.basis ?? null));
  } else {
    log(`  (The leave row could not be made directly: ${(leave as any)?.error}; the email is proved by a-decision-reaches-a-stopped-number-by-email.spec.ts.)`);
  }
}

/* ================================================================================================
 * 16. HOW A CHECK-IN ENDS ON WHATSAPP, FOR EVERY KIND
 * ============================================================================================== */
const KINDS: { kind: string; label: string; body: Record<string, unknown>; anchor?: boolean; keptInTheApp?: boolean }[] = [
  { kind: 'sales', label: 'Ending: sales', body: { scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY' } },
  { kind: 'onboarding', label: 'Ending: onboarding', body: { scenario: 'NEW_HIRE', cadence: 'WEEKLY' } },
  { kind: 'project', label: 'Ending: project', body: { scenario: 'NEW_PROJECT', cadence: 'WEEKLY' } },
  { kind: 'performance plan', label: 'Ending: performance plan', body: { scenario: 'PIP', cadence: 'WEEKLY' } },
  { kind: 'cohort', label: 'Ending: cohort', body: { scenario: 'COHORT_CHECK', cadence: 'WEEKLY' } },
  { kind: 'anchor', label: 'Ending: anchor', body: { scenario: 'NEW_PROJECT', cadence: 'WEEKLY' }, anchor: true },
  { kind: 'kept in the app', label: 'Ending: kept in the app', body: { scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY' }, keptInTheApp: true },
];
const NAMES = ['Lulu', 'Moraa', 'Nuru', 'Akinyi', 'Bahati', 'Chebet', 'Dalia', 'Eshe', 'Faraja', 'Gathoni', 'Halima', 'Itai', 'Jabali', 'Kamau', 'Laila', 'Makena', 'Neema', 'Okoth', 'Pendo', 'Rehema', 'Sefu'];
const ANSWERS = [
  'This week I finished the two customer visits I had planned and wrote up both.',
  'The Naivas order went through on Tuesday, but Quickmart is still waiting on their buyer.',
  'What is stuck is the delivery schedule: the van was in the garage for two days.',
  'I will call the Quickmart buyer on Monday and ask for a date in writing.',
  'I need the updated price list from finance before Thursday.',
  'Nobody else is waiting on me right now.',
  'The thing I am most proud of this week is the Naivas order.',
  'Next week I want to visit the three stores in Kilimani.',
  'I think the team is mostly on the same page, but the price list confused two customers.',
  'I have nothing else to add for this week.',
  'That is all from me.',
  'Yes, that is everything.',
];

export async function howItEnds(c: any): Promise<string[]> {
  const { make, signIn, prisma, api, outbox, since, says, check, log, heading, cron, wairimu, grace, orgs, waitQuiet } = c;
  const lines: string[] = [];
  const keep = (line: string) => { lines.push(line); log(line); };
  heading('16. HOW A CHECK-IN ENDS ON WHATSAPP, FOR EVERY KIND');
  await signIn(wairimu); await signIn(grace);
  await prisma.platformSetting.upsert({ where: { key: 'release.anchorScenario' }, create: { key: 'release.anchorScenario', value: { on: true } as any, updatedBy: 'whatsapp-journeys' }, update: { value: { on: true } as any } });
  /* The halfway messages are off at release; this run switches them on in the copy to read them. */
  await prisma.platformSetting.upsert({ where: { key: 'release.whatsappHalfwayMessages' }, create: { key: 'release.whatsappHalfwayMessages', value: { on: true } as any, updatedBy: 'whatsapp-journeys' }, update: { value: { on: true } as any } });
  const conversation: any = c.app.get(require('../src/modules/conversation/conversation.service').ConversationService, { strict: false });
  const whatsapp: any = c.app.get(require('../src/modules/whatsapp/whatsapp.service').WhatsAppService, { strict: false });
  const emailsTo = async (address: string, after: Date) => (await prisma.notification.findMany({ where: { channel: 'email', toAddress: address, createdAt: { gt: after } }, orderBy: { createdAt: 'asc' }, select: { subject: true, sender: true } })).map((n: any) => `${n.subject} (${n.sender})`);
  const toPhone = (who: any, from: number) => since(from).filter((s: any) => s.to === who.phone).map((s: any) => s.text);
  const quote = (xs: string[]) => (xs.length ? xs.map((x) => `"${x.replace(/\n+/g, ' / ')}"`).join(' then ') : '(nothing)');
  /* Writes in the app, for a check-in kept there. */
  const inTheApp = async (who: any, ci: any, text: string) => api(`/check-ins/${ci.id}/messages`, { token: who.token, body: { message: text } });

  for (const k of KINDS) {
    keep(`\n### ${k.kind}`);
    const names = NAMES.splice(0, 3);
    const people = names.map((n) => make(n, 'Mwangi', 'MEMBER', orgs.on, 'kito', { department: 'Sales', manager: wairimu.externalId }));
    const [done, early, halfway] = await Promise.all(people);
    for (const p of [done, early, halfway]) await signIn(p);
    const g = await api('/grounds', { token: wairimu.token, body: { label: k.label, moment: 'STARTING', timelineDays: 84, brief: `This check-in is about ${k.kind}: what moved this week, what is stuck, and what each person needs.`, ...k.body } });
    if (!g?.id) { keep(`- The check-in could not be created: ${JSON.stringify(g).slice(0, 200)}`); continue; }
    if (g.status === 'AWAITING_APPROVAL') await api(`/grounds/${g.id}/approve`, { token: grace.token, body: {} });
    if (k.anchor) await prisma.ground.update({ where: { id: g.id }, data: { startedFrom: 'anchor' } });
    if (k.keptInTheApp) await prisma.ground.update({ where: { id: g.id }, data: { overWhatsApp: false } });
    for (const p of [done, early, halfway]) {
      const added = await api(`/grounds/${g.id}/participants`, { token: wairimu.token, body: { email: p.email, roleAsDescribed: 'Sales' } });
      if (added?.refused) keep(`- ${p.first} could not be added: ${added.message}`);
      const row = await prisma.groundParticipant.findFirst({ where: { groundId: g.id, email: p.email } });
      if (row && !row.userId) await prisma.groundParticipant.update({ where: { id: row.id }, data: { userId: p.userId } });
    }
    await cron.sendSessionReadyNotificationsInner();
    await waitQuiet(800);
    const ciOf = async (p: any) => prisma.checkIn.findFirst({ where: { groundId: g.id, participant: { email: p.email } }, orderBy: { sessionNumber: 'asc' } });

    /* (a) Groundwork says it is done, then "finish". */
    {
      const at = new Date(); const from = outbox.length;
      const ci = await ciOf(done);
      let saidDone = '';
      if (k.keptInTheApp) {
        const w = await says(done, 'START');
        keep(`- Written to on WhatsApp, ${done.first} reads: "${w.text}"`);
        await api(`/check-ins/${ci.id}/open`, { token: done.token, body: {} });
        for (const a of ANSWERS.slice(0, 8)) { const r = await inTheApp(done, ci, a); if (r?.sessionComplete) { saidDone = r.reply; break; } }
        const comp = await api(`/check-ins/${ci.id}/complete`, { token: done.token, body: {} });
        keep(`- In the app, Groundwork's last words before Complete: ${saidDone ? `"${saidDone.replace(/\n+/g, ' / ')}"` : '(it had not said it was done after 8 answers)'}; Complete answered ${comp?.refused ? `refused: ${comp.message}` : 'with the end card'}.`);
      } else {
        await says(done, 'START');
        let n = 0;
        for (const a of ANSWERS) {
          n++;
          const r = await says(done, a);
          if (/Reply "finish"|reply "finish"/i.test(r.text)) { saidDone = r.text; break; }
        }
        keep(`- Groundwork says it is done, after ${n} answers: ${saidDone ? `"${saidDone.replace(/\n+/g, ' / ')}"` : '(it had not said it was done after 12 answers)'}`);
        const fin = await says(done, 'finish');
        keep(`- ${done.first} writes "finish" and reads: "${fin.text.replace(/\n+/g, ' / ')}"`);
      }
      for (let i = 0; i < 40 && !toPhone(done, from).some((t: string) => /Your report for/.test(t)) && !k.keptInTheApp; i++) await waitQuiet(1000);
      await waitQuiet(2000);
      keep(`- What ${done.first} receives on WhatsApp at the end: ${quote(toPhone(done, from).filter((t: string) => /report|complete|closed|kept in the Groundwork app/i.test(t)))}`);
      keep(`- Emails to ${done.first}: ${quote(await emailsTo(done.email, at))}`);
      keep(`- What the lead, Wairimu, receives: on WhatsApp ${quote(toPhone(wairimu, from))}; by email ${quote(await emailsTo(wairimu.email, at))}`);
      const st = await prisma.checkIn.findUnique({ where: { id: ci.id }, select: { status: true } });
      check(`${k.kind}: Groundwork said it was done and "finish" closed it`, st?.status === 'COMPLETED', st?.status);
    }

    /* (b) "finish" early. */
    if (!k.keptInTheApp) {
      await says(early, 'START');
      await says(early, ANSWERS[0]);
      const fin = await says(early, 'finish');
      keep(`- "finish" after one answer: ${early.first} reads "${fin.text.replace(/\n+/g, ' / ')}"`);
      check(`${k.kind}: "finish" early is answered with what is still needed, and nothing is closed`, /I need a little more from you before this check-in can close\./.test(fin.text), fin.text);
    }

    /* (c) Stopping halfway: the reminder, the half-hour warning, the clock's close. */
    if (!k.keptInTheApp) {
      const ci = await ciOf(halfway);
      await says(halfway, 'START');
      await says(halfway, ANSWERS[0]);
      await says(halfway, ANSWERS[1]);
      /* Eleven in the morning UTC, noon in Lagos, tomorrow: within the day, and never in the past, so no sweep closes it meanwhile. */
      const noon = new Date(); noon.setUTCDate(noon.getUTCDate() + 1); noon.setUTCHours(11, 0, 0, 0);
      await prisma.conversationTurn.updateMany({ where: { checkInId: ci.id }, data: { createdAt: new Date(noon.getTime() - 3.5 * 3600_000) } });
      await prisma.$executeRawUnsafe(`UPDATE whatsapp_sends SET created_at = created_at - interval '1 day', sent_at = sent_at - interval '1 day' WHERE phone = '${halfway.phone}'`);
      const r0 = outbox.length;
      await cron.remindThoseWhoStoppedHalfwayInner(noon);
      await waitQuiet(800);
      keep(`- Three hours quiet: ${halfway.first} reads ${quote(toPhone(halfway, r0))}`);
      check(`${k.kind}: one reminder to carry on reaches the phone`, toPhone(halfway, r0).length === 1 && /is still open, and everything you have said so far is kept/.test(toPhone(halfway, r0)[0] ?? ''), JSON.stringify(toPhone(halfway, r0)));
      await prisma.conversationTurn.updateMany({ where: { checkInId: ci.id }, data: { createdAt: new Date(Date.now() - 11.1 * 3600_000) } });
      const r1 = outbox.length;
      await cron.fireSessionClosingWarnings();
      await waitQuiet(800);
      keep(`- Eleven hours quiet: ${halfway.first} reads ${quote(toPhone(halfway, r1))}`);
      check(`${k.kind}: the half-hour warning reaches the phone`, toPhone(halfway, r1).some((t: string) => /closes in 30 minutes if nothing else is said/.test(t)), JSON.stringify(toPhone(halfway, r1)));
      await prisma.conversationTurn.updateMany({ where: { checkInId: ci.id }, data: { createdAt: new Date(Date.now() - 12.1 * 3600_000) } });
      const r2 = outbox.length; const at2 = new Date();
      await tellThemTheClockClosedIt(prisma, whatsapp, ci.id);
      await conversation.closeByTheClock(ci.id);
      for (let i = 0; i < 40 && !toPhone(halfway, r2).some((t: string) => /Your report for|Your check-in on/.test(t)); i++) await waitQuiet(1000);
      keep(`- Twelve hours quiet, the clock closes it: ${halfway.first} reads ${quote(toPhone(halfway, r2))}`);
      keep(`- What the lead receives then: on WhatsApp ${quote(toPhone(wairimu, r2))}; by email ${quote(await emailsTo(wairimu.email, at2))}`);
      const kept = await prisma.conversationTurn.count({ where: { checkInId: ci.id, role: 'PERSON' } });
      check(`${k.kind}: the clock's close is said on the phone, the report follows, and what was said is kept`, toPhone(halfway, r2).some((t: string) => /has closed, because nothing was said for twelve hours/.test(t)) && kept >= 2, `${kept} turns kept; ${JSON.stringify(toPhone(halfway, r2))}`);
    } else {
      keep('- "finish" early and stopping halfway do not reach a phone for a check-in kept in the app: the reminder, the warning and the close are never sent for it.');
    }
  }
  return lines;
}
