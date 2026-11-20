/**
 * ADDING A SENIOR PERSON WHO NEVER REGISTERS (Fatima, increment 5; plan section 3 and acceptance tests 1 to 3).
 *
 * An administrator of the organisation gives her name, her email address, her WhatsApp number and the starting brief. That one act:
 *   1. makes her identity, from the admin's word (the address and the number are the admin's; she proves them by writing back);
 *   2. starts BOTH standing jobs, the annual report and the outstanding register, so the work is already hers when she first hears from us;
 *   3. records her preferences with sensible defaults, which she changes by saying so (her-words.ts);
 *   4. records the client's approval for the four things the work needs: data handling, team outreach, confidential information, messaging;
 *   5. sends her the two introductions, the email and the WhatsApp message, as two separate deliveries (the-introduction-delivery.ts).
 *
 * Nothing is sent unless the approval to message her is on record, and doing it twice changes nothing: the people, the jobs, the setup and
 * every delivery are found before they are made, and each delivery has a unique key.
 *
 * The permission to do this is checked here, in the backend, from the organisation's own membership row. Nothing on a screen decides it.
 */
import * as crypto from 'crypto';
import { ensureThePrincipalsJobs, THE_TWO_JOBS } from '../outstanding/the-persistent-jobs';
import { theAssistantsAddress } from '../email/the-assistants-address';
import { tidyANumber, formsOfTheSameNumber } from '../whatsapp/a-number-whatsapp-can-reach';
import { emailToThePrincipal, whatsAppToThePrincipal } from './the-introductions';
import { deliverOneIntroduction, type TheOnboardingPorts } from './the-introduction-delivery';
import { AN_ADMIN_WAS_TOLD, ONLY_AN_ADMIN_MAY_ADD, PERMISSIONS_NAMES, THAT_ADDRESS_IS_ELSEWHERE, THAT_NUMBER_IS_A_COLLEAGUES, THE_EMAIL_IS_NOT_AN_ADDRESS } from './the-words';

export interface ThePreferences {
  /** both | whatsapp | email: where short notes go; files always go by email. */
  channel: 'both' | 'whatsapp' | 'email';
  reportFormat: string;
  /** Her local hours: nothing is sent before the first or after the second. */
  quietBeforeHour: number;
  quietAfterHour: number;
  /** ask_first: new people only after her yes; routine updates from people she has already approved go ahead. */
  followUps: 'ask_first' | 'routine_ok';
  reviewBeforeSending: boolean;
  /** What the starting brief said, as the admin wrote it. */
  brief: string | null;
  /** The office as the team notes name it, for example "Abuja office". */
  officeName: string | null;
  paused: boolean;
  pausedUntil: string | null;
}
export const THE_DEFAULTS: ThePreferences = {
  channel: 'both', reportFormat: 'Word and PDF for the report, PowerPoint for the presentation', quietBeforeHour: 7, quietAfterHour: 20,
  followUps: 'ask_first', reviewBeforeSending: true, brief: null, officeName: null, paused: false, pausedUntil: null,
};

export interface ThePermissions {
  dataHandling: boolean;
  teamOutreach: boolean;
  confidentialInformation: boolean;
  messaging: boolean;
  confirmedByUserId: string;
  confirmedAt: string;
}

export interface AddAnExecutive {
  organizationId: string;
  byUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsappNumber?: string | null;
  officeName?: string | null;
  brief?: string | null;
  permissions: { dataHandling?: boolean; teamOutreach?: boolean; confidentialInformation?: boolean; messaging?: boolean };
  preferences?: Partial<ThePreferences>;
  now: Date;
}

export type TheAddition =
  | { ok: true; principalUserId: string; personId: string; said: string; deliveries: { channel: string; state: string; reason: string | null }[]; alreadyThere: boolean }
  | { ok: false; said: string };

const lower = (s: string) => s.trim().toLowerCase();
const AN_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Who her assistant writes to, and how: the address answered mail comes back to. One function owns it. */
export async function theAddressForHer(prisma: any, organizationId: string): Promise<string | undefined> {
  const org: any = await prisma.organization?.findUnique?.({ where: { id: organizationId }, select: { slug: true } }).catch(() => null);
  return org?.slug ? theAssistantsAddress({ slug: org.slug }) : undefined;
}

export async function addAnExecutive(prisma: any, ports: TheOnboardingPorts, a: AddAnExecutive): Promise<TheAddition> {
  const membership: any = await prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId: a.byUserId, organizationId: a.organizationId } }, select: { role: true } }).catch(() => null);
  if (membership?.role !== 'ADMIN') return { ok: false, said: ONLY_AN_ADMIN_MAY_ADD };
  const email = lower(a.email);
  if (!AN_ADDRESS.test(email)) return { ok: false, said: THE_EMAIL_IS_NOT_AN_ADDRESS };
  const first = a.firstName.trim();
  const last = a.lastName.trim();

  let number: string | null = null;
  if (a.whatsappNumber && a.whatsappNumber.trim()) {
    const t = tidyANumber(a.whatsappNumber);
    if ('refused' in t) return { ok: false, said: t.refused };
    number = t.number;
    const onTheNumber: any[] = (await prisma.person.findMany({ where: { organizationId: a.organizationId, phone: { in: formsOfTheSameNumber(number) } }, select: { displayName: true, givenName: true, email: true } }).catch(() => [])) ?? [];
    const onSomebodyElse = onTheNumber.find((p) => lower(p.email ?? '') !== email);
    if (onSomebodyElse) return { ok: false, said: THAT_NUMBER_IS_A_COLLEAGUES(onSomebodyElse.displayName ?? onSomebodyElse.givenName ?? 'a colleague') };
  }

  /* Her sign-in record: found by address, or made. Never with a password: she is not asked to sign in. */
  let user: any = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (user && user.organizationId !== a.organizationId) return { ok: false, said: THAT_ADDRESS_IS_ELSEWHERE };
  const alreadyThere = !!user;
  if (!user) user = await prisma.user.create({ data: { organizationId: a.organizationId, email, firstName: first, lastName: last, role: 'LEAD', isEmailVerified: true, isActive: true } });
  await prisma.organizationMembership.upsert({ where: { userId_organizationId: { userId: user.id, organizationId: a.organizationId } }, create: { userId: user.id, organizationId: a.organizationId, role: 'LEAD' }, update: {} });

  /* Her roster entry, the way every other person is on the roster, with her number: the roster is the organisation's word for who she is. */
  let person: any = await prisma.person.findFirst({ where: { organizationId: a.organizationId, email: { equals: email, mode: 'insensitive' } } });
  if (!person) {
    person = await prisma.person.create({ data: { organizationId: a.organizationId, externalId: `exec-${user.id}`, sourceSystem: 'groundwork-admin', userName: email, displayName: `${first} ${last}`.trim(), givenName: first, familyName: last, email, phone: number, linkedUserId: user.id, active: true } });
  } else {
    await prisma.person.update({ where: { id: person.id }, data: { linkedUserId: person.linkedUserId ?? user.id, ...(number && !person.phone ? { phone: number } : {}) } });
  }

  /* Both jobs, the moment she is added, so the work is already hers. Safe to call again. */
  await ensureThePrincipalsJobs(prisma, { organizationId: a.organizationId, principalUserId: user.id, now: a.now });

  /* Her preferences, and the approval, recorded once. A second call keeps what is there. */
  const preferences: ThePreferences = { ...THE_DEFAULTS, ...(a.preferences ?? {}), brief: a.brief ?? null, officeName: a.officeName ?? null };
  const permissions: ThePermissions = {
    dataHandling: !!a.permissions.dataHandling, teamOutreach: !!a.permissions.teamOutreach,
    confidentialInformation: !!a.permissions.confidentialInformation, messaging: !!a.permissions.messaging,
    confirmedByUserId: a.byUserId, confirmedAt: a.now.toISOString(),
  };
  const there: any = await prisma.principalSetup.findFirst({ where: { organizationId: a.organizationId, principalUserId: user.id } });
  /* A second call can turn an approval on and never off: what was confirmed stays confirmed. */
  const effective: ThePermissions = { ...permissions, ...Object.fromEntries((['dataHandling', 'teamOutreach', 'confidentialInformation', 'messaging'] as const).map((k) => [k, !!(there?.permissions?.[k] || permissions[k])])) } as ThePermissions;
  if (!there) await prisma.principalSetup.create({ data: { organizationId: a.organizationId, principalUserId: user.id, email, whatsappNumber: number, verifiedVia: 'admin', preferences, permissions: effective, addedByUserId: a.byUserId } });
  else await prisma.principalSetup.update({ where: { id: there.id }, data: { permissions: effective, whatsappNumber: number ?? there.whatsappNumber } });
  /* Her quiet hours are the one place quiet hours live, so every mail and message already respects them. */
  await prisma.emailPreference?.upsert?.({
    where: { organizationId_personExternalId: { organizationId: a.organizationId, personExternalId: person.externalId } },
    create: { organizationId: a.organizationId, personExternalId: person.externalId, quietBeforeHour: preferences.quietBeforeHour, quietAfterHour: preferences.quietAfterHour, unsubscribeToken: crypto.randomBytes(24).toString('hex') },
    update: {},
  })?.catch?.(() => undefined);

  const missing = (['dataHandling', 'teamOutreach', 'confidentialInformation', 'messaging'] as const).filter((k) => !effective[k]).map((k) => PERMISSIONS_NAMES[k]);
  const jobs = THE_TWO_JOBS(a.now.getUTCFullYear()).map((j) => j.title);
  /* Nothing is sent to her until the approval to message her is on record. */
  const deliveries = effective.messaging ? await sendHerTheIntroductions(prisma, ports, { organizationId: a.organizationId, principalUserId: user.id, now: a.now }) : [];
  return { ok: true, principalUserId: user.id, personId: person.id, alreadyThere, deliveries, said: AN_ADMIN_WAS_TOLD({ first, jobs, email, whatsapp: number, introductions: deliveries, permissionsMissing: missing }) };
}

/** The email, then the WhatsApp message, to her. Each is its own delivery and goes once. */
export async function sendHerTheIntroductions(prisma: any, ports: TheOnboardingPorts, a: { organizationId: string; principalUserId: string; now: Date }): Promise<{ channel: string; state: string; reason: string | null }[]> {
  const setup: any = await prisma.principalSetup.findFirst({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId } });
  if (!setup) return [];
  const user: any = await prisma.user.findUnique({ where: { id: a.principalUserId }, select: { firstName: true } });
  const first = user?.firstName ?? 'there';
  const replyTo = (await theAddressForHer(prisma, a.organizationId)) ?? null;
  const out: { channel: string; state: string; reason: string | null }[] = [];
  const mail = emailToThePrincipal(first);
  const e = await deliverOneIntroduction(prisma, ports, { organizationId: a.organizationId, principalUserId: a.principalUserId, audience: 'principal', channel: 'email', recipient: setup.email, subject: mail.subject, text: mail.text, replyTo, sendKey: `intro:principal:email:${a.principalUserId}`, now: a.now });
  out.push({ channel: 'email', state: e.state === 'already' ? 'already' : e.state, reason: e.reason });
  if (setup.whatsappNumber) {
    const wa = whatsAppToThePrincipal(first, replyTo ?? 'this address');
    const w = await deliverOneIntroduction(prisma, ports, { organizationId: a.organizationId, principalUserId: a.principalUserId, audience: 'principal', channel: 'whatsapp', recipient: setup.whatsappNumber, subject: null, text: wa.text, replyTo: null, sendKey: `intro:principal:whatsapp:${a.principalUserId}`, now: a.now });
    out.push({ channel: 'whatsapp', state: w.state === 'already' ? 'already' : w.state, reason: w.reason });
  }
  return out;
}
