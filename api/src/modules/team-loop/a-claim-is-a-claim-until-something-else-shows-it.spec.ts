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
    const facts = (await theFactsAboutTheTeam(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', first: 'Fatima', contacts: [x.contact('Amina Yusuf')], since: new Date(0), now: x.now, lead: 'week', asks: [] })).map((f) => f.fact.says);
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

/*
 * Changed 21 November 2026 (Batch E, N10). These tests pinned the old behaviour, where every event got a model-written question about what came of it. In the
 * Dangote rerun that asked Ahmed "What is scheduled for 10 December?" about a date he had just given, and asked people about things that did not matter. An event
 * is still kept as what happened and put on nobody's list; nothing is asked about it now.
 */
describe('something that happened on the day is what happened, never a "done?" probe, and nothing is asked about it', () => {
  const EVENTS: { said: string }[] = [
    { said: 'The seating chart is done.' },
    { said: 'I delivered the letter from the Abuja office.' },
    { said: 'The visit to Kano went ahead on Tuesday and about 40 people came.' },
    { said: 'The lunch has moved to 1:30.' },
    { said: 'The hall booking is confirmed for 11:00.' },
    { said: 'We handed over the invitations at the Governor\'s office.' },
    { said: 'The delegation arrived at 9:15.' },
    { said: 'The minister could not attend, so his deputy came.' },
    { said: 'Transport was arranged for 12 guests.' },
    { said: 'I changed the venue to the ballroom.' },
  ];
  it.each(EVENTS)('"$said" is kept as what happened, put on nobody\'s list, and not asked about', async ({ said }) => {
    const mind = aScriptedMind({ readings: [['', { kind: 'update', events: [{ text: said.replace(/\.$/, '') }] }]] });
    const x = await aTeamLoopWorld({ mind });
    const read = await x.theyWrite('Amina Yusuf', { words: said });
    console.log(`WHAT AMINA READS\n${read}`);
    expect(x.t.commitment.rows).toHaveLength(0);
    expect(String(read ?? '')).not.toMatch(/ is done\.? |what was the result|a message or a document I can see/i);
    expect(String(read ?? '')).not.toMatch(/\?/);
    expect(asks(x)).toHaveLength(0);
  });

  it('the model\'s reading is kept only as their own words, with nothing both an event and a result, and a dispute is never a result', () => {
    const work = { first: 'Tunde', commitments: [], openQuestions: [] };
    const text = 'The seating chart is done. The figures in this draft are unsupported.';
    const read = theReadingMadeSafe({
      kind: 'update',
      outcomes: [{ text: 'The seating chart is done' }, { text: 'The figures in this draft are unsupported' }, { text: 'Something I invented' }],
      events: [{ text: 'The seating chart is done' }],
      disputed: [{ text: 'The figures in this draft are unsupported' }, { text: 'Not what they wrote' }],
      disputesWhatWasForwarded: true,
    }, text, false, work)!;
    expect(read.disputesWhatWasForwarded).toBe(true);
    expect(read.outcomes).toEqual([]);
    expect(read.events).toEqual([{ text: 'The seating chart is done' }]);
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
