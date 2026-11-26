/**
 * HER TEAM, BY HER WORD (Ebele, increment 5; plan sections 6 and 19).
 *
 * She gives names and contacts in a message, a voice note or an email. Groundwork repeats back who it would write to and asks for her go-ahead
 * ONCE, in one question. On yes, each person is sent their own WhatsApp message and their own email, word for word as the plan has them (6.1, 6.2),
 * and they take part by replying: they are put on the roster the way everybody else is, and they never sign up. A person who is outside the
 * organisation is different (plan 19, explicit confirmation): she says yes to each of them separately, they are never sent the team's
 * introduction, and in this increment nothing at all is sent to them, only her confirmation is kept.
 *
 * Who may say yes. Her, always. Somebody she lets act for her may give names and say yes for people inside her organisation; a person outside it is
 * hers to approve. Every such act is written as "Amina Yusuf for Ebele" and stays when the grant ends.
 *
 * Nobody is written to unless the organisation confirmed team outreach when she was added, and she said yes. A forwarded message cannot name
 * anybody: only her own words do (the-intake.ts herOwnWords).
 */
import * as crypto from 'crypto';
import { isAPublicMailDomain, theDomainOf } from '../../common/an-email-domain';
import { tidyANumber, formsOfTheSameNumber } from '../whatsapp/a-number-whatsapp-can-reach';
import { A_YES, A_NO } from '../public-api/a-whatsapp-message-is-routed';
import type { TheTeamMind } from '../team-loop/the-team-mind';
import { understandHerAnswer, type ReadsAnAnswer } from './her-answer';
import { recordWhatADelegateDid, type TheReader } from '../outstanding/a-delegate-acts-for-a-principal';
import { theAddressForHer } from './onboard-an-executive';
import { emailToATeamMember, theOffice, whatsAppToATeamMember } from './the-introductions';
import { deliverOneIntroduction, type TheOnboardingPorts } from './the-introduction-delivery';
import { THE_NUMBER_WAS_CORRECTED, NO_ONE_TO_WRITE_TO, ONLY_SHE_CAN_SAY_YES_FOR_OUTSIDERS, NOTHING_WAS_SENT, TEAM_OUTREACH_NOT_APPROVED, THE_EXTERNAL_WAS_NOTED, WHAT_WAS_DONE_FOR_THE_TEAM, type AnIntroductionResult, WHICH_NAME, theGoAheadQuestion } from './the-words';

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+|00)?\d[\d\s().-]{6,}\d/g;
/** Words that say the people named are hers to work with, so a message that carries one is read as naming people. */
export const A_CUE_FOR_PEOPLE = /\b(?:team|colleagues?|staff|work(?:s|ing)?\s+(?:with|for)\s+me|handl(?:e|es|ing)\b|reach\s+out|collect|these\s+people|people|contacts?)\b/i;
export const A_CUE_FOR_MY_OWN_TEAM = /\b(?:my\s+(?:team|staff|colleagues?|office|assistant|ea)|colleagues?|(?:works?|working)\s+(?:with|for)\s+me|in\s+my\s+office)\b/i;
const NOT_PART_OF_A_NAME = new Set(['My', 'The', 'These', 'Those', 'Here', 'Also', 'And', 'Please', 'Names', 'Team', 'Colleagues', 'Contact', 'Contacts', 'His', 'Her', 'Their', 'Email', 'Number', 'Whatsapp', 'WhatsApp', 'Phone', 'Mobile', 'On', 'At', 'Is', 'Can', 'You', 'I', 'Reach', 'Write', 'To', 'Ask', 'Send']);

export interface ARead { name: string | null; email: string | null; phone: string | null; /** The job she gave them, when she did. Kept in her words and never used to decide anything. */ role?: string | null }

const titleCase = (s: string) => s.split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
const nameFromTheAddress = (email: string): string | null => {
  const local = email.split('@')[0].replace(/\d+/g, '');
  const parts = local.split(/[._-]+/).filter((p) => p.length > 1);
  return parts.length >= 2 ? titleCase(parts.slice(0, 3).join(' ')) : null;
};

/** The name written just before an address or a number: up to four capitalised words, not counting the words that only introduce a list. */
function theNameBefore(before: string): string | null {
  const cleaned = before.replace(/[()[\]:;,]/g, ' ').replace(/\b(?:email|e-mail|number|whatsapp|phone|mobile|on|at|is|and|or)\b\s*$/gi, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ').filter(Boolean);
  const name: string[] = [];
  for (let i = words.length - 1; i >= 0 && name.length < 4; i -= 1) {
    const w = words[i].replace(/[.,]+$/, '');
    if (/^\p{Lu}[\p{L}'’-]*$/u.test(w) && !NOT_PART_OF_A_NAME.has(w)) name.unshift(w);
    else break;
  }
  return name.length ? name.join(' ') : null;
}

/** Names with their contacts, read from her own words. A number that carries no name beside it joins the person written just before it. */
export function readContactsFrom(message: string): ARead[] {
  const text = String(message ?? '');
  const ids: { at: number; end: number; kind: 'email' | 'phone'; value: string }[] = [];
  for (const m of text.matchAll(EMAIL)) ids.push({ at: m.index!, end: m.index! + m[0].length, kind: 'email', value: m[0].toLowerCase() });
  const noMail = text.replace(EMAIL, (m) => ' '.repeat(m.length));
  for (const m of noMail.matchAll(PHONE)) if (m[0].replace(/\D/g, '').length >= 8) ids.push({ at: m.index!, end: m.index! + m[0].length, kind: 'phone', value: m[0].trim() });
  ids.sort((a, b) => a.at - b.at);
  const out: ARead[] = [];
  let from = 0;
  for (const id of ids) {
    const before = text.slice(from, id.at);
    from = id.end;
    const named = theNameBefore(before);
    const last = out[out.length - 1];
    if (!named && last && ((id.kind === 'phone' && !last.phone) || (id.kind === 'email' && !last.email)) && /^[\s,;:()/-]*(?:(?:and|or|email|e-mail|number|whatsapp|phone|mobile|on|at|is)\b[\s,;:()/-]*)*$/i.test(before)) {
      if (id.kind === 'phone') last.phone = id.value; else last.email = id.value;
      continue;
    }
    out.push({ name: named ?? (id.kind === 'email' ? nameFromTheAddress(id.value) : null), email: id.kind === 'email' ? id.value : null, phone: id.kind === 'phone' ? id.value : null });
  }
  return out;
}

export const namesContacts = (message: string): boolean => {
  const found = readContactsFrom(message);
  return found.length > 0 && (A_CUE_FOR_PEOPLE.test(message) || found.length >= 2);
};

/** Whether a message holds an address or a number at all: the only thing decided before the model is asked, so the model is not asked about a message with nobody to write to. */
export const holdsAContact = (message: string): boolean => {
  const text = String(message ?? '');
  return /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(text) || [...text.matchAll(PHONE)].some((m) => m[0].replace(/\D/g, '').length >= 8);
};

/**
 * THE PEOPLE SHE NAMED, READ BY THE MODEL (round 1, issue I-05). A role word between a name and a number, or a plain sentence ("His number is ..."),
 * failed the whole list when names were found by their place in the line. The model reads who is who and what job she gave them; code then keeps only
 * what she wrote: an address or number the model gives must be written in her message, and a name must be made of words she wrote. A person whose
 * contact cannot be read is kept in the list with no contact, so they are asked about once and not dropped. Null when the model cannot be asked.
 */
export async function thePeopleSheNamed(mind: Pick<TheTeamMind, 'readThePeople'> | null | undefined, message: string): Promise<ARead[] | null> {
  const got = await mind?.readThePeople?.({ text: message }).catch(() => null);
  if (!got) return null;
  const text = String(message ?? '');
  const lower = text.toLowerCase();
  const written = [...text.replace(EMAIL, ' ').matchAll(PHONE)].map((m) => m[0].replace(/\D/g, ''));
  const out: ARead[] = [];
  for (const p of got) {
    const email = p.email && lower.includes(p.email.toLowerCase()) ? p.email.toLowerCase() : null;
    const digits = (p.phone ?? '').replace(/\D/g, '');
    const phone = digits.length >= 8 && written.some((w) => w.includes(digits) || digits.includes(w)) ? (p.phone as string).trim() : null;
    const words = (p.name ?? '').split(/\s+/).filter(Boolean);
    const name = words.length && words.every((w) => lower.includes(w.toLowerCase().replace(/[.,]+$/, ''))) ? titleCase(words.join(' ')) : null;
    const role = p.role && !/[@\d]/.test(p.role) ? p.role.trim().slice(0, 60) : null;
    if (!email && !phone && !name) continue;
    out.push({ name, email, phone, role });
  }
  return out;
}

export interface TheTeamPorts extends TheOnboardingPorts {
  /** Reads what she means where words are not enough: a yes in any words, and the people she named with their jobs (team-loop/the-team-mind.ts). Without it the plain readings stand. */
  mind?: (TheTeamMind & ReadsAnAnswer) | null;
  /** The existing join-from-roster logic (public-api/whatsapp-for-an-organisation.service.ts theirCheckInAccount), best effort. */
  theirCheckInAccount?(organizationId: string, personId: string): Promise<string | null>;
}

export interface TheSpeaker { userId: string; isPrincipal: boolean; reader: TheReader }

const keyOf = (c: { email?: string | null; phone?: string | null }) => (c.email ? c.email.toLowerCase() : c.phone ?? '');

/** Reads her words, keeps who she named as proposals, and asks the one question. Returns the reply, or null when it names nobody. */
export async function proposeThePeople(prisma: any, a: { organizationId: string; principalUserId: string; principalFirst: string; speaker: TheSpeaker; message: string; now: Date; mind?: TheTeamPorts['mind'] }): Promise<string | null> {
  /* The model reads who is who where it can; the plain reading by place in the line stands in where it cannot, and says less. */
  const byTheModel = holdsAContact(a.message) ? await thePeopleSheNamed(a.mind, a.message) : null;
  if (byTheModel && !byTheModel.length) return null;
  if (!byTheModel && !namesContacts(a.message)) return null;
  const setup: any = await prisma.principalSetup.findFirst({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId } });
  if (!setup) return null;
  if (!setup.permissions?.teamOutreach) return TEAM_OUTREACH_NOT_APPROVED;
  const read: ARead[] = byTheModel ?? readContactsFrom(a.message);
  const principal: any = await prisma.user.findUnique({ where: { id: a.principalUserId }, select: { email: true } });
  const herDomain = theDomainOf(principal?.email);
  const cuedTeam = A_CUE_FOR_MY_OWN_TEAM.test(a.message);
  const proposed: { name: string; contact: string; kind: 'team' | 'external'; role: string | null }[] = [];
  /* A person who cannot be read is asked about once, and the others go on: one unreadable line never fails the whole list. */
  const problems: string[] = [];
  /* People already introduced whose number or address was corrected: kept as the same person, with nothing more to ask her. */
  const corrected: { name: string; contact: string }[] = [];
  const roles: Record<string, string> = {};
  for (const r of read) {
    if (!r.name) { problems.push(WHICH_NAME(r.email ? 'email address' : 'number')); continue; }
    if (!r.email && !r.phone) { problems.push(`I could not find a number or an email address for ${r.name}. Please send it once more.`); continue; }
    let phone: string | null = null;
    if (r.phone) {
      const t = tidyANumber(r.phone);
      if ('number' in t) phone = t.number;
      else if (!r.email) { problems.push(`I could not use the number for ${r.name}. ${t.refused}`); continue; }
    }
    const key = keyOf({ email: r.email, phone });
    if (!key) continue;
    const existing: any = await prisma.outreachContact.findFirst({ where: { principalUserId: a.principalUserId, contactKey: key } });
    /*
     * A CORRECTION OF A NUMBER IS THE SAME PERSON WITH A NEW NUMBER, never a new person and never somebody outside the office (fix plan 16 November, group 3;
     * Ebele round 4, issue 1). The contact was found by its number or address, so a corrected number found nobody, was read as a stranger with no address and
     * no cue, and was held as "outside your office": nothing was sent, and the person's own messages were refused as an unknown number. Who somebody is, and
     * whether they are on the team, is decided once, from the roster, by address or by number, and a person she has already named by the same name keeps
     * what they were.
     */
    const sameNameBefore: any = existing ?? await prisma.outreachContact.findFirst({ where: { principalUserId: a.principalUserId, name: { equals: r.name, mode: 'insensitive' } } });
    if (!existing && sameNameBefore && (sameNameBefore.kind === 'team') && sameNameBefore.contactKey !== key) {
      if (sameNameBefore.personId && phone) await prisma.person.update({ where: { id: sameNameBefore.personId }, data: { phone, whatsappLastInboundAt: null } }).catch(() => undefined);
      await prisma.outreachContact.update({ where: { id: sameNameBefore.id }, data: { email: r.email ?? sameNameBefore.email, phone: phone ?? sameNameBefore.phone, contactKey: key } });
      if (sameNameBefore.state === 'introduced') { corrected.push({ name: r.name, contact: r.email ?? phone! }); continue; }
    }
    if (existing && (existing.state === 'introduced' || existing.state === 'held_external')) continue;
    const onTheRoster: any = (r.email ? await prisma.person.findFirst({ where: { organizationId: a.organizationId, email: { equals: r.email, mode: 'insensitive' }, active: true }, select: { id: true } }) : null)
      ?? (phone ? ((await prisma.person.findMany({ where: { organizationId: a.organizationId, phone: { in: formsOfTheSameNumber(phone) }, active: true }, select: { id: true } })) ?? [])[0] ?? null : null);
    const sameOffice = !!r.email && !!herDomain && !isAPublicMailDomain(herDomain) && theDomainOf(r.email) === herDomain;
    /* The safe direction: somebody with an address at another organisation is outside it, even when she said "my team", and needs her yes of their own. */
    const herWordSaysTeam = cuedTeam && (!r.email || isAPublicMailDomain(theDomainOf(r.email) ?? ''));
    const kind: 'team' | 'external' = sameNameBefore?.kind === 'team' || onTheRoster || sameOffice || herWordSaysTeam ? 'team' : 'external';
    if (existing) await prisma.outreachContact.update({ where: { id: existing.id }, data: { name: r.name, email: r.email, phone, kind, state: 'proposed', proposedByUserId: a.speaker.userId } });
    else if (sameNameBefore && sameNameBefore.kind === 'team' && sameNameBefore.contactKey === key) await prisma.outreachContact.update({ where: { id: sameNameBefore.id }, data: { phone, email: r.email, kind, state: 'proposed', proposedByUserId: a.speaker.userId } });
    else await prisma.outreachContact.create({ data: { organizationId: a.organizationId, principalUserId: a.principalUserId, name: r.name, email: r.email, phone, contactKey: key, kind, state: 'proposed', proposedByUserId: a.speaker.userId } });
    proposed.push({ name: r.name, contact: r.email ?? phone!, kind, role: r.role ?? null });
    if (r.role) roles[key] = r.role;
  }
  /* The job she gave each person is kept with her setup until she says yes, and then goes on their entry on the roster. */
  if (Object.keys(roles).length) await prisma.principalSetup.update({ where: { id: setup.id }, data: { preferences: { ...(setup.preferences ?? {}), rolesNamed: { ...(setup.preferences?.rolesNamed ?? {}), ...roles } } } }).catch(() => undefined);
  if (!proposed.length && corrected.length) return THE_NUMBER_WAS_CORRECTED(corrected.map((c) => c.name));
  if (!proposed.length) return problems.length ? problems.join(' ') : NO_ONE_TO_WRITE_TO;
  const question = theGoAheadQuestion({ team: proposed.filter((p) => p.kind === 'team'), external: proposed.filter((p) => p.kind === 'external'), by: a.speaker.isPrincipal ? null : a.principalFirst });
  return problems.length ? `${question} ${problems.join(' ')}` : question;
}

/** A plain yes or no only. Anything else is read for what it means by understandHerAnswer (her-answer.ts), where something is waiting for an answer. */
export const isAGoAheadAnswer = (message: string): 'yes' | 'no' | null => (A_YES.test(message) ? 'yes' : A_NO.test(message) ? 'no' : null);

/** Whether a go-ahead is waiting for an answer. */
export async function aGoAheadIsWaiting(prisma: any, principalUserId: string): Promise<boolean> {
  return !!(await prisma.outreachContact.findFirst({ where: { principalUserId, state: 'proposed' } }));
}

/** The question that was put to her, said again to whatever reads her answer. Null when nothing is waiting. */
export async function theGoAheadQuestionWaiting(prisma: any, principalUserId: string): Promise<string | null> {
  const waiting: any[] = (await prisma.outreachContact.findMany({ where: { principalUserId, state: 'proposed' } })) ?? [];
  if (!waiting.length) return null;
  return `Shall I write to ${waiting.map((c) => c.name).join(', ')}, tell them you asked me to, and ask what they are working on?`;
}

/** Her answer to the one go-ahead, in any words that mean yes or no. Null when her words are not an answer to it. */
export const herAnswerToTheGoAhead = (mind: ReadsAnAnswer | null | undefined, question: string, message: string) => understandHerAnswer(mind, { question, text: message });

/** Her yes or no to the one question. Writes to people only on a yes, only for people she was asked about, and only through the two introductions. */
export async function answerTheGoAhead(prisma: any, ports: TheTeamPorts, a: { organizationId: string; principalUserId: string; principalFirst: string; speaker: TheSpeaker; answer: 'yes' | 'no'; now: Date }): Promise<string | null> {
  const waiting: any[] = (await prisma.outreachContact.findMany({ where: { principalUserId: a.principalUserId, state: 'proposed' } })) ?? [];
  if (!waiting.length) return null;
  if (a.answer === 'no') {
    for (const c of waiting) await prisma.outreachContact.update({ where: { id: c.id }, data: { state: 'declined' } });
    return NOTHING_WAS_SENT;
  }
  const setup: any = await prisma.principalSetup.findFirst({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId } });
  if (!setup?.permissions?.teamOutreach || !setup?.permissions?.messaging) return TEAM_OUTREACH_NOT_APPROVED;
  const office = theOffice(setup.preferences?.officeName);
  const replyTo = (await theAddressForHer(prisma, a.organizationId)) ?? null;
  const wrote: string[] = [];
  const results: AnIntroductionResult[] = [];
  const noted: string[] = [];
  let refusedOutsiders = false;
  for (const c of waiting) {
    if (c.kind === 'external') {
      if (!a.speaker.isPrincipal) { refusedOutsiders = true; continue; }
      await prisma.outreachContact.update({ where: { id: c.id }, data: { state: 'held_external', confirmedAt: a.now, confirmedByUserId: a.speaker.userId } });
      noted.push(c.name);
      continue;
    }
    /* Inside her organisation: on the roster the way every other person is, and joined from there by the existing logic. */
    let person: any = c.email ? await prisma.person.findFirst({ where: { organizationId: a.organizationId, email: { equals: c.email, mode: 'insensitive' } } }) : null;
    if (!person && c.phone) { const onNumber: any[] = (await prisma.person.findMany({ where: { organizationId: a.organizationId, phone: { in: formsOfTheSameNumber(c.phone) } } })) ?? []; person = onNumber[0] ?? null; }
    if (!person) {
      const [given, ...rest] = String(c.name).split(' ');
      const role: string | null = setup.preferences?.rolesNamed?.[c.contactKey] ?? null;
      person = await prisma.person.create({ data: { organizationId: a.organizationId, externalId: `team-${crypto.randomBytes(6).toString('hex')}`, sourceSystem: 'groundwork-outreach', userName: c.email ?? c.phone, displayName: c.name, givenName: given, familyName: rest.join(' ') || null, email: c.email, phone: c.phone, ...(role ? { title: role } : {}), active: true } });
    }
    await ports.theirCheckInAccount?.(a.organizationId, person.id)?.catch?.(() => null);
    const mail = emailToATeamMember(a.principalFirst, office, String(c.name).split(' ')[0]);
    const chat = whatsAppToATeamMember(a.principalFirst, office, String(c.name).split(' ')[0]);
    /* What each channel really did, read from the delivery row (the-introduction-delivery.ts), for what she is told. */
    const stateOf = (r: { state: string; was?: string }) => (r.state === 'already' ? r.was ?? 'held' : r.state);
    let emailState: string | null = null;
    let whatsappState: string | null = null;
    if (c.email) emailState = stateOf(await deliverOneIntroduction(prisma, ports, { organizationId: a.organizationId, principalUserId: a.principalUserId, audience: 'team', channel: 'email', recipient: c.email, subject: mail.subject, text: mail.text, replyTo, sendKey: `intro:team:${c.id}:email`, now: a.now }));
    if (c.phone) whatsappState = stateOf(await deliverOneIntroduction(prisma, ports, { organizationId: a.organizationId, principalUserId: a.principalUserId, audience: 'team', channel: 'whatsapp', recipient: c.phone, subject: null, text: chat.text, replyTo: null, sendKey: `intro:team:${c.id}:whatsapp`, now: a.now }));
    results.push({ name: c.name, email: emailState, whatsapp: whatsappState });
    await prisma.outreachContact.update({ where: { id: c.id }, data: { state: 'introduced', personId: person.id, confirmedAt: a.now, confirmedByUserId: a.speaker.userId, introducedAt: a.now } });
    wrote.push(c.name);
  }
  if (a.speaker.reader.kind === 'delegate') await recordWhatADelegateDid(prisma, a.speaker.reader, a.organizationId, 'team_outreach', `said yes to writing to ${[...wrote, ...noted].join(', ') || 'nobody'}.`);
  const parts: string[] = [];
  if (wrote.length) parts.push(WHAT_WAS_DONE_FOR_THE_TEAM(results));
  if (noted.length) parts.push(THE_EXTERNAL_WAS_NOTED(noted));
  if (refusedOutsiders) parts.push(ONLY_SHE_CAN_SAY_YES_FOR_OUTSIDERS(a.principalFirst));
  return parts.join(' ');
}

/** An introduced team member, found by the address they write from. Scoped to the organisation. */
export async function theTeamMemberWhoWroteFrom(prisma: any, organizationId: string, address: string): Promise<any | null> {
  return prisma.outreachContact.findFirst({ where: { organizationId, email: { equals: address.trim().toLowerCase(), mode: 'insensitive' }, state: 'introduced' } });
}

/** Their first reply from the address given is how their identity is verified. Written once. */
export async function markTheirIdentityVerified(prisma: any, contact: any, now: Date): Promise<void> {
  if (contact.verifiedAt) return;
  await prisma.outreachContact.updateMany({ where: { id: contact.id, verifiedAt: null }, data: { verifiedAt: now } });
}
