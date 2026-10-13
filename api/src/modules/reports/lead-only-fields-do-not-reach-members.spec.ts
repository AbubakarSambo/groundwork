import { withoutOtherPeoplesReads } from './own-reads-only';
import { WHERE_IT_BELONGS } from './the-four-reports';

/**
 * A MEMBER WAS SERVED THE LEAD-ONLY LIST OF PEOPLE CARRYING WORK QUIETLY.
 * `/grounds/:id/report` sent `engagement.hiddenContributors` to everybody, although the map in
 * the-four-reports marks it lead-only. The strip is on the server, not on the screen.
 */
const REPORT = () => ({
  engagement: {
    hiddenContributors: [
      { label: 'Head of Sales, West Africa', evidence: 'This person is waiting for the CFO to provide the group target in writing.' },
      { label: 'Ada Test', evidence: 'Referenced as carrying the renewals work for the whole quarter.' },
    ],
    parties: [{ label: 'Participant A' }],
  },
});

describe('a lead-only field is stripped on the server for a member', () => {
  it('a member is not served hiddenContributors', () => {
    const out: any = withoutOtherPeoplesReads(REPORT(), { viewerLabel: 'Participant A', viewerParticipantId: 'p-a', viewerIsLead: false });
    expect(out.engagement.hiddenContributors).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain('Head of Sales');
  });

  it('the lead keeps only who is really outside the room, by the board\'s own filter', () => {
    const out: any = withoutOtherPeoplesReads(REPORT(), { viewerLabel: null, viewerParticipantId: null, viewerIsLead: true, partyNames: ['Ada Test'] });
    expect(out.engagement.hiddenContributors.map((r: any) => r.label)).toEqual(['Head of Sales, West Africa']);
  });

  it('every lead-only field in the map that sits in engagement or at the top is gone for a member', () => {
    const leadOnly = Object.entries(WHERE_IT_BELONGS).filter(([, p]) => p.leadOnly).map(([k]) => k);
    const eng: Record<string, any> = {};
    const top: Record<string, any> = {};
    for (const k of leadOnly) { eng[k] = [{ secret: k }]; top[k] = [{ secret: k }]; }
    const out: any = withoutOtherPeoplesReads({ ...top, engagement: eng }, { viewerLabel: null, viewerParticipantId: 'p-a', viewerIsLead: false });
    for (const k of leadOnly) {
      expect(out.engagement?.[k]).toBeUndefined();
      expect(out[k]).toBeUndefined();
    }
  });
});
