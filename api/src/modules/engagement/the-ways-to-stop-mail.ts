import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * STOPPING THE MAIL WE DECIDE TO SEND, FOR EVERYONE, WITH A QUESTION FIRST (decision 109, spec 27 to 31).
 *
 * Three things were wrong. The footer link existed only for people on a roster, so somebody invited by
 * address, or who had an account and no roster row, had no way out. The link stopped the mail on the
 * first GET, which a mail security scanner makes without a person. And nothing said what they would stop
 * receiving, or how to get it back.
 *
 * NOW. The link opens a question. Only an answer stops anything: a person pressing the button, or a mail
 * program making the one-click POST that the List-Unsubscribe header promises. The wording differs by
 * role, because what a lead loses is not what a participant loses. It stops only what we decided to send
 * (`whetherToSend`): sign-in links, invitations, reports somebody took part in, approvals and billing
 * notices keep arriving, and the page says so.
 */

export const LEAD_LOSES =
  "If you turn these emails off, you won't receive Groundwork's email insights about team progress, stalled engagement, emerging differences, people who may need attention, positive contributions or recommendations for what to do next, and reminders that your check-in is open or running out of time. You can still access Groundwork directly.";
export const PARTICIPANT_LOSES =
  "If you turn these emails off, you won't receive Groundwork's email summaries about your progress, open commitments, blockers, things you're waiting on, or useful changes between check-ins, and reminders that your check-in is open or running out of time. You can still use Groundwork directly.";
export const OTHER_LOSES =
  "If you turn these emails off, you won't receive Groundwork's email summaries, or reminders that a check-in is open or running out of time. You can still use Groundwork directly.";
export const WHAT_STILL_ARRIVES =
  'Emails you ask for will still reach you, such as sign-in links, invitations, reports from check-ins you took part in, anything you asked the assistant to send you, approvals waiting for you, and notices about billing.';
export const THE_TEAM_CONSEQUENCE =
  'Groundwork can still use the information available inside the product, but you may miss timely insights or follow-ups that would normally reach you by email.';

export const THE_SETTINGS_LABEL = {
  title: 'Emails from Groundwork that we decide to send',
  detail: 'Reminders, summaries and insights Groundwork sends without being asked.',
  /** Shown instead of the switch being on, when they used the link in a mail. */
  stoppedFromAMail:
    'You turned these off from a link in one of our emails. Turn them back on here whenever you like.',
};

export const NOT_A_LINK_WE_KNOW_TITLE = 'That link is not one we recognise';
export const NOT_A_LINK_WE_KNOW_SAYS = 'Nothing has been changed. If emails you do not want are still arriving, reply to one and we will stop them by hand.';

export type TheirRole = 'lead' | 'participant' | 'other';

@Injectable()
export class TheWaysToStopMail {
  constructor(private readonly prisma: PrismaService) {}

  /** Who a token belongs to: an address, and the rows it speaks for. Null when the link is not one of ours. */
  private async whoseToken(token: string): Promise<{ email: string | null } | null> {
    const t = (token ?? '').trim();
    if (!t) return null;
    const row = await this.prisma.emailPreference.findUnique({ where: { unsubscribeToken: t }, select: { organizationId: true, personExternalId: true } });
    if (row) {
      const p = await this.prisma.person.findFirst({ where: { organizationId: row.organizationId, externalId: row.personExternalId }, select: { email: true } });
      return { email: p?.email?.trim().toLowerCase() ?? null };
    }
    const byAddress = await this.prisma.emailAddressPreference.findUnique({ where: { unsubscribeToken: t }, select: { email: true } });
    return byAddress ? { email: byAddress.email } : null;
  }

  async roleOf(email: string | null): Promise<TheirRole> {
    if (!email) return 'other';
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      const led = await this.prisma.ground.findFirst({ where: { initiatorId: user.id }, select: { id: true } });
      return led ? 'lead' : 'participant';
    }
    const took = await this.prisma.groundParticipant.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
    return took ? 'participant' : 'other';
  }

  private async stoppedFor(email: string | null, token: string): Promise<boolean> {
    if (email) {
      const a = await this.prisma.emailAddressPreference.findUnique({ where: { email }, select: { unsubscribedAt: true } });
      if (a?.unsubscribedAt) return true;
      const people = await this.prisma.person.findMany({ where: { email: { equals: email, mode: 'insensitive' } }, select: { organizationId: true, externalId: true } });
      if (people.length) {
        const rows = await this.prisma.emailPreference.findMany({
          where: { OR: people.map((p) => ({ organizationId: p.organizationId, personExternalId: p.externalId })) },
          select: { unsubscribedAt: true },
        });
        return rows.some((r) => !!r.unsubscribedAt);
      }
      return false;
    }
    const r = await this.prisma.emailPreference.findUnique({ where: { unsubscribeToken: token }, select: { unsubscribedAt: true } });
    return !!r?.unsubscribedAt;
  }

  /** What the link's page shows. Changes nothing: a scanner that opens it stops no mail. */
  async describe(token: string) {
    const who = await this.whoseToken(token);
    if (!who) {
      return { known: false, stopped: false, title: NOT_A_LINK_WE_KNOW_TITLE, says: [NOT_A_LINK_WE_KNOW_SAYS] };
    }
    const role = await this.roleOf(who.email);
    const stopped = await this.stoppedFor(who.email, token);
    const loses = role === 'lead' ? LEAD_LOSES : role === 'participant' ? PARTICIPANT_LOSES : OTHER_LOSES;
    return {
      known: true,
      stopped,
      role,
      title: stopped ? 'These emails are already turned off' : 'Do you want to stop the emails from Groundwork that we decide to send?',
      says: stopped ? [WHAT_STILL_ARRIVES] : role === 'other' ? [loses, WHAT_STILL_ARRIVES] : [loses, THE_TEAM_CONSEQUENCE, WHAT_STILL_ARRIVES],
      keepLabel: 'Keep email insights',
      stopLabel: 'Turn off email insights',
      turnBackOnLabel: 'Turn email insights back on',
    };
  }

  /** The answer. Stops every row for the address, so one choice holds everywhere they are written to. */
  async stop(token: string) {
    const who = await this.whoseToken(token);
    if (!who) return { ok: true, known: false, stopped: false, title: NOT_A_LINK_WE_KNOW_TITLE, says: NOT_A_LINK_WE_KNOW_SAYS, canUndo: false };
    await this.setStopped(who.email, token, new Date());
    /* Settings is where somebody with an account turns them back on. Somebody without one has only this link, so it is the way back. */
    const account = who.email ? await this.prisma.user.findUnique({ where: { email: who.email }, select: { id: true } }) : null;
    const way = account ? 'You can turn them back on in Settings.' : 'Open this link again to turn them back on.';
    return { ok: true, known: true, stopped: true, title: 'These emails are turned off', says: `Groundwork will stop sending these emails. ${WHAT_STILL_ARRIVES} ${way}`, canUndo: true, hasAnAccount: !!account };
  }

  async turnBackOn(token: string) {
    const who = await this.whoseToken(token);
    if (who) await this.setStopped(who.email, token, null);
    return { ok: true, stopped: false, says: 'These emails are back on.' };
  }

  /** Settings: the signed-in person turns them back on, whichever row was stopped. */
  async turnBackOnFor(email: string) {
    await this.setStopped(email.trim().toLowerCase(), '', null);
  }

  async stoppedFromAMail(email: string): Promise<boolean> {
    return this.stoppedFor(email.trim().toLowerCase(), '');
  }

  private async setStopped(email: string | null, token: string, at: Date | null) {
    if (!email) {
      await this.prisma.emailPreference.updateMany({ where: { unsubscribeToken: token }, data: { unsubscribedAt: at } });
      return;
    }
    const people = await this.prisma.person.findMany({ where: { email: { equals: email, mode: 'insensitive' } }, select: { organizationId: true, externalId: true } });
    if (people.length) {
      await this.prisma.emailPreference.updateMany({ where: { OR: people.map((p) => ({ organizationId: p.organizationId, personExternalId: p.externalId })) }, data: { unsubscribedAt: at } });
    }
    /* The address row too: whoever has no roster row, and whoever is on a roster that is later removed. */
    if (at) {
      await this.prisma.emailAddressPreference.upsert({
        where: { email },
        create: { email, unsubscribeToken: crypto.randomBytes(32).toString('base64url'), unsubscribedAt: at },
        update: { unsubscribedAt: at },
      });
    } else {
      await this.prisma.emailAddressPreference.updateMany({ where: { email }, data: { unsubscribedAt: null } });
    }
  }
}
