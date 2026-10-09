import { ReportsService } from './reports.service';

/** B-164: a lead who had not checked in read "Everything in your session came from memory", "This is session 1 of 6 of your work as head of sales" and "Nothing here says what kind of work this is". */
describe('the coaching note before there is a session', () => {
  const service = Object.create(ReportsService.prototype) as any;
  const ground = { scenario: 'HELP_TEAM_UNDERSTAND', participants: [], checkIns: [], timelineDays: 84, cadence: 'WEEKLY' };
  it('says nothing about a session, a role or a record for somebody with no completed check-in', async () => {
    service.whatTheRecordHoldsFor = async () => ({ entries: [], sessions: [], dependencies: [], detections: [] });
    const note = await service.coachingNoteFor('g1', ground, { id: 'p1', roleAsDescribed: 'Head of sales' }, () => null);
    expect(note.whyItMatters).toBe('You have not checked in yet, so there is nothing to say about your session.');
    expect(note.beforeNextTime).toEqual(['When you check in, say one thing you did, with the date and who else was involved.']);
    expect(note.aboutYou).toEqual([]);
    expect(note.role).toBeNull();
    expect(note.whyNoRoleMap).toBeNull();
    expect(JSON.stringify(note)).not.toMatch(/came from memory|session 1 of|what kind of work/i);
  });
});
