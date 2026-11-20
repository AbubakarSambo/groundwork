import { aScriptedMind, aTeamLoopWorld } from './a-world-for-the-team-loop';
import { buildTheRegister } from '../outstanding/the-outstanding-register';
import { whatIsOutstandingSaid } from '../outstanding/the-register-in-plain-words';
import { theFactsAboutTheTeam } from './the-update-for-her';
import { theReadingMadeSafe } from './the-team-mind';

/**
 * A CLAIM IS A CLAIM UNTIL SOMETHING ELSE SHOWS IT (Fatima round 2, C1). What a person or a document says happened is only that, and the document that carried a
 * claim is never its own proof. A claim a reviewer or the sender disputes stays disputed. Something that happened on the day is an activity with its own question
 * about what came of it, not a "done?" probe and not a line on anybody's list. Every text a person reads is printed.
 */
const KEMI_DRAFT = 'Q3 draft report. 11 meetings held with 5 institutions. Vehicle hire paid in full.';
const asks = (x: any) => x.t.informationGap.rows.filter((g: any) => g.gapKey.startsWith('q:')).map((g: any) => g.gapKey);

describe('the document that carries a claim is never its own proof', () => {
  it('keeps what a document says as only what it says, and offers only the OTHER documents as proof', async () => {
    const offered: string[][] = [];
    const mind = aScriptedMind({
      shows: ({ thing, documents }) => { offered.push(documents.map((d) => d.text)); return /vehicle hire/i.test(thing) ? documents.find((d) => /Bank confirmation/.test(d.text))?.id ?? null : null; },
      readings: [['Q3 draft report', { kind: 'update', outcomes: [{ commitmentId: null, text: '11 meetings held with 5 institutions' }] }]],
    });
    const x = await aTeamLoopWorld({ mind });
    await x.theyWrite('Amina Yusuf', { words: 'Here is what I have.', files: [{ fileName: 'Q3 draft.txt', text: KEMI_DRAFT }, { fileName: 'bank.txt', text: 'Bank confirmation. Vehicle hire paid in full on 9 November.' }] });
    const row = x.t.commitment.rows.find((c: any) => /11 meetings/.test(c.text));
    expect(row.state).toBe('KEPT');
    /* The draft said it, and the bank confirmation does not show a meeting count: nothing shows it. */
    expect(String(row.provenBy ?? '')).toBe('');
    expect(offered.flat().some((t) => /Q3 draft report/.test(t))).toBe(false);
    const reg = await buildTheRegister(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', now: x.now, forADelegate: false });
    expect(reg.rows.find((r) => /11 meetings/.test(r.item))!.status).toBe('unverified');
  });

  it('still lets a message and a SEPARATE document prove a payment', async () => {
    const mind = aScriptedMind({
      shows: ({ documents }) => documents.find((d) => /Bank confirmation/.test(d.text))?.id ?? null,
      readings: [['was paid', { kind: 'update', outcomes: [{ commitmentId: null, text: 'The Capital Events payment was paid' }] }]],
    });
    const x = await aTeamLoopWorld({ mind });
    await x.theyWrite('Amina Yusuf', { words: 'The Capital Events payment was paid. The confirmation is attached.', files: [{ fileName: 'bank.txt', text: 'Bank confirmation. Capital Events paid on 9 November.' }] });
    const row = x.t.commitment.rows.find((c: any) => /Capital Events/.test(c.text));
    const doc = x.t.principalMaterial.rows.find((m: any) => m.fileName === 'bank.txt');
    expect([row.state, row.provenBy]).toEqual(['KEPT', `material:${doc.id}`]);
  });
});

describe('a claim somebody disputes stays disputed, and is never "done, and the record shows it"', () => {
  it('Kemi forwards two drafts and says the draft figures are unsupported: both claims stay open, said and unproven, in every place they are read', async () => {
    const mind = aScriptedMind({
      shows: ({ documents }) => documents[0]?.id ?? null, /* a generous model would call the draft proof: it must not even be asked */
      readings: [
        ['Q3 draft report', { kind: 'update', outcomes: [{ commitmentId: null, text: '11 meetings held with 5 institutions' }, { commitmentId: null, text: 'Vehicle hire paid in full' }] }],
        ['unsupported', { kind: 'update', disputesWhatWasForwarded: true }],
      ],
    });
    const x = await aTeamLoopWorld({ mind });
    const said = await x.theyWrite('Amina Yusuf', { words: 'I am forwarding two draft reports. The draft figures are unsupported, please do not count them.', files: [{ fileName: 'Q3 draft v1.txt', text: KEMI_DRAFT }, { fileName: 'Q3 draft v2.txt', text: `${KEMI_DRAFT} Version two.` }] });
    console.log(`WHAT AMINA READS\n${said}`);
    const rows = x.t.commitment.rows.filter((c: any) => /11 meetings|Vehicle hire/.test(c.text));
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const r of rows) { expect(r.state).toBe('OPEN'); expect(String(r.provenBy)).toMatch(/^disputed:/); }
    const reg = await buildTheRegister(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', now: x.now, forADelegate: false });
    const mine = reg.rows.filter((r) => /11 meetings|Vehicle hire/.test(r.item));
    expect(mine.every((r) => r.status === 'unverified' && r.disputed === true)).toBe(true);
    const outstanding = whatIsOutstandingSaid(reg, { forName: null, now: x.now });
    console.log(`WHAT FATIMA READS WHEN SHE ASKS WHAT IS OUTSTANDING\n${outstanding}`);
    expect(outstanding).toMatch(/not backed up/);
    expect(outstanding).not.toMatch(/the record shows it/i);
    const facts = (await theFactsAboutTheTeam(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', first: 'Fatima', contacts: [x.contact('Amina Yusuf')], since: new Date(0), now: x.now, lead: 'week', nobodyAnswered: [] })).map((f) => f.fact.says);
    console.log(`WHAT THE UPDATE SAYS\n${facts.join('\n')}`);
    expect(facts.join(' ')).toMatch(/marked as not backed up, so I have not counted it as done/);
    expect(facts.join(' ')).not.toMatch(/as the proof for .* counted as done/);
  });

  it('a claim a reviewer marks inside the document is disputed on its own, and the document\'s other claims are only unproven', async () => {
    const mind = aScriptedMind({
      readings: [['Analyst', { kind: 'update', outcomes: [{ commitmentId: null, text: 'The delegation was received by the Permanent Secretary' }], disputed: [{ text: 'The vehicle hire was paid in full' }] }]],
    });
    const x = await aTeamLoopWorld({ mind });
    await x.theyWrite('Amina Yusuf', { words: 'Draft attached.', files: [{ fileName: 'draft.txt', text: 'Analyst note: no receipt for the vehicle hire. The vehicle hire was paid in full. The delegation was received by the Permanent Secretary.' }] });
    const received = x.t.commitment.rows.find((c: any) => /received by the Permanent/.test(c.text));
    const hire = x.t.commitment.rows.find((c: any) => /vehicle hire was paid/.test(c.text));
    expect([received.state, String(received.provenBy ?? '')]).toEqual(['KEPT', '']);
    expect([hire.state, String(hire.provenBy)]).toEqual(['OPEN', expect.stringMatching(/^disputed:/)]);
  });

  it('reopens a claim that an earlier forward settled with the draft that carried it, once somebody disputes it', async () => {
    const first = aScriptedMind({ shows: ({ documents }) => documents[0]?.id ?? null, readings: [['Q3 draft report', { kind: 'update', outcomes: [{ commitmentId: null, text: '11 meetings held with 5 institutions' }] }]] });
    const x = await aTeamLoopWorld({ mind: first });
    await x.theyWrite('Amina Yusuf', { files: [{ fileName: 'Q3 draft.txt', text: KEMI_DRAFT }] });
    (x.t.commitment.rows.find((c: any) => /11 meetings/.test(c.text))).provenBy = `material:${x.t.principalMaterial.rows.find((m: any) => m.fileName === 'Q3 draft.txt').id}`;
    (x.service as any).mind = aScriptedMind({ readings: [['Please correct', { kind: 'update', disputed: [{ text: '11 meetings held with 5 institutions' }] }]] });
    await x.theyWrite('Amina Yusuf', { words: 'Please correct this: 11 meetings held with 5 institutions is not what the notes show.', at: new Date(x.now.getTime() + 3_600_000) });
    const row = x.t.commitment.rows.find((c: any) => /11 meetings/.test(c.text));
    expect(row.state).toBe('OPEN');
    expect(String(row.provenBy)).toMatch(/^disputed:/);
  });
});

describe('something that happened on the day is an activity with its own question, and never a "done?" probe', () => {
  /* The questions are what the real model wrote for these words (journey/fatima-fix-c-reads-with-the-real-model.ts); a test stands them in. */
  const EVENTS: { said: string; ask: string }[] = [
    { said: 'The seating chart is done.', ask: 'Who has seen the seating chart?' },
    { said: 'I delivered the letter from the Abuja office.', ask: 'Who received the letter and what did they say?' },
    { said: 'The visit to Kano went ahead on Tuesday and about 40 people came.', ask: 'Who was there and what was agreed?' },
    { said: 'The lunch has moved to 1:30.', ask: 'Who has been told about the new lunch time?' },
    { said: 'The hall booking is confirmed for 11:00.', ask: 'Who has the booking confirmation?' },
    { said: 'We handed over the invitations at the Governor\'s office.', ask: 'Who took the invitations, and did they say when the Governor will reply?' },
    { said: 'The delegation arrived at 9:15.', ask: 'Who met the delegation, and did anything go wrong?' },
    { said: 'The minister could not attend, so his deputy came.', ask: 'What did the deputy say on the minister\'s behalf?' },
    { said: 'Transport was arranged for 12 guests.', ask: 'Which guests still need a ride?' },
    { said: 'I changed the venue to the ballroom.', ask: 'Has everybody been told about the new venue?' },
  ];
  it.each(EVENTS)('"$said" is kept as what happened, put on nobody\'s list, and asked about once, in its own words', async ({ said, ask }) => {
    const mind = aScriptedMind({ readings: [['', { kind: 'update', events: [{ text: said.replace(/\.$/, ''), ask }] }]] });
    const x = await aTeamLoopWorld({ mind });
    const read = await x.theyWrite('Amina Yusuf', { words: said });
    console.log(`WHAT AMINA READS\n${read}`);
    expect(x.t.commitment.rows).toHaveLength(0);
    expect(read!).not.toMatch(/ is done\.? |what was the result|a message or a document I can see/i);
    expect((read!.match(/\?/g) ?? []).length).toBe(1);
    expect(read!).toContain(ask);
    expect(asks(x)).toHaveLength(1);
  });

  it('when the model has no question worth asking about an event, nothing is asked and nothing is made', async () => {
    const mind = aScriptedMind({ readings: [['', { kind: 'update', events: [{ text: 'I am forwarding two draft reports', ask: null }] }]] });
    const x = await aTeamLoopWorld({ mind });
    const read = await x.theyWrite('Amina Yusuf', { words: 'I am forwarding two draft reports.' });
    expect(String(read ?? '')).not.toMatch(/\?/);
    expect(x.t.commitment.rows).toHaveLength(0);
  });

  it('asks about the same event only once', async () => {
    const mind = aScriptedMind({ readings: [['', { kind: 'update', events: [{ text: 'The seating chart is done', ask: 'Who has seen the seating chart?' }] }]] });
    const x = await aTeamLoopWorld({ mind });
    await x.theyWrite('Amina Yusuf', { words: 'The seating chart is done.' });
    const again = await x.theyWrite('Amina Yusuf', { words: 'The seating chart is done.', at: new Date(x.now.getTime() + 3_600_000) });
    expect(String(again ?? '')).not.toMatch(/Who has seen the seating chart/);
  });

  it('the model\'s reading is kept only as their own words, with nothing both an event and a result, and a dispute is never a result', () => {
    const work = { first: 'Tunde', commitments: [], openQuestions: [] };
    const text = 'The seating chart is done. The figures in this draft are unsupported.';
    const read = theReadingMadeSafe({
      kind: 'update',
      outcomes: [{ text: 'The seating chart is done' }, { text: 'The figures in this draft are unsupported' }, { text: 'Something I invented' }],
      events: [{ text: 'The seating chart is done', ask: 'Who sat at the top table? And who is missing?' }],
      disputed: [{ text: 'The figures in this draft are unsupported' }, { text: 'Not what they wrote' }],
      disputesWhatWasForwarded: true,
    }, text, false, work)!;
    expect(read.disputesWhatWasForwarded).toBe(true);
    expect(read.outcomes).toEqual([]);
    expect(read.events).toEqual([{ text: 'The seating chart is done', ask: null }]);
    expect(read.disputed).toEqual([{ text: 'The figures in this draft are unsupported' }]);
  });
});

describe('a disputed claim is not nudged (Fatima round 6)', () => {
  it('the person who marked it as not backed up is not asked whether it has moved', async () => {
    const { aTeamLoopWorld } = require('./a-world-for-the-team-loop');
    const { nudgeWhereItHelps } = require('./a-nudge-that-helps');
    const x = await aTeamLoopWorld({});
    await x.t.commitment.create({ data: { organizationId: 'org-1', personExternalId: 'p-amina', text: '14 meetings held with 6 institutions', dueSaid: null, dueAt: null, state: 'OPEN', source: 'team_reply', provenBy: 'disputed:said', statedAt: new Date(x.now.getTime() - 5 * 86_400_000) } });
    const sent: string[] = [];
    const ports: any = { ...x.w.ports, whatsapp: { send: async (a: any) => { sent.push(a.text); return { sent: true }; } }, email: { send: async (a: any) => { sent.push(a.text); return 'sent'; }, sendOnce: async () => 'sent' } };
    await nudgeWhereItHelps(x.prisma, ports, x.now).catch(() => undefined);
    expect(sent.join(' ')).not.toMatch(/14 meetings/);
  });
});
