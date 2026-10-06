import { draftThePicture, draftTheQuestion, hasAnEngineBasis, WHY_NO_QUESTION } from './the-picture-is-drafted-from-the-reads';
import { WHO_CAN_MOVE_IT, WHAT_IT_MEANS } from '../board/what-kind-of-thing-is-in-the-way';
import { ROLE_MAPS, RoleFunction } from '../board/role-maps';
import { readsAsAMailMerge } from './every-claim-traces-to-a-row.spec';

/**
 * THE PICTURE IS BUILT FROM THE ENGINES. THE MODEL DOES NOT GET TO ADD A CLAIM.
 *
 * Every line drafted here traces to an engine output handed in, and carries that output as a string
 * the phrasing pass must keep. With no engine basis the picture is empty, not a model's summary of
 * the transcript. The written report's own agreed/open items stay, and are labelled as its.
 */
const base = {
  answered: 3, ofPeople: 3,
  confidence: { band: 'partial' as const, saying: 'There is enough here to talk about, and not enough to settle anything.', reasons: [] },
  tiles: [
    { label: 'Differences', value: '1', sub: 'still open between what people said', tone: 'warn' },
    { label: 'Blockers', value: 'None', sub: 'nobody named anything holding work up', tone: 'good' },
  ],
  patterns: [{ who: 'Zainab', signal: 'Repeated future-tense promises without completions.', periodsObserved: 3, positive: false }],
  coverage: [{ name: 'Tunde', reasonText: 'Work in this remit is described by others more than by its owner.' }],
  contribution: [],
  blockers: [
    { who: 'Zainab', on: 'Hafsah', onIsPerson: true, what: 'the on-call rota', kind: 'DECISION' as const, escalated: false },
    { who: 'Zainab', on: 'Hafsah', onIsPerson: true, what: 'a clear list of what is mine', kind: 'DECISION' as const, escalated: false },
  ],
  settled: ['A clear, written, and published rota is needed'],
  open: ['The responsibilities of the new ward coordinator role'],
};

describe('what the picture is made of', () => {
  const lines = draftThePicture(base);
  const all = lines.map((l) => l.text).join('\n');

  it('every line traces to an engine output that was handed in', () => {
    expect(all).toContain(base.confidence.saying);
    expect(all).toContain('Repeated future-tense promises without completions.');
    /* Its own sentence now, after the names, never after a colon (request 101 a). */
    expect(all).toContain('This is true of Tunde. Work in this remit is described by others more than by its owner.');
    expect(all).toContain('the on-call rota');
    expect(all).toContain(WHAT_IT_MEANS.DECISION);
  });

  it('and every kept string is present in its own line, so the guard can hold it', () => {
    for (const l of lines) for (const k of l.mustKeep ?? []) expect(l.text).toContain(k);
  });

  it('groups blockers of one kind into one line, with who can move it said once', () => {
    const block = lines.filter((l) => l.key.startsWith('block-'));
    expect(block).toHaveLength(1);
    expect(block[0].text).toContain('the on-call rota and a clear list of what is mine');
    expect((block[0].text.match(new RegExp(WHO_CAN_MOVE_IT.DECISION.slice(0, 20), 'g')) ?? []).length).toBe(1);
  });

  it('does not restate the tiles or the settled-and-open row, which have their own place on the page', () => {
    expect(lines.map((l) => l.key)).not.toContain('reads');
    expect(lines.map((l) => l.key)).not.toContain('written');
    const all = lines.map((l) => l.text).join(' ');
    expect(all).not.toMatch(/Differences: /);
    expect(all).not.toMatch(/As the written report reads it/);
  });

  it('is not a mail merge', () => {
    expect(readsAsAMailMerge(lines.map((l) => l.text))).toBeNull();
  });

  it('says a reason that is true of everybody once, naming everybody, not once per person', () => {
    /* Driven live: three people, the identical coverage reason, printed three times with a name
       swapped. From an engine, which is why grouping belongs in the draft and not in the wording. */
    const same = 'The role was never clearly defined, so there is no boundary to measure work against.';
    const out = draftThePicture({
      ...base,
      coverage: [{ name: 'You', reasonText: same }, { name: 'Zainab', reasonText: same }, { name: 'Tunde', reasonText: same }],
    });
    const cov = out.filter((l) => l.key.startsWith('cov-'));
    expect(cov).toHaveLength(1);
    /* Two sentences, never joined by a colon (request 101 a). */
    expect(cov[0].text).toBe(`This is true of everybody here. ${same}`);
    expect(readsAsAMailMerge(out.map((l) => l.text))).toBeNull();
  });

  it('never puts a thing after "waiting on", only a person', () => {
    /* Driven live: "waiting on You, role definition, payment for on-call work and the on-call rota
       for the rota" - the row's free-text label was the thing, not a person. */
    const out = draftThePicture({
      ...base,
      blockers: [{ who: 'Zainab', on: 'role definition', onIsPerson: false, what: 'the on-call rota', kind: null, escalated: false }],
    });
    const block = out.find((l) => l.key.startsWith('block-'))!;
    expect(block.text).not.toContain('waiting on role definition');
    expect(block.text).toContain('for the on-call rota');
  });

  it('is empty with no engine basis, rather than a model over the transcript', () => {
    const none = { ...base, answered: 0, patterns: [], coverage: [], contribution: [], blockers: [] };
    expect(hasAnEngineBasis(none)).toBe(false);
    expect(draftThePicture(none)).toEqual([]);
  });
});

describe('the conversation worth having', () => {
  it('comes from the blocker kind first, because that is the actionable one', () => {
    const q = draftTheQuestion({ functions: [{ fn: 'OPS', confidence: 0.9 }], blockers: [{ what: 'the rota', kind: 'DECISION' }] });
    expect(q?.text).toContain(WHO_CAN_MOVE_IT.DECISION);
    expect(q?.text).toContain('the rota');
  });

  it('else from the role map of the round\'s clearest function, in the map\'s own words', () => {
    const q = draftTheQuestion({ functions: [{ fn: 'OPS', confidence: 0.72 }, { fn: 'SALES', confidence: 0.3 }], blockers: [] });
    expect(q?.text).toBe(ROLE_MAPS[RoleFunction.OPS].neutralProbes[0]);
  });

  it('and not from a function detected below the coaching threshold', () => {
    expect(draftTheQuestion({ functions: [{ fn: 'SALES', confidence: 0.4 }], blockers: [] })).toBeNull();
  });

  it('is null with nothing to build from, and the page says why', () => {
    expect(draftTheQuestion({ functions: [], blockers: [] })).toBeNull();
    expect(WHY_NO_QUESTION).toMatch(/No question yet/);
  });
});

/** Run 8, 21 Sep 2026: the discovery report led with a 24-name blocker sentence and printed one person's coverage line ten times. */
describe('a one-time session drafts from the differences and the direction', () => {
  const { draftThePicture, pickTheFinding } = require('./the-picture-is-drafted-from-the-reads');
  const ten = Array.from({ length: 10 }, (_, i) => ({
    name: `Person ${i}`,
    reason: `1 check-in on record. Nothing named so far could be checked by anyone else. Read against ${['Project management', 'Sales', 'Research'][i % 3]}: on track here means something different.`,
  }));
  it('the direction leads, and blockers, patterns and reads are left out', () => {
    const drafts = draftThePicture({
      ...base, oneTime: true, contribution: ten,
      direction: { saying: 'Twenty-four accounts named where to go next.', lines: ['Regions: Kano and Jigawa (11), Benue (4).', 'Information missing: weekly farmgate prices (9).'] },
    });
    const keys = drafts.map((d: any) => d.key);
    expect(keys[0]).toBe('direction');
    expect(pickTheFinding(keys)).toBe('direction');
    expect(keys.some((k: string) => /^(block|pattern|cov|con)-/.test(k))).toBe(false);
    expect(drafts[0].text).toContain('weekly farmgate prices (9)');
  });
  it('and on a run, ten reads that differ only by the role tail are one line naming everybody, keyed apart from other lines', () => {
    const drafts = draftThePicture({ ...base, ofPeople: 10, contribution: ten, coverage: [], blockers: [], patterns: [] });
    const con = drafts.filter((d: any) => d.key.startsWith('con-'));
    expect(con).toHaveLength(1);
    expect(con[0].text).toMatch(/^This is true of everybody here\. 1 check-in on record/);
    expect(con[0].text).not.toMatch(/Read against/);
    const other = draftThePicture({ ...base, ofPeople: 10, contribution: [{ name: 'A', reason: '1 check-in on record. Nothing named so far could be checked by anyone else, but a date was given.' }], coverage: [], blockers: [], patterns: [] });
    expect(other.find((d: any) => d.key.startsWith('con-')).key).not.toBe(con[0].key);
  });
});

/*
 * REQUEST 109 (f), 2 October 2026: the picture read "On the crop: Amani Wekesa says Amani is growing maize ..."
 * - a colon, and Amani named twice, because the side's own words already named her.
 */
describe('a difference is said in sentences, with each person once (request 109 f)', () => {
  const lines = draftThePicture({
    ...base,
    differences: [{ topic: 'Which crop the cohort grows', sides: [
      { who: 'Amani Wekesa', says: 'Amani is growing maize this season.' },
      { who: 'Neema Achieng', says: 'Beans pay better than maize.' },
    ] }],
  } as any);
  const line = lines.find((l) => l.key.startsWith('differs-'))!.text;

  it('reads as full sentences, with no colon and nobody named twice', () => {
    expect(line).toBe('People said different things about which crop the cohort grows. Amani is growing maize this season. Neema Achieng says beans pay better than maize.');
    expect(line).not.toMatch(/Amani Wekesa says Amani/);
    expect(line).not.toMatch(/:/);
  });
});

/*
 * REQUEST 109 (f): "What to settle together" on the MarketView board showed "What did you do this period that
 * only you could have done?", a question for one person, put to the room.
 */
describe('the question to settle together is for the room (request 109 f)', () => {
  it('a chief executive\'s room is never asked a question addressed to one person', () => {
    const q = draftTheQuestion({ functions: [{ fn: RoleFunction.CEO, confidence: 0.9 }], blockers: [] });
    expect(q?.text ?? '').not.toMatch(/\byou\b|\byour\b/i);
    expect(q?.text ?? '').not.toBe('What did you do this period that only you could have done?');
  });
  it('a blocker\'s question has no colon', () => {
    const q = draftTheQuestion({ functions: [], blockers: [{ what: 'the budget sign-off', kind: 'DECISION' as any }] })!;
    expect(q.text).toBe(`${WHO_CAN_MOVE_IT.DECISION} Who is that for the budget sign-off, and have they been asked?`);
  });
});
