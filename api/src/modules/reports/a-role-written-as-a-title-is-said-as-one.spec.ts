import { gapsOverTime, aRoleWrittenAsATitle } from './what-the-record-shows-over-time';

/**
 * A ROLE WRITTEN AS A JOB TITLE, AS THE LEAD READS IT UNDER "OVER TIME" (review of 1 October 2026).
 *
 * re-d, sales, every session, overTime.gaps[0].say: "The role written down for Femi Okonkwo is
 * Relationship officer, Lagos mainland; target 12 approved facilities this quarter." Every description
 * below is word for word one the run stored (re-d and run-21).
 */
const record = { lines: 6, checkable: 3, documented: 0, openCommitments: 2, owedToOthers: 0, sessions: 1 };

describe('a role written as a job title is said as one, in full sentences', () => {
  it('Femi Okonkwo (re-d, sales)', () => {
    const [g] = gapsOverTime([{ participantId: 'p-femi', label: 'Femi Okonkwo', expected: 'Relationship officer, Lagos mainland. Target 12 approved facilities this quarter.', ...record }]);
    expect(g.say).toBe('Femi Okonkwo is a relationship officer for Lagos mainland, with a goal of 12 approved facilities this quarter. '
      + 'Since then, the record holds 1 session, 6 lines of what was said, 3 with a name, a number or a date in them, none backed by a document and 2 commitments still open.');
  });

  it.each([
    ['Tobi Adewale', 'Engagement Director. Owns the relationships with the five largest clients.', 'Tobi Adewale is an Engagement Director. Tobi Adewale owns the relationships with the five largest clients.'],
    ['Daniel Park', 'Support team manager, six weeks in. Six direct reports.', 'Daniel Park is a support team manager, six weeks in. The role description also says "Six direct reports."'],
    ['Ruth Njeri', 'Engineer. Currently building the referral scheme.', 'Ruth Njeri is an engineer. Ruth Njeri is currently building the referral scheme.'],
    ['Amara Diallo', 'Product designer. Did the flow design.', 'Amara Diallo is a product designer. Amara Diallo did the flow design.'],
    ['Wanjiru Kariuki', 'Head of expansion. Owns the Kenya entry.', 'Wanjiru Kariuki is head of expansion. Wanjiru Kariuki owns the Kenya entry.'],
  ])('%s', (label, description, says) => {
    expect(aRoleWrittenAsATitle(label, description)).toBe(says);
  });

  it('never joins the lead\'s pieces with a semicolon, and never reads a title as a verb', () => {
    for (const d of ['Relationship officer, Ikeja. Target 14 approved facilities this quarter.', 'Support specialist. On Daniel\'s team. Was his peer.', 'Support lead. Took the customer calls.']) {
      const [g] = gapsOverTime([{ participantId: 'p', label: 'Ngozi Eze', expected: d, ...record }]);
      expect(g.say).not.toMatch(/;|is to support/);
    }
  });

  it('a title that is also the person\'s label is quoted, so the name never replaces it', () => {
    expect(aRoleWrittenAsATitle('Relationship officer', 'Relationship officer, Ikeja. Target 14 approved facilities this quarter.'))
      .toBe('Relationship officer is down as "Relationship officer" for Ikeja, with a goal of 14 approved facilities this quarter.');
  });

  it('a role that starts with what somebody is there to do keeps its sentence', () => {
    expect(aRoleWrittenAsATitle('Marcus Oyelaran', 'Build the government relationships and confirm the real approval pathway independently.')).toBeNull();
  });
});
