import { alreadyPut, numbersWithUnits, sayWhatDoesNotAddUp, whatDoesNotAddUp } from './what-does-not-add-up';

/**
 * Adversarial runs, 20 Sep 2026: "noticed what did not add up" scored 2.3 of 5. The poultry farmer's
 * birds halved between sessions, the borrower's goal changed, the rep's own target differed from the
 * manager's, and none of it was said to anybody. The product does the arithmetic now.
 */
describe('what does not add up', () => {
  it('reads a number and the thing it counts', () => {
    expect(numbersWithUnits('I lost 220 birds. We are at 200 eggs a day now.')).toEqual([
      { value: 220, unit: 'bird', raw: '220 birds' },
      { value: 200, unit: 'egg', raw: '200 eggs' },
    ]);
    expect(numbersWithUnits('We are at N26m for the quarter.')[0]).toMatchObject({ value: 26_000_000, unit: 'money' });
    expect(numbersWithUnits('40 tonnes a week by October 2026')).toEqual([{ value: 40, unit: 'tonne', raw: '40 tonnes' }]);
  });

  const base = { thisSession: 2, targets: [], sessionsLeft: 1, aiTurnsThisSession: [] as string[] };

  it('the same thing counted differently across sessions, with the change worked out', () => {
    const d = whatDoesNotAddUp({
      ...base,
      said: [
        { text: '500 birds, aiming for 400 eggs a day', type: 'SUCCESS_DEFINITION', session: 1 },
        { text: 'I have 260 birds left and we get about 200 eggs a day', type: 'PROGRESS', session: 2 },
      ],
    });
    const birds = d.find((x) => x.lines[2]?.includes('bird'));
    expect(birds?.kind).toBe('counted differently');
    expect(birds?.lines[2]).toBe('That is 500 birds then 260: down 48%.');
    expect(d.find((x) => x.lines[2]?.includes('egg'))?.lines[2]).toBe('That is 400 eggs then 200: down 50%.');
  });

  it("the lead's number for them against their own", () => {
    const d = whatDoesNotAddUp({
      ...base,
      said: [],
      targets: [
        { name: 'Bring in at least N50m', target: 50_000_000, count: 0, yours: true, setByThem: false },
        { name: 'N40m by the end of the quarter', target: 40_000_000, count: 26_000_000, yours: true, setByThem: true },
      ],
    });
    expect(d[0]).toMatchObject({ kind: 'two numbers for one target' });
    expect(d[0].lines[0]).toContain('50m');
    expect(d[0].lines[1]).toContain('40m');
  });

  it('behind with the run nearly over, and not when it is not nearly over', () => {
    const targets = [{ name: 'N40m', target: 40_000_000, count: 26_000_000, yours: true, setByThem: true }];
    expect(whatDoesNotAddUp({ ...base, said: [], targets: [{ name: 'Team N180m', target: 180_000_000, count: 71_000_000, yours: false, setByThem: false }], sessionsLeft: 1 })).toEqual([]);
    expect(whatDoesNotAddUp({ ...base, said: [], targets, sessionsLeft: 1 })[0]).toMatchObject({ kind: 'behind with the run nearly over' });
    expect(whatDoesNotAddUp({ ...base, said: [], targets, sessionsLeft: 4 })).toEqual([]);
  });

  it('what it was for has gone quiet', () => {
    const d = whatDoesNotAddUp({
      ...base,
      said: [
        { text: 'The goal is to increase my income from deliveries', type: 'SUCCESS_DEFINITION', session: 1 },
        { text: 'Just continuing to make the payments', type: 'INTENT', session: 2 },
        { text: 'The payments are made on the 25th', type: 'PROGRESS', session: 2 },
      ],
    });
    expect(d[0]).toMatchObject({ kind: 'what it was for has gone quiet' });
    expect(d[0].lines[0]).toContain('increase my income');
  });

  it('and nothing, when nothing is off', () => {
    expect(whatDoesNotAddUp({
      ...base,
      said: [
        { text: 'The goal is more deliveries and more income', type: 'SUCCESS_DEFINITION', session: 1 },
        { text: 'Deliveries are up, income is up', type: 'PROGRESS', session: 2 },
      ],
    })).toEqual([]);
  });

  it('a difference already put this session is listed as put, not put again', () => {
    const input = {
      ...base,
      said: [
        { text: '500 birds', type: 'SUCCESS_DEFINITION', session: 1 },
        { text: '260 birds left', type: 'PROGRESS', session: 2 },
      ],
      aiTurnsThisSession: ['Last time you said 500 birds; today you said 260. What happened in between?'],
    };
    const [d] = whatDoesNotAddUp(input);
    expect(alreadyPut(d, input.aiTurnsThisSession)).toBe(true);
    const block = sayWhatDoesNotAddUp(input);
    expect(block).toContain('ALREADY PUT TO THEM THIS SESSION');
    expect(block).not.toContain('PUT THIS ONE TO THEM');
  });

  it('the block puts one and holds the rest', () => {
    const block = sayWhatDoesNotAddUp({
      ...base,
      said: [
        { text: '500 birds, 400 eggs a day', type: 'SUCCESS_DEFINITION', session: 1 },
        { text: '260 birds, 200 eggs a day', type: 'PROGRESS', session: 2 },
      ],
    });
    expect(block).toContain('PUT THIS ONE TO THEM THIS SESSION');
    expect(block).toContain('Also on record, for a later turn');
    expect(block).toContain('A question, not a verdict');
  });
});
