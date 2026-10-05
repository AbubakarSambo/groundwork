/* The journeys themselves. See whatsapp-journeys.ts for what is real and what is not. */
import * as fs from 'fs';
import * as path from 'path';

const FILES = path.join(__dirname, 'whatsapp-journeys-files');

export async function journeys(c: any): Promise<void> {
  const { make, signIn, prisma, api, outbox, since, writes, says, received, check, log, heading, cron, grace, wairimu, amani, chidi, baraka, nia, otto, orgs, files, post, message, waitQuiet, DAY } = c;
  const flat = (s: string) => s.replace(/\s+/g, ' ').trim();
  const sendsOf = (checkInId?: string, kind?: string) => prisma.whatsAppSend.findMany({ where: { ...(checkInId ? { checkInId } : {}), ...(kind ? { kind: { startsWith: kind } } : {}) }, orderBy: { createdAt: 'asc' } });
  /** Moves everything written so far into "yesterday", so the next message is on a new day (how often Groundwork writes first is counted by the day). */
  const aDayPasses = async () => {
    await prisma.$executeRawUnsafe(`UPDATE whatsapp_sends SET created_at = created_at - interval '1 day', sent_at = sent_at - interval '1 day'`);
    await prisma.$executeRawUnsafe(`UPDATE people SET whatsapp_last_inbound_at = whatsapp_last_inbound_at - interval '1 day' WHERE whatsapp_last_inbound_at IS NOT NULL`);
    await prisma.$executeRawUnsafe(`UPDATE whatsapp_inbound_messages SET handled_at = handled_at - interval '1 day'`);
    await prisma.$executeRawUnsafe(`UPDATE whatsapp_connections SET last_inbound_at = last_inbound_at - interval '1 day' WHERE last_inbound_at IS NOT NULL`);
    log('  (a day passes: everything sent so far is now a day old, and nobody has written since yesterday)');
  };
  const checkInOf = async (groundId: string, p: any) => prisma.checkIn.findFirst({ where: { groundId, participant: { email: p.email } }, orderBy: { sessionNumber: 'asc' } });
  const bodyOf = (s: any) => s.text as string;

  /* An earlier run of these journeys left its check-ins in this database. They are closed first, so the jobs below see only this run's people. */
  await prisma.$executeRawUnsafe(`UPDATE grounds SET status = 'CLOSED' WHERE organization_id IN (SELECT id FROM organizations WHERE (name LIKE 'Kito Foods %' OR name LIKE 'Plain Goods %') AND id NOT IN ('${orgs.on.id}', '${orgs.off.id}'))`);
  await signIn(grace); await signIn(wairimu);
  /* The suites, switched on as an admin does on the Suites page. */
  for (const [key, answers] of [['leave', { days: 21, approver: 'Their manager' }], ['spend', { currency: 'KES', limit: 20000, above: grace.userId }]] as const) {
    const r = await api(`/suites/${key}`, { method: 'PUT', token: grace.token, body: { on: true, answers } });
    log(`  Grace switches on ${key}: ${r?.refused ? `REFUSED ${r.refused}: ${r.message}` : 'on'}`);
  }

  const makeGround = async (label: string, extra: Record<string, unknown>, people: [any, string][]) => {
    const g = await api('/grounds', { token: wairimu.token, body: { label, scenario: 'OKR_ALIGNMENT', moment: 'STARTING', cadence: 'WEEKLY', timelineDays: 84, brief: `This check-in is about ${label}: the pipeline, the renewals with Harbor Foods, Green Mart and Fresh Basket, and how each person is getting on with their customers.`, ...extra } });
    if (!g?.id) throw new Error(`the check-in was not created: ${JSON.stringify(g).slice(0, 300)}`);
    if (g.status === 'AWAITING_APPROVAL') await api(`/grounds/${g.id}/approve`, { token: grace.token, body: {} });
    for (const [p, role] of people) {
      const added = await api(`/grounds/${g.id}/participants`, { token: wairimu.token, body: { email: p.email, roleAsDescribed: role } });
      if (added?.refused) throw new Error(`${p.first} was not added: ${JSON.stringify(added).slice(0, 300)}`);
      const row = await prisma.groundParticipant.findFirst({ where: { groundId: g.id, email: p.email } });
      if (!row?.userId) await prisma.groundParticipant.update({ where: { id: row!.id }, data: { userId: p.userId } });
    }
    return g.id as string;
  };

  // ==============================================================================================
  heading('1. THE INVITATION, THE FIRST SESSION ANNOUNCED, AND START');
  /* The handshake and the signature first: nothing unsigned or wrongly signed is ever read. */
  const handshake = await fetch(`${process.env.API ?? 'http://localhost:3006/api/v1'}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(c.verifyToken ?? process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? '')}&hub.challenge=1158201444`);
  check('Meta\'s handshake with the test verify token is answered with the challenge, bare', handshake.status === 200 && (await handshake.text()) === '1158201444');
  const wrong = await fetch(`${process.env.API ?? 'http://localhost:3006/api/v1'}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1`);
  check('A handshake with the wrong verify token is refused', wrong.status === 403);
  const beforeBad = outbox.length;
  const badStatus = await post(message(amani.phone, { type: 'text', text: { body: 'hello' } }), { badSignature: true });
  const unsignedStatus = await post(message(amani.phone, { type: 'text', text: { body: 'hello' } }), { unsigned: true });
  await waitQuiet();
  check('A message signed with the wrong secret, and one with no signature, are refused and nobody is written to', badStatus === 401 && unsignedStatus === 401 && outbox.length === beforeBad, `statuses ${badStatus}, ${unsignedStatus}`);

  const salesId = await makeGround('Sales team, Q4', {}, [[amani, 'Sales'], [chidi, 'Sales'], [baraka, 'Deliveries']]);
  const invited = await prisma.groundParticipant.findMany({ where: { groundId: salesId, userId: { not: null } }, select: { email: true, invitedAt: true } });
  check('The invitation was made for each person on the check-in (the email is a recorded send, never a real one)', invited.filter((i: any) => i.invitedAt).length >= 3, JSON.stringify(invited));
  const amaniCheckIn = await checkInOf(salesId, amani);
  const before = outbox.length;
  await cron.sendSessionReadyNotificationsInner();
  await waitQuiet(1000);
  const toAmani = received(amani, before);
  check('The first session is announced to Amani, once, in Hafsah\'s words for checkin_open', toAmani.length === 1 && toAmani[0].template === 'checkin_open' && bodyOf(toAmani[0]) === 'Hi Amani, your check-in for Sales team, Q4 is open. It takes about five minutes, and you can answer right here. Reply START to begin.', JSON.stringify(toAmani.map(bodyOf)));
  /* The same job again must not announce twice. */
  const again = outbox.length;
  await cron.sendSessionReadyNotificationsInner();
  await waitQuiet(500);
  check('Running the same job again announces nothing a second time', since(again).filter((s: any) => s.to === amani.phone).length === 0);
  const announced = await sendsOf(amaniCheckIn.id, 'checkin-open');
  check('The announcement is written down as a send of the kind checkin-open, as the template (Amani has not written yet, so it is outside the 24 hours)', announced.length >= 1 && announced.some((a: any) => a.kind === 'checkin-open:template' || a.kind === 'checkin-open'), JSON.stringify(announced.map((a: any) => a.kind)));

  const started = await says(amani, 'START');
  check('START begins the check-in: the session is named, the words that switch are said, and the first question follows', /Sales team, Q4/.test(started.text) && started.text.includes(`You can write "ask" at any time to talk to Ask ${orgs.on.name}, "back" to come back to your check-in, and "switch" to choose another check-in.`) && started.got.length === 1);
  const afterStart = await prisma.checkIn.findUnique({ where: { id: amaniCheckIn.id }, select: { status: true } });
  check('Amani\'s session is now in progress, and START was not stored as her answer', afterStart?.status === 'IN_PROGRESS' && !(await prisma.conversationTurn.findFirst({ where: { checkInId: amaniCheckIn.id, role: 'PERSON', content: 'START' } })));

  // ==============================================================================================
  heading('2. A FULL CHECK-IN ON WHATSAPP, TO ITS END');
  const chidiCheckIn = await checkInOf(salesId, chidi);
  await says(chidi, 'START');
  const answers = [
    'We closed two renewals this week. Harbor Foods on Tuesday for 4.2 million shillings and Green Mart on Thursday for 1.8 million.',
    'The third one, Fresh Basket, is still open. Their buyer is away until the 14th, so I will call him on the 15th.',
    'I am behind on new leads. My target was ten meetings and I had six, because two shops moved their appointments.',
    'I need Wairimu to sign off the discount for Fresh Basket before the 15th. Without it I cannot close.',
  ];
  const said: string[] = [];
  const answerAll = async (list: string[]) => {
    for (const a of list) {
      const r = await says(chidi, a);
      said.push(a);
      check(`Chidi is answered, in plain words, and never in silence ("${a.slice(0, 36)}...")`, r.got.length >= 1 && r.text.trim().length > 0 && r.status < 300);
    }
  };
  await answerAll(answers);
  const more = [
    'Yes, Wairimu knows. I told her on Monday, but she has not replied yet.',
    'Two of the meetings I set up myself, and the other four came from the referral list Baraka gave me.',
    'Next I call Fresh Basket on the 15th and ask for the signed renewal by the 20th.',
    'That is everything for now.',
  ];
  const reportFrom = outbox.length;
  let fin = await says(chidi, 'finish');
  for (const m of more) {
    if (/Your check-in is complete and on record/.test(fin.text)) break;
    check('"finish" before the record is thick enough is answered with what is still needed, in words', /I need a little more from you before this check-in can close\./.test(fin.text) && fin.got.length === 1);
    await answerAll([m]);
    fin = await says(chidi, 'finish');
  }
  check('"finish" completes the check-in and says so', fin.text.includes('Your check-in is complete and on record. Your report follows in a moment.'), fin.text);
  /* The report follows from the completion listener, off the request. */
  for (let i = 0; i < 45 && !since(reportFrom).some((s: any) => s.to === chidi.phone && /Your report for Sales team, Q4/.test(s.text)); i++) await waitQuiet(1000);
  const reportMsgs = received(chidi, reportFrom).filter((s: any) => /Your report for/.test(s.text));
  check('Chidi\'s own report follows on his phone', reportMsgs.length === 1 && /^Your report for Sales team, Q4 is ready\./.test(reportMsgs[0].text), JSON.stringify(reportMsgs.map(bodyOf)));
  const done = await prisma.checkIn.findUnique({ where: { id: chidiCheckIn.id }, select: { status: true } });
  check('The check-in is completed in the record', done?.status === 'COMPLETED');
  const turns = await prisma.conversationTurn.findMany({ where: { checkInId: chidiCheckIn.id, role: 'PERSON' }, orderBy: { createdAt: 'asc' }, select: { content: true } });
  const stored = turns.map((t: any) => t.content);
  check('What Chidi wrote is stored word for word, none of it changed', said.every((a) => stored.includes(a)), JSON.stringify(stored).slice(0, 400));
  check('"START" and "finish" are not stored as answers', !stored.some((t: string) => /^(start|finish)$/i.test(t.trim())));

  // ==============================================================================================
  heading('3. A PHOTO AND A DOCUMENT SENT DURING A CHECK-IN');
  const barakaCheckIn = await checkInOf(salesId, baraka);
  await says(baraka, 'START');
  await says(baraka, 'I delivered the Green Mart order on Thursday and the customer signed for it.');
  files.set('media-photo-1', { buffer: fs.readFileSync(path.join(FILES, 'signed-order.png')), mime: 'image/png' });
  const photo = await writes(baraka, { type: 'image', image: { id: 'media-photo-1', mime_type: 'image/png', caption: 'The signed order from Green Mart' } });
  check('A photo is put on the check-in and said so, with his note, and who can see it', /^Your photo is on your check-in with your note: The signed order from Green Mart\./.test(photo.text) && !/wamid|image-/.test(photo.text) && /Only you can see this, and nobody else can open it\./.test(photo.text), photo.text);
  files.set('media-doc-1', { buffer: fs.readFileSync(path.join(FILES, 'renewals-notes.txt')), mime: 'text/plain' });
  const doc = await writes(baraka, { type: 'document', document: { id: 'media-doc-1', mime_type: 'text/plain', filename: 'renewals-notes.txt' } });
  check('A document is put on the check-in and said so', /"renewals-notes.txt" is on your check-in\./.test(doc.text), doc.text);
  const stuck = await writes(baraka, { type: 'document', document: { id: 'media-missing-1', mime_type: 'application/pdf', filename: 'lost.pdf' } });
  check('A file that cannot be fetched is answered, not dropped in silence', /I could not fetch that file from WhatsApp\. Send it again, or upload it in Groundwork\./.test(stuck.text), stuck.text);
  const kept = await prisma.groundDocument.findMany({ where: { groundId: salesId }, select: { fileName: true, mimeType: true, participantId: true } }).catch(() => []);
  check('Both files are on the check-in in the record', kept.length === 2 && kept.some((k: any) => /^image-/.test(k.fileName)) && kept.some((k: any) => k.fileName === 'renewals-notes.txt'), JSON.stringify(kept));
  const voice = await writes(baraka, { type: 'sticker', sticker: { id: 'x' } });
  check('A message of a kind it cannot read is answered with what it can read', /I can read text, photos and documents here\./.test(voice.text), voice.text);

  // ==============================================================================================
  heading('5. A LEAVE REQUEST AND A SPENDING REQUEST SAID IN A CHECK-IN (the first day)');
  const leaveRows = () => prisma.leaveRequest.findMany({ where: { organizationId: orgs.on.id, userId: amani.userId }, orderBy: { askedAt: 'asc' } });
  const toldTo = (who: any, from: number, re: RegExp) => since(from).filter((s: any) => s.to === who.phone && re.test(s.text));
  const lines = (t: string) => t.split('\n').map((l: string) => '        ' + l).join('\n');

  /** A request in a check-in: asked once, said back, sent on a yes. */
  const aLeaveRequest = async (dates: string, label: string) => {
    const first = await says(amani, `I would like leave from ${dates} please.`);
    check(`${label}: Amani is asked once, in Hafsah's words`, first.text === 'Shall I treat this as a leave request?' && first.got.length === 1, first.text);
    const yes = await says(amani, 'yes');
    check(`${label}: after her yes she reads the request said back, is asked before anything is sent, and is told how to return`, /leave/i.test(yes.text) && /\?/.test(yes.text) && /Write "back" to return to your check-in\./.test(yes.text), yes.text);
    const from = outbox.length;
    await says(amani, 'yes');
    await waitQuiet(1000);
    return { from };
  };
  const amaniBeforeRequest = await prisma.conversationTurn.count({ where: { checkInId: amaniCheckIn.id, role: 'PERSON' } });

  const L1 = await aLeaveRequest('20 October to 22 October', 'Leave 1');
  const l1 = (await leaveRows())[0];
  check('Leave 1 is saved, waiting, for the right days', !!l1 && l1.status === 'waiting' && l1.startsOn.toISOString().slice(0, 10) === '2026-10-20' && l1.endsOn.toISOString().slice(0, 10) === '2026-10-22', JSON.stringify(l1));
  const toWairimuToday = since(L1.from - 1).filter((s: any) => s.to === wairimu.phone);
  /* Wairimu leads a check-in that opened today and was told so: she has had her one message. Decision 92: the approval is told straight away all the same. */
  const wairimuHad = await prisma.whatsAppSend.count({ where: { phone: wairimu.phone, kind: { startsWith: 'checkin-open' }, sentAt: { not: null } } });
  check('Wairimu was told today that her own check-in opened, and is still told straight away that Amani\'s leave waits for her', wairimuHad === 1 && toWairimuToday.length === 1 && /Amani has asked for leave from Tuesday 20 October to Thursday 22 October, and it is waiting for you\./.test(toWairimuToday[0].text), `opening notices to Wairimu ${wairimuHad}; messages to her since: ${JSON.stringify(toWairimuToday.map(bodyOf))}`);
  check('None of the request went into Amani\'s check-in as an answer', (await prisma.conversationTurn.count({ where: { checkInId: amaniCheckIn.id, role: 'PERSON' } })) === amaniBeforeRequest);
  const back1 = await says(amani, 'back');
  check('"back" returns Amani to her check-in', /^You are back in your check-in\. Sales team, Q4, session 1\. Carry on where you left off\.$/.test(back1.text), back1.text);

  /* Spending: Baraka has no line manager, so an admin decides. Grace has had no message today, so she is told. */
  const sp = await says(baraka, 'I need to spend KES 12,000 on fuel for the delivery van.');
  check('Baraka is asked once whether to treat it as a spending request', sp.text === 'Shall I treat this as a spending request?', sp.text);
  const spYes = await says(baraka, 'yes');
  check('Spending is said back before it is sent, with the sum', /12,000/.test(spYes.text) && /\?/.test(spYes.text), spYes.text);
  const spFrom = outbox.length;
  await says(baraka, 'yes');
  await waitQuiet(1000);
  const spendRow = await prisma.spendRequest.findFirst({ where: { organizationId: orgs.on.id, userId: baraka.userId } });
  check('The spending request is saved, waiting, for the right sum', !!spendRow && spendRow.status === 'waiting' && Number(spendRow.amount) === 12000, JSON.stringify(spendRow));
  const graceTold = since(spFrom - 1).filter((s: any) => s.to === grace.phone);
  check('Grace, who decides for Baraka, is told it is waiting, in the words of groundwork_request_waiting', graceTold.length === 1 && graceTold[0].template === 'groundwork_request_waiting' && graceTold[0].text === 'Hi Grace, Baraka has asked for KES 12,000 for fuel for the delivery van, and it is waiting for you. Reply here to approve or decline it, or open Groundwork to read it first.', JSON.stringify(graceTold.map(bodyOf)));
  await says(baraka, 'back');
  const gApprove = await says(grace, 'approve');
  check('Grace\'s "approve" is said back with the sum before anything happens', /You are approving Baraka's request to spend KES 12,000 for fuel for the delivery van\. Is that right\?/.test(gApprove.text) && (await prisma.spendRequest.findFirst({ where: { id: spendRow!.id } }))?.status === 'waiting', gApprove.text);
  const gFrom = outbox.length;
  await says(grace, 'yes');
  await waitQuiet(1000);
  check('It is approved after her yes', (await prisma.spendRequest.findFirst({ where: { id: spendRow!.id } }))?.status === 'approved');
  const barakaTold = since(gFrom).filter((m: any) => m.to === baraka.phone);
  check('Baraka is told it was approved by Grace, in the words of groundwork_request_decided', barakaTold.some((m: any) => m.text === 'Hi Baraka, your request for KES 12,000 for fuel for the delivery van was approved by Grace. Open Groundwork to read it.'), JSON.stringify(barakaTold.map(bodyOf)));

  // ==============================================================================================
  heading('6. THE LEAD\'S DAILY SUMMARY (the next morning, seven o\'clock in Lagos)');
  await aDayPasses();
  const sumFrom = outbox.length;
  const tick = await cron.sendTheLeadsDailySummariesInner(new Date());
  await waitQuiet(1000);
  const toLead = since(sumFrom).filter((s: any) => s.to === wairimu.phone);
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  log(`  jobs tried: ${tick.tried}`);
  for (const m of toLead) log(`    Wairimu reads [template ${m.template}]:\n${lines(m.text)}`);
  check('Wairimu gets exactly one message, the summary, as the lead_daily_summary template (she has not written in 24 hours)', toLead.length === 1 && toLead[0].template === 'lead_daily_summary', JSON.stringify(toLead.map(bodyOf)));
  const summary = toLead[0]?.text ?? '';
  check('It opens with her name and says how many have checked in, and who has not, in a full sentence', /^Good morning Wairimu\. Here's today's summary of your check-ins: /.test(summary) && /In "Sales team, Q4", 1 of 4 people have checked in, and you, Amani and Baraka have not yet\./.test(summary), summary);
  check('It carries the leave that is waiting for her, which she was also told about straight away', /Amani's leave from Tuesday 20 October to Thursday 22 October is waiting for you to approve or decline\./.test(summary), summary);
  check('It carries a link to the board', summary.includes(`${base}/grounds/${salesId}/board`), summary);
  check('Nothing anybody said is in it', !/Harbor|Green Mart|Fresh Basket|4\.2|1\.8|discount|referral|meetings/i.test(summary), summary);
  check('It is one paragraph with no line break', !/\n/.test(summary));
  const toOthers = since(sumFrom).filter((s: any) => s.to !== wairimu.phone);
  check('Nobody else gets a summary: not a person who is not a lead, and not the lead of an organisation that has not turned WhatsApp on', toOthers.length === 0, JSON.stringify(toOthers.map((o: any) => [o.to, bodyOf(o)])));
  const again2 = outbox.length;
  await cron.sendTheLeadsDailySummariesInner(new Date());
  await waitQuiet(600);
  check('Run again the same morning, the lead is not written to a second time', since(again2).filter((s: any) => s.to === wairimu.phone).length === 0);

  /* She replies to the summary. */
  const appr = await says(wairimu, 'approve');
  check('Her "approve" is said back with the days, before anything happens', /You are approving Amani's leave from Tuesday 20 October to Thursday 22 October\. Is that right\?/.test(appr.text) && (await leaveRows())[0].status === 'waiting', appr.text);
  const decidedFrom = outbox.length;
  const yesApprove = await says(wairimu, 'yes');
  await waitQuiet(1000);
  check('After her yes it is approved, and she is told so', (await leaveRows())[0].status === 'approved' && /approved now/.test(yesApprove.text), yesApprove.text);
  const amaniTold = since(decidedFrom).filter((m: any) => m.to === amani.phone);
  check('Amani is told the outcome in the words of groundwork_request_decided', amaniTold.some((m: any) => m.text === 'Hi Amani, your request for leave from Tuesday 20 October to Thursday 22 October was approved by Wairimu. Open Groundwork to read it.'), JSON.stringify(amaniTold.map(bodyOf)));

  // ==============================================================================================
  heading('5 (continued). DECLINE, AND A QUESTION, ON LATER DAYS');
  await aDayPasses();
  const L2 = await aLeaveRequest('27 October to 28 October', 'Leave 2');
  const l2 = (await leaveRows())[1];
  check('Leave 2 is saved, waiting', !!l2 && l2.status === 'waiting', JSON.stringify(l2));
  const l2told = toldTo(wairimu, L2.from - 1, /27 October/);
  check('Wairimu is told about it in the words of groundwork_request_waiting (she has had no other message today)', l2told.length === 1 && l2told[0].text === 'Hi Wairimu, Amani has asked for leave from Tuesday 27 October to Wednesday 28 October, and it is waiting for you. Reply here to approve or decline it, or open Groundwork to read it first.', JSON.stringify(since(L2.from - 1).filter((s: any) => s.to === wairimu.phone).map(bodyOf)));
  await says(amani, 'back');
  const decline = await says(wairimu, 'decline');
  check('Her "decline" is said back before anything happens', /You are declining Amani's leave from Tuesday 27 October to Wednesday 28 October\. Is that right\?/.test(decline.text) && (await leaveRows())[1].status === 'waiting', decline.text);
  const declinedFrom = outbox.length;
  await says(wairimu, 'yes');
  await waitQuiet(1000);
  check('After her yes it is declined', (await leaveRows())[1].status === 'declined');
  const amaniTold2 = since(declinedFrom).filter((m: any) => m.to === amani.phone);
  check('Amani is told it was declined, in the words of groundwork_request_decided', amaniTold2.some((m: any) => m.text === 'Hi Amani, your request for leave from Tuesday 27 October to Wednesday 28 October was declined by Wairimu. Open Groundwork to read it.'), JSON.stringify(amaniTold2.map(bodyOf)));

  await aDayPasses();
  const L3 = await aLeaveRequest('3 November to 4 November', 'Leave 3');
  const l3 = (await leaveRows())[2];
  check('Leave 3 is saved, waiting', !!l3 && l3.status === 'waiting', JSON.stringify(l3));
  await says(amani, 'back');
  /* Wairimu asks by replying on WhatsApp, the way she approves: said back word for word, and sent only on her yes, through the same code the app's box uses. */
  const qFrom = outbox.length;
  const askedBack = await says(wairimu, 'question for Amani about her leave: Who will cover the Renewals calls?');
  check('Her question is said back word for word, and nothing has gone to Amani yet', askedBack.text === 'You are asking Amani, “Who will cover the Renewals calls?” It is about Amani\'s leave from Tuesday 3 November to Wednesday 4 November. I will send it as you wrote it, and the request stays waiting for you. Shall I send it?' && since(qFrom).filter((s: any) => s.to === amani.phone).length === 0, askedBack.text);
  const sentQ = await says(wairimu, 'yes');
  check('After her yes she is told it went, and that the request still waits for her', sentQ.text === 'I have sent your question to Amani. The request is still waiting for you to decide.', sentQ.text);
  await waitQuiet(1000);
  const asked = since(qFrom).filter((s: any) => s.to === amani.phone);
  check('Amani is told on her phone that Wairimu has a question, with the question in Wairimu\'s own words, and that the request still waits', asked.length === 1 && asked[0].text === 'Hi Amani, Wairimu has a question about your request for leave from Tuesday 3 November to Wednesday 4 November. Wairimu asked, “Who will cover the Renewals calls?” You can reply here with your answer, or answer it in Groundwork. Your request is still waiting for Wairimu to decide.', JSON.stringify(asked.map(bodyOf)));
  const reply = await says(amani, 'Chidi will cover my calls.');
  check('Her reply is not taken for her check-in answer: she is asked whether it is her answer to the question', reply.text === "Is this your answer to Wairimu's question about your leave?", reply.text);
  const sent = await says(amani, 'yes');
  check('After her yes the answer is sent, and she is told her check-in is still open', sent.text === 'I have sent your answer to Wairimu. Your leave request is still waiting for Wairimu to decide. Your check-in is still open, so carry on with it whenever you are ready.', sent.text);
  check('Her words were not stored as a check-in answer', !(await prisma.conversationTurn.findFirst({ where: { checkInId: amaniCheckIn.id, content: 'Chidi will cover my calls.' } })));

  // ==============================================================================================
  heading('4. REMINDERS AND NUDGES, WITH THE JOBS RUN AT SET CLOCKS');
  await aDayPasses();
  const renewalsId = await makeGround('Renewals', {}, [[amani, 'Sales'], [chidi, 'Sales'], [baraka, 'Deliveries'], [grace, 'Admin']]);
  const visitsId = await makeGround('Customer visits', {}, [[amani, 'Sales'], [chidi, 'Sales'], [baraka, 'Deliveries']]);
  const openFrom = outbox.length;
  await cron.sendSessionReadyNotificationsInner();
  await waitQuiet(1500);
  for (const p of [amani, chidi, baraka]) {
    const mine = since(openFrom).filter((s: any) => s.to === p.phone);
    check(`${p.first}: both check-ins are announced the day they open (two messages is the most), each in Hafsah's words`, mine.length === 2 && mine.some((m: any) => m.text === `Hi ${p.first}, your check-in for Renewals is open. It takes about five minutes, and you can answer right here. Reply START to begin.`) && mine.some((m: any) => m.text === `Hi ${p.first}, your check-in for Customer visits is open. It takes about five minutes, and you can answer right here. Reply START to begin.`), JSON.stringify(mine.map(bodyOf)));
  }
  /* Now make them late, and run the morning job on the same day: nothing more goes. */
  const setAge = async (groundId: string, p: any, days: number) => prisma.checkIn.updateMany({ where: { groundId, participant: { email: p.email } }, data: { createdAt: new Date(Date.now() - days * DAY) } });
  await setAge(renewalsId, amani, 8);   // weekly: due yesterday, so overdue
  await setAge(renewalsId, baraka, 6);  // due tomorrow
  await setAge(renewalsId, grace, 6);   // due tomorrow
  await setAge(visitsId, chidi, 3);     // the lead's first chase day
  const sameDay = outbox.length;
  const rowsBefore = await prisma.whatsAppSend.count();
  const morning1 = await cron.sendWhatsAppRemindersInner(new Date());
  await waitQuiet(800);
  check('The morning job on the day they opened (08:30 UTC) sends nothing more to those who already had two messages', since(sameDay).filter((s: any) => [amani, chidi, baraka].some((p) => p.phone === s.to)).length === 0, JSON.stringify(since(sameDay).map(bodyOf)));
  const graceMorning = since(sameDay).filter((s: any) => s.to === grace.phone);
  log(`  Grace, who had no opening notice today for these (she is on Renewals, announced above), reads: ${JSON.stringify(graceMorning.map(bodyOf))}`);

  await aDayPasses();
  const morningFrom = outbox.length;
  const morning2 = await cron.sendWhatsAppRemindersInner(new Date());
  await waitQuiet(1200);
  const dueDate = new Date(Date.now() + DAY).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' }).replace(',', '');
  const morningMsgs = (p: any) => since(morningFrom).filter((s: any) => s.to === p.phone);
  const aBy = morningMsgs(amani);
  check('Amani, whose Renewals check-in is overdue, gets one message: checkin_overdue', aBy.length === 1 && aBy[0].template === 'checkin_overdue' && aBy[0].text === "Hi Amani, your check-in for Renewals is overdue. It's still open, so you can answer here now.", JSON.stringify(aBy.map(bodyOf)));
  const bBy = morningMsgs(baraka);
  check('Baraka, whose Renewals check-in is due tomorrow, gets one message: checkin_due_tomorrow, with the day', bBy.length === 1 && bBy[0].text === `Hi Baraka, your check-in for Renewals is due tomorrow, ${dueDate}. You can answer here whenever suits you before then.`, JSON.stringify(bBy.map(bodyOf)) + ' expected day ' + dueDate);
  const cBy = morningMsgs(chidi);
  check('Chidi, three days into Customer visits, gets one message: the lead\'s chase, checkin_your_view_matters, with Wairimu\'s name', cBy.length === 1 && cBy[0].text === "Hi Chidi, your check-in for Customer visits is still waiting. Your answers help Wairimu understand what's in your way, and where they can help. It takes about five minutes, and you can answer here." , JSON.stringify(cBy.map(bodyOf)));
  const gBy = morningMsgs(grace);
  check('Grace, due tomorrow on Renewals, gets one message', gBy.length === 1 && /due tomorrow/.test(gBy[0].text), JSON.stringify(gBy.map(bodyOf)));
  const mornSecond = outbox.length;
  await cron.sendWhatsAppRemindersInner(new Date());
  await waitQuiet(600);
  check('Run again the same morning, nobody is written to twice (one message on a day nothing opens)', since(mornSecond).length === 0, JSON.stringify(since(mornSecond).map(bodyOf)));
  const perDay = await prisma.$queryRawUnsafe(`SELECT phone, count(*)::int n FROM whatsapp_sends WHERE sent_at IS NOT NULL AND created_at >= date_trunc('day', now() at time zone 'UTC') AND kind IN ('checkin-open','due-tomorrow','opens-soon','closes-soon','overdue','team-almost-in','your-view-matters','lead-summary') GROUP BY phone HAVING count(*) > 1`);
  check('Nobody has had more than one first message today', perDay.length === 0, JSON.stringify(perDay));

  /* A session that opens at a set time: a quarter-hour job, an hour before. */
  const planningId = await makeGround('Q1 planning', {}, [[amani, 'Sales']]);
  const opensAt = new Date(Date.now() + 50 * 60_000);
  await prisma.checkIn.updateMany({ where: { groundId: planningId, participant: { email: amani.email } }, data: { availableFrom: opensAt } });
  const soonFrom = outbox.length;
  const soon = await cron.sendWhatsAppOpensSoonInner(new Date());
  await waitQuiet(800);
  const soonMsgs = since(soonFrom).filter((s: any) => s.to === amani.phone);
  check('Amani is told an hour before Q1 planning opens, and it is her second message of a day on which a check-in opens, so it goes', soonMsgs.length === 1 && /^Hi Amani, your check-in for Q1 planning opens in an hour, at \d{1,2}:\d{2} (am|pm)\. Reply here when it opens and we'll begin\.$/.test(soonMsgs[0].text), JSON.stringify(soonMsgs.map(bodyOf)));
  const soonAgain = outbox.length;
  await cron.sendWhatsAppOpensSoonInner(new Date());
  await waitQuiet(500);
  check('The same job again does not tell her a second time', since(soonAgain).length === 0);

  // ==============================================================================================
  heading('8. "STOP" AND "NOT NOW"');
  await aDayPasses();
  /* A fresh morning. Baraka says "not now" before the jobs run; Chidi says stop. */
  await prisma.checkIn.updateMany({ where: { groundId: renewalsId, participant: { email: chidi.email } }, data: { createdAt: new Date(Date.now() - 8 * DAY) } }); // overdue, so he would be written to
  const bn = await says(baraka, 'not now');
  check('"Not now" is answered in Hafsah\'s words', bn.text === 'All right. I will not write to you first again today. Your check-in is still open, and you can answer here whenever you are ready.', bn.text);
  const st = await says(chidi, 'stop');
  check('"Stop" is answered, and says how to start again', st.text === 'Stopped. Nothing more comes to this number from Groundwork unless you reply START. Your check-ins are still in Groundwork.', st.text);
  const chidiRow = await prisma.person.findUnique({ where: { id: chidi.personId }, select: { whatsappStoppedAt: true } });
  check('Chidi is recorded as stopped', !!chidiRow?.whatsappStoppedAt);
  await prisma.checkIn.updateMany({ where: { groundId: renewalsId, participant: { email: baraka.email } }, data: { createdAt: new Date(Date.now() - 6 * DAY) } });
  const stopFrom = outbox.length;
  await cron.sendWhatsAppRemindersInner(new Date());
  await waitQuiet(800);
  const toBarakaChidi = since(stopFrom).filter((s: any) => s.to === baraka.phone || s.to === chidi.phone);
  check('After "not now" and "stop", the morning job writes to neither of them, though Baraka has a check-in due tomorrow', toBarakaChidi.length === 0, JSON.stringify(toBarakaChidi.map(bodyOf)));
  const forced = await prisma.whatsAppSend.findMany({ where: { phone: baraka.phone, kind: 'not-now' } });
  check('"Not now" is written down, so the rule can read it', forced.length >= 1);
  /* Even something they asked for that Groundwork starts is not sent to somebody who stopped. */
  const waitingKind = outbox.length;
  const sendTo = app_whatsapp(c);
  const heldOne = await sendTo.sendFor(orgs.on.id, chidi.phone, 'Hi Chidi, a test.', { kind: 'overdue' });
  check('A message Groundwork starts is refused for somebody who said stop, with the reason recorded', heldOne.sent === false && /said STOP/.test(heldOne.error ?? '') && since(waitingKind).length === 0, JSON.stringify(heldOne));
  /* Chidi can still write to Groundwork; and START puts the notices back. */
  const resumed = await says(chidi, 'START');
  check('"START" after "stop" resumes the notices, and says so', resumed.text === 'Resumed. Your check-in notices come here again.', resumed.text);
  check('Chidi is no longer recorded as stopped', !(await prisma.person.findUnique({ where: { id: chidi.personId }, select: { whatsappStoppedAt: true } }))?.whatsappStoppedAt);
  const chidiNow = outbox.length;
  await cron.sendWhatsAppRemindersInner(new Date());
  await waitQuiet(800);
  const chidiAfter = since(chidiNow).filter((s: any) => s.to === chidi.phone);
  check('After START, the morning job writes to Chidi again, once: his Renewals check-in is overdue', chidiAfter.length === 1 && chidiAfter[0].text === "Hi Chidi, your check-in for Renewals is overdue. It's still open, so you can answer here now.", JSON.stringify(chidiAfter.map(bodyOf)));
  check('Baraka, who said "not now", still gets nothing today', since(chidiNow).filter((s: any) => s.to === baraka.phone).length === 0);

  // ==============================================================================================
  heading('7. ASK GROUNDWORK ON WHATSAPP: "ask", A QUESTION, "back"');
  const turnsBefore = await prisma.conversationTurn.count({ where: { checkIn: { participant: { email: amani.email }, groundId: salesId }, role: 'PERSON' } });
  const askSw = await says(amani, 'ask');
  check('"ask" moves Amani to Ask Groundwork and says how to return', askSw.text === `You are now talking to Ask ${orgs.on.name}. Ask me anything about the company, your work or your check-ins. Write "back" to return to your check-in.`, askSw.text);
  const question = await says(amani, 'Where is my leave request?');
  check('Her question is answered by Ask Groundwork from her own record: where each leave request stands', question.got.length >= 1 && !/I cannot answer that one yet/.test(question.text) && /20 October/.test(question.text) && /3 November/.test(question.text), question.text);
  const notAsRequest = await says(amani, 'What leave have I asked for, and what was decided?');
  check('A question about leave is never read as a request for leave', !/I could not tell exactly which days you mean/.test(notAsRequest.text) && notAsRequest.got.length >= 1, notAsRequest.text);
  check('The question was not stored as an answer in her check-in', (await prisma.conversationTurn.count({ where: { checkIn: { participant: { email: amani.email }, groundId: salesId }, role: 'PERSON' } })) === turnsBefore);
  const backAgain = await says(amani, 'back');
  check('"back" returns her to the check-in she was in', /^You are back in your check-in\. .*Carry on where you left off\.$/s.test(backAgain.text) || /back in your check-in/i.test(backAgain.text), backAgain.text);
  /* Somebody with no check-in open asks directly. */
  const tumaini = await make('Tumaini', 'Oloo', 'MEMBER', orgs.on, 'kito', { department: 'Sales', manager: wairimu.externalId });
  const direct = await says(tumaini, 'What can you help me with?');
  check('A person with no check-in open who writes is answered by Ask Groundwork, never in silence', direct.got.length >= 1 && direct.text.trim().length > 10, direct.text);
  const notYet = await says(tumaini, 'back');
  check('"back" with nothing to go back to says so', notYet.text.length > 10, notYet.text);

  // ==============================================================================================
  heading('10. A CHECK-IN KEPT IN THE APP NEVER REACHES THE PHONE');
  const privateId = await makeGround('Private notes', {}, [[tumaini, 'Sales']]);
  const patch = await api(`/grounds/${privateId}/over-whatsapp`, { method: 'PATCH', token: wairimu.token, body: { over: false } });
  log(`  Wairimu keeps it in the app: ${JSON.stringify(patch).slice(0, 120)}`);
  await prisma.checkIn.updateMany({ where: { groundId: privateId }, data: { createdAt: new Date(Date.now() - 9 * DAY) } });
  await aDayPasses();
  const keptFrom = outbox.length;
  await cron.sendSessionReadyNotificationsInner();
  await cron.sendWhatsAppRemindersInner(new Date());
  await cron.sendWhatsAppOpensSoonInner(new Date());
  await cron.sendTheLeadsDailySummariesInner(new Date());
  await waitQuiet(1500);
  const toTumaini = since(keptFrom).filter((s: any) => s.to === tumaini.phone);
  check('No opening notice, reminder or nudge about it reaches Tumaini\'s phone', toTumaini.length === 0, JSON.stringify(toTumaini.map(bodyOf)));
  const wairimuAll = since(keptFrom).filter((s: any) => s.to === wairimu.phone);
  check('The lead\'s summary says nothing about it', wairimuAll.every((m: any) => !/Private notes/.test(m.text)), JSON.stringify(wairimuAll.map(bodyOf)));
  /* Tumaini has only this check-in open; "ask" still works, but what he writes does not go into it. */
  const writesToIt = await says(tumaini, 'Here is my first answer.');
  check('If he writes to it on WhatsApp he is told to answer it in the app, and nothing is stored', writesToIt.text === 'Your check-in "Private notes" is kept in the Groundwork app, so I cannot take your answers to it here. Please open Groundwork and answer it there.' || /kept in the Groundwork app/.test(writesToIt.text), writesToIt.text);
  const storedAny = await prisma.conversationTurn.count({ where: { checkIn: { groundId: privateId } } });
  check('Nothing he wrote was stored in it', storedAny === 0, String(storedAny));

  // ==============================================================================================
  heading('9. NO ADD-ON, THE LIMIT, THE PLATFORM SWITCH OFF: NOTHING NEW GOES, AND NOBODY IS LEFT IN SILENCE');
  await aDayPasses();
  /* (a) Plain Goods has not turned WhatsApp on. */
  await signIn(nia);
  const plainId = await (async () => {
    const g = await api('/grounds', { token: nia.token, body: { label: 'Sales, Plain Goods', scenario: 'OKR_ALIGNMENT', moment: 'STARTING', cadence: 'WEEKLY', timelineDays: 84, brief: 'This check-in is about how sales are going at Plain Goods this quarter.' } });
    if (!g?.id) throw new Error(`Plain Goods check-in was not created: ${JSON.stringify(g).slice(0, 200)}`);
    if (g.status === 'AWAITING_APPROVAL') await prisma.ground.update({ where: { id: g.id }, data: { status: 'OPEN' } }); // Plain Goods has no admin to approve it
    const added = await api(`/grounds/${g.id}/participants`, { token: nia.token, body: { email: otto.email, roleAsDescribed: 'Sales' } });
    log(`  Nia adds Otto: ${JSON.stringify(added).slice(0, 200)}; the check-in is ${g.status}`);
    const row = await prisma.groundParticipant.findFirst({ where: { groundId: g.id, email: otto.email } });
    if (!row?.userId) await prisma.groundParticipant.update({ where: { id: row!.id }, data: { userId: otto.userId } });
    return g.id as string;
  })();
  await prisma.checkIn.updateMany({ where: { groundId: plainId, participant: { email: otto.email } }, data: { createdAt: new Date(Date.now() - 8 * DAY) } });
  const plainFrom = outbox.length;
  await cron.sendSessionReadyNotificationsInner();
  await cron.sendWhatsAppRemindersInner(new Date());
  await cron.sendWhatsAppOpensSoonInner(new Date());
  await cron.sendTheLeadsDailySummariesInner(new Date());
  await waitQuiet(1500);
  const toPlain = since(plainFrom).filter((s: any) => s.to === otto.phone || s.to === nia.phone);
  log(`  What Otto and Nia were sent by the jobs: ${JSON.stringify(toPlain.map((m: any) => [m.to === otto.phone ? 'Otto' : 'Nia', bodyOf(m)]))}`);
  check('Plain Goods has not turned WhatsApp on: the opening notice, the reminders and the lead\'s summary send nothing to its people', toPlain.length === 0, JSON.stringify(toPlain.map(bodyOf)));
  const wrote = await says(otto, 'START');
  check('Otto writes anyway and is answered, not left in silence', wrote.got.length >= 1 && wrote.text.trim().length > 10, wrote.text);

  /* (b) Plain Goods when the paid add-on is in force: held, and told, once. */
  await prisma.platformSetting.upsert({ where: { key: 'pricing.freeTrial' }, create: { key: 'pricing.freeTrial', value: { on: true, months: 1, teamsUnder: 20, onSince: new Date(Date.now() - 3 * DAY).toISOString() } as any, updatedBy: 'whatsapp-journeys' }, update: { value: { on: true, months: 1, teamsUnder: 20, onSince: new Date(Date.now() - 3 * DAY).toISOString() } as any } });
  const heldFrom = outbox.length;
  const held1 = await says(otto, 'I closed the Mombasa order on Friday.');
  const expectedHeld = 'Your organisation has not turned on WhatsApp, so this check-in stays in the app. You can carry on in the Groundwork app.';
  check('With the paid add-on in force and Plain Goods not having turned it on, Otto is told once, plainly, and the check-in carries on in the app', since(heldFrom).filter((m: any) => m.to === otto.phone).length === 1 && held1.text === expectedHeld, JSON.stringify(since(heldFrom).map(bodyOf)));
  const heldAgain = outbox.length;
  await says(otto, 'And the Kisumu one on Saturday.');
  check('He is not told the same thing a second time within a day', since(heldAgain).filter((m: any) => m.to === otto.phone).length === 0);
  const use = await prisma.whatsAppMonthlyUse.findFirst({ where: { organizationId: orgs.off.id } });
  check('The held messages are counted for the month and not as sent', !!use && use.held >= 1, JSON.stringify(use));
  /* Put the trial switch back off for the rest. */
  await prisma.platformSetting.update({ where: { key: 'pricing.freeTrial' }, data: { value: { on: false, months: 1, teamsUnder: 20 } as any } });

  /* (c) Kito Foods has used its month's messages. */
  const limitRow = (await prisma.pricingPlan.findFirst({ where: { whatsappMonthlyLimit: { not: null } }, orderBy: { amountCents: 'asc' } }));
  const month = new Date().toISOString().slice(0, 7);
  await prisma.whatsAppMonthlyUse.upsert({ where: { organizationId_month: { organizationId: orgs.on.id, month } }, create: { organizationId: orgs.on.id, month, sent: 100000 }, update: { sent: 100000 } });
  await prisma.person.update({ where: { id: amani.personId }, data: { whatsappLastInboundAt: new Date(Date.now() - 3 * 3600_000) } });
  const limFrom = outbox.length;
  const atLimit = await says(amani, 'Is my leave from 20 October still approved?');
  check('At the monthly limit, Amani who writes is told why and that her check-in carries on in the app', /^Your organisation has used all its WhatsApp messages for this month, so this check-in stays in the app\. WhatsApp starts again on 1 November 2026\. You can carry on in the Groundwork app\.$/.test(atLimit.text), atLimit.text);
  const graceLim = since(limFrom).filter((m: any) => m.to === grace.phone);
  log(`  The admin, Grace, is told once: ${JSON.stringify(graceLim.map(bodyOf))}`);
  const adminToldRow = await prisma.whatsAppMonthlyUse.findFirst({ where: { organizationId: orgs.on.id, month } });
  check('The admins are told once that the limit was reached (recorded), and the held message was counted', !!adminToldRow?.adminToldAt && adminToldRow.held >= 1, JSON.stringify(adminToldRow));
  await prisma.whatsAppMonthlyUse.update({ where: { organizationId_month: { organizationId: orgs.on.id, month } }, data: { sent: 0, held: 0, adminToldAt: null } });

  /* (d) The platform's own switch is off. */
  await prisma.platformSetting.update({ where: { key: 'whatsapp_enabled' }, data: { value: false as any } });
  const offFrom = outbox.length;
  const offStatus = await post(c.message(chidi.phone, { type: 'text', text: { body: 'Are you there?' } }));
  await cron.sendWhatsAppRemindersInner(new Date());
  await cron.sendTheLeadsDailySummariesInner(new Date());
  await waitQuiet(800);
  check('With the platform\'s switch off, the webhook is accepted and nothing is sent by any job or reply', offStatus < 300 && since(offFrom).length === 0, `status ${offStatus}; sent ${JSON.stringify(since(offFrom).map(bodyOf))}`);
  log('  (With the platform switch off nothing can be sent at all, so nobody can be told; the app is where the check-in carries on.)');
  await prisma.platformSetting.update({ where: { key: 'whatsapp_enabled' }, data: { value: true as any } });

  /* (e) Somebody whose number is nobody's. */
  const stranger = { first: 'A stranger', phone: '+254799999999' };
  const strangerReads = await says(stranger, 'Hello, can I join?');
  check('A number that is on no roster is told how to be added, not left in silence', strangerReads.text === "We don't recognize this number yet. Add it in your Groundwork Settings, then message us again.", strangerReads.text);
}

/** The sender, from the same application the API runs. */
function app_whatsapp(c: any): any {
  return c.app.get(require('../src/modules/whatsapp/whatsapp.service').WhatsAppService, { strict: false });
}
