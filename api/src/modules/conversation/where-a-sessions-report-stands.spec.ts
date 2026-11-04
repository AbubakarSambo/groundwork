import { ConversationService } from './conversation.service';
import { whereASessionsReportStands } from './where-a-sessions-report-stands';

describe('a session’s own report, as the person reads it', () => {
  it('a finished session with no report says it was not kept, instead of leaving the page waiting', () => {
    expect(whereASessionsReportStands({ report: null, finishedAt: new Date() })).toEqual({
      state: 'not-kept',
      says: 'No report was kept for this session. What you said is below.',
    });
  });
  it('an open session and a kept report say so too', () => {
    expect(whereASessionsReportStands({ report: null, finishedAt: null }).state).toBe('open');
    expect(whereASessionsReportStands({ report: { a: 1 }, finishedAt: new Date() }).state).toBe('ready');
  });
  it('the route serves that state beside the report, for a finished session whose report was never written', async () => {
    const svc: any = Object.create(ConversationService.prototype);
    svc.loadOwnedCheckIn = async () => ({ id: 'c1' });
    svc.prisma = { checkIn: { findUnique: async () => ({ sessionReport: null, completedAt: new Date('2026-10-08T10:00:00Z'), sessionNumber: 1, groundId: 'g1', participant: { partyType: 'MEMBER' } }) } };
    const out = await svc.getSessionReport('c1', 'u1');
    expect(out.report).toBeNull();
    expect(out.state).toBe('not-kept');
    expect(out.says).toBe('No report was kept for this session. What you said is below.');
  });
});
