import { aScriptedMind, aTeamLoopWorld } from './a-world-for-the-team-loop';
import { buildTheRegister } from '../outstanding/the-outstanding-register';
import { theQuestionsStillOpen } from './what-their-reply-says';

/**
 * A TEAM MEMBER'S REPLY, FORWARD OR VOICE NOTE IS THEIR CHECK-IN (plan 6.3, 26.1 and 31). What they send goes on the records that exist (a commitment, the
 * one-per-person-and-question gap row), a forwarded report answers what it answers so it is never asked twice, and a thin answer earns ONE question.
 * Every text a person reads is printed, so it can be judged.
 */
const KILELE = [
  'Kilele progress report, week of 9 November.',
  'The audit letter went to the Auditor General on Monday 9 November.',
  'Next, we will send the budget letter by Friday.',
  "The permit is waiting for the Director's approval.",
].join(' ');

/* The test's model says a document shows the audit letter was sent when its own words say so, and for nothing else (which-document-shows-it.ts). The report itself is
   never offered as the proof of what it claims (round 2, C1), so only another document can be. */
const theReport = () => aScriptedMind({
  shows: ({ thing, documents }) => (/audit letter/i.test(thing) ? documents.find((d) => /Auditor General/.test(d.text))?.id ?? null : null),
  readings: [['Kilele progress report', {
    kind: 'update',
    answers: [{ slug: 'q:working_on' }, { slug: 'q:what_changed' }, { slug: 'q:result' }, { slug: 'q:blocked' }],
    outcomes: [{ commitmentId: null, text: 'The audit letter went to the Auditor General on Monday 9 November' }],
    commitments: [{ text: 'we will send the budget letter by Friday', whenSaid: 'by Friday' }],
    blockers: [{ text: "The permit is waiting for the Director's approval", waitingOn: 'the Director' }],
  }], ['ongoing', { kind: 'update', vague: { about: 'the budget letter', how: 'ongoing' } }]],
});

describe('a forwarded report answers what it answers, so the same thing is never asked twice', () => {
  it('writes the promise, the result with its proof and what is stuck on the existing records, and marks each question answered from the document', async () => {
    const mind = theReport();
    const x = await aTeamLoopWorld({ mind });
    const said = await x.theyWrite('Amina Yusuf', { words: 'Here is the report I sent on Monday.', files: [{ fileName: 'Kilele report.txt', text: KILELE }] });
    console.log(`WHAT AMINA READS\n${said}`);
    expect(said).toBe('Amina, thank you. I have noted the 3 things from what you sent, and I will not ask you for it again.');
    expect(said).not.toMatch(/\?/);

    const mine = x.t.commitment.rows;
    expect(mine.map((c: any) => [c.text, c.state, c.waitingOn, String(c.provenBy ?? '').startsWith('material:')])).toEqual([
      ['we will send the budget letter by Friday', 'OPEN', null, false],
      ["The permit is waiting for the Director's approval", 'OPEN', 'the Director', false],
      /* Said in the report, and the report is the only thing that says it: it is kept as their word, with nothing showing it (round 2, C1: a document that carries a claim is not its own proof). */
      ['The audit letter went to the Auditor General on Monday 9 November', 'KEPT', null, false],
    ]);
    /* The marker: written from the document read, one row per person and question. */
    const doc = x.t.principalMaterial.rows.find((m: any) => m.fileName === 'Kilele report.txt');
    const marks = x.t.informationGap.rows.filter((g: any) => g.gapKey.startsWith('q:') && g.askedOfEmail === 'amina@example.com');
    expect(marks.map((g: any) => [g.gapKey, g.state, g.answeredFrom])).toEqual(['q:working_on', 'q:what_changed', 'q:result', 'q:blocked'].map((k) => [k, 'answered', `material:${doc.id}`]));
    /* The next turn reads it: only the question nothing answered is still open. */
    expect((await theQuestionsStillOpen(x.prisma, x.contact('Amina Yusuf'))).map((q) => q.slug)).toEqual(['q:support']);
  });

  it('reaches Fatima\'s register: the result Amina only wrote down shows as unverified, the promise as open, the stuck item as waiting on the Director', async () => {
    const x = await aTeamLoopWorld({ mind: theReport() });
    await x.theyWrite('Amina Yusuf', { files: [{ fileName: 'Kilele report.txt', text: KILELE }] });
    const reg = await buildTheRegister(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', now: x.now, forADelegate: false });
    const rows = reg.rows.filter((r) => r.sources.some((s) => s.from === 'what they told Groundwork'));
    expect(rows.map((r) => [r.item, r.owner, r.status, r.dependency]).sort((p, q) => String(p[0]).localeCompare(String(q[0])))).toEqual([
      ['The audit letter went to the Auditor General on Monday 9 November', 'Amina Yusuf', 'unverified', null],
      ["The permit is waiting for the Director's approval", 'Amina Yusuf', 'open', 'Waiting on the Director'],
      ['we will send the budget letter by Friday', 'Amina Yusuf', 'open', null],
    ]);
  });

  it('is never asked again when she later sends only "still ongoing", because that question was already answered', async () => {
    const mind = theReport();
    const x = await aTeamLoopWorld({ mind });
    await x.theyWrite('Amina Yusuf', { files: [{ fileName: 'Kilele report.txt', text: KILELE }] });
    const second = await x.theyWrite('Amina Yusuf', { words: 'Still ongoing', at: new Date(x.now.getTime() + 3_600_000) });
    console.log(`WHAT AMINA READS THE SECOND TIME\n${second}`);
    expect(second).not.toMatch(/\?/);
    expect(mind.saw[mind.saw.length - 1].openQuestions).toEqual(['q:support']);
  });

  it('says the same promise said more fully is one promise', async () => {
    const mind = aScriptedMind({ readings: [['budget letter by Friday and copy', { commitments: [{ text: 'I will send the budget letter by Friday and copy the Director', whenSaid: 'by Friday' }] }], ['budget letter by Friday.', { commitments: [{ text: 'I will send the budget letter by Friday', whenSaid: 'by Friday' }] }]] });
    const x = await aTeamLoopWorld({ mind });
    await x.theyWrite('Amina Yusuf', { words: 'I will send the budget letter by Friday.' });
    await x.theyWrite('Amina Yusuf', { words: 'I will send the budget letter by Friday and copy the Director.', at: new Date(x.now.getTime() + 3_600_000) });
    expect(x.t.commitment.rows.map((c: any) => c.text)).toEqual(['I will send the budget letter by Friday and copy the Director']);
  });
});

describe('a thin answer earns one question, and never a questionnaire', () => {
  it('"ongoing" is asked one focused question, once', async () => {
    const x = await aTeamLoopWorld({ mind: aScriptedMind() });
    const first = await x.theyWrite('Ibrahim Sule', { words: 'ongoing' });
    console.log(`THE ONE QUESTION IBRAHIM READS\n${first}`);
    expect(first).toBe('Ibrahim, thank you. You said your work is ongoing. What has changed on it since you last told me, and what result do you expect from it?');
    expect((first!.match(/\?/g) ?? []).length).toBe(1);
    const again = await x.theyWrite('Ibrahim Sule', { words: 'still ongoing', at: new Date(x.now.getTime() + 3_600_000) });
    expect(again).not.toMatch(/What has changed/);
    expect(x.t.informationGap.rows.filter((g: any) => g.gapKey === 'q:what_changed')).toHaveLength(1);
  });

  it('"done" with nothing shown is kept as their word, asked once for what shows it, and is not counted as done in her register', async () => {
    const mind = aScriptedMind({ readings: [['I will send the Kilele letter', { commitments: [{ text: 'I will send the Kilele letter by Thursday', whenSaid: 'by Thursday' }] }]] });
    const x = await aTeamLoopWorld({ mind });
    await x.theyWrite('Amina Yusuf', { words: 'I will send the Kilele letter by Thursday.' });
    const id = x.t.commitment.rows[0].id;
    (mind as any).readTheirWords = async () => ({ kind: 'update', commitments: [], outcomes: [{ commitmentId: id, text: 'The letter is done' }], blockers: [], answers: [], vague: null });
    const said = await x.theyWrite('Amina Yusuf', { words: 'The letter is done', at: new Date(x.now.getTime() + 3_600_000) });
    console.log(`THE ONE QUESTION AMINA READS\n${said}`);
    expect(said).toBe('Amina, thank you. You said “I will send the Kilele letter by Thursday” is done. What was the result, and is there a message or a document I can see that shows it?');
    const reg = await buildTheRegister(x.prisma, { organizationId: 'org-1', principalUserId: 'u-fatima', now: x.now, forADelegate: false });
    expect(reg.rows.find((r) => r.item.includes('Kilele letter'))?.status).toBe('unverified');
  });

  it('stops probing when what they sent covers it: no question at all', async () => {
    const x = await aTeamLoopWorld({ mind: theReport() });
    const said = await x.theyWrite('Amina Yusuf', { files: [{ fileName: 'Kilele report.txt', text: KILELE }] });
    expect(said).not.toMatch(/\?/);
  });
});
