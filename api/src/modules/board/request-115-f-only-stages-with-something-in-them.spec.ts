import { reportedAgainstTheRules, NO_STAGE_RULES, NO_DEAL_REPORTED_YET } from './the-work-by-area-and-by-stage';

/**
 * REQUEST 115 (f): "Reported, stage by stage" sent four rows saying "Nobody has reported a deal at ...".
 * Now only the stages with a deal in them are sent, in the stages' own order, and where no stage has
 * one, a single sentence. Built from the rows each reader is already served, so a participant whose board
 * is their own sees only the stages of their own deals (the walls are held by request-107-c's spec).
 */
const STAGES = ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won'];
const deal = (id: string, stage: string, known: 'proof' | 'said' = 'said') => ({ id, kind: 'deal', name: id, stage, known, owner: null, ownerParticipantId: null, due: null, fields: {}, from: 'said' as const });
const grid = (rows: any[]) => [{ section: 'Deal grid', holds: 'deals', state: rows.length ? 'filled' : 'none-yet', stages: STAGES, rows }] as any;

describe('request 115 (f): only stages with something in them', () => {
  it('sends only the stages a deal was reported at, in order, with no "Nobody has reported" row', () => {
    const r = reportedAgainstTheRules('sales org', grid([deal('Westgate Deli', 'Quoted'), deal('Tuskys Westgate', 'Won', 'proof'), deal('Naivas Karen', 'Quoted')]))!;
    expect(r.stages.map((s) => s.says)).toEqual([
      '2 deals were reported at Quoted, and none of them has a document behind it.',
      '1 deal was reported at Won, and it has a document behind it.',
    ]);
    expect(r.why).toBe(NO_STAGE_RULES);
    expect(r.says).toBeUndefined();
    expect(JSON.stringify(r)).not.toMatch(/Nobody has reported a deal at (?!any)/);
  });

  it('says one sentence where no deal has been reported at any stage', () => {
    const r = reportedAgainstTheRules('sales org', grid([]))!;
    expect(r.stages).toEqual([]);
    expect(r.says).toBe(NO_DEAL_REPORTED_YET);
    expect(NO_DEAL_REPORTED_YET).toBe('Nobody has reported a deal at any stage yet.');
  });
});
