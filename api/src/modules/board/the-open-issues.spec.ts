import { aDecisionAsAQuestion, aPromiseAsATitle, ISSUE_STEPS, theOpenIssues } from './the-open-issues';

/**
 * OPEN ISSUES, AS WAIRIMU READS THEM ON THE SALES BOARD (board-as-lead.txt, screen match 16 October).
 * Each issue comes from a row already on record and sits at its own step; the buttons are the picture's.
 */
const now = new Date('2026-09-23T15:15:00Z');
const read = () => theOpenIssues({
  groundId: 'g-sales',
  now,
  differences: [{ key: '0', topic: 'Mama Fresh', withFirstName: 'Brian', since: new Date('2026-09-01T12:00:00Z') }],
  stillToDecide: [
    { id: 'q-range', text: 'Decide whether a price range counts as a budget', createdAt: new Date('2026-09-18T09:00:00Z'), raisedIn: 4 },
    { id: 'q-discount', text: 'Decide whether to offer a discount for early deposits in Q4', createdAt: new Date('2026-09-19T09:00:00Z'), raisedIn: 1 },
  ],
  memories: [{ text: 'In Q2, a discount for early deposits raised deposits by 10% but cut margin by 6%' }],
  leadPromises: [
    { id: 'k-records', text: 'I will move the customer records to Brian.', createdAt: new Date('2026-09-12T10:00:00Z') },
    { id: 'k-new', text: 'I will call Lakeside on Friday.', createdAt: new Date('2026-09-22T10:00:00Z') },
  ],
});

describe('open issues, each at its step', () => {
  it('reads the four steps the picture shows, in this order', () => {
    expect(read().map((i) => [i.title, i.step])).toEqual([
      ['Brian and you see Mama Fresh differently', 'Unclear'],
      ['Does a price range count as a budget?', 'Options'],
      ['Offer a discount for early deposits in Q4?', 'Understood'],
      ['Move the customer records to Brian', 'Being done'],
    ]);
  });

  it('a difference needs a conversation, with a way to start it and the two buttons', () => {
    const [d] = read();
    expect(d.next).toBe('have the conversation with Brian.');
    expect(d.conversation).toEqual({
      heading: 'This needs a conversation',
      says: 'You and Brian have seen this differently for 3 weeks, and it has not been talked about.',
      wayToStart: '“Brian, we see Mama Fresh differently. Can we agree on it?”',
    });
    expect(d.action?.label).toBe('Prepare the conversation');
    expect(d.quiet?.label).toBe('Not now');
  });

  it('a question nobody owns asks who decides, and one decided before says what happened last time', () => {
    const issues = read();
    expect(issues[1].says).toBe('This has come up in 4 check-ins. Nobody has decided, and nobody owns it.');
    expect(issues[1].action?.label).toBe('Name who decides, and by when');
    expect(issues[2].says).toBe('Last time we decided this: In Q2, a discount for early deposits raised deposits by 10% but cut margin by 6%.');
    expect(issues[2].action).toBeNull();
  });

  it('what the lead said they would do a week ago asks whether it happened; a new one is not an issue yet', () => {
    const doing = read()[3];
    expect(doing.says).toBe('Decided on 12 September, 11 days ago. Has it happened?');
    expect(doing.action?.choices?.map((c) => c.label)).toEqual(['Yes, it’s done', 'Not yet']);
    expect(doing.action?.choices?.[0].route).toEqual({ method: 'PATCH', path: '/grounds/g-sales/commitments/k-records', body: { status: 'DONE' } });
    expect(read().some((i) => i.title.includes('Lakeside'))).toBe(false);
  });

  it('the six steps are the picture’s, and no sentence labels a person', () => {
    expect([...ISSUE_STEPS]).toEqual(['Unclear', 'Understood', 'Options', 'Decided', 'Being done', 'Checked']);
    const said = JSON.stringify(read());
    expect(said).not.toMatch(/\b(?:PIP|exit|at risk|underperform|lazy)\b/i);
  });

  it('words a question and a promise as the picture does', () => {
    expect(aDecisionAsAQuestion('Decide whether a price range counts as money ready')).toBe('Does a price range count as money ready?');
    expect(aPromiseAsATitle("I'll send Grace the stand quote.")).toBe('Send Grace the stand quote');
  });
});
