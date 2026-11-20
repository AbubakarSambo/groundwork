/**
 * A SMALL IN-MEMORY WORLD FOR THE TESTS OF ONBOARDING WITHOUT REGISTRATION (Fatima, increment 5), built on the one for the outstanding register.
 * Fatima's organisation has Grace as its administrator, Amina as the person who acts for Fatima, Tunde (whose own check-in Fatima does not run) and
 * Ibrahim. Mail and WhatsApp are fakes that write down exactly what a person would have read, so a test can print it.
 */
import { aTable, anOrganisationForAnExecutive, ORG } from '../outstanding/an-organisation-for-an-executive';
import type { TheTeamPorts } from './team-introductions';
import type { TheIntakePorts } from './the-intake';
import type { TheAcknowledgementPorts } from './the-first-picture';

export { ORG };
export const SLUG = 'dangote-abuja';

/** A table that refuses a second row with the same values for `keys`, the way the database's unique index does. */
function unique(table: ReturnType<typeof aTable>, keys: string[]) {
  const make = table.create;
  table.create = async (a: any) => {
    if (table.rows.some((r) => keys.every((k) => (r[k] ?? null) === (a.data[k] ?? null)))) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    return make(a);
  };
  return table;
}

export interface TheSent { to: string; subject?: string; text: string; replyTo?: string; channel: 'email' | 'whatsapp'; kind?: string }

export function aWorldForOnboarding(now: Date = new Date('2026-11-10T09:00:00Z')) {
  const o = anOrganisationForAnExecutive(now);
  const t: any = o.tables;
  for (const u of t.user.rows) u.organizationId = ORG;
  t.organization = aTable([{ id: ORG, slug: SLUG, name: 'Dangote Abuja Office' }], 'org');
  const roles: Record<string, string> = { 'u-fatima': 'LEAD', 'u-amina': 'MEMBER', 'u-tunde': 'LEAD', 'u-grace': 'ADMIN', 'u-ibrahim': 'MEMBER' };
  t.organizationMembership = aTable(Object.entries(roles).map(([userId, role]) => ({ userId, organizationId: ORG, role })), 'm');
  t.principalSetup = aTable([], 'ps');
  t.introductionDelivery = unique(aTable([], 'id'), ['sendKey']);
  t.outreachContact = unique(aTable([], 'oc'), ['principalUserId', 'contactKey']);
  t.informationGap = aTable([], 'ig');
  t.intakeBatch = aTable([], 'ib');
  t.principalMaterial = aTable([], 'pm');
  t.emailPreference = aTable([], 'ep');
  t.yearEndLog = aTable([], 'yl');
  t.persistentJob = aTable([], 'pj');
  /* Fatima is not on the roster or in the user table until an admin adds her. The work she runs (her check-ins) is already there, as it would be for an office whose brief was loaded. */
  t.user.rows.splice(t.user.rows.findIndex((u: any) => u.id === 'u-fatima'), 1);
  t.person.rows.splice(t.person.rows.findIndex((p: any) => p.linkedUserId === 'u-fatima'), 1);
  t.organizationMembership.rows.splice(t.organizationMembership.rows.findIndex((m: any) => m.userId === 'u-fatima'), 1);
  const userCreate = t.user.create;
  t.user.create = async ({ data }: any) => userCreate({ data: { ...data, id: data.email === 'fatimawale@example.com' ? 'u-fatima' : `u-${String(data.email).split('@')[0]}` } });

  const sent: TheSent[] = [];
  const settings = { whatsapp: 'refuse' as 'refuse' | 'accept' | 'night' | 'stopped', mail: 'sent' as 'sent' | 'held' | 'suppressed' };
  const ports: TheTeamPorts & TheAcknowledgementPorts = {
    email: {
      send: async (a: any) => { if (settings.mail === 'sent') sent.push({ to: a.to, subject: a.subject, text: a.text, replyTo: a.replyTo, channel: 'email', kind: 'introduction' }); return settings.mail; },
      reply: async (a: any) => { sent.push({ to: a.to, subject: a.subject, text: a.text, replyTo: a.replyTo, channel: 'email', kind: 'reply' }); return 'sent' as const; },
    } as any,
    whatsapp: {
      send: async (a: any) => {
        if (settings.whatsapp === 'accept') { sent.push({ to: a.phone, text: a.text, channel: 'whatsapp', kind: a.kind }); return { sent: true }; }
        if (settings.whatsapp === 'night') return { sent: false, error: 'Quiet hours where the organisation is; held until 2026-11-11T06:00:00.000Z' };
        if (settings.whatsapp === 'stopped') return { sent: false, error: 'This person said STOP on WhatsApp; not sent' };
        return { sent: false, error: 'The first message to this number must go as groundwork_first_contact, which is not approved yet; not sent' };
      },
    },
    theirCheckInAccount: async () => null,
  };
  const intake: TheIntakePorts = {
    transcriber: { transcribe: async (a: any) => (String(a.buffer).startsWith('UNCLEAR') ? { ok: true, text: 'The minister will see us on Thursday.', unclear: [{ heard: 'Thursday' }] } : String(a.buffer).startsWith('SILENCE') ? { ok: false } : { ok: true, text: String(a.buffer).replace(/^VOICE:/, ''), unclear: [] }) } as any,
    read: async (f) => (/\.(?:txt|csv|eml)$/i.test(f.fileName) ? { text: f.bytes.toString('utf8') } : /\.pdf$/i.test(f.fileName) && f.bytes.toString('utf8').startsWith('BROKEN') ? { unreadable: 'it would not open' } : { text: `Contents of ${f.fileName}` }),
  };
  return { ...o, t, sent, settings, ports, intake };
}

export const ADMIN = 'u-grace';
export const addFatima = (w: ReturnType<typeof aWorldForOnboarding>, over: Record<string, unknown> = {}) => ({
  organizationId: ORG, byUserId: ADMIN, firstName: 'Fatima', lastName: 'Wali Abdulrahman', email: 'fatimawale@example.com', whatsappNumber: '+2348031112222',
  officeName: 'Abuja office', brief: 'Bring together the Abuja office’s work, government engagements, outstanding commitments and the year-end report.',
  permissions: { dataHandling: true, teamOutreach: true, confidentialInformation: true, messaging: true }, now: w.now, ...over,
});
