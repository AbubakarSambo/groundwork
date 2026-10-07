import { ReportsService } from './reports.service';

/**
 * The anchor's lead has a set-up conversation, not a check-in. It was read as a work account, and her
 * own coaching said "Everything in your session came from memory". A person whose only conversation is
 * a set-up gets no coaching note about it.
 */
describe('a set-up conversation is not read as a check-in by the coaching note', () => {
  const service = Object.create(ReportsService.prototype) as any;
  const held = (sessions: any[]) => ({ entries: [{ participantId: 'p1', text: 'x', recallBased: true }], sessions, dependencies: [], detections: [] });
  const ground = { scenario: 'HELP_TEAM_UNDERSTAND', participants: [], checkIns: [] };

  it('gives no note when her only conversation is a set-up', async () => {
    service.whatTheRecordHoldsFor = async () => held([{ participantId: 'p1', sessionNumber: 1, isSetup: true }]);
    expect(await service.coachingNoteFor('g1', ground, { id: 'p1' }, () => null)).toBeNull();
  });
});
