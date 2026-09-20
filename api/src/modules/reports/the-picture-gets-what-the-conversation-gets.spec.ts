import { whatDoesNotAddUpPerPerson, withoutUncountedAlls } from './the-picture-gets-what-the-conversation-gets';

/** Run 3, 20 Sep 2026: "All participants are using their financed assets", with one borrower's bike at his cousin's. */
describe('the picture gets what the conversation gets', () => {
  it('a sentence counting the people comes out; a sentence counting things stays', () => {
    const r = withoutUncountedAlls('All participants are using their financed assets. Halima lost 220 birds and is two instalments behind. Everyone is making repayments on time. All fourteen modules are done.');
    expect(r.cut).toEqual(['All participants are using their financed assets.', 'Everyone is making repayments on time.']);
    expect(r.text).toBe('Halima lost 220 birds and is two instalments behind. All fourteen modules are done.');
    expect(withoutUncountedAlls('Each of the five business owners described a constraint.').cut).toHaveLength(1);
    expect(withoutUncountedAlls('The team is at N102m of the N180m.').cut).toEqual([]);
  });

  it('the synthesis is handed each person\'s own arithmetic, and nobody without a gap', () => {
    const block = whatDoesNotAddUpPerPerson([
      { participantId: 'h', label: 'the poultry farmer', targets: [], said: [
        { text: '500 birds, 400 eggs a day', type: 'SUCCESS_DEFINITION', session: 1 },
        { text: 'I have 260 birds now and get 200 eggs a day', type: 'PROGRESS', session: 2 },
      ] },
      { participantId: 'm', label: 'the rice miller', targets: [], said: [{ text: '46 farmers this season', type: 'PROGRESS', session: 2 }] },
    ], 2);
    expect(block).toContain('the poultry farmer:');
    expect(block).toContain('down 48%');
    expect(block).not.toContain('the rice miller');
    expect(block).toContain('never turned into "all are on track"');
    expect(whatDoesNotAddUpPerPerson([], 1)).toBe('');
  });
});
