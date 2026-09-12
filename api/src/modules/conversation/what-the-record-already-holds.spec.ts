import {
  whatTheRecordAlreadyHolds,
  sayOneThingInTheWay,
  daysSince,
  WAITED_LONG_ENOUGH_TO_ASK,
} from './what-the-record-already-holds';

const NOW = new Date('2026-09-12T09:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe('what the record already holds', () => {
  it('says where they are against a number instead of leaving it to be asked', () => {
    const out = whatTheRecordAlreadyHolds({
      targets: [{ name: 'Musa - North', target: 35, count: 0 }],
      inTheWay: [], saidLastTime: [], now: NOW,
    });
    expect(out).toContain('Musa - North: 0 of 35');
    expect(out).toContain('Do not ask what this person is aiming for');
  });

  it('leaves out a target nobody put a number on', () => {
    /* A qualitative objective is tracked and not counted. Printed as "x of null" it would invite
       the model to invent the denominator, which is the one number nobody may supply. */
    const out = whatTheRecordAlreadyHolds({
      targets: [{ name: 'Keep dealers happy', target: null, count: 0 }],
      inTheWay: [], saidLastTime: [], now: NOW,
    });
    expect(out).not.toContain('Keep dealers happy');
  });

  it('gives the age and whether anybody escalated, which is the difference between waiting and chasing', () => {
    const line = sayOneThingInTheWay(
      { what: 'the Sokoto lease approval', on: 'finance', since: daysAgo(21), escalated: false },
      NOW,
    );
    expect(line).toContain('21 days old');
    expect(line).toContain('nobody has escalated it');
  });

  it('names a blocker with nobody on it as exactly that', () => {
    /* "Waiting on finance" is not waiting on anybody: a function cannot answer an email, be chased,
       or be escalated past. It is the commonest shape an excuse takes. */
    const line = sayOneThingInTheWay({ what: 'approval', on: null, since: daysAgo(3), escalated: false }, NOW);
    expect(line).toContain('on nobody named');
  });

  it('points at the ones that have sat a fortnight, and at the ones naming no person', () => {
    const out = whatTheRecordAlreadyHolds({
      targets: [],
      inTheWay: [
        { what: 'the Sokoto lease', on: 'finance', since: daysAgo(21), escalated: false },
        { what: 'a price list', on: null, since: daysAgo(2), escalated: false },
      ],
      saidLastTime: [], now: NOW,
    });
    expect(out).toContain('one has sat for a fortnight or more');
    expect(out).toContain('A team cannot answer an email');
    expect(out).toContain('Ask what has actually been done about them since');
  });

  it('spells out what is still unanswered about a blocker, and the ways through', () => {
    /* The three facts that separate blocked from stuck. Written out rather than left to a model
       that is already carrying 273 other instructions. */
    const out = whatTheRecordAlreadyHolds({
      targets: [],
      inTheWay: [{ what: 'the Sokoto lease', on: null, since: daysAgo(21), escalated: false, tried: 'asked-again' }],
      saidLastTime: [], now: NOW,
    });
    expect(out).toContain('Still unanswered about these');
    expect(out).toContain('A team is not a person');
    expect(out).toContain('taken it above them');
    expect(out).toContain('what do you do if you do not');
    expect(out).toContain('options rather than as a telling-off');
    expect(out).toContain('what can move without this');
  });

  it('asks whether last time’s promise happened before anything new', () => {
    const out = whatTheRecordAlreadyHolds({
      targets: [], inTheWay: [],
      saidLastTime: ['I will call Adeola on Monday'], now: NOW,
    });
    expect(out).toContain('ask whether it happened before asking anything new');
    expect(out).toContain('I will call Adeola on Monday');
  });

  it('is empty when the record holds none of it, rather than a heading with nothing under it', () => {
    /* A heading with nothing under it reads to a model as an absence of facts to be filled, which
       is the one thing this block must never invite. */
    expect(whatTheRecordAlreadyHolds({ targets: [], inTheWay: [], saidLastTime: [], now: NOW })).toBe('');
  });

  it('counts a thing raised today as nought days and never goes negative', () => {
    expect(daysSince(NOW, NOW)).toBe(0);
    expect(daysSince(new Date(NOW.getTime() + 60_000), NOW)).toBe(0);
    expect(WAITED_LONG_ENOUGH_TO_ASK).toBe(14);
  });
});
