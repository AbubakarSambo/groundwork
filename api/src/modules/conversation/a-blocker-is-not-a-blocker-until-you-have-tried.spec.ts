import {
  whatTheyTried, stillToAsk, waysThrough, whatToAskThemToDo, A_FORTNIGHT,
  HOW_HARD_THEY_TRIED, SAME_CHANNEL_TWICE_IS_NOT_CHASING, type Standing,
} from './a-blocker-is-not-a-blocker-until-you-have-tried';

const musa = (over: Partial<Standing> = {}): Standing => ({
  what: 'the Sokoto lease approval', owner: null, days: 21, tried: 'asked-again', chaseBy: null, ...over,
});

describe('a blocker is not a blocker until you have tried', () => {
  it('reads two emails as asking again, not as chasing', () => {
    /* The live turn: "I emailed finance twice, no answer." Same channel, same person, twice. */
    expect(whatTheyTried('I emailed finance twice, no answer.')).toBe('asked-again');
    expect(HOW_HARD_THEY_TRIED['asked-again']).toContain('same channel');
    expect(SAME_CHANNEL_TWICE_IS_NOT_CHASING).toContain('is not chasing');
  });

  it('reads picking up the phone as more than writing', () => {
    expect(whatTheyTried('I called him on Tuesday')).toBe('escalated');
    expect(whatTheyTried('I walked over and asked')).toBe('escalated');
  });

  it('reads going above somebody as escalating, and routing round it as its own thing', () => {
    expect(whatTheyTried('I raised it with her manager')).toBe('escalated');
    expect(whatTheyTried('We found a way through with another supplier')).toBe('went-around');
  });

  it('reads silence as nothing, rather than guessing generously', () => {
    expect(whatTheyTried('')).toBe('nothing');
    expect(whatTheyTried('It is still stuck')).toBe('nothing');
  });

  it('asks for a person first, because nothing else can be acted on without one', () => {
    const asks = stillToAsk(musa());
    expect(asks[0]).toContain('A team is not a person');
  });

  it('asks whether they have spoken to anyone once a fortnight has gone', () => {
    expect(stillToAsk(musa({ owner: 'Adeola' })).join(' ')).toContain('taken it above them');
    expect(stillToAsk(musa({ owner: 'Adeola', days: 3 })).join(' ')).toContain('rather than written');
  });

  it('always wants a date and what happens if it slips', () => {
    expect(stillToAsk(musa({ owner: 'Adeola', tried: 'escalated' })).join(' ')).toContain('what do you do if you do not');
    expect(stillToAsk(musa({ owner: 'Adeola', tried: 'escalated', chaseBy: new Date() }))).toEqual([]);
  });

  it('offers ways through, starting with the one they have not tried', () => {
    const ways = waysThrough(musa());
    expect(ways[0]).toContain('who owns this by name');
    expect(ways.join(' ')).toContain('Speak to');
    expect(ways.join(' ')).toContain('Take it above');
    /* The one everybody forgets: the rest of the work is not blocked. */
    expect(ways.join(' ')).toContain('what can move without this');
  });

  it('tells the lead what to ask for, never a verdict about the person', () => {
    const line = whatToAskThemToDo('Musa', musa())!;
    expect(line).toContain('21 days');
    expect(line).toContain('asked more than once, same channel');
    expect(line).toContain('Ask them to');
    /* Not "Musa is blocked", and nothing about Musa himself. */
    expect(line).not.toMatch(/\bblocked\b|\blazy\b|\bexcuse\b/i);
  });

  it('says nothing to the lead where somebody has actually pushed', () => {
    expect(whatToAskThemToDo('Musa', musa({ tried: 'escalated' }))).toBeNull();
    expect(whatToAskThemToDo('Musa', musa({ tried: 'went-around' }))).toBeNull();
  });

  it('and says nothing about a fresh blocker somebody has already asked about', () => {
    /* A thing raised on Monday and asked about on Monday is a person doing their job. */
    expect(whatToAskThemToDo('Musa', musa({ days: 2, tried: 'asked-once' }))).toBeNull();
    expect(A_FORTNIGHT).toBe(14);
  });

  it('but does speak up where nothing has been done at all, however new it is', () => {
    expect(whatToAskThemToDo('Musa', musa({ days: 1, tried: 'nothing' }))).toContain('nothing said yet');
  });
});
