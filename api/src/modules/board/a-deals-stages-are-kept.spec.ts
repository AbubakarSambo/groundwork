import { withTheStageKept, theStagesKept, theStagesOnRecord, theMovesBetween, theDayItWasWon, theStagesToKeep } from './a-deals-stages-are-kept';
import { plainFields } from './the-kind-of-work';
import { aLineNamesTheCustomer } from './one-deal-per-customer';
import { notAnsweringSince } from './a-deal-that-has-stalled';

/**
 * EACH STAGE A DEAL IS PUT AT IS KEPT, WITH ITS DAY (Drop Access, 17 October 2026), so the weekly report can say how many deals
 * moved stage this week, and never makes a move up.
 */
const MON = new Date('2026-10-12T15:00:00Z');
const WED = new Date('2026-10-14T15:00:00Z');
const FRI = new Date('2026-10-16T15:00:00Z');

describe('a deal\'s stages, kept with their days', () => {
  it('keeps a stage only when the deal was not already at it', () => {
    let f = withTheStageKept({ Units: '6' }, 'Contacted', MON, 'check-in');
    f = withTheStageKept(f, 'contacted', WED, 'check-in');
    f = withTheStageKept(f, 'Quoted', WED, 'board');
    expect(theStagesKept(f).map((s) => `${s.stage} ${s.by}`)).toEqual(['Contacted check-in', 'Quoted board']);
  });

  it('is never served as one of the deal\'s details', () => {
    const f = withTheStageKept({ Units: '6', Contact: 'Jane' }, 'Quoted', WED, 'check-in');
    expect(plainFields(f)).toEqual({ Units: '6', Contact: 'Jane' });
  });

  it('a deal kept before its stages were is kept first at where it stood, so the move from it counts', () => {
    const f = withTheStageKept({}, 'Quoted', WED, 'check-in', { stage: 'Contacted', since: MON });
    const stages = theStagesKept(f);
    expect(stages.map((s) => s.stage)).toEqual(['Contacted', 'Quoted']);
    expect(stages[0].asOf).toBe(true);
    expect(theMovesBetween(stages, MON, FRI)).toHaveLength(1);
  });

  it('a deal with no stages kept has no move on record, only where it stands', () => {
    const stages = theStagesOnRecord({ stage: 'Won', stagesKept: [], stageSaidOn: WED, firstOnRecordAt: MON });
    expect(theMovesBetween(stages, MON, FRI)).toEqual([]);
    expect(theDayItWasWon(stages, 'Won')).toEqual(WED);
  });

  it('the day a deal was won is the first day the record shows it at the last stage', () => {
    let f = withTheStageKept({}, 'Quoted', MON, 'check-in');
    f = withTheStageKept(f, 'Won', WED, 'check-in');
    expect(theDayItWasWon(theStagesKept(f), 'Won')).toEqual(WED);
    expect(theDayItWasWon(theStagesKept(withTheStageKept(f, 'Quoted', FRI, 'board')), 'Won')).toBeNull();
  });

  it('is carried over when the deal\'s details are written again', () => {
    const f = withTheStageKept({ Units: '6' }, 'Quoted', WED, 'check-in');
    expect({ Units: '7', ...theStagesToKeep(f) }).toEqual({ Units: '7', _stages: theStagesKept(f) });
  });
});

describe('a short name is not another customer whose name starts the same way', () => {
  it('"Mama Pima" is not Mama Mboga Mart, and "Kilele M-Pesa" is still Kilele Hotel', () => {
    expect(aLineNamesTheCustomer('Mama Pima hasn\'t replied since Monday.', 'Mama Mboga Mart')).toBe(false);
    expect(aLineNamesTheCustomer('Mama Pima hasn\'t replied since Monday.', 'Mama Pima Stores')).toBe(true);
    expect(aLineNamesTheCustomer('Kilele M-Pesa came in for 200,000.', 'Kilele Hotel')).toBe(true);
    expect(aLineNamesTheCustomer('Kilele 40 units, paid.', 'Kilele Hotel')).toBe(true);
  });

  it('so Mama Mboga Mart has not stalled because Mama Pima did not answer', () => {
    const lines = [{ text: 'Mama Pima hasn\'t replied since Monday.', createdAt: new Date('2026-10-13T15:00:00Z') }];
    expect(notAnsweringSince('Mama Mboga Mart', lines)).toBeNull();
    expect(notAnsweringSince('Mama Pima Stores', lines)).not.toBeNull();
  });
});
