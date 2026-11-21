/**
 * THE SYNTHETIC WORLD THE YEAR-END TESTS RUN IN (Fatima, increment 4). Fatima's organisation from the outstanding tests, with the tables the year-end
 * work writes (drafts, the log, recipients), a mail port and a WhatsApp port that are the local fakes (they keep what was sent, with the files), and a
 * clock the test moves. The mail port does what the one door does: it records "sent" when the mail goes, and "held" when told to hold, so the
 * states are the ones production writes.
 */
import { anOrganisationForAnExecutive, aTable, ORG } from '../outstanding/an-organisation-for-an-executive';
import { markTheYearEndFilesSent } from './the-year-end-log';
import { giveTheAskBack, theAskWent } from '../executive-onboarding/information-gaps';
import { whyTheseCannotGo, type AnAttachment } from '../email/attachments';
import type { OwnerPorts } from './the-year-end-owner';

type Row = Record<string, any>;

function matchesRich(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => {
    if (k === 'OR') return (v as Row[]).some((w) => matchesRich(row, w));
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      if ('in' in v) return (v as any).in.includes(row[k]);
      if ('notIn' in v) return !(v as any).notIn.includes(row[k]);
      if ('not' in v) return row[k] !== (v as any).not;
      if ('gte' in v) return row[k] != null && new Date(row[k]).getTime() >= new Date((v as any).gte).getTime();
      if ('lte' in v) return row[k] != null && new Date(row[k]).getTime() <= new Date((v as any).lte).getTime();
      if ('contains' in v) return String(row[k] ?? '').includes((v as any).contains);
      if ('startsWith' in v) return String(row[k] ?? '').startsWith((v as any).startsWith);
      if ('path' in v) return (row[k] ?? {})[(v as any).path[0]] === (v as any).equals;
      return matchesRich(row, v as Row);
    }
    return (row[k] ?? null) === (v ?? null);
  });
}

export function aRichTable(unique: string[][] = [], idPrefix = 'x') {
  const rows: Row[] = [];
  let n = 0;
  const sorted = (xs: Row[], orderBy: any) => {
    if (!orderBy) return xs;
    const [[key, dir]] = Object.entries(orderBy) as [string, string][];
    return [...xs].sort((a, b) => (new Date(a[key]).getTime() - new Date(b[key]).getTime() || (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0)) * (dir === 'desc' ? -1 : 1));
  };
  const table = {
    rows,
    findMany: async (a: any = {}) => sorted(rows.filter((r) => matchesRich(r, a.where)), a.orderBy).slice(0, a.take ?? 1e9).map((r) => ({ ...r })),
    findFirst: async (a: any = {}) => { const r = sorted(rows.filter((x) => matchesRich(x, a.where)), a.orderBy)[0]; return r ? { ...r } : null; },
    findUnique: async (a: any = {}) => { const r = rows.find((x) => matchesRich(x, a.where)); return r ? { ...r } : null; },
    create: async ({ data }: any) => {
      for (const keys of unique) if (rows.some((r) => keys.every((k) => (r[k] ?? null) === (data[k] ?? null)))) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      const row = { id: `${idPrefix}-${++n}`, createdAt: new Date(), at: new Date(), ...data };
      rows.push(row);
      return { ...row };
    },
    update: async ({ where, data }: any) => Object.assign(rows.find((r) => matchesRich(r, where)) ?? {}, data),
    updateMany: async ({ where, data }: any) => { const hit = rows.filter((r) => matchesRich(r, where)); hit.forEach((r) => Object.assign(r, data)); return { count: hit.length }; },
    deleteMany: async ({ where }: any) => { const hit = rows.filter((r) => matchesRich(r, where)); hit.forEach((r) => rows.splice(rows.indexOf(r), 1)); return { count: hit.length }; },
    upsert: async ({ where, create, update }: any) => {
      const found = rows.find((r) => matchesRich(r, where));
      if (found) return Object.assign(found, update);
      return table.create({ data: create });
    },
  };
  return table;
}

export interface ASentMail { to: string; subject: string; text: string; files: AnAttachment[]; sendKey: string; kind: 'files' | 'progress' | 'ask' }
export interface ASentWhatsApp { phone: string; text: string; kind: string }

export function aYearEndWorld(now: Date = new Date('2026-11-10T09:00:00Z')) {
  const o = anOrganisationForAnExecutive(now);
  const t: any = o.tables;
  t.yearEndDraft = aRichTable([['organizationId', 'principalUserId', 'year', 'version']], 'yd');
  t.yearEndLog = aRichTable([['principalUserId', 'kind', 'subject']], 'yl');
  t.yearEndRecipient = aRichTable([['principalUserId', 'email']], 'yr');
  t.informationGap = t.informationGap ?? aRichTable([['principalUserId', 'gapKey', 'askedOfEmail']], 'ig');
  /* Fatima has a phone; nobody else on the roster is needed for it. */
  t.person.rows.find((p: any) => p.linkedUserId === 'u-fatima').phone = '+2348012345678';
  t.person.rows.find((p: any) => p.linkedUserId === 'u-fatima').timezone = 'Africa/Lagos';
  t.person.rows.forEach((p: any) => { p.timezone = p.timezone ?? 'Africa/Lagos'; });

  const clock = { now };
  const mails: ASentMail[] = [];
  const whatsapps: ASentWhatsApp[] = [];
  const held: ASentMail[] = [];
  const mode = { mail: 'sent' as 'sent' | 'held' | 'suppressed' | 'throws', asks: 'sent' as 'sent' | 'held', whatsapp: true, routineMailsToday: new Set<string>() };
  const heldAsks: ASentMail[] = [];
  const everyOneAlreadyHad = new Set<string>();

  const ports: OwnerPorts = {
    email: {
      sendTheYearEndFiles: async (to, subject, text, files, sendKey) => {
        const why = whyTheseCannotGo(files);
        if (why) throw new Error(why);
        if (mode.mail === 'throws') throw new Error('The mail service refused it.');
        if (mode.mail === 'suppressed') return 'suppressed';
        const m: ASentMail = { to, subject, text, files, sendKey, kind: 'files' };
        if (mode.mail === 'held') { held.push(m); return 'held'; }
        if (everyOneAlreadyHad.has(sendKey)) return 'suppressed';
        everyOneAlreadyHad.add(sendKey);
        mails.push(m);
        await markTheYearEndFilesSent(o.prisma, sendKey, `provider-${mails.length}`);
        return 'sent';
      },
    },
    whatsapp: { send: async (a) => { if (!mode.whatsapp) return { sent: false }; whatsapps.push({ phone: a.phone, text: a.text, kind: a.kind }); return { sent: true }; } },
    progressEmail: async (to, subject, text) => { mails.push({ to, subject, text, files: [], sendKey: '', kind: 'progress' }); return 'sent'; },
    askByEmail: async (a) => {
      /* The day's one routine message a person: the door's rule, here as the fake. */
      const k = `${a.to}|${clock.now.toISOString().slice(0, 10)}`;
      if (mode.routineMailsToday.has(k)) { await giveTheAskBack(o.prisma, a.askKey); return 'suppressed'; }
      mode.routineMailsToday.add(k);
      const m: ASentMail = { to: a.to, subject: a.subject, text: a.text, files: [], sendKey: a.askKey ?? '', kind: 'ask' };
      /* Held, it waits in the outbox; the questions it carries are not asked until it goes, as at the one door. */
      if (mode.asks === 'held') { heldAsks.push(m); return 'held'; }
      mails.push(m);
      await theAskWent(o.prisma, a.askKey, clock.now);
      return 'sent';
    },
  };
  /** The held mails go, as the held-mail cron makes them. */
  const releaseTheHeldMails = async () => {
    for (const m of held.splice(0)) { mails.push(m); await markTheYearEndFilesSent(o.prisma, m.sendKey, `provider-${mails.length}`); }
  };
  /** The held questions, when their morning comes: the first to a person goes, and the one-a-day rule refuses the rest, as the one door does. */
  const releaseTheHeldAsks = async () => {
    for (const m of heldAsks.splice(0)) {
      const k = `${m.to}|${clock.now.toISOString().slice(0, 10)}|released`;
      if (mode.routineMailsToday.has(k)) { await giveTheAskBack(o.prisma, m.sendKey); continue; }
      mode.routineMailsToday.add(k);
      mails.push(m);
      await theAskWent(o.prisma, m.sendKey, clock.now);
    }
  };
  return { ...o, t, ORG, clock, mails, whatsapps, held, heldAsks, mode, ports, releaseTheHeldMails, releaseTheHeldAsks, aTable };
}
