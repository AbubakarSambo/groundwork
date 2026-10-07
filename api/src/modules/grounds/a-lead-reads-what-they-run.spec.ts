import { whatTheyMayRead, leadsTheSameDepartment, groundsAViewerMayList } from './who-may-read-this-check-in';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A LEAD READS WHAT THEY RUN, AND THE SHARED LEVEL OF WHAT THEIR DEPARTMENT RUNS. LEAD was a role
 * consulted in two places, neither a read; a lead could not see their own team's check-ins unless
 * they happened to have started them. Blank departments never match: no department is no scope.
 */
const checkIn = { organizationId: 'org', scenario: 'NEW_PROJECT' as const, initiatorId: 'other-lead', participants: [], leadDepartment: 'Finance' };

describe('a lead', () => {
  it('reads at lead on what they run, whatever their department', () => {
    expect(whatTheyMayRead('me', { role: 'LEAD', organizationId: 'org', department: null }, { ...checkIn, initiatorId: 'me' })).toBe('lead');
  });
  it('reads at shared on a check-in run by a lead of their own department, and nothing on another department\'s', () => {
    expect(whatTheyMayRead('me', { role: 'LEAD', organizationId: 'org', department: 'Finance' }, checkIn)).toBe('shared');
    expect(whatTheyMayRead('me', { role: 'LEAD', organizationId: 'org', department: 'Sales' }, checkIn)).toBeNull();
  });
  it('a blank department is nobody\'s, on either side', () => {
    expect(leadsTheSameDepartment({ role: 'LEAD', organizationId: 'org', department: '' }, { ...checkIn, leadDepartment: '' })).toBe(false);
    expect(leadsTheSameDepartment({ role: 'LEAD', organizationId: 'org', department: null }, checkIn)).toBe(false);
    expect(leadsTheSameDepartment({ role: 'LEAD', organizationId: 'org', department: 'Finance' }, { ...checkIn, leadDepartment: null })).toBe(false);
  });
  it('a MEMBER in the same department gets nothing from it; the grant is the role\'s', () => {
    expect(whatTheyMayRead('me', { role: 'MEMBER', organizationId: 'org', department: 'Finance' }, checkIn)).toBeNull();
  });
  it('and the list carries the department\'s leads for a LEAD only', () => {
    const asLead = groundsAViewerMayList('me', { role: 'LEAD', organizationId: 'org' }, 'org', ['l1', 'l2']) as any;
    /* Updated in the privacy sweep: the department's leads, except for the evaluation check-ins they run (decision 75, item 25). */
    expect(asLead.OR).toContainEqual({ initiatorId: { in: ['l1', 'l2'] }, scenario: { notIn: expect.arrayContaining(['PIP', 'NEW_HIRE']) } });
    const asMember = groundsAViewerMayList('me', { role: 'MEMBER', organizationId: 'org' }, 'org', ['l1']) as any;
    expect(JSON.stringify(asMember)).not.toContain('l1');
  });
  it('the schema note that a LEAD inherits nothing now names this one read', () => {
    /* The note IS a comment, so it is read as one: the doc lines on the LEAD value, not the stripped source. */
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '');
    const schema = strip(readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma'), 'utf8'));
    const leadNote = schema.split('\n').filter((l) => l.trim().startsWith('///')).join('\n');
    expect(leadNote).toMatch(/fix plan E5, amending/);
    expect(leadNote).toContain('who-may-read-this-check-in.ts');
  });
});
