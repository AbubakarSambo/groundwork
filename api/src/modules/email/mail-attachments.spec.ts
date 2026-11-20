import { EmailService } from './email.service';
import { ATTACHMENT_LIMITS, whyTheseCannotGo } from './attachments';
import { ROUTINE_EMAILS } from '../engagement/one-routine-message-a-day';
import { whatThisMailIs } from './nothing-goes-out-that-was-turned-off';
import { aRichTable } from '../year-end/a-year-end-world-for-specs';

const sendMail = jest.fn(async (_m: any) => ({}));
jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: (m: any) => (sendMail as any)(m) }) }));

/**
 * A MAIL CAN CARRY FILES, AT THE ONE DOOR (Fatima, increment 4). What the mail catcher receives, what a held mail keeps, what is refused, and what
 * the same send key does twice. The service is the real one; the database is a small in-memory one that refuses a key twice the way Postgres does.
 */
const PDF = Buffer.from('%PDF-1.4 a small file');
const DOCX = Buffer.from('PK a small file');

function aMailService(opts: { quiet?: boolean } = {}) {
  const outbox = aRichTable([['key']], 'ob');
  const scheduled = aRichTable([], 'se');
  const log = aRichTable([['principalUserId', 'kind', 'subject']], 'yl');
  const notes: any[] = [];
  const prisma: any = new Proxy({
    outboxClaim: outbox, scheduledEmail: scheduled, yearEndLog: log,
    notification: { create: async ({ data }: any) => { notes.push(data); return data; }, findMany: async () => [] },
    person: { findMany: async () => [], findFirst: async () => (opts.quiet ? { organizationId: 'org-1', externalId: 'p-fatima', timezone: 'Africa/Lagos' } : null) },
    emailPreference: { findUnique: async () => null },
  }, { get: (t: any, k: string) => t[k] ?? new Proxy({}, { get: () => async () => null }) });
  const mail = new EmailService({ get: () => undefined } as any, { recordSend: async () => undefined } as any, prisma);
  return { mail, prisma, log, scheduled, notes };
}
const KEY = 'year-end:u-fatima:2026:v1:draft:fatima@example.com';
const queued = (log: any) => log.create({ data: { organizationId: 'org-1', principalUserId: 'u-fatima', kind: 'queued', subject: KEY, version: 1, recipient: 'fatima@example.com' } });
const files = () => [{ filename: '2026-year-end-report-v1-draft.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', content: DOCX }, { filename: '2026-year-end-report-v1-draft.pdf', contentType: 'application/pdf', content: PDF }];

beforeEach(() => { sendMail.mockClear(); jest.useRealTimers(); });

describe('files reach the mail catcher, whole', () => {
  it('carries each file with its name, type and bytes, and records "sent" against the send key', async () => {
    const { mail, log } = aMailService();
    await queued(log);
    const outcome = await mail.sendTheYearEndFiles('fatima@example.com', 'Your year-end report and presentation are ready for review', 'Hello Fatima,\n\nI have attached both files.', files(), KEY);
    expect(outcome).toBe('sent');
    const sent = sendMail.mock.calls[0][0];
    expect(sent.to).toBe('fatima@example.com');
    expect(sent.attachments.map((a: any) => [a.filename, a.contentType, a.content.length])).toEqual([['2026-year-end-report-v1-draft.docx', files()[0].contentType, DOCX.length], ['2026-year-end-report-v1-draft.pdf', 'application/pdf', PDF.length]]);
    expect(sent.attachments[1].content.equals(PDF)).toBe(true);
    expect(log.rows.map((r: any) => r.kind)).toEqual(['queued', 'sent']);
  });

  it('a mail with no files carries none, as every other mail always has', async () => {
    const { mail } = aMailService();
    await mail.sendTheYearEndProgress('fatima@example.com', 'More records for your year-end work', 'Hello Fatima,');
    expect(sendMail.mock.calls[0][0].attachments).toBeUndefined();
  });
});

describe('a held mail keeps its files, and sends the same ones when its moment comes', () => {
  it('held for quiet hours, the files are in the held row; released, they go out byte for byte and "sent" is recorded then, not before', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-11T01:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] });
    const { mail, log, scheduled } = aMailService({ quiet: true });
    await queued(log);
    expect(await mail.sendTheYearEndFiles('fatima@example.com', 'Ready', 'Hello Fatima,', files(), KEY)).toBe('held');
    expect(sendMail).not.toHaveBeenCalled();
    expect(log.rows.map((r: any) => r.kind)).toEqual(['queued']);
    const row = scheduled.rows[0];
    expect(row.context).toMatchObject({ sendKey: KEY });
    expect(row.attachments.map((a: any) => a.filename)).toEqual(files().map((f) => f.filename));
    expect(Buffer.from(row.attachments[1].contentBase64, 'base64').equals(PDF)).toBe(true);
    await mail.deliverHeld(row as any);
    expect(sendMail.mock.calls[0][0].attachments[1].content.equals(PDF)).toBe(true);
    expect(log.rows.map((r: any) => r.kind)).toEqual(['queued', 'sent']);
  });
});

describe('the same send key goes once', () => {
  it('a second mail for the same job, version and person is not sent, whatever the day', async () => {
    const { mail, log } = aMailService();
    await queued(log);
    expect(await mail.sendTheYearEndFiles('fatima@example.com', 'Ready', 'Hello Fatima,', files(), KEY)).toBe('sent');
    expect(await mail.sendTheYearEndFiles('fatima@example.com', 'Ready', 'Hello Fatima,', files(), KEY)).toBe('suppressed');
    jest.useFakeTimers({ now: new Date(Date.now() + 3 * 86_400_000), doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] });
    expect(await mail.sendTheYearEndFiles('fatima@example.com', 'Ready', 'Hello Fatima,', files(), KEY)).toBe('suppressed');
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('a new version is a new key and goes', async () => {
    const { mail } = aMailService();
    await mail.sendTheYearEndFiles('fatima@example.com', 'Ready', 'Hello Fatima,', files(), KEY);
    await mail.sendTheYearEndFiles('fatima@example.com', 'Ready again', 'Hello Fatima,', files(), KEY.replace(':v1:', ':v2:'));
    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});

describe('what a mail may carry is explicit, and a mail that breaks it is refused whole', () => {
  it('states the limits', () => {
    expect(ATTACHMENT_LIMITS).toEqual({ maxFiles: 8, maxBytesEach: 8 * 1024 * 1024, maxBytesTotal: 20 * 1024 * 1024, allowedExtensions: ['docx', 'pdf', 'pptx', 'xlsx', 'csv', 'txt'] });
  });

  it('says why, in a sentence, for too many files, a kind that is not ours, a path in a name, and a file or a total that is too big', () => {
    const f = (filename: string, n = 1) => ({ filename, contentType: 'x', content: Buffer.alloc(n) });
    expect(whyTheseCannotGo(Array.from({ length: 9 }, (_, i) => f(`a${i}.pdf`)))).toBe('A mail may carry at most 8 files, and this one has 9.');
    expect(whyTheseCannotGo([f('run.exe')])).toBe('The file "run.exe" is not a kind that can be mailed. Only docx, pdf, pptx, xlsx, csv, txt files can.');
    expect(whyTheseCannotGo([f('../secret.pdf')])).toBe('The file name "../secret.pdf" is not allowed.');
    expect(whyTheseCannotGo([f('big.pdf', 8 * 1024 * 1024 + 1)])).toBe('The file "big.pdf" is larger than 8 MB, which is the most one file in a mail may be.');
    expect(whyTheseCannotGo([f('a.pdf', 7_000_000), f('b.pdf', 7_000_000), f('c.pdf', 7_000_000)])).toBe('The files together are larger than 20 MB, which is the most one mail may carry.');
    expect(whyTheseCannotGo([f('ok.pdf'), f('ok.xlsx')])).toBeNull();
    expect(whyTheseCannotGo(undefined)).toBeNull();
  });

  it('a mail with a file that may not go is not sent without it: it is refused, and written down as failed', async () => {
    const { mail, notes } = aMailService();
    await expect(mail.sendTheYearEndFiles('fatima@example.com', 'Ready', 'Hello Fatima,', [{ filename: 'run.exe', contentType: 'x', content: DOCX }], KEY)).rejects.toThrow('is not a kind that can be mailed');
    expect(sendMail).not.toHaveBeenCalled();
    expect(notes.slice(-1)[0]).toMatchObject({ outcome: 'failed', sender: 'sendTheYearEndFiles' });
  });
});

describe('what kind of mail each is, so the one door treats it right', () => {
  it('the files are asked for, never the day\'s routine message; a progress note is Groundwork deciding to send, and counts', () => {
    expect(whatThisMailIs('sendTheYearEndFiles')).toBe('asked for');
    expect(ROUTINE_EMAILS.has('sendTheYearEndFiles')).toBe(false);
    expect(whatThisMailIs('sendTheYearEndProgress')).toBe('we decided to send it');
    expect(ROUTINE_EMAILS.has('sendTheYearEndProgress')).toBe(true);
  });
});
