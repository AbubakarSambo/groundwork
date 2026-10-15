import { ReportsService } from './reports.service';
import { whatAParticipantMayRead } from './the-judgement-is-the-leads';
import { findingsWithoutTheirLabels } from './a-finding-is-served-without-its-label';
import { GroundScenario, PartyType } from '@prisma/client';

/**
 * A FINDING IS SERVED WITHOUT ITS LABEL, FOR EVERY READER.
 *
 * Run 10 of the twenty-four scenarios served `"label": "the initiator"` and `"label": "Participant
 * A"` beside every finding, in the lead's report and in each participant's own: 113 of the 114
 * internal labels anybody was handed. Asserted on what comes out of `theReportAsItWasShared`, the
 * door every report and board read goes through, as the lead and as a participant, with the same
 * pattern `tools/score_run.py` counts.
 */

/* tools/score_run.py, PROBLEMS["internal labels shown ..."], the same regular expression. */
const INTERNAL_LABELS = /\b(the initiator|The initiator|Participants? [A-Z](?:, [A-Z])*(?:,? and [A-Z])?\b|the person who set this up)/;

const at = (d: number) => new Date(`2026-09-0${d}T09:00:00Z`);
const LEAD = { id: 'p-lead', partyType: PartyType.INITIATOR, roleAsDescribed: null, email: 'bisi@bank.test', createdAt: at(1), user: { firstName: 'Bisi', lastName: 'Adeyemi' } };
const NGOZI = { id: 'p-ngozi', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'ngozi@bank.test', createdAt: at(2), user: { firstName: 'Ngozi', lastName: 'Eze' } };

const STORED = {
  sharedAs: null,
  sharedPicture: 'Two people have checked in.',
  findings: [
    { text: 'The initiator says the target is eight renewals a quarter.', label: 'the initiator', hasGap: false, headline: null, participantId: 'p-lead' },
    { text: 'Participant A says the target was five for the first quarter.', label: 'Participant A', hasGap: true, headline: null, participantId: 'p-ngozi' },
  ],
};
const ground = (): any => ({ scenario: GroundScenario.PULSE_CHECK, peersVisibleToEachOther: true, participants: [LEAD, NGOZI], report: STORED });
const readAs = (participantId: string | null, isLead: boolean) =>
  (Object.create(ReportsService.prototype) as ReportsService).theReportAsItWasShared(ground(), participantId, isLead) as any;

describe('a finding is served without its label', () => {
  it('the lead reads each finding named, and no label beside it', () => {
    const served = readAs('p-lead', true);
    expect(served.findings).toEqual([
      { text: 'You say the target is eight renewals a quarter.', hasGap: false, headline: null, participantId: 'p-lead' },
      { text: 'Ngozi Eze says the target was five for the first quarter.', hasGap: true, headline: null, participantId: 'p-ngozi' },
    ]);
    expect(JSON.stringify(served.findings)).not.toMatch(INTERNAL_LABELS);
  });

  it('a participant reads only their own finding, named, and no label beside it', () => {
    const served = whatAParticipantMayRead(readAs('p-ngozi', false), { isLead: false, participantId: 'p-ngozi' }) as any;
    expect(served.findings).toEqual([
      { text: 'You say the target was five for the first quarter.', hasGap: true, headline: null, participantId: 'p-ngozi' },
    ]);
    expect(JSON.stringify(served.findings)).not.toMatch(INTERNAL_LABELS);
  });

  it('the stored row keeps its labels: they come off at the read, not at the write', () => {
    readAs('p-lead', true);
    expect(STORED.findings.map((f) => f.label)).toEqual(['the initiator', 'Participant A']);
    const copy = findingsWithoutTheirLabels(STORED);
    expect(copy).not.toBe(STORED);
    expect(STORED.findings[0]).toHaveProperty('label', 'the initiator');
  });

  it('leaves a report with no findings exactly as it was', () => {
    const r = { sharedPicture: 'x' };
    expect(findingsWithoutTheirLabels(r)).toBe(r);
    expect(findingsWithoutTheirLabels(null)).toBeNull();
  });
});
