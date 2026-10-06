/*
 * MORE JOURNEYS ON WHATSAPP (5 Oct 2026, Hafsah's item 3): an onboarding and a project check-in done in
 * full on WhatsApp with the real model, and the anchor's nudge and weekly insight. Run after the journeys
 * in whatsapp-journeys-steps.ts, by whatsapp-journeys.ts, with the same recorder, signing and database.
 *
 * Two things are set straight into the gw_ copy, and said so: the anchor switch (release.anchorScenario,
 * which has no page yet), and the anchor mark on a check-in Wairimu makes through POST /grounds with the
 * scenario the anchor door ends up with (NEW_PROJECT), exactly the one write the anchor door makes (entry.service.ts). Time is moved by
 * moving the record back, as the other journeys do.
 */
export async function moreJourneys(c: any): Promise<void> {
  const { make, signIn, prisma, api, outbox, since, says, received, check, log, heading, cron, grace, wairimu, orgs, waitQuiet, DAY } = c;
  const bodyOf = (s: any) => s.text as string;

  const aDayPasses = async () => {
    await prisma.$executeRawUnsafe(`UPDATE whatsapp_sends SET created_at = created_at - interval '1 day', sent_at = sent_at - interval '1 day'`);
    await prisma.$executeRawUnsafe(`UPDATE people SET whatsapp_last_inbound_at = whatsapp_last_inbound_at - interval '1 day' WHERE whatsapp_last_inbound_at IS NOT NULL`);
    await prisma.$executeRawUnsafe(`UPDATE whatsapp_inbound_messages SET handled_at = handled_at - interval '1 day'`);
    log('  (a day passes)');
  };

  const makeGround = async (label: string, body: Record<string, unknown>, people: [any, string][]) => {
    const g = await api('/grounds', { token: wairimu.token, body: { label, moment: 'STARTING', cadence: 'WEEKLY', timelineDays: 84, ...body } });
    if (!g?.id) throw new Error(`the check-in "${label}" was not created: ${JSON.stringify(g).slice(0, 300)}`);
    if (g.status === 'AWAITING_APPROVAL') await api(`/grounds/${g.id}/approve`, { token: grace.token, body: {} });
    for (const [p, role] of people) {
      const added = await api(`/grounds/${g.id}/participants`, { token: wairimu.token, body: { email: p.email, roleAsDescribed: role } });
      if (added?.refused) throw new Error(`${p.first} was not added to "${label}": ${JSON.stringify(added).slice(0, 300)}`);
      const row = await prisma.groundParticipant.findFirst({ where: { groundId: g.id, email: p.email } });
      if (!row?.userId) await prisma.groundParticipant.update({ where: { id: row!.id }, data: { userId: p.userId } });
    }
    return g.id as string;
  };

  /** One person's whole check-in on WhatsApp: START, every answer, "finish" until it closes, and the report on the phone. */
  const aFullCheckIn = async (who: any, groundId: string, label: string, answers: string[], more: string[]) => {
    const ci = await prisma.checkIn.findFirst({ where: { groundId, participant: { email: who.email } }, orderBy: { sessionNumber: 'asc' } });
    const announcedFrom = outbox.length;
    await cron.sendSessionReadyNotificationsInner();
    await waitQuiet(800);
    const announced = received(who, announcedFrom);
    check(`${who.first} is told on WhatsApp that "${label}" is open`, announced.length === 1 && announced[0].text.includes(`your check-in for ${label} is open`), JSON.stringify(announced.map(bodyOf)));
    const started = await says(who, 'START');
    check(`START begins "${label}" for ${who.first}, and the first question follows`, started.got.length === 1 && started.text.includes(label), started.text);
    const said: string[] = [];
    for (const a of answers) {
      const r = await says(who, a);
      said.push(a);
      check(`${who.first} is answered, never in silence ("${a.slice(0, 36)}...")`, r.got.length >= 1 && r.text.trim().length > 0 && r.status < 300, r.text);
    }
    const reportFrom = outbox.length;
    let fin = await says(who, 'finish');
    for (const m of more) {
      if (/Your check-in is complete and on record/.test(fin.text)) break;
      const r = await says(who, m);
      said.push(m);
      check(`${who.first} is answered, never in silence ("${m.slice(0, 36)}...")`, r.got.length >= 1 && r.text.trim().length > 0, r.text);
      fin = await says(who, 'finish');
    }
    check(`"finish" completes "${label}" and says so`, fin.text.includes('Your check-in is complete and on record. Your report follows in a moment.'), fin.text);
    for (let i = 0; i < 60 && !since(reportFrom).some((s: any) => s.to === who.phone && /Your report for/.test(s.text)); i++) await waitQuiet(1000);
    const report = since(reportFrom).filter((s: any) => s.to === who.phone && /Your report for/.test(s.text));
    for (const r of report) log(`    ${who.first} reads:\n${r.text.split('\n').map((l: string) => `        ${l}`).join('\n')}`);
    check(`${who.first}'s own report for "${label}" follows on the phone`, report.length === 1 && report[0].text.startsWith(`Your report for ${label} is ready.`), JSON.stringify(report.map(bodyOf)));
    const done = await prisma.checkIn.findUnique({ where: { id: ci.id }, select: { status: true } });
    check(`"${label}" is completed in the record`, done?.status === 'COMPLETED', done?.status);
    const stored = (await prisma.conversationTurn.findMany({ where: { checkInId: ci.id, role: 'PERSON' }, select: { content: true } })).map((t: any) => t.content);
    check(`What ${who.first} wrote is stored word for word`, said.every((a) => stored.includes(a)), JSON.stringify(stored).slice(0, 300));
    return ci;
  };

  // ==============================================================================================
  heading('11. AN ONBOARDING CHECK-IN, IN FULL, ON WHATSAPP');
  await aDayPasses();
  await signIn(grace); await signIn(wairimu);
  const zawadi = await make('Zawadi', 'Otieno', 'MEMBER', orgs.on, 'kito', { department: 'Sales', manager: wairimu.externalId });
  const onboardingId = await makeGround('Zawadi joins Sales', {
    scenario: 'NEW_HIRE',
    brief: 'Zawadi started in Sales on Monday. This check-in is about her first weeks: what she has learned about our customers, what is still unclear, and who she needs to meet.',
  }, [[zawadi, 'New sales executive']]);
  await aFullCheckIn(zawadi, onboardingId, 'Zawadi joins Sales', [
    'This week I shadowed Amani on four customer visits, two in Westlands and two in Kilimani.',
    'I now understand how we price for the big supermarkets, but I still do not know who approves a discount above ten percent.',
    'I have not met anyone from Operations yet. I would like to meet Baraka, because customers ask me about delivery times.',
    'My laptop only arrived on Wednesday, so I lost two days of training on the order system.',
  ], [
    'Next week I will make my first two calls on my own, to Fresh Basket and to Green Mart.',
    'I would like Wairimu to sit in on the Fresh Basket call.',
    'That is everything for this week.',
  ]);

  // ==============================================================================================
  heading('12. A PROJECT CHECK-IN, IN FULL, ON WHATSAPP');
  await aDayPasses();
  const juma = await make('Juma', 'Kiprono', 'MEMBER', orgs.on, 'kito', { department: 'Operations', manager: wairimu.externalId });
  const projectId = await makeGround('Cold room project', {
    scenario: 'NEW_PROJECT',
    brief: 'The cold room at the Ruiru depot is being built this quarter. This check-in is about progress against the plan, what is blocking it, and what each person needs.',
  }, [[juma, 'Project lead for the cold room']]);
  await aFullCheckIn(juma, projectId, 'Cold room project', [
    'The concrete floor was poured on Tuesday, two days later than the plan, because the cement delivery came late.',
    'The insulation panels are ordered and arrive on the 18th. The supplier has confirmed it in writing.',
    'The electrician has not confirmed a date yet. Without him we cannot test the cooling unit.',
    'We have spent 1.4 million of the 3 million budget so far.',
  ], [
    'I will call the electrician on Monday and get a date in writing by Wednesday.',
    'I need Grace to approve the extra 80,000 for the second door seal.',
    'That is all from me this week.',
  ]);

  // ==============================================================================================
  heading('13. THE ANCHOR: A WEEKLY CHECK-IN, THE NUDGE WITH YOUR OWN PROMISE, AND THE LEAD\'S WEEKLY INSIGHT');
  await prisma.platformSetting.upsert({ where: { key: 'release.anchorScenario' }, create: { key: 'release.anchorScenario', value: { on: true } as any, updatedBy: 'whatsapp-journeys' }, update: { value: { on: true } as any } });
  log('  The anchor switch (release.anchorScenario) is turned on in the copy.');
  await aDayPasses();
  const kesi = await make('Kesi', 'Mwende', 'MEMBER', orgs.on, 'kito', { department: 'Sales', manager: wairimu.externalId });
  const anchorId = await makeGround('Sales team weekly', {
    /* The anchor door's HELP_TEAM_UNDERSTAND is not a scenario of its own; resolveScenario makes it NEW_PROJECT. */
    scenario: 'NEW_PROJECT',
    brief: 'A weekly check-in for the sales team: what moved this week, what is stuck, and what each person will do next.',
  }, [[kesi, 'Sales executive']]);
  await prisma.ground.update({ where: { id: anchorId }, data: { startedFrom: 'anchor' } });
  log('  The check-in is marked as started from the anchor, the one write the anchor door makes.');
  await aFullCheckIn(kesi, anchorId, 'Sales team weekly', [
    'This week I signed the Naivas order for 600,000 shillings, and the Quickmart one is still waiting for their buyer.',
    'The new price list confused two customers, because it still shows last month\'s delivery charge.',
    'I will send the corrected price list to Quickmart by Friday.',
  ], [
    'Nothing else is stuck. The Naivas delivery goes on Tuesday.',
    'That is everything this week.',
  ]);

  /* Her promise, taken from what she said, as the record keeps it. */
  let promise: any = null;
  for (let i = 0; i < 90 && !promise; i++) {
    promise = await prisma.groundCommitment.findFirst({ where: { groundId: anchorId, source: 'CHECK_IN', status: 'UNKNOWN' }, orderBy: { createdAt: 'desc' } }).catch(() => null);
    if (!promise) await waitQuiet(1000);
  }
  log(`  The promise the record keeps for Kesi: ${promise ? `"${promise.text}"` : '(none)'}`);
  check('Her promise is kept on the record from what she said', !!promise, 'no CHECK_IN commitment after 90 seconds');

  /* The next week's session opens, and has waited long enough to be chased. */
  const second = await prisma.checkIn.findFirst({ where: { groundId: anchorId, participant: { email: kesi.email }, sessionNumber: 2 } });
  check('Her second session was made when the first closed', !!second, 'no session 2');
  if (second) {
    const opened = new Date(Date.now() - 4 * DAY);
    await prisma.checkIn.update({ where: { id: second.id }, data: { availableFrom: opened, createdAt: opened } });
    await aDayPasses();
    const nudgeFrom = outbox.length;
    await cron.sendWhatsAppRemindersInner(new Date());
    await waitQuiet(1000);
    const nudge = received(kesi, nudgeFrom);
    /* Her promise said back in "you": "I will send ..." comes back as "you said you would send ...". */
    const herWords = String(promise?.text ?? '').replace(/^I will /i, '').replace(/[.!?]+$/, '');
    check('Kesi gets one nudge, with her own promise in it', nudge.length === 1 && !!herWords && nudge[0].text.includes(`you would ${herWords}`), JSON.stringify(nudge.map(bodyOf)));
    const row = await prisma.whatsAppSend.findFirst({ where: { checkInId: second.id, kind: { startsWith: 'anchor-follow-up' } } });
    check('The nudge is written down as the anchor\'s follow-up', !!row, JSON.stringify(row));
  }

  /* Friday morning: the lead's weekly insight. */
  const friday = (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7)); d.setUTCHours(5, 30, 0, 0); return d; })();
  await aDayPasses();
  const insightFrom = outbox.length;
  const tried = await cron.sendTheAnchorWeeklyInsightsInner(friday);
  await waitQuiet(1000);
  const insight = received(wairimu, insightFrom);
  log(`  The weekly insight job tried ${tried?.tried ?? 0}.`);
  check('Wairimu gets the anchor\'s weekly insight, once, with the board\'s link', insight.length === 1 && insight[0].text.includes(`/grounds/${anchorId}/board`), JSON.stringify(insight.map(bodyOf)));
  check('The insight carries none of Kesi\'s words', insight.every((m: any) => !/Naivas|Quickmart|600,000|price list/.test(m.text)), JSON.stringify(insight.map(bodyOf)));
  const sends = await prisma.whatsAppSend.findMany({ where: { kind: { startsWith: 'anchor-weekly-insight' }, organizationId: orgs.on.id } });
  check('The insight is written down as a send', sends.length >= 1, JSON.stringify(sends.map((s: any) => s.kind)));
}
