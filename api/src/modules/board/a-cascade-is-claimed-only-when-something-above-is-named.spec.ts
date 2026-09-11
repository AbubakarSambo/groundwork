import { GroundScenario } from '@prisma/client';
import { isThisACascade, CascadeInput } from './is-this-a-cascade';

const base: CascadeInput = {
  scenario: GroundScenario.PULSE_CHECK,
  objectiveNames: ['Cut onboarding time'],
  importedWithParents: [],
  entries: [],
};

const said = (text: string, participantId = 'p1') => ({ participantId, text });

describe('a cascade is claimed only when something above is named', () => {
  it('does not claim one from the situation alone', () => {
    const r = isThisACascade({ ...base, scenario: GroundScenario.OKR_ALIGNMENT });
    expect(r.isCascade).toBe(false);
    expect(r.basis).toEqual(['DECLARED']);
  });

  it('tells a team that picked alignment and named nothing above them', () => {
    const r = isThisACascade({ ...base, scenario: GroundScenario.OKR_ALIGNMENT });
    expect(r.why).toContain('Nothing above this has been named yet');
  });

  it('claims one when somebody says what it sits under, and quotes their words', () => {
    const r = isThisACascade({
      ...base,
      entries: [said('Our two results hang under the company goal of doubling active shops.')],
    });
    expect(r.isCascade).toBe(true);
    expect(r.basis).toContain('SAID_IN_THE_CHAT');
    expect(r.parentNamed).toBe('company goal of doubling active shops');
  });

  it('claims one when the customer system recorded a parent', () => {
    const r = isThisACascade({
      ...base,
      importedWithParents: [{ title: 'Cut onboarding time', parentTitle: 'Grow net revenue 30%' }],
    });
    expect(r.isCascade).toBe(true);
    expect(r.parentNamed).toBe('Grow net revenue 30%');
  });

  it('does not read a plain objective as having something above it', () => {
    const r = isThisACascade({ ...base, entries: [said('Our objective is to cut churn to under five percent.')] });
    expect(r.isCascade).toBe(false);
    expect(r.parentNamed).toBeNull();
  });

  it('counts teams only where the sentence says the word', () => {
    const r = isThisACascade({
      ...base,
      entries: [said('The sales team and the engineering team both wrote results under this.')],
    });
    expect(r.teamsNamed.sort()).toEqual(['engineering', 'sales']);
    expect(r.basis).toContain('SEVERAL_TEAMS_NAMED');
    expect(r.isCascade).toBe(true);
  });

  it('does not name a team called "the"', () => {
    const r = isThisACascade({ ...base, entries: [said('I am on the team that owns this and so is she.')] });
    expect(r.teamsNamed).toEqual([]);
  });

  it('does not turn a capitalised name into a department', () => {
    const r = isThisACascade({ ...base, entries: [said('Ade and Maryam are both on this one.')] });
    expect(r.teamsNamed).toEqual([]);
    expect(r.isCascade).toBe(false);
  });

  it('never invents a parent when people only gesture at one', () => {
    const r = isThisACascade({ ...base, entries: [said('This is part of the wider org objective this quarter.')] });
    expect(r.isCascade).toBe(true);
    expect(r.parentNamed).toBeNull();
    expect(r.why).toContain('without naming what');
  });

  it('takes the first person who named it, not the last', () => {
    const r = isThisACascade({
      ...base,
      entries: [
        said('It rolls up to the retention goal.', 'p1'),
        said('I thought it rolled up to the growth goal.', 'p2'),
      ],
    });
    expect(r.parentNamed).toBe('retention goal');
  });

  it('refuses a fragment as a name', () => {
    const r = isThisACascade({ ...base, entries: [said('It sits under X.')] });
    expect(r.parentNamed).toBeNull();
  });
});
