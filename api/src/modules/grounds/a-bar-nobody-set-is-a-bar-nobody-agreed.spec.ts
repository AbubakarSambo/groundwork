import { proposalFrom, extractionToolFor, confirmedSay } from './what-the-context-chat-heard';
import { contextGaps } from './the-context-chat';

const base = {
  timelineDays: 90, cadence: 'WEEKLY', successLooksLike: 'the depot runs without me',
  partyCount: 3, perPersonObjectiveCount: 3, openDocumentCount: 1,
};

describe('a bar nobody set is a bar nobody agreed', () => {
  it('asks for the measures when a ground counts nothing', () => {
    const keys = contextGaps({ ...base, targetCount: 0, scenario: 'NEW_PROJECT' }).map(g => g.key);
    expect(keys).toContain('targets');
  });

  it('stops asking once there are some', () => {
    expect(contextGaps({ ...base, targetCount: 2, scenario: 'NEW_PROJECT' }).map(g => g.key)).not.toContain('targets');
  });

  it('never asks a situation that counts nothing', () => {
    for (const s of ['CRISIS_ALIGNMENT', 'ACUTE_SHOCK', 'DRIFT', 'OPEN_READ', 'SNAPSHOT']) {
      expect(contextGaps({ ...base, targetCount: 0, scenario: s }).map(g => g.key)).not.toContain('targets');
    }
  });

  it('says the document can answer it, so nobody retypes a plan they attached', () => {
    const gap = contextGaps({ ...base, targetCount: 0, scenario: 'NEW_PROJECT' }).find(g => g.key === 'targets')!;
    expect(gap.ask).toContain('already in something you have attached');
    expect(gap.suggests).toContain('plan');
  });

  it('proposes what it heard, and keeps a measure with no number', () => {
    const p = proposalFrom('targets', { targets: [
      { name: 'shops onboarded', target: 40 },
      { name: 'the new depot running' },
    ] } as any, []);
    expect(p.kind).toBe('targets');
    if (p.kind !== 'targets') throw new Error('wrong kind');
    /* Each carries the direction its say-back states (decision 69); none without a number. */
    expect(p.targets).toEqual([
      { name: 'shops onboarded', target: 40, direction: 'AIM' },
      { name: 'the new depot running', target: null, direction: null },
    ]);
    /* Each measure is named, and the one with no number says so (found live, 1 October 2026). */
    expect(p.say).toBe('I will set 2 measures for this check-in. "shops onboarded" is an aim of 40 to reach. "the new depot running" has no number, so it will be followed but not counted. A number can be something to reach, a limit not to go over, a share to keep at or above, a date to meet, or a count to keep at zero. You can change any of them on the board, including what kind of number each one is.');
  });

  it('says plainly when nothing is counted rather than implying it is', () => {
    const p = proposalFrom('targets', { targets: [{ name: 'the handover done' }] } as any, []);
    if (p.kind !== 'targets') throw new Error('wrong kind');
    expect(p.say).toBe('I will set one measure for this check-in. "the handover done" has no number, so it will be followed but not counted. You can change it on the board.');
  });

  it('changes nothing when the answer holds no measure', () => {
    expect(proposalFrom('targets', { targets: [] } as any, []).kind).toBe('none');
    expect(proposalFrom('targets', {} as any, []).kind).toBe('none');
    expect(proposalFrom('targets', { targets: [{ name: 'x' }] } as any, []).kind).toBe('none');
  });

  it('refuses a sentence where a measure goes, and never repeats one', () => {
    const p = proposalFrom('targets', { targets: [
      { name: 'we need to make sure that every single shop in the three states is visited at least once' },
      { name: 'shops onboarded', target: 40 },
      { name: 'Shops Onboarded', target: 50 },
    ] } as any, []);
    if (p.kind !== 'targets') throw new Error('wrong kind');
    expect(p.targets).toEqual([{ name: 'shops onboarded', target: 40, direction: 'AIM' }]);
  });

  it('does not let a pasted plan become twenty rows on a board', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ name: `measure ${i}`, target: i }));
    const p = proposalFrom('targets', { targets: many } as any, []);
    if (p.kind !== 'targets') throw new Error('wrong kind');
    expect(p.targets).toHaveLength(8);
  });

  it('tells the model to read them out of the document when it is pointed at one', () => {
    const tool = extractionToolFor('targets') as any;
    const d = tool.input_schema.properties.targets.description as string;
    expect(d).toContain('INCLUDING when they point at a document you can read');
    expect(tool.input_schema.properties.targets.items.properties.target.description)
      .toContain('OMIT it rather than guessing');
  });
});

/*
 * FOUND LIVE, 1 October 2026 (item 6, journey/memory-requests-and-being-away-live.ts): the lead read
 * "Set one measure, tracked rather than counted, because no number was named for them." before the
 * yes, and the same order again after it. Neither named the measure.
 */
describe('the measures said back, as the lead reads them', () => {
  it('names each measure before the yes, and says it is done after it', () => {
    const p = proposalFrom('targets', { targets: [{ name: 'deliveries signed for by the customer' }] } as any, []);
    if (p.kind !== 'targets') throw new Error('wrong kind');
    expect(p.say).toContain('"deliveries signed for by the customer"');
    expect(p.say).not.toMatch(/^Set |tracked rather than counted|for them\./);
    expect(confirmedSay(p)).toBe('I have set one measure for this check-in. "deliveries signed for by the customer" has no number, so it will be followed but not counted. You can change it on the board.');
  });
});

/*
 * THE QUESTIONS THE SETUP CONVERSATION ASKS, READ AS THE LEAD READS THEM (found live, 1 October 2026,
 * item 6). After a No the lead read "What is this counted by? Name the two or three measures - and if
 * they are already in something you have attached, say so ...": pieces joined with a dash. Every one
 * of these is shown to the lead word for word, so each is whole sentences, with no dash or semicolon
 * joining pieces.
 */
describe('every question the setup conversation asks is in whole sentences', () => {
  const all = contextGaps({ ...base, timelineDays: 0, cadence: null, successLooksLike: null, partyCount: 1, targetCount: 0, scenario: 'NEW_PROJECT' } as any);
  it.each(all.map((g) => [g.key, g.ask]))('%s', (_key, ask) => {
    expect(ask).not.toMatch(/ - |;/);
    expect(ask).toMatch(/[.?]$/);
    expect(ask.split(/(?<=[.?])\s+/).every((s: string) => /^[A-Z]/.test(s))).toBe(true);
  });
  it('asks each of them', () => {
    expect(all.map((g) => g.key)).toEqual(expect.arrayContaining(['timeline', 'cadence', 'success', 'targets']));
  });
});
