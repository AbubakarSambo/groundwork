/* The steps of the nine user journeys. See user-journeys.ts. */

const PLAN = `Sales team plan for the last quarter of the year.

We are at KES 9.6m for the quarter against KES 18m. The number I agreed with Grace is 18m. Credit must stay under 35% of sales.

Amani Wekesa closed Harbor Foods this week, her biggest ever. I want Amani at KES 4.5m for the quarter. She is at 3.1m now. She told me she would send the Green Mart renewal proposal on Wednesday and it did not happen. Amani, have you sent the Green Mart proposal?

Baraka Mutua runs deliveries. He will confirm the Fresh Basket delivery date with the warehouse by Friday 16 October.

Things to decide: whether we keep the 30 day credit rule or move to 21 days.

Dates: the quarter ends 31 December and the price list goes out on 1 November.`;

export async function journeys(ctx: any) {
  const { prisma, api, check, log, heading, mail, mailFor, waitForMail, stamp } = ctx;
  const PW = 'JourneysTest123!';
  type Someone = { first: string; last: string; email: string; token: string; userId: string };
  const person = (first: string, last: string, dom = 'kito'): Someone => ({ first, last, email: `${first.toLowerCase()}.${last.toLowerCase()}.${stamp}@${dom}.test`, token: '', userId: '' });
  const grace = person('Grace', 'Achieng');
  const wairimu = person('Wairimu', 'Njoroge');
  const amani = person('Amani', 'Wekesa');
  const baraka = person('Baraka', 'Mutua');
  const tokenIn = (m: string, re: RegExp) => m.match(re)?.[1] ?? null;
  const said = (r: any) => (typeof r === 'string' ? r : String(JSON.stringify(r)));
  /** Every sentence a page serves: the strings with more than one word, with ids and dates left out. */
  const sentencesIn = (x: any): string => (typeof x === 'string' ? (/\s/.test(x) ? x : '') : Array.isArray(x) ? x.map(sentencesIn).filter(Boolean).join(' ') : x && typeof x === 'object' ? Object.values(x).map(sentencesIn).filter(Boolean).join(' ') : '');
  /** Nothing a person reads may be a broken seam: no "undefined", no raw object, no id, no stray list punctuation. */
  const noBrokenSeams = (what: string, text: string) => check(`${what} has no broken seams (no "undefined", "null", "[object", ids, or doubled full stops)`, !/undefined|\[object|\bNaN\b|\bnull\b|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\.\.(?!\.)/.test(text), text.slice(0, 300));

  // ==============================================================================================
  heading('1. SIGN UP (Grace, the admin, from nothing; then a returning sign-in by the emailed link)');
  let from = mail.length;
  const saved = await api('/auth/entry-save', { body: { email: grace.email, draft: { payload: { firstName: grace.first, orgName: `Kito Foods ${stamp}` } } } });
  check('Grace is told, in a plain sentence, to look at her email, and nothing is made before she does', saved?.message === 'Check your email for your sign-in link.' && !(await prisma.user.findFirst({ where: { email: grace.email } })), said(saved));
  const link = await waitForMail(grace.email, /verify-email\?token=/, from);
  check('The email arrives, with a link that opens the app', !!link, 'no email caught');
  const gToken = link ? tokenIn(link, /verify-email\?token=([0-9a-f]+)/) : null;
  check('The link points at the app and not the API', !!link && new RegExp(`${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '').replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')}/verify-email\\?token=`).test(link), link?.match(/https?:\/\/[^\s"'>]*verify-email[^\s"'>]*/)?.[0]?.replace(/token=[0-9a-f]+/, 'token=…'));
  const opened = await api('/auth/verify-email', { body: { token: gToken } });
  grace.token = opened?.accessToken ?? '';
  grace.userId = opened?.user?.id ?? '';
  check('Opening the link signs Grace in as the admin of an organisation named as she typed it', !!grace.token && opened?.user?.role === 'ADMIN' && opened?.user?.organizationName === `Kito Foods ${stamp}` && opened?.justCreated === true, said(opened).slice(0, 300));
  const again = await api('/auth/verify-email', { body: { token: gToken } });
  check('The same link cannot be used twice', !!again?.refused, said(again));
  const org = await prisma.user.findUnique({ where: { id: grace.userId }, include: { organization: true } });
  check('The stored account has her name, her address and the organisation', org?.firstName === 'Grace' && org?.email === grace.email && org?.organization?.name === `Kito Foods ${stamp}`, said(org?.organization?.name));
  const orgId = org?.organizationId as string;

  /* Grace invites Wairimu, as the lead, from the People page. */
  from = mail.length;
  const invitedLead = await api('/auth/team-invite', { token: grace.token, body: { email: wairimu.email, role: 'LEAD', name: `${wairimu.first} ${wairimu.last}` } });
  check('Grace invites Wairimu to open check-ins, and is told so', invitedLead?.message !== undefined && !invitedLead?.refused, said(invitedLead));
  const leadMail = await waitForMail(wairimu.email, /set-password\?token=|verify-email\?token=|token=/, from);
  check('Wairimu is sent an email that names Grace\'s organisation', !!leadMail && leadMail.includes(`Kito Foods ${stamp}`) , leadMail?.slice(0, 400));
  const leadToken = leadMail ? tokenIn(leadMail, /token=([0-9a-f]+)/) : null;
  const wSet = await api('/auth/set-password', { body: { token: leadToken, password: PW } });
  wairimu.token = wSet?.accessToken ?? '';
  wairimu.userId = wSet?.user?.id ?? '';
  check('Wairimu opens it, chooses a password, and is in as a person who can open check-ins, in Grace\'s organisation', !!wairimu.token && wSet?.user?.organizationId === orgId && wSet?.user?.mayOpenCheckIns === true, said(wSet).slice(0, 300));

  /* A returning sign-in: Wairimu asks for a link. */
  from = mail.length;
  const re = await api('/auth/member-signin', { body: { email: wairimu.email } });
  check('Asking for a sign-in link says the same sentence whether or not the address is known', re?.message === 'We have sent a sign-in link to that address, if we know it. Check your email.', said(re));
  const reLink = await waitForMail(wairimu.email, /token=/, from);
  const reTok = reLink ? tokenIn(reLink, /verify-email\?token=([0-9a-f]+)/) : null;
  const reIn = reTok ? await api('/auth/verify-email', { body: { token: reTok } }) : null;
  check('The emailed link signs a returning person in', !!reIn?.accessToken && reIn?.user?.email === wairimu.email, said(reIn).slice(0, 200));
  const stranger = await api('/auth/member-signin', { body: { email: `nobody.${stamp}@kito.test` } });
  check('A stranger\'s address gets the very same sentence and no email', stranger?.message === re?.message && mailFor(`nobody.${stamp}@kito.test`).length === 0, said(stranger));

  // ==============================================================================================
  heading('2. SET UP A CHECK-IN FROM A PASTED PLAN (Wairimu, the lead)');
  const made = await api('/grounds', { token: wairimu.token, body: { label: 'Sales team, last quarter', scenario: 'OKR_ALIGNMENT', moment: 'STARTING', cadence: 'WEEKLY', timelineDays: 84, brief: 'This check-in is for the sales team to say how the quarter is going, what is blocking them and what they will do next, so that Wairimu can help early and the numbers are honest.' } });
  const gid: string = made?.id;
  check('Wairimu creates the check-in', !!gid, said(made).slice(0, 300));
  log(`  status after creating: ${made?.status}`);
  if (made?.status === 'AWAITING_APPROVAL') {
    const waiting = await api('/grounds/awaiting-approval', { token: grace.token });
    check('Grace, the admin, finds it waiting for her on her list', JSON.stringify(waiting).includes(gid), said(waiting).slice(0, 300));
    const appr = await api(`/grounds/${gid}/approve`, { token: grace.token, body: {} });
    check('Grace approves it', !appr?.refused, said(appr).slice(0, 200));
  }
  /* Grace has put the two people on the People page, with their names, as an admin does; each opens that invitation. */
  for (const who of [amani, baraka]) {
    const f = mail.length;
    const inv = await api('/auth/team-invite', { token: grace.token, body: { email: who.email, role: 'MEMBER', name: `${who.first} ${who.last}` } });
    check(`Grace adds ${who.first} to People with her name, and is told so`, !inv?.refused, said(inv));
    const m = await waitForMail(who.email, /set-password\?token=/, f);
    check(`${who.first} is sent an email that names Kito Foods ${stamp}`, !!m && m.includes(`Kito Foods ${stamp}`), m?.match(/Subject:.*/)?.[0]);
    const set = await api('/auth/set-password', { body: { token: m ? tokenIn(m, /token=([0-9a-f]+)/) : null, password: PW } });
    who.token = set?.accessToken ?? ''; who.userId = set?.user?.id ?? '';
    check(`${who.first} opens it and is in, as a person who takes part, in the same organisation`, !!who.token && set?.user?.organizationId === orgId && set?.user?.role === 'MEMBER', said(set).slice(0, 200));
  }

  // ==============================================================================================
  heading('3. INVITE PEOPLE (Wairimu adds Amani and Baraka; each opens the invitation)');
  const colleagues = await api('/users/colleagues', { token: wairimu.token });
  log(`  Wairimu's list of colleagues: ${(Array.isArray(colleagues) ? colleagues : []).map((c: any) => c.name).join(', ')}`);
  check('Amani and Baraka are on Wairimu\'s list of colleagues, by name', ['Amani Wekesa', 'Baraka Mutua'].every((n) => (Array.isArray(colleagues) ? colleagues : []).some((c: any) => c.name === n)), said(colleagues).slice(0, 300));
  for (const [who, role] of [[amani, 'Sales'], [baraka, 'Deliveries']] as const) {
    const f = mail.length;
    const pick = (Array.isArray(colleagues) ? colleagues : []).find((c: any) => c.name === `${who.first} ${who.last}`);
    const added = await api(`/grounds/${gid}/participants`, { token: wairimu.token, body: { colleagueId: pick?.id, roleAsDescribed: role } });
    check(`Wairimu adds ${who.first}`, !added?.refused, said(added).slice(0, 300));
    const inviteMail = await waitForMail(who.email, /invite\?token=/, f);
    check(`${who.first} is sent an invitation that names Wairimu and the check-in`, !!inviteMail && /Wairimu/.test(inviteMail) && /Sales team, last quarter/.test(inviteMail), inviteMail?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 600));
    if (inviteMail) log('    ' + inviteMail.match(/Subject:.*/)?.[0] + '\n    ' + inviteMail.split(/\r?\n\r?\n/).slice(1).join(' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 700));
    (who as any).inviteToken = inviteMail ? tokenIn(inviteMail, /invite\?token=([0-9a-zA-Z_-]+)/) : null;
  }

  // ==============================================================================================
  heading('2 (continued). THE PLAN, READ NOW THAT THE TWO PEOPLE ARE ON THE CHECK-IN');
  const read = await api('/grounds/' + gid + '/plan/proposals', { token: wairimu.token, body: { text: PLAN } });
  log(`  Groundwork reads back: ${said(read?.says)}`);
  for (const pr of read?.proposals ?? []) log(`    - [${pr.kind}] ${pr.says}${pr.note ? ' (' + pr.note + ')' : ''}`);
  check('The plan is read and said back in a plain sentence before anything is saved', typeof read?.says === 'string' && read.says.length > 20 && (read?.proposals ?? []).length >= 3, said(read).slice(0, 400));
  check('Nothing says a person is missing from the check-in, because both are on it', !(read?.proposals ?? []).some((x: any) => /not on this check-in/.test(x.note ?? '') || /not on this check-in/.test(x.says ?? '')), said((read?.proposals ?? []).map((x: any) => x.note)));
  const before = await prisma.groundObjective.count({ where: { groundId: gid } });
  check('Nothing was written to the check-in by the reading alone', before === 0, `objectives ${before}`);

  /* She says yes to each, one at a time, as the plan page does. */
  const sayings: string[] = [];
  for (const pr of read?.proposals ?? []) {
    const c = await api(`/grounds/${gid}/plan/proposals/${pr.id}/confirm`, { token: wairimu.token, body: pr.kind === 'goal' && pr.fields?.number !== undefined ? { direction: pr.directionSuggested ?? 'AIM' } : {} });
    sayings.push(`${pr.kind}: ${c?.refused ? 'REFUSED ' + c.message : said(c?.says ?? c?.saying ?? 'ok').slice(0, 160)}`);
  }
  for (const l of sayings) log('    ' + l);
  check('Every yes is accepted', sayings.every((x) => !x.includes('REFUSED')), sayings.join(' | '));
  await new Promise((r) => setTimeout(r, 1500));
  const amaniRow = await prisma.groundParticipant.findFirst({ where: { groundId: gid, email: amani.email } });
  const barakaRow = await prisma.groundParticipant.findFirst({ where: { groundId: gid, email: baraka.email } });
  const objectives = await prisma.groundObjective.findMany({ where: { groundId: gid } });
  const commitments = await prisma.groundCommitment.findMany({ where: { groundId: gid } });
  log('  Stored objectives: ' + JSON.stringify(objectives.map((o: any) => ({ name: o.name, target: o.target, owner: o.ownerParticipantId === amaniRow?.id ? 'Amani' : o.ownerParticipantId === barakaRow?.id ? 'Baraka' : o.ownerParticipantId ? '?' : 'team' }))));
  log('  Stored commitments: ' + JSON.stringify(commitments.map((c: any) => ({ who: c.participantId === amaniRow?.id ? 'Amani' : c.participantId === barakaRow?.id ? 'Baraka' : c.participantId ? '?' : 'team', text: c.text, when: c.whenSaid }))));
  const amaniGoal = objectives.find((o: any) => o.ownerParticipantId === amaniRow?.id && /4\.5|4,500,000|4500000/.test(`${o.name} ${o.target}`));
  check('Amani\'s KES 4.5m is on Amani', !!amaniGoal, JSON.stringify(objectives.map((o: any) => [o.name, o.target, o.ownerParticipantId])));
  check('Nobody else holds that number', !objectives.some((o: any) => o.ownerParticipantId === barakaRow?.id && /4\.5/.test(`${o.name} ${o.target}`)));
  check('Amani\'s Green Mart proposal is her commitment and Baraka\'s delivery date is his', commitments.some((c: any) => c.participantId === amaniRow?.id && /green mart/i.test(c.text)) && commitments.some((c: any) => c.participantId === barakaRow?.id && /fresh basket/i.test(c.text)), JSON.stringify(commitments.map((c: any) => [c.participantId, c.text])));
  check('Nothing from the plan was invented that the plan did not say', !commitments.some((c: any) => /tunde|kemi|musa/i.test(c.text)) && !objectives.some((o: any) => /200|900/.test(String(o.target))), '');

  // ==============================================================================================
  heading('4. CHECK IN (Amani and Baraka open their invitations and answer; Wairimu is asked to answer too)');
  const answers: Record<string, string[]> = {
    Amani: [
      'Honestly it has been a mixed week. Harbor Foods closed at 3.1 million so far, which is good, but the Green Mart renewal proposal has not gone out yet.',
      'The reason is that Green Mart keeps changing who signs it off, and I did not want to send it to the wrong person. I will send it by Friday now that I have the new name.',
      'The thing that worries me most is credit. Two of my dealers are paying at 45 days and that eats the margin.',
      'What would help is if Wairimu could agree the 21 day rule with finance before the end of the month, because I cannot hold the dealers to 30 days on my own.',
    ],
    Baraka: [
      'Deliveries are mostly on time. The Fresh Basket date is the one I cannot confirm, because the warehouse keeps moving its dispatch day.',
      'I asked the warehouse manager on Monday and he said Thursday, then on Tuesday he said Friday. I will have a firm answer by Friday 16 October.',
      'The blocker is that nobody told the warehouse the sales promises. Amani and I each promise dates they cannot meet.',
    ],
  };
  const checkInIds: Record<string, string> = {};
  const transcripts: Record<string, string> = {};
  for (const who of [amani, baraka]) {
    const row = await prisma.groundParticipant.findFirst({ where: { groundId: gid, email: who.email } });
    const prev = await api(`/participants/invite?token=${row?.inviteToken}`);
    check(`${who.first} opens the invitation link and reads whose it is and what it is for`, !prev?.refused && /Sales team, last quarter/.test(said(prev)), said(prev).slice(0, 300));
    const acc = await api('/participants/accept', { token: who.token, body: { token: row?.inviteToken, firstName: who.first, lastName: who.last } });
    check(`${who.first} accepts and is taken to their own check-in`, !acc?.refused && !!(acc?.checkInId ?? acc?.checkIn?.id ?? acc?.groundId), said(acc).slice(0, 300));
    const ci = await prisma.checkIn.findFirst({ where: { groundId: gid, participant: { email: who.email } }, orderBy: { sessionNumber: 'asc' } });
    check(`${who.first} has a first session`, !!ci, '');
    if (!ci) continue;
    checkInIds[who.first] = ci.id;
    const opening = await api(`/check-ins/${ci.id}/open`, { token: who.token, body: {} });
    const openText = String(opening?.reply ?? opening?.message?.content ?? opening?.content ?? said(opening));
    log(`  ${who.first} reads (opening): ${openText.slice(0, 700)}`);
    check(`${who.first}'s opening is a plain question in full sentences`, openText.length > 20 && !opening?.refused && /[.?]$/.test(openText.trim()), openText.slice(0, 200));
    const lines: string[] = [];
    for (const a of answers[who.first]) {
      const r = await api(`/check-ins/${ci.id}/messages`, { token: who.token, body: { message: a } });
      const reply = String(r?.reply ?? r?.message?.content ?? r?.content ?? (r?.refused ? `REFUSED ${r.message}` : said(r)));
      lines.push(reply);
      log(`  ${who.first} says: ${a.slice(0, 90)}…\n    Groundwork: ${reply.slice(0, 500)}`);
      check(`${who.first} gets a reply`, !r?.refused && reply.length > 5, reply.slice(0, 200));
    }
    transcripts[who.first] = lines.join('\n');
    const stored = await prisma.conversationTurn.findMany({ where: { checkInId: ci.id, role: 'PERSON' }, orderBy: { createdAt: 'asc' } });
    check(`Everything ${who.first} typed is stored, word for word, in order`, stored.length === answers[who.first].length && stored.every((t: any, i: number) => t.content === answers[who.first][i]), stored.map((t: any) => t.content.slice(0, 40)).join(' | '));
    const done = await api(`/check-ins/${ci.id}/messages`, { token: who.token, body: { message: 'That is everything from me, thank you.' } });
    log(`  ${who.first} says they are finished. Groundwork: ${String(done?.reply ?? said(done)).slice(0, 400)}`);
    let comp = await api(`/check-ins/${ci.id}/complete`, { token: who.token, body: {} });
    log(`  ${who.first} completes: ${said(comp).slice(0, 400)}`);
    /* A person told "I need a little more from you before this check-in can close" does what it says: answers one or two more questions, then finishes. */
    const more = ['I think the warehouse planning is what I would change first. If sales shared promised dates in advance I could plan around them.', 'That is all I have for now, thank you.'];
    for (let k = 0; comp?.refused && /few more exchanges|need a little more from you/.test(String(comp.message)) && k < 2; k++) {
      check(`${who.first} is told in a plain sentence what to do when the check-in is not ready to close`, /^[A-Z].*[.]$/.test(String(comp.message)), String(comp.message));
      log(`  ${who.first} is refused: "${comp.message}" and answers once more.`);
      const extra = await api(`/check-ins/${ci.id}/messages`, { token: who.token, body: { message: more[k] } });
      log(`    Groundwork: ${String(extra?.reply ?? said(extra)).slice(0, 300)}`);
      comp = await api(`/check-ins/${ci.id}/complete`, { token: who.token, body: {} });
      log(`  ${who.first} completes again: ${said(comp).slice(0, 200)}`);
    }
    check(`${who.first} can finish their check-in`, comp?.status === 'completed', said(comp).slice(0, 300));
    if (who === amani) {
      const early = await api(`/grounds/${gid}/report`, { token: wairimu.token });
      log(`  Wairimu asks for the team report while two have not answered, and reads: ${said(early).slice(0, 300)}`);
      if (early?.refused) check('Before everyone has answered, Wairimu is told why in whole sentences (each begins with a capital letter, none is joined with a dash)', /^[A-Z][^.]*\.( [A-Z][^.]*\.)*$/.test(String(early.message).replace(/ - /, '. ')) && !/ - /.test(String(early.message)) && !/\. [a-z]/.test(String(early.message)), String(early.message), 'the reports builder (api/src/modules/reports/why-there-is-no-report-yet.ts)');
    }
    const end = await api(`/check-ins/${ci.id}/end-card`, { token: who.token });
    log(`  ${who.first}'s end card: ${said(end).slice(0, 600)}`);
  }
  await new Promise((r) => setTimeout(r, 4000));

  /* Wairimu is on her own check-in too, and the team report waits for her as it waits for anyone. */
  const wCi = await prisma.checkIn.findFirst({ where: { groundId: gid, participant: { userId: wairimu.userId }, isSetup: false }, orderBy: { sessionNumber: 'asc' } });
  check('Wairimu has her own first session on the check-in she leads', !!wCi, '');
  if (wCi) {
    checkInIds.Wairimu = wCi.id;
    const op = await api(`/check-ins/${wCi.id}/open`, { token: wairimu.token, body: {} });
    log(`  Wairimu reads (opening): ${String(op?.reply ?? op?.message?.content ?? op?.content ?? said(op)).slice(0, 500)}`);
    for (const a of [
      'From where I sit the quarter is behind. We are at 9.6 million against 18, and the gap is mostly the Green Mart renewal and the delivery dates.',
      'I have agreed to settle the 21 day credit rule with finance by the end of October. Until then Amani and the dealers are holding the line on their own.',
      'The thing I cannot see is why the warehouse keeps moving dispatch days. I will ask Baraka for the dates in writing by Friday.',
    ]) {
      const r = await api(`/check-ins/${wCi.id}/messages`, { token: wairimu.token, body: { message: a } });
      log(`  Wairimu says: ${a.slice(0, 80)}…\n    Groundwork: ${String(r?.reply ?? said(r)).slice(0, 400)}`);
    }
    await api(`/check-ins/${wCi.id}/messages`, { token: wairimu.token, body: { message: 'That is everything from me, thank you.' } });
    let wc = await api(`/check-ins/${wCi.id}/complete`, { token: wairimu.token, body: {} });
    for (let k = 0; wc?.refused && /few more exchanges|need a little more from you/.test(String(wc.message)) && k < 2; k++) {
      log(`  Wairimu is refused: "${wc.message}" and answers once more.`);
      await api(`/check-ins/${wCi.id}/messages`, { token: wairimu.token, body: { message: ['The one thing I would change is to agree the credit rule with finance this week rather than at the end of the month.', 'That is all from me.'][k] } });
      wc = await api(`/check-ins/${wCi.id}/complete`, { token: wairimu.token, body: {} });
    }
    check('Wairimu finishes her own check-in', wc?.status === 'completed', said(wc).slice(0, 300));
  }

  // ==============================================================================================
  heading('5. READ THE BOARD AND THE REPORTS (each reader)');
  /* The team report is written in the background once everybody has answered. A person waits for it as they would. */
  let teamReport: any = null;
  for (let i = 0; i < 25; i++) {
    teamReport = await api(`/grounds/${gid}/report`, { token: wairimu.token });
    if (i === 0 && teamReport?.refused) log(`  (the lead asks for the team report at once and reads: ${teamReport.message})`);
    /* A report written when only one person had answered is not the report of all three; it updates when something new comes in. */
    if (!teamReport?.refused && !/not yet contributed|Only (one|you|\w+)( of the three \w+)?( \w+)? (has|have) (checked in|contributed)|(people|person) (have|has) answered so far|based on a single account|single record/i.test(said(teamReport?.sharedPicture))) break;
    await new Promise((r) => setTimeout(r, 6000));
  }
  check('The team report is there after everybody has answered', !!teamReport && !teamReport.refused, said(teamReport).slice(0, 300));
  check('and it is the report of all three, not of the first person to finish', !/not yet contributed|Only (one|you|\w+)( of the three \w+)?( \w+)? (has|have) (checked in|contributed)|(people|person) (have|has) answered so far|based on a single account|single record/i.test(said(teamReport?.sharedPicture)), said(teamReport?.sharedPicture).slice(0, 700), 'the reports builder (api/src/modules/reports)');
  noBrokenSeams('The team report the lead reads', sentencesIn(teamReport));
  log(`  Wairimu reads the team report: ${said(teamReport).slice(0, 2500)}`);
  for (const [name, who] of [['Wairimu (lead)', wairimu], ['Grace (admin)', grace], ['Amani (takes part)', amani]] as const) {
    const board = await api(`/grounds/${gid}/board`, { token: who.token });
    check(`${name} can open the board`, !board?.refused, said(board).slice(0, 200));
    log(`  ${name} board, headline: ${said(board?.headline)}; quickRead: ${said(board?.quickRead).slice(0, 500)}`);
    const rep = await api(`/grounds/${gid}/report`, { token: who.token });
    log(`  ${name} team report: ${rep?.refused ? 'REFUSED ' + rep.message : said(rep).slice(0, 700)}`);
    check(`${name} can read the team report`, !rep?.refused, said(rep).slice(0, 200));
  }
  const amaniBoard = await api(`/grounds/${gid}/board`, { token: amani.token });
  const amaniReport = await api(`/grounds/${gid}/report`, { token: amani.token });
  check('What Amani reads of the team does not carry Wairimu\'s own notes or judgement', !amaniBoard?.theJudgement && !/judgement|private note/i.test(said(amaniReport)), '');
  const amaniOwn = await api(`/grounds/${gid}/my-solo-report`, { token: amani.token });
  log(`  Amani reads her own report: ${said(amaniOwn).slice(0, 900)}`);
  const leadOnAmani = await api(`/grounds/${gid}/my-solo-report`, { token: wairimu.token });
  check('Wairimu reading "my own report" gets Wairimu\'s, never Amani\'s', !said(leadOnAmani).includes('Green Mart renewal proposal has not gone out'), said(leadOnAmani).slice(0, 200));
  const sessAmani = await api(`/check-ins/${checkInIds.Amani}/session-report`, { token: baraka.token });
  check('Baraka cannot open Amani\'s own session report', !!sessAmani?.refused, said(sessAmani).slice(0, 200));
  const sessLead = await api(`/check-ins/${checkInIds.Amani}/session-report`, { token: wairimu.token });
  check('Wairimu cannot open Amani\'s own session report either', !!sessLead?.refused, said(sessLead).slice(0, 200));
  const trAmani = await api(`/check-ins/${checkInIds.Amani}/transcript`, { token: amani.token });
  check('Amani reads her own words back, word for word', answers.Amani.every((a) => said(trAmani).includes(a.slice(0, 40))), said(trAmani).slice(0, 200));
  const trPeek = await api(`/check-ins/${checkInIds.Amani}/transcript`, { token: baraka.token });
  check('Baraka cannot read Amani\'s transcript', !!trPeek?.refused, said(trPeek).slice(0, 200));

  // ==============================================================================================
  heading('6. USE ASK GROUNDWORK (each reader asks; nobody reads anybody else\'s questions)');
  const textOf = (r: any) => (r?.refused ? `REFUSED ${r.message}` : (r?.blocks ?? []).map((b: any) => b.body ?? b.summary ?? b.text ?? '').filter(Boolean).join('\n\n') || said(r));
  const ask = async (who: Someone, message: string) => {
    const r = await api('/ask', { token: who.token, body: { message } });
    const t = textOf(r);
    log(`  ${who.first} asks: "${message}"\n    Groundwork: ${t.replace(/\n/g, '\n      ').slice(0, 900)}`);
    noBrokenSeams(`${who.first}'s answer to "${message.slice(0, 40)}"`, t);
    return { r, t };
  };
  const help = await ask(amani, 'What can you help me with?');
  check('Amani is told what she can do here, in plain sentences', help.t.length > 40 && !help.r?.refused && !/I cannot answer that one yet/.test(help.t), help.t.slice(0, 200));
  const own = await ask(amani, 'What did I say about the Green Mart proposal?');
  check('Amani is answered from her own words', /green mart/i.test(own.t) && !/sales promises/i.test(own.t), own.t.slice(0, 300));
  const hers = await ask(amani, 'What did Baraka say about the warehouse?');
  
  const rep1 = await prisma.report.findFirst({ where: { groundId: gid }, select: { releasedSessions: true } });
  const released1 = !!rep1?.releasedSessions?.includes(1);
  log(`  (the team's picture of session 1 is ${released1 ? 'already shared' : 'not shared yet'} when Amani asks)`);
  if (released1) check('Once the picture is shared, Amani is given Baraka\'s words as he wrote them, with where they are from', /nobody told the warehouse the sales promises/.test(hers.t) && /check-in of \d{1,2} \w+ on Sales team, last quarter/.test(hers.t), hers.t.slice(0, 400));
  else check('Until the picture is shared, Amani is told in a plain sentence that what Baraka said opens to her when the team\'s report is shared', /words open to you when the team's report is shared\./.test(hers.t), hers.t.slice(0, 300));
  const lead1 = await ask(wairimu, 'What did Baraka say about the warehouse?');
  check('Wairimu, who runs the check-in, is given Baraka\'s words as he wrote them (decision 4), with where they are from', /nobody told the warehouse the sales promises/.test(lead1.t) && /check-in of \d{1,2} \w+ on Sales team, last quarter/.test(lead1.t), lead1.t.slice(0, 400));
  const lead0 = await ask(wairimu, 'Where are we on the quarter?');
  log(`  (observation: ${lead0.t.startsWith('I cannot answer') ? 'a lead\'s plain question about the quarter gets the fallback, with options' : 'answered'})`);
  const lead2 = await ask(wairimu, 'How is the team doing?');
  check('Wairimu is answered about the quarter in plain sentences', lead2.t.length > 30 && !lead2.r?.refused, lead2.t.slice(0, 300));
  const peek = await api(`/ask?userId=${amani.userId}`, { token: wairimu.token });
  check('Wairimu cannot read Amani\'s questions', !!peek?.refused || !JSON.stringify(peek).includes('Green Mart proposal'), said(peek).slice(0, 200));
  const peek2 = await api(`/ask/${amani.userId}`, { token: grace.token });
  check('Grace, the admin, cannot read Amani\'s questions either', !!peek2?.refused || !JSON.stringify(peek2).includes('Green Mart proposal'), said(peek2).slice(0, 200));
  const peek3 = await api('/ask', { token: amani.token });
  check('Amani can read her own questions back', JSON.stringify(peek3).includes('Green Mart'), said(peek3).slice(0, 200));

  /* The lead shares the team's picture; then it opens to everybody in the check-in. */
  const rel = await api(`/grounds/${gid}/report/release`, { token: wairimu.token, body: {} });
  log(`  Wairimu shares the team's picture: ${said(rel).slice(0, 400)}`);
  check('Wairimu, who runs the check-in, can share the team\'s picture, and is told which session went', !rel?.refused, said(rel).slice(0, 300), 'the reports builder (api/src/modules/reports/reports.controller.ts: release is limited to the ADMIN role, so the person who runs the check-in is refused with "This action requires one of the following roles: ADMIN")');
  const amaniAfter = await api(`/grounds/${gid}/report`, { token: amani.token });
  log(`  Amani reads the team report after it is shared: ${said(amaniAfter).slice(0, 900)}`);
  noBrokenSeams('The team report Amani reads after it is shared', sentencesIn(amaniAfter));
  check('Amani can now read the team\'s picture, and it is not marked as not shared', !amaniAfter?.notSharedYet, said(amaniAfter).slice(0, 300));

  // ==============================================================================================
  heading('7. REQUEST AND APPROVE LEAVE AND SPENDING (Grace switches them on; Amani and Baraka ask; the approvers decide)');
  for (const [key, answers] of [['leave', { days: 21, approver: 'Their manager' }], ['spend', { currency: 'KES', limit: 20000, above: grace.userId }]] as const) {
    const r = await api(`/suites/${key}`, { method: 'PUT', token: grace.token, body: { on: true, answers } });
    check(`Grace switches on ${key}`, !r?.refused, said(r).slice(0, 200));
  }
  const nope = await api('/suites/leave', { method: 'PUT', token: amani.token, body: { on: false, answers: {} } });
  check('A person who only takes part cannot switch a suite off', !!nope?.refused, said(nope).slice(0, 200));
  const lv = await ask(amani, 'I would like leave from 20 October to 22 October please.');
  const lvProposal = (lv.r?.blocks ?? []).find((b: any) => b.type === 'proposal');
  check('Amani\'s leave is said back to her with the days, and she is asked before anything is sent', !!lvProposal && /20 October/.test(lv.t) && /\?/.test(lv.t), lv.t.slice(0, 300));
  check('Nothing was saved before her yes', (await prisma.leaveRequest.count({ where: { organizationId: orgId } })) === 0);
  const lvYes = await api('/ask/answer', { token: amani.token, body: { proposalId: lvProposal?.proposalId, answer: 'yes' } });
  log(`  Amani says yes. Groundwork: ${textOf(lvYes).slice(0, 500)}`);
  const lvRow = await prisma.leaveRequest.findFirst({ where: { organizationId: orgId } });
  check('After her yes the request is saved, waiting, for the right days', !!lvRow && lvRow.status === 'waiting' && lvRow.startsOn.toISOString().slice(0, 10) === '2026-10-20' && lvRow.endsOn.toISOString().slice(0, 10) === '2026-10-22', JSON.stringify(lvRow));
  const boardWho = lvRow ? (await prisma.user.findUnique({ where: { id: lvRow.approverUserId ?? '' }, select: { firstName: true } }).catch(() => null))?.firstName ?? '(nobody named)' : '';
  log(`  The request's approver: ${boardWho}`);
  const lvBoardW = await api('/suites/leave/board', { token: wairimu.token });
  const lvBoardG = await api('/suites/leave/board', { token: grace.token });
  log(`  Wairimu's leave board: ${said(lvBoardW).slice(0, 700)}`);
  log(`  Grace's leave board: ${said(lvBoardG).slice(0, 700)}`);
  const approverToken = JSON.stringify(lvBoardW).includes('Amani') ? wairimu : grace;
  check('The request is waiting for somebody who may decide it, and that person reads Amani\'s name and days', JSON.stringify(lvBoardW).includes('Amani') || JSON.stringify(lvBoardG).includes('Amani'), '');
  const barakaPeek = await api('/suites/leave/board', { token: baraka.token });
  check('Baraka, who only takes part, cannot read the leave board', !!barakaPeek?.refused || !JSON.stringify(barakaPeek).includes('Amani'), said(barakaPeek).slice(0, 200));
  const barakaMine = await api('/suites/leave/mine', { token: baraka.token });
  check('Baraka\'s own leave page does not hold Amani\'s request', !JSON.stringify(barakaMine).includes('Amani') && !JSON.stringify(barakaMine).includes('20 October'), said(barakaMine).slice(0, 200));
  const q = await api(`/suites/leave/requests/${lvRow?.id}/question`, { token: approverToken.token, body: { question: 'Who will cover the Renewals calls?' } });
  check('The approver asks a question and it is kept with the request', !q?.refused, said(q).slice(0, 200));
  const qa = await api(`/suites/leave/requests/${lvRow?.id}/answer`, { token: amani.token, body: { answer: 'Baraka will cover them, and I will check in on Friday.' } });
  check('Amani answers it', !qa?.refused, said(qa).slice(0, 200));
  const ap = await api(`/suites/leave/requests/${lvRow?.id}/approve`, { token: approverToken.token, body: {} });
  check('The approver approves', !ap?.refused, said(ap).slice(0, 200));
  const mineLv = await api('/suites/leave/mine', { token: amani.token });
  log(`  Amani's own leave page: ${said(mineLv).slice(0, 700)}`);
  noBrokenSeams('Amani\'s own leave page', sentencesIn(mineLv));
  check('Amani reads that her leave was approved, and by whom, in her own page', /approved/i.test(said(mineLv)), said(mineLv).slice(0, 300));

  const sp = await ask(baraka, 'I need to spend KES 12,000 on fuel for the delivery van.');
  const spProposal = (sp.r?.blocks ?? []).find((b: any) => b.type === 'proposal');
  check('Baraka\'s spending is said back with the sum and he is asked before anything is sent', !!spProposal && /12,000/.test(sp.t) && /\?/.test(sp.t), sp.t.slice(0, 300));
  const spYes = await api('/ask/answer', { token: baraka.token, body: { proposalId: spProposal?.proposalId, answer: 'yes' } });
  log(`  Baraka says yes. Groundwork: ${textOf(spYes).slice(0, 500)}`);
  const spRow = await prisma.spendRequest.findFirst({ where: { organizationId: orgId } });
  check('After his yes the request is saved, waiting, for the right sum', !!spRow && spRow.status === 'waiting' && Number(spRow.amount) === 12000, JSON.stringify(spRow));
  const spBoardG = await api('/suites/spend/board', { token: grace.token });
  log(`  Grace's spending board: ${said(spBoardG).slice(0, 700)}`);
  check('Grace, the admin, reads Baraka\'s request on the spending board', JSON.stringify(spBoardG).includes('Baraka') && JSON.stringify(spBoardG).includes('12000') && JSON.stringify(spBoardG).includes('fuel for the delivery van'), '');
  const spAp = await api(`/suites/spend/requests/${spRow?.id}/approve`, { token: grace.token, body: {} });
  check('Grace approves it', !spAp?.refused, said(spAp).slice(0, 200));
  const spMine = await api('/suites/spend/mine', { token: baraka.token });
  log(`  Baraka's own spending page: ${said(spMine).slice(0, 700)}`);
  noBrokenSeams('Baraka\'s own spending page', sentencesIn(spMine));
  check('Baraka reads that it was approved', /approved/i.test(said(spMine)), said(spMine).slice(0, 300));
  const spMineAmani = await api('/suites/spend/mine', { token: amani.token });
  check('Amani\'s spending page does not hold Baraka\'s request', !JSON.stringify(spMineAmani).includes('fuel'), said(spMineAmani).slice(0, 200));

  // ==============================================================================================
  heading('8. DO A PERFORMANCE REVIEW (Grace switches reviews on; Wairimu writes one for Amani)');
  const rv = await api('/suites/reviews', { method: 'PUT', token: grace.token, body: { on: true, answers: { every: 'Every 6 months', writer: 'Their manager' } } });
  check('Grace switches on performance reviews', !rv?.refused, said(rv).slice(0, 200));
  const amaniPerson = await prisma.person.findFirst({ where: { organizationId: orgId, OR: [{ linkedUserId: amani.userId }, { email: amani.email }] } });
  const wairimuPerson = await prisma.person.findFirst({ where: { organizationId: orgId, OR: [{ linkedUserId: wairimu.userId }, { email: wairimu.email }] } });
  /* Who reports to whom is on the organisation's list of people (the People page and its HR system); Amani reports to Wairimu. */
  if (amaniPerson && wairimuPerson) await prisma.person.update({ where: { id: amaniPerson.id }, data: { managerExternalId: wairimuPerson.externalId } });
  check('Amani is on the organisation\'s list of people', !!amaniPerson, '');
  if (amaniPerson) {
    await prisma.evaluationDue.create({ data: { organizationId: orgId, personExternalId: amaniPerson.externalId, dueOn: new Date(Date.now() + 2 * 86_400_000), kind: 'periodic', source: 'groundwork:the-organisations-date' } });
    const rb = await api('/suites/reviews/board', { token: wairimu.token });
    log(`  Wairimu's reviews board: ${said(rb).slice(0, 900)}`);
    const due = (rb?.next ?? []).find((n: any) => /Amani/.test(n.name));
    check('Wairimu is told in a plain sentence that a review for Amani is ready to start, with no score on it', !!due && /\.$/.test(due.standsSays ?? '') && !/score|rating|at risk|PIP/i.test(JSON.stringify(due)), said(due).slice(0, 300));
    const noBoard = await api('/suites/reviews/board', { token: amani.token });
    check('Amani cannot open the reviews board', !!noBoard?.refused, said(noBoard).slice(0, 200));
    const started = due ? await api(`/suites/reviews/due/${due.dueId}/start`, { token: wairimu.token, body: {} }) : null;
    check('Wairimu starts it', !!started?.id, said(started).slice(0, 200));
    if (started?.id) {
      const read1 = await api(`/suites/reviews/${started.id}`, { token: wairimu.token });
      log(`  Wairimu reads the review: ${said(read1).slice(0, 1500)}`);
      const w1 = await api(`/suites/reviews/${started.id}/words`, { method: 'PUT', token: wairimu.token, body: { text: 'Amani closed Harbor Foods, her biggest sale yet, and she has said plainly where the Green Mart proposal slipped and why. I would like to see the proposal go out by Friday.' } });
      check('Wairimu writes her own words', !w1?.refused, said(w1).slice(0, 200));
      const hide = await api(`/suites/reviews/${started.id}`, { token: amani.token });
      log(`  Amani reads the review before the meeting: ${said(hide).slice(0, 1500)}`);
      check('Amani can read her own review', !hide?.refused, said(hide).slice(0, 200));
      check('Amani is not shown how her answers were rated, only what she did and proved', !/rated|rating|score/i.test(said(hide)), said(hide).slice(0, 300));
      const v1 = await api(`/suites/reviews/${started.id}/view`, { method: 'PUT', token: amani.token, body: { text: 'The Green Mart delay was mine. The sign-off kept changing and I should have told Wairimu sooner.' } });
      check('Amani writes her own view beside it', !v1?.refused, said(v1).slice(0, 200));
      const baPeek = await api(`/suites/reviews/${started.id}`, { token: baraka.token });
      check('Baraka cannot read Amani\'s review', !!baPeek?.refused, said(baPeek).slice(0, 200));
      const dec = await api(`/suites/reviews/${started.id}/decision`, { token: wairimu.token, body: { decision: 'Amani carries on in her role, and I will check the Green Mart proposal with her on Friday.', reasons: 'She closed her biggest sale yet and was open about the delay.' } });
      check('Wairimu decides, with her reasons', !dec?.refused, said(dec).slice(0, 200));
      const after = await api(`/suites/reviews/${started.id}`, { token: amani.token });
      log(`  Amani reads the decision: ${said(after).slice(0, 900)}`);
      check('Amani reads the decision and the reasons', /carries on/.test(said(after)) && /biggest sale/.test(said(after)), said(after).slice(0, 300));
      const mineR = await api('/suites/reviews/mine', { token: amani.token });
      check('The review is on Amani\'s own list of reviews', JSON.stringify(mineR).includes(started.id), said(mineR).slice(0, 200));
    }
  }

  // ==============================================================================================
  heading('9. OPEN THE COMPANY PAGE (each reader)');
  for (const [name, who] of [['Grace (admin)', grace], ['Wairimu (lead)', wairimu], ['Amani (takes part)', amani]] as const) {
    const co = await api('/company', { token: who.token });
    log(`  ${name} reads the Company page: ${co?.refused ? 'REFUSED ' + co.message : said(co).slice(0, 1800)}`);
    check(`${name} is served the Company page without error`, !co?.refused, said(co).slice(0, 200));
    if (!co?.refused) noBrokenSeams(`The Company page ${name} reads`, sentencesIn(co));
  }
  void orgId; void amaniGoal;
}
