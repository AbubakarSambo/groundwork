/**
 * LAYER 2 ON THE REAL ROWS OF THE ROUND-23 RUN (fixtures/round-23-assessments.json: the assessments the run wrote, trimmed to the
 * parts layer 2 reads, nothing edited). The baseline run (round 22) wrote no assessments, so its people are read here from the
 * round-23 run of the same cast.
 *
 * Honest people wrongly flagged is zero-tolerance (Hafsah, 2 November 2026):
 *   - Aisha, Joseph and Peter are the honest controls: nothing that needs work is stated about them.
 *   - David is quietly excellent: that is stated, with his proof.
 *   - Brian and Moses let promised days pass: that is stated, with each day.
 *   - Mercy missed one promise while she had too much on: one miss is not a pattern.
 *
 * Each case is read twice: from the rows exactly as stored, and from the same rows as the new read marks them (the fields the
 * assessment's instructions now ask for: `dayPassed` where the day given had passed, and "not mentioned" where the words were
 * only "I have nothing more on that"). The marks added are listed in `asTheNewReadMarksThem`.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { theRecordAcrossTime, theLeadsViewOf, type AnAssessmentSeen } from './patterns-across-the-assessments';
import { theInterventionsAfter } from './the-next-step-for-each-pattern';

const FIXTURE = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'round-23-assessments.json'), 'utf8')) as { people: Record<string, { participantId: string; seen: AnAssessmentSeen[] }> };
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** The record of one person, as stored. */
const asStored = (who: string) => copy(FIXTURE.people[who]);

/** The marks the new instructions ask the read for, on the same rows: which promise, in which check-in, and what the read now says. */
const MARKS: Record<string, { session: number; promise: string; mark: Record<string, unknown> }[]> = {
  Brian: [
    { session: 2, promise: 'c:40306365-a4ba-4356-a003-fbed4b8366e5', mark: { dayPassed: true } }, // "tomorrow, Tuesday 3 November", read on 9 November
    { session: 2, promise: 'c:5f61b872-5e94-4bc1-b2cd-4ad31528207c', mark: { dayPassed: true } }, // "by Wednesday, 4 November", read on 9 November
    { session: 3, promise: 'c:df716ec4-b28a-450f-b023-ef067e2768fa', mark: { dayPassed: true } }, // "by today, Monday 9 November", read on 16 November
    { session: 3, promise: 'c:185c5427-6fa9-4b13-94e5-c287419a7607', mark: { dayPassed: true } }, // "today", said 9 November, read on 16 November
  ],
  Moses: [
    { session: 3, promise: 'c:5736ddd4-a460-48da-be50-dd54a6b55a6f', mark: { dayPassed: true } }, // "by Wednesday 4 November", read on 9 November
    { session: 5, promise: 'c:5736ddd4-a460-48da-be50-dd54a6b55a6f', mark: { dayPassed: true } },
    { session: 5, promise: 'c:1e40bd3f-7121-4b64-80a6-df23094acaf8', mark: { dayPassed: true } }, // "by today, Monday 9 November", read on 16 November
  ],
  Peter: [
    { session: 5, promise: 'c:42d77321-949f-4a25-92f7-07c9fff22b26', mark: { dayPassed: true } }, // kept on 4 November (session 3), reported again
  ],
  Aisha: [
    { session: 4, promise: 'c:5d7fdcae-f5a2-42f7-9f82-ca5ef08dc3a8', mark: { outcome: 'not mentioned', happened: 'OPEN' } }, // her words: "I have nothing more on that."
  ],
};

function asTheNewReadMarksThem(who: string) {
  const p = asStored(who);
  for (const m of MARKS[who] ?? []) {
    const s = p.seen.find((x) => x.sessionNumber === m.session)!;
    const due = (s.assessment.comparedWithLastTime.promisesDue as any[]).find((d) => d.previousItem === m.promise);
    if (!due) throw new Error(`No ${m.promise} in ${who}'s check-in ${m.session}`);
    Object.assign(due, m.mark);
  }
  return p;
}

const READS = { 'as stored': asStored, 'as the new read marks them': asTheNewReadMarksThem };
const read = (how: keyof typeof READS, who: string) => { const p = READS[how](who); return theRecordAcrossTime(p.participantId, p.seen); };
const holding = (r: ReturnType<typeof theRecordAcrossTime>) => r.patterns.filter((p) => p.state === 'holds');
const needsWork = (r: ReturnType<typeof theRecordAcrossTime>) => holding(r).filter((p) => p.kind === 'needs work');

describe.each(Object.keys(READS) as (keyof typeof READS)[])('layer 2 on the round-23 rows, %s', (how) => {
  it.each(['Aisha', 'Joseph', 'Peter'])('%s, an honest control, has nothing stated against them', (who) => {
    expect(needsWork(read(how, who))).toEqual([]);
  });

  it('David\'s quiet excellence is stated, with the proof he gave', () => {
    const r = read(how, 'David');
    const strength = holding(r).find((p) => p.key === 'quiet-excellence');
    expect(strength?.saying).toBe('David has shown proof for 4 pieces of work.');
    expect(strength?.instances.map((i) => [i.sessionNumber, i.on, i.words[0]])).toEqual([
      [1, '2026-11-02', 'The Kitengela transfer is complete.'],
      [2, '2026-11-09', 'Kilele Holdings signed the engagement letter on Wednesday 4 November.'],
      [2, '2026-11-09', expect.stringContaining('KES 14,000,000')],
      [2, '2026-11-09', expect.stringContaining('KES 280,000')],
    ]);
    expect(needsWork(r)).toEqual([]);
  });

  it('Mercy\'s one missed promise is not called slipping; her load is stated', () => {
    const r = read(how, 'Mercy');
    expect(holding(r).map((p) => p.key)).not.toContain('slipping-promises');
    const load = holding(r).find((p) => p.key === 'overload');
    expect(load).toMatchObject({ kind: 'too much on', saying: 'In 2 check-ins, Mercy described having too much on.' });
    expect(load!.instances.map((i) => i.on)).toEqual(['2026-11-09', '2026-11-23']);
  });

  it('nothing "not mentioned" is ever an instance: David\'s two open promises become his next questions', () => {
    const r = read(how, 'David');
    expect(r.patterns.map((p) => p.key)).not.toContain('slipping-promises');
    expect(r.toAskNextTime).toEqual(expect.arrayContaining([
      expect.stringContaining('call Simba Estates'),
      expect.stringContaining('finish the search on the Kilele land'),
    ]));
  });
});

describe('promised days that passed, with each day named', () => {
  it('Brian: stated from the rows as stored, each instance one promise with its check-in, day and words', () => {
    const slip = holding(read('as stored', 'Brian')).find((p) => p.key === 'slipping-promises')!;
    expect(slip.saying).toBe('Brian has let 4 promised days pass without the work done.');
    expect(slip.instances.map((i) => [i.on, i.words[0]])).toEqual([
      ['2026-11-16', 'The Kasarani Foods submissions draft is still not sent.'],
      ['2026-11-16', "I haven't followed up with them since their offer to pay KES 150,000."],
      ['2026-11-23', "I still haven't called Tumaini Traders' lawyer."],
      ['2026-11-23', "I still haven't called Tumaini Traders' lawyer."],
    ]);
  });

  it('Brian: as the new read marks them, each re-promised day counts once, and a later report of the same promise adds nothing', () => {
    const slip = holding(read('as the new read marks them', 'Brian')).find((p) => p.key === 'slipping-promises')!;
    expect(slip.instances.map((i) => [i.sessionNumber, i.item.slice(0, 41)])).toEqual([
      [2, 'follow up with Kasarani Foods again tomor'],
      [2, 'send the Kasarani Foods submissions draft'],
      [3, 'send it by today, Monday 9 November'],
      [3, 'call them to inquire about the delay and '],
      [3, "call Tumaini Traders' lawyer today to dis"],
      [4, "call Tumaini Traders' lawyer"],
    ]);
  });

  it('Moses: as the new read marks them, the 4 November and 9 November days for the attendance sheets are stated', () => {
    const slip = holding(read('as the new read marks them', 'Moses')).find((p) => p.key === 'slipping-promises')!;
    expect(slip.saying).toBe('Moses has let 2 promised days pass without the work done.');
    expect(slip.instances.map((i) => [i.on, i.item])).toEqual([
      ['2026-11-09', 'send the two signed attendance sheets to Ruth (by Wednesday 4 November)'],
      ['2026-11-16', 'send them'],
    ]);
  });

  it('Peter: a promise kept on 4 November and reported again later is still kept', () => {
    const r = read('as the new read marks them', 'Peter');
    expect(r.patterns.map((p) => p.key)).not.toContain('slipping-promises');
    expect(holding(r).map((p) => p.key)).toContain('quiet-excellence');
  });
});

describe('the next step follows each pattern that holds', () => {
  it('Brian\'s slipping gets a coaching question for him, in check-in 3 where it first holds', () => {
    const p = asTheNewReadMarksThem('Brian');
    let steps: any[] = [];
    for (let n = 1; n <= p.seen.length; n += 1) {
      const upTo = p.seen.slice(0, n);
      const now = upTo[upTo.length - 1];
      steps = theInterventionsAfter(steps, theRecordAcrossTime(p.participantId, upTo).patterns, { checkInId: now.checkInId, sessionNumber: now.sessionNumber });
    }
    const slipping = steps.find((s) => s.key === 'slipping-promises');
    expect(slipping).toMatchObject({ forWhom: 'the person', theLeadDecides: false, startedIn: { sessionNumber: 3 } });
    /* A new day passed in check-in 4, so the question did not work, and the step moved on to a clear expectation. */
    expect(slipping).toMatchObject({ step: 'a clear expectation', followedUp: [{ sessionNumber: 4, worked: false }] });
  });

  it('nobody honest is given a step about their work', () => {
    for (const who of ['Aisha', 'Joseph', 'Peter', 'David']) {
      const p = asTheNewReadMarksThem(who);
      const now = p.seen[p.seen.length - 1];
      const steps = theInterventionsAfter([], theRecordAcrossTime(p.participantId, p.seen).patterns, { checkInId: now.checkInId, sessionNumber: now.sessionNumber });
      expect(steps.filter((s) => s.ladder === 'work')).toEqual([]);
    }
  });
});

describe('the lead\'s view, from her own words in setup', () => {
  it('round 23 stored no setup words about any one person, so no bias is stated, and the role she gave in setup is kept', () => {
    const wanjiru = asStored('Wanjiru').seen[0];
    const view = theLeadsViewOf('David Kiprop', wanjiru, 'Wanjiru Kamau');
    expect(view).toMatchObject({ spokenOf: 'neutral', role: 'Conveyancing' });
    const david = asStored('David');
    const r = theRecordAcrossTime(david.participantId, david.seen, view);
    expect(r.patterns.map((p) => p.key)).not.toContain('the-leads-bias');
    expect(r.role?.saying).toEqual(expect.stringMatching(/^David's role is conveyancing tasks\. In 3 check-ins, the work David described fits that role\./));
  });

  it('her doubt about David, against his proved work, is put to her with her words and his instances', () => {
    const wanjiru = asStored('Wanjiru').seen[0];
    wanjiru.assessment.setup!.privateNotes = [{ id: 'n1', words: 'Not sure what he does all week.', from: [4], whoMaySee: 'the lead only', saidWordForWord: true, about: 'David', spokenOf: 'criticism' } as any];
    const david = asStored('David');
    const r = theRecordAcrossTime(david.participantId, david.seen, theLeadsViewOf('David Kiprop', wanjiru, 'Wanjiru Kamau'));
    const bias = r.patterns.find((p) => p.key === 'the-leads-bias')!;
    expect(bias.participantId).toBe(FIXTURE.people.Wanjiru.participantId);
    expect(bias.saying).toBe('In setup you said of David, "Not sure what he does all week." Since then, David\'s own record shows something different. David has shown proof for 4 pieces of work.');
    expect(bias.instances[0]).toMatchObject({ checkInId: wanjiru.checkInId, words: ['Not sure what he does all week.'] });
    /* It is about the lead: its step is hers, never offered to David. */
    const now = david.seen[david.seen.length - 1];
    const steps = theInterventionsAfter([], r.patterns, { checkInId: now.checkInId, sessionNumber: now.sessionNumber });
    expect(steps.find((s) => s.key === 'the-leads-bias')).toMatchObject({ forWhom: 'the lead', participantId: FIXTURE.people.Wanjiru.participantId });
  });
});
