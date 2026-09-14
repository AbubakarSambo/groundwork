import { proposalFrom, extractionToolFor } from './what-the-context-chat-heard';
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
    expect(p.targets).toEqual([
      { name: 'shops onboarded', target: 40 },
      { name: 'the new depot running', target: null },
    ]);
    expect(p.say).toContain('1 of them with a number');
  });

  it('says plainly when nothing is counted rather than implying it is', () => {
    const p = proposalFrom('targets', { targets: [{ name: 'the handover done' }] } as any, []);
    if (p.kind !== 'targets') throw new Error('wrong kind');
    expect(p.say).toContain('tracked rather than counted');
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
    expect(p.targets).toEqual([{ name: 'shops onboarded', target: 40 }]);
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
