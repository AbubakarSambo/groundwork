import { eachLineInTheirName, theKindThatFits } from './what-each-person-said-is-in-their-name';

/** Requests 127 item 4 and 129 item 5: lines typed INTENT that intend nothing, as the lead and the person read them. */
const row = (items: any[]) => [{ participantId: 'p-aisha', name: 'Aisha Wanjiku', items }];
describe('a line typed as an intention', () => {
  it.each([
    ['I close refunds when I send the instruction, because the old rule said so.'],
    ['Zainab Suleiman, partnerships.'],
    ['I believed Zainab was driving this forward.'],
  ])('is sent with no kind when it intends nothing: %s', (text) => {
    expect(theKindThatFits(text, 'INTENT')).toBeNull();
    const served: any = eachLineInTheirName(row([{ text, type: 'INTENT', saidAs: 'their-words' }]), 'u-other');
    expect(served[0].items[0].type).toBeNull();
    expect(served[0].items[0].text).toContain(text.replace(/[.!?]+$/, ''));
  });
  it.each([
    ['I will send the data room on Wednesday.'],
    ["I'm going to visit Kisumu next week."],
    ['I want to move the refund rule to the helpdesk.'],
  ])('keeps the kind of a line that intends: %s', (text) => {
    expect(theKindThatFits(text, 'INTENT')).toBe('INTENT');
  });
  it('never changes the kind of any other line, or the person\'s words', () => {
    expect(theKindThatFits('I closed 14 tickets.', 'PROGRESS')).toBe('PROGRESS');
    expect(theKindThatFits('I close refunds.', 'COMMITMENT')).toBe('COMMITMENT');
  });
});
