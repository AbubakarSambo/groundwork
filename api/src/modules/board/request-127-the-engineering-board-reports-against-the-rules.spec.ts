import { reportedAgainstTheRules } from './the-work-by-area-and-by-stage';

/** Request 127 item 11 (added 4 October): `reportedAgainstCriteria` was not sent on the engineering board. */
const row = (id: string, kind: string, stage: string, from: 'said' | 'lead' = 'said', known: 'proof' | 'said' | 'lead' = 'said') => ({ id, kind, name: id, stage, owner: null, ownerParticipantId: null, due: null, fields: {}, from, known });
const grid = (rows: any[]) => [{ section: 'Deal grid', holds: 'releases and tasks', state: 'filled', stages: ['Worked on', 'Written', 'Merged', 'Tested', 'Deployed', 'Used'], rows }] as any;

describe('the engineering board, stage by stage', () => {
  it('says what was reported at each stage, in the kind\'s own word, for both readers', () => {
    const r: any = reportedAgainstTheRules('engineering release', grid([row('a', 'task', 'Merged'), row('b', 'task', 'Merged'), row('c', 'task', 'Deployed', 'said', 'proof')]));
    expect(r.stages.map((s: any) => s.says)).toEqual([
      '2 tasks were reported at Merged, and none of them has a document behind it.',
      '1 task was reported at Deployed, and it has a document behind it.',
    ]);
    expect(r.why).toBe('Nothing on record says what each piece of work must show at each stage. The board counts what people reported, and how much of it has a document behind it. It cannot count how many meet the rules.');
  });
  it('says so once when nothing is at any stage', () => {
    const r: any = reportedAgainstTheRules('engineering release', [{ section: 'Deal grid', holds: 'x', state: 'filled', stages: ['Merged'], rows: [{ ...row('a', 'task', 'x'), stage: null }] }] as any);
    expect(r.stages).toEqual([]);
    expect(r.says).toBe('Nobody has reported a task at any stage yet.');
  });
  it('is not sent where the kind has no stages', () => {
    expect(reportedAgainstTheRules('founder\'s own check-in' as any, [{ section: 'Work plan', holds: 'x', state: 'filled', rows: [row('a', 'commitment', 'x')] }] as any)).toBeNull();
  });
});
