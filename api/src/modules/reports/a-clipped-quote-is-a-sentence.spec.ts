import { aCommitmentSaid } from './what-the-record-shows-over-time';

/** Request 136 item 3: `In session 1, you said, "send the data room". The time you gave for it was "on Wednesday".` */
const base = { statedInSession: 1, restatedIn: [], status: 'UNKNOWN', theySaidIt: true, saidWordForWord: true, whenSaidWordForWord: true };
describe('a commitment whose words are only a piece of a sentence', () => {
  it('is said to the person as a sentence, with the time inside it', () => {
    expect(aCommitmentSaid({ ...base, who: 'You', what: 'send the data room', when: 'on Wednesday' }, 1))
      .toBe('In session 1, you said you would send the data room on Wednesday. Nobody has said yet whether it happened.');
  });
  it('is said to the lead about the person, with no clipped quotes', () => {
    const says = aCommitmentSaid({ ...base, who: 'Wanjiru Kamau', what: 'send the data room', when: 'on Wednesday' }, 1);
    expect(says).toBe('In session 1, Wanjiru Kamau said they would send the data room on Wednesday. Nobody has said yet whether it happened.');
    expect(says).not.toMatch(/"/);
  });
  it('does not say the time twice when the words hold it', () => {
    expect(aCommitmentSaid({ ...base, who: 'You', what: 'hire the engineer by Friday', when: 'by Friday' }, 1))
      .toBe('In session 1, you said you would hire the engineer by Friday. Nobody has said yet whether it happened.');
  });
  it('still quotes a whole sentence of theirs', () => {
    expect(aCommitmentSaid({ ...base, who: 'You', what: 'I will send the data room.', when: 'on Wednesday' }, 1))
      .toContain('In session 1, you said, "I will send the data room."');
  });
});
