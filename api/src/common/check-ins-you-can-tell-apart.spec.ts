import { labelsTheyCanTellApart, namesTheyCanTellApart } from './check-ins-you-can-tell-apart';

describe('check-ins with the same name', () => {
  it('reads a unique name exactly as before', () => {
    const said = namesTheyCanTellApart([{ id: 'a', label: 'Sales team, Q4', startedAt: new Date('2026-09-02T09:00:00Z') }, { id: 'b', label: 'Stock project' }]);
    expect(said.get('a')).toBe('Sales team, Q4');
    expect(said.get('b')).toBe('Stock project');
  });

  it('tells two of the same name apart by when each started', () => {
    const said = namesTheyCanTellApart([
      { id: 'a', label: 'Sales team, Q4', startedAt: new Date('2026-09-02T09:00:00Z') },
      { id: 'b', label: 'sales team q4', startedAt: new Date('2026-09-20T09:00:00Z') },
    ], 'UTC');
    expect(said.get('a')).toBe('Sales team, Q4, started 2 September');
    expect(said.get('b')).toBe('sales team q4, started 20 September');
  });

  it('uses who runs it when both started on the same day', () => {
    const said = namesTheyCanTellApart([
      { id: 'a', label: 'Onboarding', startedAt: new Date('2026-09-02T09:00:00Z'), leadName: 'Wairimu' },
      { id: 'b', label: 'Onboarding', startedAt: new Date('2026-09-02T15:00:00Z'), leadName: 'Baraka' },
    ], 'UTC');
    expect(said.get('a')).toBe('Onboarding, run by Wairimu, started 2 September');
    expect(said.get('b')).toBe('Onboarding, run by Baraka, started 2 September');
  });

  it('leaves the other names alone when only two share one', () => {
    const out = labelsTheyCanTellApart([
      { id: 'a', label: 'Q4', startedAt: new Date('2026-09-02T09:00:00Z') },
      { id: 'b', label: 'Q4', startedAt: new Date('2026-09-03T09:00:00Z') },
      { id: 'c', label: 'Hiring' },
    ], 'UTC').map((c) => c.label);
    expect(out).toEqual(['Q4, started 2 September', 'Q4, started 3 September', 'Hiring']);
  });
});
