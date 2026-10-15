import { serviceFor, theSessionReportAs, at } from './__fixtures__/sales-team-q3-two-sessions';
import { filesSentWith } from './files-sent-with-a-check-in';
import { reportAsText } from '../public-api/a-whatsapp-message-is-routed';

/**
 * B-103. Amani sent a PDF and two photos on WhatsApp during her check-in, and her own report said
 * "Nothing said this session has a document behind it." The files are kept the way an app upload is
 * (on the ground, against her, while her check-in was open), and the report now counts them. Who is
 * counted them is who may see them: her, and anybody once a file is open to the check-in.
 */
function withAmanisFiles(visibility: 'PRIVATE' | 'OPEN' = 'PRIVATE') {
  const { svc, w } = serviceFor('sales');
  for (const e of w.entries) e.recallBased = true;
  for (const c of w.checkIns) (c as any).startedAt = at(c.sessionNumber === 1 ? '25' : '29');
  const files = [
    { fileName: 'pipeline.pdf', participantId: 'p-amani', origin: 'typed', visibility, createdAt: new Date('2026-09-29T19:00:00Z') },
    { fileName: 'photo-1.jpg', participantId: 'p-amani', origin: 'photo', visibility, createdAt: new Date('2026-09-29T19:05:00Z') },
    { fileName: 'photo-2.jpg', participantId: 'p-amani', origin: 'photo', visibility, createdAt: new Date('2026-09-29T19:06:00Z') },
  ];
  const prisma = (svc as any).prisma;
  prisma.groundDocument.findMany = async ({ where }: any = {}) => files.filter((f) =>
    (!where?.participantId?.in || where.participantId.in.includes(f.participantId))
    && (!where?.OR || where.OR.some((o: any) => (o.visibility && o.visibility === f.visibility) || (o.participantId && o.participantId === f.participantId))));
  return svc;
}
const theTile = (read: any) => (read.atAGlance ?? []).find((g: any) => g.label === 'How much was said');

describe('B-103: files sent with a check-in are counted in its report', () => {
  it('Amani reads that her three files were sent, never that nothing has a document behind it', async () => {
    const read = await theSessionReportAs(withAmanisFiles(), 'u-amani', 2);
    expect(theTile(read).value).toBe('3 files sent');
    expect(theTile(read).sub).toBe("3 files were sent with this session's check-ins. Nothing said has been matched to one of them yet.");
    expect(reportAsText(read, 'Sales team, Q3')).not.toContain('Nothing said this session has a document behind it.');
  });

  it('Rukia, the lead, is counted them as she would see them: not while they are private to Amani, and yes once open', async () => {
    expect(theTile(await theSessionReportAs(withAmanisFiles('PRIVATE'), 'u-rukia', 2)).sub).toBe('Nothing said this session has a document behind it.');
    expect(theTile(await theSessionReportAs(withAmanisFiles('OPEN'), 'u-rukia', 2)).value).toBe('3 files sent');
  });

  it('a file sent outside the check-in, or by somebody else, is not counted with it', () => {
    const checkIns = [{ participantId: 'p-amani', startedAt: '2026-10-13T07:00:00Z', completedAt: '2026-10-13T08:00:00Z' }];
    expect(filesSentWith([
      { participantId: 'p-amani', createdAt: '2026-10-13T07:42:00Z' },
      { participantId: 'p-amani', createdAt: '2026-10-12T07:42:00Z' },
      { participantId: 'p-baraka', createdAt: '2026-10-13T07:42:00Z' },
    ], checkIns)).toBe(1);
  });
});
