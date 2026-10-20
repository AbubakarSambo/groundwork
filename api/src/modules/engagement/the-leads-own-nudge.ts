import { ForbiddenException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PartyType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { theDirectMorningIsOn } from '../organisation/the-direct-morning-switch';
import { aTeamMembersOpeningFor, type ATeamMembersOpening } from '../conversation/the-one-thing-today';
import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { whoOnACheckInIsAway } from '../suites/who-is-away';
import { isHeldForTheNight } from '../whatsapp/quiet-hours-are-the-organisations';
import { THEY_SAID_NOT_NOW, THEY_SAID_STOP } from '../whatsapp/a-message-outside-the-window';
import { theirDay, aDayIn, aTimeOfDay, type ASessionOnRecord } from './who-answers-and-when';

/**
 * THE LEAD'S OWN NUDGE: "NUDGE PETER" (nudges that get answers; Hafsah, 20 October 2026; behind `organizations.direct_morning_on`).
 *
 * On her board's "Your team" (and its top), each person who has not answered today has a button for the lead alone. Pressing it sends ONE
 * message, from her by name, about that person's one thing today (conversation/the-one-thing-today.ts):
 *   "Joseph, this is from Grace. Juja Hardware is waiting on the KES 4,500 price for 5 units. What's happening with it, and what's next?"
 * With nothing specific on record: "Joseph, this is from Grace. Your check-in for Sales team, Q4 is still open today. Can you answer it now?"
 *
 * ONE CHANNEL. WhatsApp where the person has a number and the check-in is answered there: inside the 24 hours as these words; outside them
 * as the approved template that fits ("your view matters", which names the lead; its wording is never changed). Where WhatsApp cannot take
 * it (no approved template, the first message to a number, WhatsApp not on), by email instead. Never both.
 *
 * THE RULES THAT STILL HOLD. Not the day's routine message: it is not counted towards the one a day and is not held by it. Quiet hours hold
 * it until seven (WhatsApp and email alike). STOP and "Not now" on WhatsApp stop it, and nothing goes by email in their place: that is
 * the person's own word. Their stop link and opt-out stop the email. Never to somebody on approved leave.
 *
 * AT MOST ONE A PERSON A DAY. Kept in one `platform_settings` row per person and day (as a-message-sent-once keeps "once"), written when it
 * went or was held for the morning; the button then reads "Nudged at 10:40". Recorded in the notifications ledger by the door it went
 * through, under its own name: `sendTheLeadsNudge` by email, `lead-nudge` on WhatsApp.
 *
 * WHO MAY. The lead who runs the check-in, and nobody else: a team member, an admin who only reads, or somebody outside it is refused
 * (403), here on the server.
 */

export const THE_NUDGE_KEY = (participantId: string, day: string) => `engagement.lead-nudge.${participantId}.${day}`;
export const NUDGE_KIND = 'lead-nudge';
export const NUDGE_SENDER = 'sendTheLeadsNudge';

export interface ANudgeServed {
  participantId: string;
  firstName: string;
  /** "Nudge Peter", or "Nudged at 10:40" once she has. */
  says: string;
  nudgedAt: string | null;
}

export interface WhatBecameOfTheNudge {
  nudged: boolean;
  /** "10:40" in the organisation's zone, once nudged today. */
  at: string | null;
  /** What the lead reads, in a sentence. */
  says: string;
  channel?: 'whatsapp' | 'email' | null;
}

const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const firstOf = (p: any) => String(p?.user?.firstName ?? p?.nameGiven ?? '').trim().split(/\s+/)[0] || null;

/** The words of the nudge, from the lead by name, about the person's one thing today. */
export function theNudgeSays(firstName: string | null, leadFirst: string, opening: ATeamMembersOpening | null, label: string): { text: string; subject: string } {
  const name = firstName ? `${firstName}, ` : '';
  const one = opening?.things?.[0] ?? null;
  if (one) {
    return {
      text: `${name}this is from ${leadFirst}. ${capital(one.says)} ${one.asks}`.replace(/^this/, 'This'),
      subject: `${leadFirst} has a question for you today`,
    };
  }
  return {
    text: `${name}this is from ${leadFirst}. Your check-in for ${label} is still open today. Can you answer it now?`.replace(/^this/, 'This'),
    subject: `${leadFirst} is asking you to answer your check-in for ${label} today`,
  };
}

/** The day's nudge for this person, if the lead has sent one: when, as "10:40" in the zone. */
export async function theNudgeToday(prisma: any, participantId: string, now: Date, zone: string): Promise<string | null> {
  try {
    const row = await prisma?.platformSetting?.findUnique?.({ where: { key: THE_NUDGE_KEY(participantId, aDayIn(now, zone)) } });
    const at = (row?.value as any)?.at;
    return at ? aTimeOfDay(new Date(at), zone) : null;
  } catch {
    return null;
  }
}

/** For the board: each person the lead may nudge, with the button's words. Empty where the switch is off. */
export async function theNudgesOnTheBoard(prisma: any, organizationId: string | null, people: { participantId: string; firstName: string }[], now: Date): Promise<ANudgeServed[]> {
  if (!people.length || !organizationId || !(await theDirectMorningIsOn(prisma, organizationId))) return [];
  const zone = (await theOrganisationsZone(prisma, organizationId).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE;
  const out: ANudgeServed[] = [];
  for (const p of people) {
    const at = await theNudgeToday(prisma, p.participantId, now, zone);
    out.push({ participantId: p.participantId, firstName: p.firstName, nudgedAt: at, says: at ? `Nudged at ${at}` : `Nudge ${p.firstName}` });
  }
  return out;
}

@Injectable()
export class TheLeadsOwnNudgeService {
  private readonly logger = new Logger(TheLeadsOwnNudgeService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    @Optional() private whatsapp?: WhatsAppService,
  ) {}

  async nudge(groundId: string, participantId: string, requestingUserId: string, now: Date = new Date()): Promise<WhatBecameOfTheNudge> {
    const prisma: any = this.prisma;
    const ground = await prisma.ground.findUnique({
      where: { id: groundId },
      select: { id: true, label: true, organizationId: true, initiatorId: true, overWhatsApp: true,
        participants: { select: { id: true, userId: true, partyType: true, email: true, nameGiven: true, managingOnly: true, leftAt: true, user: { select: { firstName: true, email: true, phoneNumber: true, isActive: true, deletedAt: true } } } } },
    });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    /* The lead who runs it, and nobody else. Decided here, on the server. */
    if (!requestingUserId || ground.initiatorId !== requestingUserId) throw new ForbiddenException('Only the person who runs this check-in can nudge somebody in it.');
    if (!(await theDirectMorningIsOn(prisma, ground.organizationId))) throw new ForbiddenException('Nudging somebody from the board is not turned on for your organisation.');
    const isLead = (p: any) => p.partyType === PartyType.INITIATOR || p.userId === ground.initiatorId;
    const lead = (ground.participants ?? []).find(isLead);
    const them = (ground.participants ?? []).find((p: any) => p.id === participantId);
    if (!them || isLead(them) || them.managingOnly || them.leftAt) throw new NotFoundException('That person is not on this check-in’s team, so there is nobody to nudge.');
    const first = firstOf(them) ?? 'They';
    const leadFirst = firstOf(lead) ?? 'Your lead';
    const zone = (await theOrganisationsZone(prisma, ground.organizationId).catch(() => null)) ?? THE_PRODUCTS_OWN_ZONE;

    /* At most one a person a day. */
    const already = await theNudgeToday(prisma, participantId, now, zone);
    if (already) return { nudged: true, at: already, says: `Nudged at ${already}` };

    /* Only somebody with a session open today that they have not answered. */
    const sessions: ASessionOnRecord[] = await prisma.checkIn.findMany({
      where: { groundId, participantId },
      select: { id: true, participantId: true, sessionNumber: true, status: true, isSetup: true, completedAt: true, availableFrom: true, createdAt: true, closedReason: true },
    });
    const day = theirDay(participantId, sessions, now, zone);
    if (day.answeredToday) return { nudged: false, at: null, says: `${first} has already checked in today, so no nudge was sent.` };
    if (!day.dueToday) return { nudged: false, at: null, says: `${first} has no check-in open today, so no nudge was sent.` };
    const away = (await whoOnACheckInIsAway(prisma, groundId, now).catch(() => new Map())).get(participantId);
    if (away) return { nudged: false, at: null, says: `${first} is on approved leave, so no nudge was sent.` };
    if (them.user && (them.user.isActive === false || them.user.deletedAt)) return { nudged: false, at: null, says: `${first} can no longer sign in, so no nudge was sent.` };

    const open = sessions.filter((c) => String(c.status).toUpperCase() !== 'COMPLETED' && !c.isSetup).sort((a, b) => Number(b.sessionNumber ?? 0) - Number(a.sessionNumber ?? 0))[0] as any;
    const opening = await aTeamMembersOpeningFor(prisma, { groundId, participantId, sessionNumber: open?.sessionNumber ?? null, now }).catch(() => null);
    const words = theNudgeSays(first === 'They' ? null : first, leadFirst, opening, ground.label);

    /* One channel: WhatsApp where they have a number and the check-in is answered there, else email; email too where WhatsApp cannot take it. */
    const address = String(them.user?.email ?? them.email ?? '').trim();
    const person = address ? await prisma.person?.findFirst?.({ where: { organizationId: ground.organizationId, email: { equals: address, mode: 'insensitive' }, active: true }, select: { phone: true } }).catch(() => null) : null;
    const phone = person?.phone ?? them.user?.phoneNumber ?? null;
    let channel: 'whatsapp' | 'email' | null = null;
    let outcome: 'sent' | 'held' | 'stopped' | 'not sent' = 'not sent';
    if (phone && ground.overWhatsApp !== false && this.whatsapp) {
      const r = await this.whatsapp.sendFor(ground.organizationId, phone, words.text, {
        checkInId: open?.id ?? null, kind: NUDGE_KIND, params: [first, ground.label, leadFirst], paramsFor: { groundwork_first_contact: [words.text] },
      }).catch((err: any) => ({ sent: false, error: String(err?.message ?? 'failed') }));
      if (r.sent) { channel = 'whatsapp'; outcome = 'sent'; }
      else if (isHeldForTheNight(r.error)) { channel = 'whatsapp'; outcome = 'held'; }
      else if (r.error === THEY_SAID_STOP || r.error === THEY_SAID_NOT_NOW) {
        return { nudged: false, at: null, channel: null, says: r.error === THEY_SAID_STOP ? `${first} said STOP on WhatsApp, so no nudge was sent, and you can call ${first} instead.` : `${first} replied "Not now" on WhatsApp today, so no nudge was sent, and you can call ${first} instead.` };
      }
    }
    if (!channel && address && !/@unclaimed\.invalid$/i.test(address)) {
      const link = open?.id ? this.email.buildCheckInUrl(open.id) : `${String((this.email as any).frontendUrl ?? '').replace(/\/$/, '')}/grounds/${groundId}`;
      const went = await this.email.sendTheLeadsNudge(address, words.subject, [words.text], 'Open your check-in', link, participantId).catch((err: any) => { this.logger.warn(`The lead's nudge to ${participantId} could not be emailed: ${err?.message}`); return 'failed' as const; });
      if (went === 'sent' || went === 'held') { channel = 'email'; outcome = went; }
      else if (went === 'suppressed') outcome = 'stopped';
    }
    if (!channel) {
      return { nudged: false, at: null, channel: null, says: outcome === 'stopped' ? `${first} has turned these messages off, so no nudge was sent, and you can call ${first} instead.` : `The nudge to ${first} could not be sent, so you can call ${first} instead.` };
    }
    const value = { at: now.toISOString(), channel, outcome, by: requestingUserId };
    try { await prisma.platformSetting.create({ data: { key: THE_NUDGE_KEY(participantId, aDayIn(now, zone)), value, updatedBy: 'engagement' } }); }
    catch { try { await prisma.platformSetting.update({ where: { key: THE_NUDGE_KEY(participantId, aDayIn(now, zone)) }, data: { value, updatedBy: 'engagement' } }); } catch { /* another copy wrote it */ } }
    const at = aTimeOfDay(now, zone);
    return { nudged: true, at, channel, says: outcome === 'held' ? `You nudged ${first} at ${at}, and it goes at 7am, after quiet hours.` : `Nudged at ${at}` };
  }
}
