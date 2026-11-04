import { ReportsService } from '../reports/reports.service';

/**
 * HEARING WHAT SOMEBODY SAYS THEY HAVE DONE.
 *
 * Progress only existed if somebody typed it into a form, so a person could describe two proposals
 * at length in their check-in and the record would still say nothing had been done.
 *
 * That made the report unfair, not just thin: the reading that "the agreed thing is not being done"
 * rests on nothing being recorded as done, so an empty progress list turned every passed date into
 * that reading - for somebody who had been getting on with it and saying so.
 *
 * Changed 2 November 2026: a separate model read (extractProgress) filed a check-in's progress against
 * an aim. The conversation's assessment already puts every line of progress on the record (work that
 * moved, figures that changed, what happened to a promise), so the report reads that record, with
 * what they added themselves. This now checks what the report says, for both cases.
 */
const AN_AIM_PAST_ITS_DATE = { participantId: 'ed', text: 'Get three proposals out', dueDate: new Date(Date.UTC(2026, 9, 1)), dueSaid: 'by 1 October', status: 'OPEN', seenBySubject: true, awareness: 'TOLD', kind: 'TARGET' };

async function whatTheReportSays(progressOnTheRecord: { participantId: string; text: string }[], addedThemselves: { participantId: string; text: string }[] = []) {
  const prisma: any = {
    personObjective: { findMany: async () => [AN_AIM_PAST_ITS_DATE] },
    groundDependency: { findMany: async () => [] },
    delivery: { findMany: async () => addedThemselves },
    recordEntry: { findMany: async (a: any) => (a.where.type === 'PROGRESS' ? progressOnTheRecord : []) },
    checkIn: { findMany: async () => [] },
    ground: { findUnique: async () => ({ organizationId: 'org' }) },
    interaction: { findMany: async () => [] },
    productMetric: { findMany: async () => [] },
  };
  const svc = Object.create(ReportsService.prototype) as any;
  svc.prisma = prisma;
  svc.logger = { log: () => {}, warn: () => {} };
  return svc.whatTheRecordShows('g1', new Map([['ed', 'Ed']])) as Promise<string>;
}

describe('what they said they did', () => {
  it('is read from the record their check-in wrote, so a passed date with work said is late, not untouched', async () => {
    const says = await whatTheReportSays([{ participantId: 'ed', text: 'Sent two of the three proposals to Bayer on Tuesday.' }]);
    expect(says).toContain('Ed: "Get three proposals out".');
    expect(says).toContain('there is progress recorded against it, so this is late rather than untouched');
    expect(says).not.toContain('Nothing has been recorded as done');
  });

  it('counts what they added themselves too', async () => {
    const says = await whatTheReportSays([], [{ participantId: 'ed', text: 'Sent two proposals' }]);
    expect(says).toContain('late rather than untouched');
  });

  it('and says nothing has been recorded as done only when nothing has', async () => {
    const says = await whatTheReportSays([]);
    expect(says).toContain('Nothing has been recorded as done either, which is worth asking about directly.');
  });

  it('never counts somebody else\'s progress as theirs', async () => {
    const says = await whatTheReportSays([{ participantId: 'amina', text: 'Closed the Bayer deal.' }]);
    expect(says).toContain('Nothing has been recorded as done either');
  });
});
