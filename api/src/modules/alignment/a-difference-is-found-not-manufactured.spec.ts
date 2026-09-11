import { whatTheySaidItIs, WHAT_THEY_SAY_IT_IS_PROMPT } from './what-they-say-the-deal-is';
import { whatItMayBeUsedFor, howItReads, type Term } from './a-term-is-not-true-because-a-model-read-it';

const onFile = [
  { id: 't1', says: 'The Distributor shall pay a revenue share of twenty per cent.', reads: 'A 20% revenue share is payable.', clause: '4.1' },
  { id: 't2', says: 'A monthly report by the tenth.', reads: 'A monthly report is due by the tenth.', clause: '4.3' },
];

describe('a difference is found, not manufactured', () => {
  it('records a different understanding of a clause that exists', () => {
    const out = whatTheySaidItIs({ readings: [{ about: 'the revenue share', reads: 'Twenty per cent of net, after landed cost.', termId: 't1' }] }, onFile);
    expect(out.differences).toHaveLength(1);
    expect(out.differences[0].termId).toBe('t1');
    expect(out.notInTheDocument).toEqual([]);
  });

  it('does not turn agreement into a difference', () => {
    const out = whatTheySaidItIs({ readings: [{ about: 'the report', reads: 'A monthly report is due by the tenth!', termId: 't2' }] }, onFile);
    expect(out.differences).toEqual([]);
  });

  it('records something described that no clause covers', () => {
    const out = whatTheySaidItIs({ readings: [{ about: 'marketing support', reads: 'They fund half the launch spend in the first year.', inTheDocument: false }] }, onFile);
    expect(out.notInTheDocument).toHaveLength(1);
    expect(out.notInTheDocument[0].termId).toBeNull();
  });

  it('treats unsure as unsure, never as the document being silent', () => {
    const out = whatTheySaidItIs({ readings: [{ about: 'something', reads: 'It is meant to be quarterly I think.' }] }, onFile);
    expect(out.differences).toEqual([]);
    expect(out.notInTheDocument).toEqual([]);
  });

  it('never attaches a reading to a term that is not on the list', () => {
    const out = whatTheySaidItIs({ readings: [{ about: 'x', reads: 'Something about the share.', termId: 'nope' }] }, onFile);
    expect(out.differences).toEqual([]);
  });

  it('nothing said this way can ever judge what happened', () => {
    expect(whatItMayBeUsedFor('said, and not in the document')).not.toContain('used to judge what happened');
    expect(whatItMayBeUsedFor('read differently by each side')).not.toContain('used to judge what happened');
  });

  it('says it plainly on screen, without blaming anybody', () => {
    const t: Term = {
      says: 'marketing support', reads: 'They fund half the launch spend in the first year.',
      state: 'said, and not in the document', clause: null, checkedBy: ['Beta Stores'], readDifferently: null,
    };
    const line = howItReads(t);
    expect(line).toContain('no clause in the document says it');
    expect(line).toContain('so everybody works from the same one');
    expect(line).not.toMatch(/missing|withheld|breach|fault|wrong/i);
  });

  it('is told it is not a negotiation, and not to talk like one', () => {
    expect(WHAT_THEY_SAY_IT_IS_PROMPT).toContain('THIS IS NOT A NEGOTIATION');
    expect(WHAT_THEY_SAY_IT_IS_PROMPT).toContain('Never use the words party, counterparty, position or dispute');
    expect(WHAT_THEY_SAY_IT_IS_PROMPT).toContain('found while saying so is still easy');
  });
});
