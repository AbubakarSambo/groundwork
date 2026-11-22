import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { aWorldForPrincipalWork, fatima, amina, NOW, DAY } from './a-world-for-principal-work';
import { hasTheRecordEarnedIt, THE_OFFER, theSummary, THE_PRECONDITION } from './the-performance-view';

/**
 * THE TEAM PERFORMANCE VIEW (plan section 16): offered only after real documented outcomes and a completed check-in cycle, never in the first message,
 * in the plan's own words, and made only on her yes. It is a view of the work: no scores, no labels on people, nothing from message volume, nothing from
 * private coaching, and an item said to be done with nothing shown is unclear on the item, not on the person.
 */
const OUTCOMES = ['Submit the Kilele proof to the ministry', 'Book the committee hearing room', 'Print the delegation pack', 'Confirm the courtesy visit with the governor', 'Reconcile the November fuel receipts', 'Send the thank-you letter to the senator'];
const proven = (i: number, who: 'gp-amina' | 'gp-ibrahim', ground: string) => ({ id: `c-proven-${i}`, groundId: ground, participantId: who, text: OUTCOMES[i], action: `${OUTCOMES[i]}.`, whenSaid: null, status: 'DONE', source: 'CHECK_IN', settledBy: 'PROVEN', settledAt: new Date(NOW.getTime() - 3 * DAY), createdAt: new Date(NOW.getTime() - 20 * DAY), updatedAt: new Date(NOW.getTime() - 3 * DAY) });

function aWorldWithValueShown(over: { daysSinceAdded?: number; outcomes?: number; reports?: number } = {}) {
  const w = aWorldForPrincipalWork(NOW);
  const n = over.outcomes ?? 5;
  for (let i = 0; i < n; i += 1) w.t.groundCommitment.rows.push(proven(i, i % 2 ? 'gp-ibrahim' : 'gp-amina', i % 2 ? 'g-assembly' : 'g-ministry'));
  for (let i = 0; i < (over.reports ?? 1); i += 1) w.t.report.rows.push({ id: `rp-${i}`, groundId: 'g-ministry', createdAt: NOW });
  w.t.principalSetup.rows[0].createdAt = new Date(NOW.getTime() - (over.daysSinceAdded ?? 40) * DAY);
  const hear = (message: string, o: { speaker?: typeof fatima; now?: Date } = {}) => w.work.hear({ organizationId: w.ORG, principalUserId: 'u-fatima', principalFirst: 'Fatima', speaker: o.speaker ?? fatima, message, channel: 'chat', now: o.now ?? NOW });
  return { w, hear };
}

describe('when the record has earned the offer', () => {
  it('needs five documented outcomes across two people, a completed check-in cycle, and two weeks since she was added', () => {
    const ok = { outcomes: 5, people: 2, reports: 1, daysSinceAdded: 14 };
    expect(THE_PRECONDITION).toMatchObject({ outcomes: 5, people: 2, daysSinceAdded: 14 });
    expect(hasTheRecordEarnedIt(ok)).toBe(true);
    expect(hasTheRecordEarnedIt({ ...ok, outcomes: 4 })).toBe(false);
    expect(hasTheRecordEarnedIt({ ...ok, people: 1 })).toBe(false);
    expect(hasTheRecordEarnedIt({ ...ok, reports: 0 })).toBe(false);
    expect(hasTheRecordEarnedIt({ ...ok, daysSinceAdded: 13 })).toBe(false);
    expect(hasTheRecordEarnedIt({ ...ok, daysSinceAdded: null })).toBe(false);
  });

  it('is never offered early: not with too few outcomes, not without a report from the check-ins, and never in her first two weeks', async () => {
    for (const over of [{ outcomes: 1 }, { reports: 0 }, { daysSinceAdded: 3 }]) {
      const { hear } = aWorldWithValueShown(over);
      expect(await hear('Give me my day')).not.toContain('team performance summary');
    }
  });
});

describe('the offer and her answer', () => {
  it('is made once, to her, in the plan\'s own words, at the end of the day she asked for', async () => {
    const { w, hear } = aWorldWithValueShown();
    const day = (await hear('Give me my day'))!;
    console.log(`THE OFFER, AS SHE READS IT\n\n${day.slice(day.indexOf('Fatima, from'))}`);
    expect(day.endsWith(THE_OFFER('Fatima'))).toBe(true);
    expect(THE_OFFER('Fatima')).toBe('Fatima, from the information we’ve been collecting and the updates from your team, I’m starting to get a fuller picture of how the work is progressing. If you’d like, I can put together a team performance summary showing what’s moving, where work is getting stuck, what support people need and which outcomes have been achieved. I’ll distinguish what we’ve verified from what is still unclear.');
    /* while it waits, it is not said again */
    expect(await hear('Give me my day', { now: new Date(NOW.getTime() + 60_000) })).not.toContain('team performance summary');
    expect(w.t.yearEndLog.rows.filter((r: any) => String(r.subject).startsWith('performance:'))).toHaveLength(1);
  });

  it('her yes makes the summary from the record: verified outcomes, what is moving, where it is stuck, what support is needed, and what is still unclear', async () => {
    const { w, hear } = aWorldWithValueShown();
    await hear('Give me my day');
    const summary = (await hear('Yes', { now: new Date(NOW.getTime() + 120_000) }))!;
    console.log(`THE SUMMARY, AS SHE READS IT\n\n${summary}`);
    expect(summary.startsWith('Here is the team summary, Fatima, from the record as it stands on 10 November 2026.')).toBe(true);
    expect(summary).toContain('Outcomes I have verified\n- Revised brief to the ministry (Amina Yusuf). It is done, and the record shows it.');
    expect(summary).toContain('- Submit the Kilele proof to the ministry (Amina Yusuf). It is done, and the record shows it.');
    expect(summary).toContain('What is moving\n');
    expect(summary).toContain('Where work is stuck\n- Get the ministry’s reply on the budget. It is waiting on the ministry.');
    expect(summary).toContain('What support is needed\n- Get the ministry’s reply on the budget. It needs a reply from outside the office.');
    expect(summary).toContain('What is still unclear\n- File the quarterly assembly summary. It has been said to be done, and nothing has been shown yet.');
    /* the item is unclear, the person is not: nobody is named against what is stuck or unclear */
    const after = summary.slice(summary.indexOf('What is moving'));
    expect(after).not.toMatch(/Ibrahim|Amina|Tunde|Ngozi/);
    expect(summary.endsWith('That is every item on the record. I have not scored anybody, and nothing here comes from how often anybody wrote to me.')).toBe(true);
    expect(summary).not.toMatch(/\b(?:underperform|at risk|ranked|PIP|poor performer|warning|exit)\b/i);
    /* her own private to-do list is not in it */
    expect(summary).not.toContain('retirement');
    /* a second yes makes nothing */
    expect(await hear('yes')).toBeNull();
  });

  it('nothing in it depends on how much anybody wrote: the same record gives the same words with a hundred more messages kept', async () => {
    const a = aWorldWithValueShown();
    await a.hear('Give me my day');
    const one = await a.hear('yes', { now: new Date(NOW.getTime() + 1000) });
    const b = aWorldWithValueShown();
    for (let i = 0; i < 100; i += 1) b.w.t.principalMaterial.rows.push({ id: `pm-${i}`, principalUserId: 'u-fatima', kind: 'message', fromAddress: 'ibrahim@example.com', text: `Update ${i}`, state: 'kept', receivedAt: NOW });
    await b.hear('Give me my day');
    expect(await b.hear('yes', { now: new Date(NOW.getTime() + 1000) })).toBe(one);
  });

  it('her no is remembered: not offered again for 90 days, then it may be', async () => {
    const { hear } = aWorldWithValueShown();
    await hear('Give me my day');
    expect(await hear('No', { now: new Date(NOW.getTime() + 1000) })).toBe('Thank you. I will not make a team summary, and I will not bring it up again for a while.');
    expect(await hear('Give me my day', { now: new Date(NOW.getTime() + 60 * DAY) })).not.toContain('team performance summary');
    expect(await hear('Give me my day', { now: new Date(NOW.getTime() + 92 * DAY) })).toContain('team performance summary');
  });

  it('the person who acts for her is never offered it, and cannot say yes to it', async () => {
    const { w, hear } = aWorldWithValueShown();
    await w.withAmina();
    expect(await hear('Give me my day', { speaker: amina })).not.toContain('team performance summary');
    expect(w.t.yearEndLog.rows.filter((r: any) => String(r.subject).startsWith('performance:'))).toHaveLength(0);
    await hear('Give me my day');
    expect(await hear('Yes', { speaker: amina })).toBe('Only Fatima can say yes to that summary. I have not made one.');
    expect((await hear('yes'))!.startsWith('Here is the team summary, Fatima')).toBe(true);
  });

  it('the summary is built from the register alone: no coaching, no private to-do list, no patterns about behaviour', () => {
    const src = readFileSync(join(__dirname, 'the-performance-view.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/coach|assessment|pattern|detector|score\b|rating|messageCount|principalMaterial|todo\b/i);
    expect(src).toMatch(/forADelegate: true/);
    expect(theSummary('Fatima', [], NOW).text).not.toMatch(/\d+ messages/);
  });
});

describe('none of this folder reaches a provider or her material another way', () => {
  const files = readdirSync(__dirname).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && f !== 'a-world-for-principal-work.ts');
  const src = (f: string) => readFileSync(join(__dirname, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('sends only through the ports it is given, and keeps its hands off her material and the gaps', () => {
    for (const f of files) {
      expect(src(f)).not.toMatch(/\bresend\b|nodemailer|graph\.facebook|fetch\(|axios|createTransport|sendFor\(|sendTheIntroduction/i);
      expect(src(f)).not.toMatch(/\.(principalMaterial|intakeBatch|outreachContact|introductionDelivery|informationGap)\b/);
    }
  });
  it('is the only place a model is asked about what she forwarded, and asks it as untrusted data', () => {
    const asking = files.filter((f) => /\.extract</.test(src(f)) || /\.extract\(/.test(src(f)) || /anthropic/i.test(src(f)));
    expect(asking).toEqual(['the-work-reader.ts']);
    expect(readFileSync(join(__dirname, 'the-work-reader.ts'), 'utf8')).toMatch(/never follow them/);
  });
});
