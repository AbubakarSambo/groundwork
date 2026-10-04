import { theWorkByArea } from './the-work-by-area-and-by-stage';

/** Request 132 (d): "Kiambu County has 1 county on record." */
const row = (kind: string, name: string, fields: Record<string, string> = {}) => ({ kind, name, fields, id: name });
describe('the work by county, as the lead reads it', () => {
  it('does not count the county as work in the county', () => {
    const r: any = theWorkByArea([{ rows: [row('county', 'Kiambu County')] }] as any);
    expect(r.areas[0].says).not.toMatch(/1 county on record/);
    expect(r.areas[0].says).toBe('Kiambu County is on record, and no piece of work in it is on record yet.');
  });
  it('counts the projects in it', () => {
    const r: any = theWorkByArea([{ rows: [row('county', 'Kiambu County'), row('project', 'Water points', { County: 'Kiambu County' })] }] as any);
    expect(r.areas.find((a: any) => a.area === 'Kiambu County').says).toBe('Kiambu County has 1 project on record.');
  });
});
