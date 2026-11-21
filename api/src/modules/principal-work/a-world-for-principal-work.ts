/**
 * THE WORLD THE TESTS OF THE PAYMENTS, THE ASSEMBLY, THE VOICE AND THE BRIEFINGS RUN IN (Fatima, increment 6b). It is the year-end world (Fatima, her
 * people, a draft that can be made) with the tables this work writes added, a finance coordinator she has named and introduced, a Managing Director on the
 * roster, mail and WhatsApp that write down exactly what a person would have read, and a clock the test moves. Nothing here reaches a provider or a model.
 */
const XLSX = require('xlsx') as typeof import('xlsx');
import { aYearEndWorld, aRichTable } from '../year-end/a-world-for-the-year-end';
import { handleTheDraftWords } from '../year-end/year-end.service';
import { grantADelegate } from '../outstanding/a-delegate-acts-for-a-principal';
import { keepWhatWasForwarded, type AnArrival, type TheIntakePorts } from '../executive-onboarding/the-intake';
import { PrincipalWork, type TheWorkPorts } from './principal-work';
import { readerWithoutAModel, type TheWorkReader } from './the-work-reader';
import { theAskWent } from '../executive-onboarding/information-gaps';

export const NOW = new Date('2026-11-10T09:00:00Z');
export const DAY = 86_400_000;
export const REPLY_TO = 'assistant+dangote-abuja@myground.work';
export const fatima = { userId: 'u-fatima', isPrincipal: true };
export const amina = { userId: 'u-amina', isPrincipal: false };

export interface ASent { via: 'reply' | 'ask' | 'whatsapp'; to: string; subject?: string; text: string }

/** The same text the one reader gives an upload: a sheet is "--- Sheet: Name ---" and then its rows as CSV. */
export const sheetAsText = (rows: (string | number)[][], name = 'Payments'): string => `--- Sheet: ${name} ---\n${XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows)).trim()}`;
export const anXlsx = (rows: (string | number)[][], name = 'Payments'): Buffer => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name); return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }); };

export function aWorldForPrincipalWork(now: Date = NOW, over: { reader?: TheWorkReader } = {}) {
  const w = aYearEndWorld(now);
  const t: any = w.t;
  t.principalSetup = aRichTable([], 'ps');
  t.principalSetup.rows.push({ id: 'ps-1', organizationId: w.ORG, principalUserId: 'u-fatima', email: 'fatima@example.com', whatsappNumber: '+2348012345678', verifiedVia: 'reply', preferences: { channel: 'both', quietBeforeHour: 7, quietAfterHour: 20 }, permissions: { dataHandling: true, teamOutreach: true, confidentialInformation: true, messaging: true }, addedByUserId: 'u-grace', createdAt: new Date(now.getTime() - 40 * DAY), updatedAt: now });
  t.outreachContact = aRichTable([], 'oc');
  t.outreachContact.rows.push({ id: 'oc-ngozi', organizationId: w.ORG, principalUserId: 'u-fatima', name: 'Ngozi Eze', email: 'ngozi@example.com', phone: '+2348099990000', contactKey: 'ngozi@example.com', kind: 'team', state: 'introduced', personId: null, proposedAt: now, introducedAt: now });
  t.intakeBatch = aRichTable([], 'ib');
  t.principalMaterial = aRichTable([], 'pm');
  t.informationGap = aRichTable([['principalUserId', 'gapKey', 'askedOfEmail']], 'ig');
  t.paymentTrackerLine = aRichTable([['principalUserId', 'lineKey']], 'pl');
  t.weeklyDigest = aRichTable([['principalUserId', 'institution', 'weekKey']], 'wd');
  t.spendRequest = aRichTable([], 'sr');
  t.report = aRichTable([], 'rp');
  t.person.rows.push({ id: 'pid-md', organizationId: w.ORG, externalId: 'p-md', linkedUserId: null, active: true, email: 'md@example.com', givenName: 'Musa', familyName: 'Bello', displayName: 'Musa Bello', title: 'Managing Director', userName: 'musa.bello' });

  const sent: ASent[] = [];
  const mode = { whatsapp: true, mail: 'sent' as 'sent' | 'held' | 'suppressed' };
  const ports: TheWorkPorts = {
    email: {
      reply: async (a) => { if (mode.mail === 'suppressed') return 'suppressed'; sent.push({ via: 'reply', to: a.to, subject: a.subject, text: a.text }); return mode.mail; },
      /* As the one door does: what the mail asks is marked asked only when it goes. */
      ask: async (a) => { if (mode.mail === 'suppressed') return 'suppressed'; sent.push({ via: 'ask', to: a.to, subject: a.subject, text: a.text }); if (mode.mail === 'sent') await theAskWent(w.prisma, a.askKey, w.clock.now); return mode.mail; },
    },
    whatsapp: { send: async (a) => { if (!mode.whatsapp) return { sent: false, error: 'not sent' }; sent.push({ via: 'whatsapp', to: a.phone, text: a.text }); return { sent: true }; } },
  };
  const yearEnd = { handle: (a: { organizationId: string; userId: string; message: string; channel: string; now?: Date }) => handleTheDraftWords(w.prisma, w.ports, { ...a, now: a.now ?? w.clock.now, replyTo: REPLY_TO }) };
  const reader = over.reader ?? readerWithoutAModel;
  const waitingList: { ref: string; firstName: string; thing: string }[] = [];
  const work = new PrincipalWork({ prisma: w.prisma, ports, yearEnd, reader, replyTo: async () => REPLY_TO, waitingForHer: async () => waitingList });

  /* The intake as production has it: sheets are read to text the way an upload is read, a voice note by whatever the test says it heard. */
  const intake: TheIntakePorts = {
    transcriber: { transcribe: async (a: any) => (String(a.buffer).startsWith('UNCLEAR:') ? { ok: true, text: String(a.buffer).slice(8), unclear: [{ heard: 'March' }] } : String(a.buffer).startsWith('SILENCE') ? { ok: false } : { ok: true, text: String(a.buffer).replace(/^VOICE:/, ''), unclear: [] }) } as any,
    read: async (f) => {
      if (/\.xlsx$/i.test(f.fileName)) { const wb = XLSX.read(f.bytes, { type: 'buffer' }); return { text: wb.SheetNames.map((n) => `--- Sheet: ${n} ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[n]).trim()}`).join('\n\n') }; }
      return { text: f.bytes.toString('utf8') };
    },
  };
  let n = 0;
  const forward = async (a: { from?: 'principal' | 'amina' | 'ngozi'; subject?: string; body?: string; at?: Date; files?: { fileName: string; mimeType: string; bytes: Buffer }[] }) => {
    const at = a.at ?? w.clock.now;
    const from = a.from ?? 'principal';
    const arrival: AnArrival = from === 'ngozi'
      ? { organizationId: w.ORG, principalUserId: 'u-fatima', fromUserId: 'contact:oc-ngozi', fromAddress: 'ngozi@example.com', channel: 'email', providerId: `m-${++n}`, subject: a.subject ?? null, body: a.body ?? null, receivedAt: at, files: a.files ?? [], beyondTheLimit: 0, now: at }
      : { organizationId: w.ORG, principalUserId: 'u-fatima', fromUserId: from === 'amina' ? 'u-amina' : 'u-fatima', fromAddress: from === 'amina' ? 'amina@example.com' : 'fatima@example.com', channel: 'email', providerId: `m-${++n}`, subject: a.subject ?? null, body: a.body ?? null, receivedAt: at, files: a.files ?? [], beyondTheLimit: 0, now: at };
    return keepWhatWasForwarded(w.prisma, intake, arrival);
  };
  const afterQuiet = (from: Date = w.clock.now) => new Date(from.getTime() + 4 * 60_000);
  const withAmina = () => grantADelegate(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', delegateName: 'Amina Yusuf', delegateUserId: 'u-amina', via: 'chat' });
  return { ...w, t, sent, mode, ports, yearEndPorts: w.ports, waitingList, work, yearEnd, reader, intake, forward, afterQuiet, withAmina, now };
}

export const read = (sent: ASent[]) => sent.map((m) => `[${m.via} to ${m.to}${m.subject ? `, subject: ${m.subject}` : ''}]\n${m.text}`).join('\n\n');
