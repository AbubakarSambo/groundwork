import { theOutboxKey, mayItGo } from '../../common/the-one-outbox';
/** What a message already sent is answered: nothing goes. */
const ALREADY_SENT = 'already sent';
import * as crypto from 'crypto';
import { aPersonNeverReadsAnInternalName } from '../../common/no-internal-name-reaches-a-person';
import { sealTheirKey, theirKey, theServerCanKeepSecrets, THE_SERVER_HAS_NO_KEY, isSealed, THEIR_KEYS_CANNOT_BE_OPENED, KEYS_NEED_TYPING_AGAIN, theKeysCannotBeOpened, whyItCannot } from './an-organisations-own-keys';
import { OnModuleInit, Injectable, Logger, UnauthorizedException, BadRequestException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Did it go. One shape from both numbers; see sendMessage. */
export type SendResult = { sent: boolean; status?: number; error?: string; /** Meta's id for the message, so a reply to it can be traced back (decision 106 item 1). */ messageId?: string };

/** The body Meta answered with, or nothing when it cannot be read. Never throws. */
async function readTheBody(res: any): Promise<string> {
  try { return typeof res?.text === 'function' ? String((await res.text()) ?? '') : ''; } catch { return ''; }
}

/** Meta's id for a message it accepted, from the body it answered with. Undefined when there is none. */
/** WhatsApp refuses a text over 4,096 characters (B-144). Anything longer is cut at a sentence and says where the rest is. */
export const WHATSAPP_TEXT_LIMIT = 4096;
const THE_REST_IS_IN_THE_APP = ' The rest is in Groundwork.';
export function withinWhatsAppsLimit(text: string): string {
  if (text.length <= WHATSAPP_TEXT_LIMIT) return text;
  const room = WHATSAPP_TEXT_LIMIT - THE_REST_IS_IN_THE_APP.length - 1;
  const cut = text.slice(0, room);
  const at = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'), cut.lastIndexOf('\n'));
  return `${(at > room / 2 ? cut.slice(0, at + 1) : cut.replace(/\s+\S*$/, '')).trimEnd()}${THE_REST_IS_IN_THE_APP}`;
}

export function theMessageIdIn(body: string): string | undefined {
  try { const id = JSON.parse(body)?.messages?.[0]?.id; return typeof id === 'string' && id ? id : undefined; } catch { return undefined; }
}
/** What a send was for, so the row can be found later. Both optional: a notice has no check-in. */
export type SendContext = {
  checkInId?: string | null;
  kind?: string;
  /** The product's own words for the template's {{1}}, {{2}}, used when the message has to go as a template. */
  params?: string[];
  /** The words for a newer template's blanks, by its name, where they differ from `params` (a-message-outside-the-window.ts, THE_NEWER_TEMPLATE_FIRST). */
  paramsFor?: Record<string, string[]>;
  /** Set only by held-for-the-night.cron.ts: the message was held for quiet hours and its morning has come, so the night is not asked again. */
  afterTheNight?: boolean;
};

/**
 * WHAT META REFUSED, WITHOUT WHAT WE SENT IT (G4).
 *
 * A failed send used to log two hundred characters of Meta's response body. That body quotes the
 * request back, so a delivery failure wrote the message - somebody's check-in question, or their
 * own report - into the application log. The code and type are what a failure is diagnosed from;
 * the free-text half is Meta's prose about our request and is not needed to act on it.
 */
/**
 * How long the read receipt and typing indicator may take before it is abandoned. It is a courtesy
 * on the way to the real answer, so it never waits longer than the answer would have taken anyway.
 */
export const READ_RECEIPT_DEADLINE_MS = 5_000;

export function metaErrorCode(body: string): string {
  try {
    const e = (JSON.parse(body) ?? {}).error ?? {};
    const bits = [e.type, e.code, e.error_subcode].filter((b: unknown) => b !== undefined && b !== null);
    return bits.length ? bits.join('/') : 'no error code';
  } catch {
    return 'unparseable error body';
  }
}
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { META_REFUSED_IT, ALREADY_GO_BY_EMAIL, AN_OPENING, BY_EMAIL_ROUTINE, BY_EMAIL_AFTER_THEIR_OWN, THE_OPENING_EMAILS, oneMessage, theOnceKey, theSenderFor, theSubjectFor, theWordsForAnEmail, whatsAppCouldNotTakeIt } from './by-email-instead';
import { hasBeenToldOnce, nowToldOnce } from '../engagement/a-message-sent-once';
import { WhatsAppAddOnService } from '../billing/whatsapp-add-on.service';
import { aLocalForm, callingCodeOf, formsOfTheSameNumber, tidyANumber } from './a-number-whatsapp-can-reach';
import { theCountryCodeOf, tidyANumberFor } from './the-organisations-country';
import { itSendsFromTheirNumber, WHAT_SAYS_IT_WORKS, whatIsMissingFrom, NOTHING_WAS_SAVED_BECAUSE, THIS_IS_FOR_YOUR_OWN_NUMBER, THAT_IS_A_TEAM_MEMBERS_NUMBER, A_PHONE_NUMBER_IS_NOT_ITS_ID } from './a-connection-that-works';
import { WhichNumber, inboundKeysFrom, whichNumberOf } from './one-number-per-conversation';
import { GroundworksOwnNumber, OurNumber } from './groundworks-own-number';
import { aSignInsNumberChanged, refuseANumberOnSomebodyElse } from './one-number-for-a-person';
import { FIRST_CONTACT, FIRST_CONTACT_NOT_APPROVED, theFirstContactLine } from './the-first-message-to-a-number';
import { aRoutineWhatsApp, theirRoutineMessagesToday } from '../engagement/one-routine-message-a-day';
import { heldUntilTheMorning, QUIET_HOURS_HELD } from './quiet-hours-are-the-organisations';
import { ATemplate, insideTheServiceWindow, isBusinessInitiated, WENT_BEFORE_THIS_RELEASE, NOT_TURNED_ON_QUIETLY, templateFor, theTemplateToUse, OUTSIDE_THE_WINDOW, THEY_SAID_STOP, FIRST_MESSAGES, APPROVALS, ONLY_HELD_BY_NOT_NOW, OPENING_OR_CLOSING, NOT_TODAY, THEY_SAID_NOT_NOW, NEVER_THE_FIRST_MESSAGE } from './a-message-outside-the-window';

/**
 * Single Groundwork-owned WhatsApp Business number, shared across every org -
 * there is no per-org toggle. A phone number identifies exactly one account
 * (User.phoneNumber is globally unique), so inbound messages are matched to
 * a user by number alone ("it detects your number").
 *
 * Until WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID are set, sends are
 * dev-logged only - mirrors EmailService's [DEV EMAIL] pattern so the rest
 * of the app can wire against this service today and it goes live the
 * moment credentials land, with no code change.
 */
/** The messages that say "in an hour" or "in half an hour": by the morning after a night held, the moment they were about has passed. */
export const ABOUT_THE_NEXT_HOUR: ReadonlySet<string> = new Set(['opens-soon', 'closes-soon', 'closes-in-half-an-hour']);
export const THE_HOUR_IT_WAS_ABOUT_HAS_PASSED = 'Held for quiet hours, and the hour it was about has passed; not sent';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    /*
     * WHATSAPP IS A PAID ADD-ON, WITH A MONTHLY LIMIT (decision 78). Asked before every message an
     * organisation's check-ins send, and told about every one that went. Optional only so a test that
     * builds this by hand without it still runs; Nest always provides it.
     */
    @Optional() private addOn?: WhatsAppAddOnService,
    /* For a message WhatsApp could not take: the same message, by email instead (by-email-instead.ts). Optional and last, so a test that builds this by hand still runs. */
    @Optional() private email?: EmailService,
  ) {
    this.ownNumber = new GroundworksOwnNumber(config, prisma);
  }

  /**
   * GROUNDWORK'S OWN NUMBER AND ITS KEYS: saved in the back office first (/admin/whatsapp), the
   * WHATSAPP_* server settings when nothing is saved there. Every send on our number, the signature
   * check and the verify-token check read it here. See groundworks-own-number.ts.
   */
  readonly ownNumber: GroundworksOwnNumber;

  /** The back office's page for our number: the IDs, "set" or "not set" for each secret, the webhook address and the switch. */
  async ourNumberAsStaffReadIt() {
    const [page, toggle] = await Promise.all([
      this.ownNumber.asStaffReadIt(this.config.get<string>('app.publicApiUrl')),
      this.getToggleState(),
    ]);
    return {
      ...page,
      switch: {
        ...toggle,
        saying: toggle.live
          ? 'WhatsApp is on for everyone. Messages go from this number.'
          : toggle.adminEnabled
            ? 'WhatsApp is switched on, but nothing can go until the phone number ID and the access token are both set.'
            : toggle.credentialsConfigured
              ? 'WhatsApp is switched off. Nothing goes from this number until you switch it on in the System tab.'
              : 'WhatsApp is switched off, and the phone number ID and the access token are not both set yet.',
      },
    };
  }

  /** The number, its keys and whether both the token and the number ID are there. */
  async ours(): Promise<OurNumber> {
    return this.ownNumber.inUse();
  }

  /**
   * WHOSE MESSAGE THIS IS, for the add-on and the limit. A send on our own number carries no
   * organisation, so it is read from the check-in it is about, or from the number when exactly one
   * organisation has it. Null when nobody can be named, which is a message about finding the person
   * their organisation (not recognised, or which one), and those are never held.
   */
  private async whoseMessage(context: SendContext, to: string): Promise<string | null> {
    if (context.checkInId) {
      const ci = await this.prisma.checkIn
        .findUnique({ where: { id: context.checkInId }, select: { ground: { select: { organizationId: true } } } })
        .catch(() => null);
      if (ci?.ground?.organizationId) return ci.ground.organizationId;
    }
    const orgs = await this.whichOrganisations(to).catch(() => [] as { id: string }[]);
    return orgs.length === 1 ? orgs[0].id : null;
  }

  /**
   * HELD, WHEN THE ORGANISATION HAS NOT TURNED WHATSAPP ON OR HAS USED THIS MONTH'S MESSAGES. Nothing
   * goes by WhatsApp; the send record says why in the sentence the person reads in the app, and the
   * month's count of held messages goes up (at the limit, the admins are told once). Null when it may go.
   */
  private async heldFor(organizationId: string | null, to: string, context: SendContext): Promise<SendResult | null> {
    if (!organizationId || !this.addOn) return null;
    const may = await this.addOn.mayWeSend(organizationId);
    if (may.send) return null;
    const result: SendResult = { sent: false, error: may.saying };
    await this.writeItDown(organizationId, to, result, { ...context, kind: context.kind ? `${context.kind}:held` : 'held' });
    await this.addOn.countHeld(organizationId, may.why);
    await this.tellThemItIsHeld(organizationId, to, context, may.saying).catch((err: any) => this.logger.warn(`Could not tell ${to} that WhatsApp is held: ${err?.message}`));
    return result;
  }

  /**
   * NEVER SILENCE WHEN WHATSAPP IS HELD (decision 82, item 4; morning report item 71). A person who
   * wrote and heard nothing reads the product as dead. So when a message is held by the add-on or the
   * month's limit and the person wrote in the last 24 hours (a reply always is), they get ONE free
   * message, not counted towards the month, saying why and that the check-in carries on in the app.
   * Once in any 24 hours, so a conversation does not become a stream of the same sentence. Outside
   * the 24 hours nothing can go at all, and the app says it from the send record.
   */
  static heldSaying(saying: string): string {
    return `${saying} You can carry on in the Groundwork app.`;
  }

  private async tellThemItIsHeld(organizationId: string, to: string, context: SendContext, saying: string): Promise<void> {
    const forms = formsOfTheSameNumber(to);
    if (isBusinessInitiated(context.kind)) {
      const person = await this.prisma.person
        ?.findFirst({ where: { organizationId, phone: { in: forms } }, select: { whatsappLastInboundAt: true } })
        .catch(() => null);
      if (!insideTheServiceWindow(person?.whatsappLastInboundAt)) return;
    }
    const told = await (this.prisma.whatsAppSend as any)
      ?.findFirst?.({ where: { phone: { in: forms }, kind: 'held-told', sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, select: { id: true } })
      ?.catch?.(() => null);
    if (told) return;
    const text = WhatsAppService.heldSaying(saying);
    const own = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } }).catch(() => null);
    let result: SendResult;
    if (own && itSendsFromTheirNumber(own)) result = theirKey(own, 'accessToken') ? await this.deliver(own.phoneNumberId, theirKey(own, 'accessToken'), to, text) : { sent: false, error: THEIR_KEYS_CANNOT_BE_OPENED };
    else if (await this.isEnabled()) { const ours = await this.ours(); result = await this.post(ours.phoneNumberId ?? '', ours.accessToken ?? '', to, text); }
    else result = { sent: false, error: 'WhatsApp is not configured on this deployment' };
    /* Written down, never counted: this one is free. */
    await this.writeItDown(organizationId, to, result, { checkInId: context.checkInId ?? null, kind: 'held-told' });
  }

  /** The messages that are about the next hour, so are untrue once a night has passed. */
  static readonly ABOUT_THE_NEXT_HOUR = ABOUT_THE_NEXT_HOUR;

  /**
   * HELD FOR THE NIGHT (release plan Part 0; Drop Access run 1, item 12). A message Groundwork starts, asked to go in quiet hours
   * where the organisation is, is kept with its words and sent at seven by held-for-the-night.cron.ts, which asks every other rule
   * again then (STOP, "Not now", one a day, the 24 hours). A reply is never held. Where the hold cannot be written (no such table, as
   * in a test built by hand), the message goes now rather than being lost. Null when it may go now.
   */
  private async heldForTheNight(organizationId: string | null, to: string, text: string, context: SendContext): Promise<SendResult | null> {
    if (context.afterTheNight || !isBusinessInitiated(context.kind)) return null;
    const scheduled = (this.prisma as any).scheduledWhatsApp;
    if (!organizationId || typeof scheduled?.create !== 'function') return null;
    try {
      const until = await heldUntilTheMorning(this.prisma, organizationId);
      if (!until) return null;
      const { afterTheNight: _ignored, ...kept } = context;
      await scheduled.create({ data: { organizationId, phone: to, text, context: kept as any, notBefore: until } });
      const result: SendResult = { sent: false, error: QUIET_HOURS_HELD(until) };
      await this.writeItDown(organizationId, to, result, { ...context, kind: context.kind ? `${context.kind}:quiet-hours` : 'quiet-hours' });
      this.logger.log(`Holding a WhatsApp message to ${to} until ${until.toISOString()} (quiet hours where the organisation is).`);
      return result;
    } catch (err: any) {
      this.logger.warn(`Could not hold a WhatsApp message to ${to} for the night: ${err?.message}; sending now.`);
      return null;
    }
  }

  /** A message held for the night, when its morning has come. Every other rule is asked again on the way. */
  async sendHeldForTheNight(row: { organizationId: string | null; phone: string; text: string; context: unknown }): Promise<SendResult> {
    const context = { ...((row.context ?? {}) as SendContext), afterTheNight: true };
    /*
     * "OPENS IN AN HOUR" IS NEVER SENT THE MORNING AFTER (engine test, Muchemi & Co, Sunday 18 October). At 9pm Aisha, Njeri and Brian
     * were each to be told "your check-in for Fee notes opens in an hour, at 12:00 am East Africa Time". It was quiet hours, so it was
     * held, and at seven the next morning it went out beside "your check-in for Fee notes is open". A message about the next hour or
     * half hour is about a moment that has passed by the morning: it is written down as not sent, with the reason, and never sent.
     */
    if (ABOUT_THE_NEXT_HOUR.has(String(context.kind ?? '').replace(/:template$/, ''))) {
      const result: SendResult = { sent: false, error: THE_HOUR_IT_WAS_ABOUT_HAS_PASSED };
      await this.writeItDown(row.organizationId, row.phone, result, context);
      return result;
    }
    return row.organizationId ? this.sendFor(row.organizationId, row.phone, row.text, context) : this.sendMessage(row.phone, row.text, context);
  }

  /** A message that went counts towards its organisation's month. */
  private async counted(organizationId: string | null, result: SendResult): Promise<SendResult> {
    if (organizationId && result.sent && this.addOn) await this.addOn.countSent(organizationId);
    return result;
  }

  private static readonly TOGGLE_KEY = 'whatsapp_enabled';

  /**
   * Two independent gates, both must pass:
   * (1) credentials configured (WHATSAPP_ACCESS_TOKEN/PHONE_NUMBER_ID) - this
   *     is the "is it technically available" check.
   * (2) the GW admin toggle - "should we actually use it right now."
   * Credentials being set does not turn WhatsApp on by itself; an admin must
   * flip the toggle once they've verified the integration.
   */

  /**
   * MESSAGES FROM META, OR NOTHING.
   *
   * The inbound handler used to trust `message.from` - a phone number written in the request body -
   * as proof of identity, and then wrote into that person's private check-in as them. Nothing
   * verified the request came from Meta at all: the class was `@Public()`, the admin toggle and the
   * credential check both govern SENDING, and the GET handler's verifyToken is only the subscribe
   * handshake. So anyone who knew one linked number could author somebody else's answers.
   *
   * FAIL CLOSED, in the same shape the Resend webhook already uses: no secret, no header, a
   * malformed header or a mismatch all reject and nothing is processed. An unconfigured deployment
   * therefore has no live inbound path, which is the correct default for a channel that writes to
   * the record.
   *
   * Compared with `timingSafeEqual` on equal-length buffers, so the comparison cannot leak the
   * expected digest a byte at a time.
   */
  async verifySignature(headers: Record<string, string | string[] | undefined>, raw: Buffer): Promise<void> {
    const secret = (await this.ours()).appSecret;
    if (!secret) throw new UnauthorizedException('That message could not be checked as coming from WhatsApp, so it was not accepted.');

    const header = headers['x-hub-signature-256'];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided || !provided.startsWith('sha256=')) {
      throw new UnauthorizedException('That message could not be checked as coming from WhatsApp, so it was not accepted.');
    }

    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const got = provided.slice('sha256='.length);
    /** Length check first: timingSafeEqual throws on unequal lengths rather than returning false. */
    if (got.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(got, 'utf8'), Buffer.from(expected, 'utf8'))) {
      throw new UnauthorizedException('That message could not be checked as coming from WhatsApp, so it was not accepted.');
    }
  }

  async isEnabled(): Promise<boolean> {
    if (!(await this.ours()).enabled) return false;
    const setting = await this.prisma.platformSetting.findUnique({ where: { key: WhatsAppService.TOGGLE_KEY } });
    return setting?.value === true;
  }

  async getToggleState(): Promise<{ credentialsConfigured: boolean; adminEnabled: boolean; live: boolean; displayNumber?: string | null }> {
    const ours = await this.ours();
    const credentialsConfigured = ours.enabled;
    const setting = await this.prisma.platformSetting.findUnique({ where: { key: WhatsAppService.TOGGLE_KEY } });
    const adminEnabled = setting?.value === true;
    /* The number people read is not a secret; it rides with the switch so every reader of the switch has it. */
    return { credentialsConfigured, adminEnabled, live: credentialsConfigured && adminEnabled, displayNumber: ours.displayNumber ?? null };
  }

  async setEnabled(enabled: boolean, adminUserId: string): Promise<void> {
    await this.prisma.platformSetting.upsert({
      where: { key: WhatsAppService.TOGGLE_KEY },
      create: { key: WhatsAppService.TOGGLE_KEY, value: enabled, updatedBy: adminUserId },
      update: { value: enabled, updatedBy: adminUserId },
    });
  }

  /**
   * The one stored form ("+2348012345678") of a number that already carries its country, such as
   * the number WhatsApp sends. A local number cannot be tidied without its organisation's country;
   * see `tidyFor` for numbers people type.
   */
  static normalize(rawNumber: string): string {
    const tidied = tidyANumber(rawNumber ?? '');
    if ('number' in tidied) return tidied.number;
    const digits = (rawNumber ?? '').trim().replace(/[^\d+]/g, '');
    return digits.startsWith('+') ? digits : `+${digits}`;
  }

  /**
   * A NUMBER SOMEBODY TYPED, IN THE ONE STORED FORM (survey item 6). A local number takes the
   * organisation's country; with none known it is refused with a sentence asking for the whole number.
   */
  async tidyFor(organizationId: string | null, rawNumber: string): Promise<string> {
    return tidyANumberFor(this.prisma as any, organizationId, rawNumber);
  }

  /** The number to send to: a stored local number gets its organisation's country, when one is known. */
  private async reachable(organizationId: string | null, rawNumber: string): Promise<string> {
    if (!aLocalForm(rawNumber)) return WhatsAppService.normalize(rawNumber);
    return this.tidyFor(organizationId, rawNumber).catch(() => WhatsAppService.normalize(rawNumber));
  }

  /**
   * A ROW FOUND BY THE LOCAL FORM OF A NUMBER IS THE SAME NUMBER ONLY IN ITS OWN COUNTRY. "0801..."
   * kept by a Nigerian organisation is "+234801..."; kept by a Kenyan one it is somebody else.
   */
  private async theSameNumber(organizationId: string | null, stored: string | null | undefined, incoming: string): Promise<boolean> {
    if (!aLocalForm(stored)) return true;
    const code = await theCountryCodeOf(this.prisma as any, organizationId);
    return !!code && code === callingCodeOf(incoming);
  }

  /**
   * Send a WhatsApp message to a phone number. Returns true if actually sent
   * via the API, false if dev-logged only (no credentials configured yet).
   */
  /**
   * ONE ANSWER TO "DID IT GO", FROM BOTH NUMBERS. `sendMessage` (the platform number) threw on a
   * non-2xx while `deliver` (an organisation's own number) returned false, so the same failure
   * reached a caller two different ways and the register's own description of it was half right.
   * Both return this now, both write a WhatsAppSend row, and neither throws into the flow of the
   * check-in it was about: a message that could not go is a fact to record, not a failure of the
   * conversation.
   */
  async sendMessage(phoneNumber: string, text: string, context: SendContext = {}): Promise<SendResult> {
    let to = WhatsAppService.normalize(phoneNumber);
    const org = this.addOn ? await this.whoseMessage(context, to) : null;
    if (aLocalForm(phoneNumber)) to = await this.reachable(org, phoneNumber);
    const held = (await this.heldFor(org, to, context)) ?? (await this.heldForTheNight(org, to, text, context));
    if (held) return held;
    /* Free text only: a template's fixed words are Meta's and never pass through here. No internal name is ever sent (night quality run 2). */
    return this.sendOnOurNumber(org, to, aPersonNeverReadsAnInternalName(text, 'a WhatsApp reply', this.logger), context);
  }

  /** Our own number, once the add-on and the limit have said it may go. */
  private async sendOnOurNumber(org: string | null, to: string, text: string, context: SendContext): Promise<SendResult> {
    const gate = await this.mayInitiate(org, to, context, 'ours', text);
    if (!gate.free) {
      if (gate.quiet) return { sent: false, error: gate.because };
      if (gate.template) { const ours = await this.ours(); return this.sendTemplate(ours.phoneNumberId ?? '', ours.accessToken ?? '', org, to, text, gate.template, gate.params ? { ...context, params: gate.params } : context); }
      const result: SendResult = { sent: false, error: gate.because };
      await this.writeItDown(org, to, result, context);
      await this.byEmailInstead(org, to, text, context, gate.because);
      return result;
    }
    if (!(await this.isEnabled())) {
      /*
       * THE BODY ONLY OUTSIDE PRODUCTION.
       *
       * This branch is "the channel is off", not "this is a developer's laptop" — and a production
       * deployment with no WhatsApp credentials configured is exactly that state. So a message
       * meant for one person's phone was written into the production log, where staff can read it.
       * The address stays because knowing a send was attempted and to whom is the point of the
       * line; the body is somebody's message.
       */
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn(`WhatsApp is not configured; a message to ${to} was not sent (${text.length} characters).`);
      } else {
        /* The length, never the message. A check-in question and a person's own report both go
           out this way, and a local log is still a log (G4). */
        this.logger.warn(`[DEV WHATSAPP] a message of ${text.length} characters was not sent.`);
      }
      const result: SendResult = { sent: false, error: 'WhatsApp is not configured on this deployment' };
      await this.writeItDown(org, to, result, context);
      return result;
    }

    const ours = await this.ours();
    const result = await this.post(ours.phoneNumberId ?? '', ours.accessToken ?? '', to, await this.namedForSomebodyInTwoOrganisations(org, to, text, context));
    if (result.sent) this.logger.log(`WhatsApp message sent to ${to}`);
    await this.writeItDown(org, to, result, context);
    if (!result.sent && result.status) await this.byEmailInstead(org, to, text, context, META_REFUSED_IT);
    return this.counted(org, result);
  }

  /**
   * WHERE META'S GRAPH API IS. Meta's own address unless WHATSAPP_GRAPH_BASE_URL says otherwise, which only a test
   * sets (to a recorder on this machine, so a local run of the journeys sends nothing to anyone).
   */
  private graphBase(): string {
    return (this.config.get<string>('whatsapp.graphBaseUrl') || 'https://graph.facebook.com/v20.0').replace(/\/+$/, '');
  }

  /**
   * IS GROUNDWORK'S NUMBER CONNECTED? One cheap read of the phone number ID with the token in use,
   * for the back office. The token goes in the header and nowhere else: not in the answer, not in a
   * log line. Says what Meta answered in a sentence.
   */
  async isOurNumberConnected(): Promise<{ connected: boolean; saying: string }> {
    const ours = await this.ours();
    if (!ours.accessToken || !ours.phoneNumberId) {
      return { connected: false, saying: 'Not connected. Groundwork needs both the phone number ID and the access token before it can reach Meta.' };
    }
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8000);
    try {
      const res = await fetch(`${this.graphBase()}/${encodeURIComponent(ours.phoneNumberId)}?fields=display_phone_number,verified_name`, {
        headers: { Authorization: `Bearer ${ours.accessToken}` },
        signal: ac.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn(`Checking Groundwork's WhatsApp number: Meta answered ${res.status} ${metaErrorCode(body)}.`);
        return { connected: false, saying: `Not connected. Meta did not accept the saved access token and phone number ID together. Meta answered with error ${res.status}.` };
      }
      const info = (await res.json().catch(() => ({}))) as { display_phone_number?: string; verified_name?: string };
      const number = info.display_phone_number ? ` Meta has this number as ${info.display_phone_number}` : '';
      const name = info.verified_name ? `${number ? ',' : ' Meta has this number'} under the name ${info.verified_name}` : '';
      return { connected: true, saying: `Connected.${number}${name}${number || name ? '.' : ''}` };
    } catch {
      this.logger.warn("Checking Groundwork's WhatsApp number: Meta could not be reached.");
      return { connected: false, saying: 'Not connected. Groundwork could not reach Meta just now. Try again in a minute.' };
    } finally {
      clearTimeout(timer);
    }
  }

  static readonly OUR_TEST_MESSAGE = "This is a test message from Groundwork. If you can read it, Groundwork's WhatsApp number is working.";

  /**
   * A TEST MESSAGE FROM GROUNDWORK'S NUMBER, to the one number a member of staff typed and to nobody
   * else. Goes whether or not the platform switch is on, because it is how staff check the keys before
   * switching it on. Written down like every send (kind `admin-test:<staff user id>`), and logged with the
   * same id. Never carries a secret back.
   */
  async sendOurTest(rawNumber: string, byUserId: string): Promise<{ sent: boolean; to: string; saying: string }> {
    const typed = (rawNumber ?? '').trim();
    if (!typed) throw new BadRequestException('Type the number to send the test message to.');
    if (aLocalForm(typed) || !/^\+?[\d\s()-]{7,}$/.test(typed)) {
      throw new BadRequestException('Type the whole number with its country code, for example +44 7700 900123.');
    }
    const to = WhatsAppService.normalize(typed);
    const ours = await this.ours();
    if (!ours.accessToken || !ours.phoneNumberId) {
      return { sent: false, to, saying: `Nothing was sent to ${to}. Save the phone number ID and the access token first.` };
    }
    const result = await this.post(ours.phoneNumberId, ours.accessToken, to, WhatsAppService.OUR_TEST_MESSAGE);
    /* Who sent it, on the row and in the log: the staff member's id, never a secret. */
    await this.writeItDown(null, to, result, { kind: `admin-test:${byUserId}` });
    this.logger.log(`A WhatsApp test message to ${to} was ${result.sent ? 'sent' : 'not sent'} by staff member ${byUserId}.`);
    return result.sent
      ? { sent: true, to, saying: `The test message went to ${to}. Check that phone to see that it arrived.` }
      : { sent: false, to, saying: `The test message did not go to ${to}. ${result.status ? `Meta answered with error ${result.status}.` : 'Meta could not be reached.'} If the number has not written to Groundwork's number in the last 24 hours, Meta may refuse a message that is not a template.` };
  }

  /** The one HTTP call both numbers make. Never throws: the answer is in the result. */
  private async post(phoneNumberId: string, accessToken: string, to: string, text: string): Promise<SendResult> {
    try {
      const res = await fetch(`${this.graphBase()}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace('+', ''), type: 'text', text: { body: withinWhatsAppsLimit(text) } }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        /* Meta's status and error code, not the body it echoed back to us - that body can carry
           the message we just tried to send. */
        this.logger.error(`WhatsApp send failed for ${to}: ${res.status} ${metaErrorCode(body)}`);
        return { sent: false, status: res.status, error: body.slice(0, 500) || `HTTP ${res.status}` };
      }
      const accepted = await readTheBody(res);
      return { sent: true, status: res.status, messageId: theMessageIdIn(accepted) };
    } catch (err: any) {
      this.logger.error(`WhatsApp send failed for ${to}: ${err?.message}`);
      return { sent: false, error: String(err?.message ?? err).slice(0, 500) };
    }
  }

  /**
   * THE TICKS TURN BLUE AND "typing…" APPEARS, IN ONE CALL TO META.
   *
   * An opener is composed by the model and can take ten seconds or more. For that whole time the
   * person who just wrote sees nothing: no ticks, no sign anybody is there. Long enough to write
   * again, or to decide the thing is dead.
   *
   * Meta marks the message read and raises the indicator from the same request, and drops the
   * indicator when the reply goes or after 25 seconds, whichever comes first. So this is called
   * only where a reply is actually coming - after the redelivery and double-tap guards, never
   * before them - which is Meta's own instruction too: do not show it if you will not answer.
   *
   * ON THE NUMBER THE MESSAGE ARRIVED ON, which is why `via` is passed rather than guessed. A
   * receipt sent from Groundwork's number for a message somebody wrote to their organisation's own
   * number is about a message that number never saw, and Meta refuses it.
   *
   * NEVER THROWS, AND NEVER COSTS THE REPLY. A receipt that did not go is worth a debug line and
   * nothing more - it must not take a check-in down with it - and the request carries its own
   * deadline so a slow Meta cannot hold up the answer the person is waiting for.
   */
  async weAreReadingThis(messageId: string, organizationId: string | null, via: WhichNumber = 'ours'): Promise<void> {
    if (!messageId) return;
    try {
      let phoneNumberId: string | undefined;
      let accessToken: string | undefined;
      if (via === 'theirs' && organizationId) {
        const own = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } }).catch(() => null);
        if (!own || !itSendsFromTheirNumber(own)) return;
        phoneNumberId = own.phoneNumberId;
        /* Sealed on the row, so it goes through the same opener every send uses. */
        accessToken = theirKey(own, 'accessToken');
      } else {
        const ours = await this.ours();
        phoneNumberId = ours.phoneNumberId;
        accessToken = ours.accessToken;
      }
      if (!phoneNumberId || !accessToken) return;
      const res = await fetch(`${this.graphBase()}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId, typing_indicator: { type: 'text' } }),
        signal: AbortSignal.timeout(READ_RECEIPT_DEADLINE_MS),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.debug(`Read receipt refused for ${messageId}: ${res.status} ${metaErrorCode(body)}`);
      }
    } catch (err: any) {
      this.logger.debug(`Read receipt could not be sent for ${messageId}: ${err?.message}`);
    }
  }

  /** The row, awaited so a caller that asks the record straight afterwards (the halfway sweeps) finds it; a ledger that cannot be written still never stops a reply that can be sent. */
  private async writeItDown(organizationId: string | null, phone: string, result: SendResult, context: SendContext): Promise<void> {
    await this.prisma.whatsAppSend
      .create({
        data: {
          organizationId,
          phone,
          checkInId: context.checkInId ?? null,
          kind: context.kind ?? null,
          /* Stamped by the application's clock, as the email record is, so the day's one-message count follows the same clock when it is moved (the test bed). */
          createdAt: new Date(),
          sentAt: result.sent ? new Date() : null,
          failedAt: result.sent ? null : new Date(),
          status: result.status ?? null,
          error: result.error ?? null,
          ...(result.messageId ? { providerMessageId: result.messageId } : {}),
        },
      })
      .catch((err: any) => this.logger.warn(`Could not record a WhatsApp send to ${phone}: ${err?.message}`));
    /* And the same fact in the ledger every channel writes to (Notification), so a failed send is findable beside a suppressed mail. */
    await this.prisma.notification
      .create({ data: { channel: 'whatsapp', organizationId, toAddress: phone, sender: context.kind ?? null, outcome: result.sent ? 'sent' : 'failed', because: result.sent ? null : (result.error ?? null) } })
      .catch(() => undefined);
  }

  /** Finds the account a check-in link should go to, by phone number - the "auto-detect" step. */
  /**
   * SEND ON THE ORGANISATION'S OWN NUMBER, OR OURS.
   *
   * An organisation with a connection sends from its number with its token; one without falls back to
   * the platform number, which is what every send did before. Returns false when nothing could send,
   * and never throws into the caller's flow: a notice that could not go is a warning, not a failure of
   * the check-in it was about.
   */
  async sendFor(organizationId: string, phoneNumber: string, text: string, context: SendContext = {}): Promise<SendResult> {
    const to = await this.reachable(organizationId, phoneNumber);
    /* The one outbox (common/the-one-outbox.ts): the same message never goes twice. One held for the night was claimed when it was held. */
    if (!context.afterTheNight && !(await mayItGo(this.prisma, theOutboxKey({ channel: 'whatsapp', to, kind: context.kind ?? null, about: context.checkInId ?? null, text })))) return { sent: false, error: ALREADY_SENT };
    const held = (await this.heldFor(organizationId, to, context)) ?? (await this.heldForTheNight(organizationId, to, text, context));
    if (held) return held;
    const own = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } }).catch(() => null);
    /* A row that is switched off, or half set up and never proven, is no connection: Groundwork's own number (a-connection-that-works.ts). */
    if (!own || !itSendsFromTheirNumber(own)) return this.sendOnOurNumber(organizationId, to, text, context);
    if (!theirKey(own, 'accessToken')) {
      /* The token is sealed and this server cannot open it (the key was changed or removed). Nothing is sent, and the reason is kept. */
      const result: SendResult = { sent: false, error: THEIR_KEYS_CANNOT_BE_OPENED };
      await this.writeItDown(organizationId, to, result, context);
      return result;
    }
    const gate = await this.mayInitiate(organizationId, to, context, 'theirs', text);
    if (!gate.free) {
      if (gate.quiet) return { sent: false, error: gate.because };
      if (gate.template) return this.sendTemplate(own.phoneNumberId, theirKey(own, 'accessToken'), organizationId, to, text, gate.template, gate.params ? { ...context, params: gate.params } : context);
      const result: SendResult = { sent: false, error: gate.because };
      await this.writeItDown(organizationId, to, result, context);
      await this.byEmailInstead(organizationId, to, text, context, gate.because);
      return result;
    }
    const result = await this.deliver(own.phoneNumberId, theirKey(own, 'accessToken'), to, await this.namedForSomebodyInTwoOrganisations(organizationId, to, text, context));
    if (result.sent) await this.prisma.whatsAppConnection.update({ where: { id: own.id }, data: { lastOutboundAt: new Date() } }).catch(() => undefined);
    await this.writeItDown(organizationId, to, result, context);
    if (!result.sent && result.status) await this.byEmailInstead(organizationId, to, text, context, META_REFUSED_IT);
    return this.counted(organizationId, result);
  }

  /**
   * A REPLY GOES FROM THE NUMBER THE PERSON WROTE TO (survey item 8). `theirs` is the organisation's
   * own number, falling back to ours when it has none; `ours` is Groundwork's number, even for an
   * organisation that has its own, because that is the number this person is talking to.
   */
  async sendOn(via: WhichNumber, organizationId: string, phoneNumber: string, text: string, context: SendContext = {}): Promise<SendResult> {
    if (via === 'theirs') return this.sendFor(organizationId, phoneNumber, text, context);
    const to = await this.reachable(organizationId, phoneNumber);
    if (!context.afterTheNight && !(await mayItGo(this.prisma, theOutboxKey({ channel: 'whatsapp', to, kind: context.kind ?? null, about: context.checkInId ?? null, text })))) return { sent: false, error: ALREADY_SENT };
    const held = (await this.heldFor(organizationId, to, context)) ?? (await this.heldForTheNight(organizationId, to, text, context));
    if (held) return held;
    return this.sendOnOurNumber(organizationId, to, text, context);
  }

  /** The list of check-ins, on the number the person wrote to. Our number sends the numbered text. */
  async sendListOn(via: WhichNumber, organizationId: string, phoneNumber: string, body: string, rows: { id: string; title: string; description: string }[], fallbackText: string): Promise<boolean> {
    if (via === 'theirs') return this.sendListFor(organizationId, phoneNumber, body, rows, fallbackText);
    return (await this.sendOn('ours', organizationId, phoneNumber, fallbackText, { kind: 'which-one' })).sent;
  }

  /** A file the person sent, fetched with the token of the number they sent it to. */
  async fetchMediaOn(via: WhichNumber, organizationId: string, mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    return this.fetchMediaFor(via === 'theirs' ? organizationId : null, mediaId);
  }

  /**
   * WHICH NUMBER THIS PERSON LAST WROTE TO, read from the claim on the last message they sent. Null
   * when nothing they sent was claimed with its number.
   */
  async lastWroteTo(organizationId: string, phoneNumber: string): Promise<WhichNumber | null> {
    const phone = WhatsAppService.normalize(phoneNumber);
    const last = await this.prisma.whatsAppInboundMessage
      .findFirst({
        where: { organizationId, OR: [{ messageId: { startsWith: inboundKeysFrom('ours', phone) } }, { messageId: { startsWith: inboundKeysFrom('theirs', phone) } }] },
        orderBy: { handledAt: 'desc' },
        select: { messageId: true },
      })
      .catch(() => null);
    return whichNumberOf(last?.messageId);
  }

  /** When this person last wrote to this one number. */
  private async lastWroteOn(via: WhichNumber, organizationId: string | null, to: string): Promise<Date | null> {
    const last = await this.prisma.whatsAppInboundMessage
      ?.findFirst({
        where: { ...(organizationId ? { organizationId } : {}), messageId: { startsWith: inboundKeysFrom(via, to) } },
        orderBy: { handledAt: 'desc' },
        select: { handledAt: true },
      })
      .catch(() => null);
    return last?.handledAt ?? null;
  }

  /**
   * A LIST THEY CAN TAP. Meta's interactive list message, up to ten rows; the text fallback is the
   * numbered version, sent when the organisation has no connection of its own or the list is refused.
   */
  async sendListFor(organizationId: string, phoneNumber: string, body: string, rows: { id: string; title: string; description: string }[], fallbackText: string): Promise<boolean> {
    if (await this.heldFor(organizationId, WhatsAppService.normalize(phoneNumber), { kind: 'which-one' })) return false;
    const own = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } }).catch(() => null);
    if (!own || !itSendsFromTheirNumber(own)) return (await this.sendOnOurNumber(organizationId, WhatsAppService.normalize(phoneNumber), fallbackText, { kind: 'which-one' })).sent;
    if (!theirKey(own, 'accessToken')) { this.logger.warn(`WhatsApp list not sent for org ${organizationId}: ${THEIR_KEYS_CANNOT_BE_OPENED}`); return false; }
    const to = WhatsAppService.normalize(phoneNumber).replace('+', '');
    try {
      const res = await fetch(`${this.graphBase()}/${own.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${theirKey(own, 'accessToken')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to, type: 'interactive',
          interactive: { type: 'list', body: { text: body.slice(0, 1024) }, action: { button: 'Choose', sections: [{ title: 'Your check-ins', rows: rows.slice(0, 10) }] } },
        }),
      });
      if (res.ok) { await this.counted(organizationId, { sent: true }); return true; }
      this.logger.warn(`WhatsApp list refused for ${to}: ${res.status}; sending the numbered text instead.`);
    } catch (err: any) {
      this.logger.warn(`WhatsApp list failed for ${to}: ${err?.message}; sending the numbered text instead.`);
    }
    return (await this.counted(organizationId, await this.deliver(own.phoneNumberId, theirKey(own, 'accessToken'), `+${to}`, fallbackText))).sent;
  }

  /**
   * A PHOTO OR A DOCUMENT THEY SENT. Meta hands over an id; the bytes are fetched with the
   * organisation's own token in two steps, the second signed the same way. Ten megabytes is the
   * document pipeline's own ceiling.
   */
  async fetchMediaFor(organizationId: string | null, mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const own = organizationId ? await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } }).catch(() => null) : null;
    const token = (own && itSendsFromTheirNumber(own) ? theirKey(own, 'accessToken') : undefined) ?? (await this.ours()).accessToken;
    if (!token) return null;
    try {
      const meta = await fetch(`${this.graphBase()}/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!meta.ok) { this.logger.warn(`WhatsApp media lookup failed: ${meta.status}`); return null; }
      const info = (await meta.json()) as { url?: string; mime_type?: string; file_size?: number };
      if (!info.url) return null;
      if ((info.file_size ?? 0) > 10 * 1024 * 1024) return null;
      const file = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
      if (!file.ok) { this.logger.warn(`WhatsApp media download failed: ${file.status}`); return null; }
      return { buffer: Buffer.from(await file.arrayBuffer()), mimeType: info.mime_type ?? 'application/octet-stream' };
    } catch (err: any) {
      this.logger.warn(`WhatsApp media fetch failed: ${err?.message}`);
      return null;
    }
  }

  private async deliver(phoneNumberId: string, accessToken: string, to: string, text: string): Promise<SendResult> {
    return this.post(phoneNumberId, accessToken, to, text);
  }

  /**
   * WHETHER THIS MESSAGE MAY GO AS FREE TEXT. A reply to something the person just wrote always may.
   * A message the product starts may only inside Meta's 24-hour window, measured from the last time
   * THIS person wrote to us, and never to somebody who said STOP. Outside the window it goes as an
   * approved template or is recorded as not sent, with the reason - checked before anything is
   * composed or paid for. See a-message-outside-the-window.ts.
   */
  private async mayInitiate(organizationId: string | null, to: string, context: SendContext, via: WhichNumber, text = ''): Promise<{ free: true } | { free: false; template: ATemplate | null; because: string; quiet?: boolean; params?: string[] }> {
    if (!isBusinessInitiated(context.kind)) return { free: true };
    /*
     * NOTHING NEW GOES TO AN ORGANISATION THAT NEVER TURNED WHATSAPP ON (decisions 78 and 88). The
     * morning sweeps ask this before they read a row; the opening notice, the approvals, the questions
     * and the reviews did not, and while the paid-add-on switch is off the add-on gate lets everything
     * go. So it is asked here, once, for every message Groundwork starts except the report, which went
     * before. An organisation that already had a number of its own connected keeps what it had.
     */
    if (organizationId && !WENT_BEFORE_THIS_RELEASE.has(context.kind as string) && !(await this.hasTurnedItOn(organizationId))) {
      return { free: false, template: null, because: NOT_TURNED_ON_QUIETLY, quiet: true };
    }
    const person = await this.prisma.person
      .findFirst({
        where: { phone: { in: formsOfTheSameNumber(to) }, ...(organizationId ? { organizationId } : {}) },
        orderBy: { whatsappLastInboundAt: { sort: 'desc', nulls: 'last' } },
        select: { whatsappStoppedAt: true, whatsappLastInboundAt: true },
      })
      .catch(() => null);
    if (person?.whatsappStoppedAt || (await this.saidStopFrom(to))) return { free: false, template: null, because: THEY_SAID_STOP };
    const often = await this.howOftenToday(to, context.kind);
    if (often) return { free: false, template: null, because: often, quiet: true };
    /*
     * THE WINDOW IS PER BUSINESS NUMBER (survey item 8). When the organisation has a number of its
     * own, two numbers are in play, and a message the person wrote to one does not open the window
     * on the other: only what they wrote to THIS number counts. With only our number in play, the
     * person's own stamp is the same thing, and is what older messages carry.
     */
    const ownNumber = organizationId
      ? await this.prisma.whatsAppConnection?.findUnique({ where: { organizationId }, select: WHAT_SAYS_IT_WORKS }).catch(() => null)
      : null;
    const onThisNumber = await this.lastWroteOn(via, organizationId, to);
    /*
     * THE PERSON'S OWN STAMP IS ABOUT THE NUMBER IT CAME FROM (Drop Access, 21 October; findings 1.4 D). When a number is changed the
     * stamp stays on the roster entry, so a new number that has never written read as inside the 24 hours: the message went as plain
     * text and Meta refused it. The stamp counts only for a number Groundwork has been in touch with; a new one gets the first contact.
     */
    const theirStamp = !onThisNumber && person?.whatsappLastInboundAt && !(await this.neverInTouchWith(to)) ? person.whatsappLastInboundAt : null;
    const lastWrote = itSendsFromTheirNumber(ownNumber) ? onThisNumber : (onThisNumber ?? theirStamp);
    if (insideTheServiceWindow(lastWrote)) return { free: true };
    const approved = await this.approvedFor(organizationId, via);
    /*
     * THE FIRST MESSAGE TO A NUMBER NAMES THE ORGANISATION AND SAYS "NOT YOU? REPLY STOP" (decision 106
     * item 2). A number typed wrong reaches a stranger; the first thing they read says who it is for and how
     * to end it. "First" is: nothing ever sent to this number and nothing ever received from it. It goes as
     * groundwork_first_contact, carrying the message's own words; until Meta approves that template, a first
     * message is recorded as not sent, rather than sent without the protection.
     */
    /* Never a first contact; otherwise, once Meta approved its own template (groundwork_checkin_thanks) and it is listed, it goes as that. */
    if (NEVER_THE_FIRST_MESSAGE.has(context.kind as string) && !lastWrote && (await this.neverInTouchWith(to))) return { free: false, template: null, because: OUTSIDE_THE_WINDOW };
    if (NEVER_THE_FIRST_MESSAGE.has(context.kind as string)) {
      const thanks = theTemplateToUse(context.kind, approved, { params: context.params, paramsFor: context.paramsFor });
      return { free: false, template: thanks?.template ?? null, because: OUTSIDE_THE_WINDOW, ...(thanks?.params ? { params: thanks.params } : {}) };
    }
    if (!lastWrote && !this.somebodyIsAlreadyWritingFirstTo(to) && (await this.neverInTouchWith(to)) && !this.somebodyIsAlreadyWritingFirstTo(to)) {
      /* Claimed at once, so a second check-in opening for the same number in the same moment is the ordinary notice and not a second introduction (user journeys, F-19). */
      const first = templateFor(FIRST_CONTACT, approved);
      if (!first) return { free: false, template: null, because: FIRST_CONTACT_NOT_APPROVED };
      this.firstContactsBeingSent.set(WhatsAppService.normalize(to), Date.now());
      /* A message that says which shorter words it carries as a first contact (the direct morning: whole sentences that fit, never cut mid-sentence) carries those. */
      const ownFirstWords = context.paramsFor?.[first.name]?.[0];
      return { free: false, template: first, because: OUTSIDE_THE_WINDOW, params: [await this.nameOfTheOrganisation(organizationId), ownFirstWords ?? theFirstContactLine(context.kind, context.params, text)] };
    }
    const chosen = theTemplateToUse(context.kind, approved, { params: context.params, paramsFor: context.paramsFor });
    return { free: false, template: chosen?.template ?? null, because: OUTSIDE_THE_WINDOW, ...(chosen?.params ? { params: chosen.params } : {}) };
  }

  /**
   * THE SAME MESSAGE BY EMAIL, WHEN WHATSAPP COULD NOT TAKE IT (Hafsah, 19 October, point 2; see by-email-instead.ts for every rule).
   * Never throws into the sender's flow: an email that could not go is a warning, and the WhatsApp record already says why.
   */
  private async byEmailInstead(organizationId: string | null, to: string, text: string, context: SendContext, because: string): Promise<void> {
    const kind = context.kind ?? '';
    if (!this.email || !organizationId || !isBusinessInitiated(kind) || !whatsAppCouldNotTakeIt(because) || ALREADY_GO_BY_EMAIL.has(kind)) return;
    try {
      const forms = formsOfTheSameNumber(to);
      /* Whose message it is: the check-in's own person, or the one person on this organisation's roster with this number. */
      const ci: any = context.checkInId
        ? await Promise.resolve((this.prisma as any).checkIn?.findUnique?.({ where: { id: context.checkInId }, select: { id: true, createdAt: true, participantId: true, participant: { select: { email: true, user: { select: { email: true } } } } } })).catch(() => null)
        : null;
      const onTheRoster: any = ci ? null : await Promise.resolve((this.prisma as any).person?.findFirst?.({ where: { organizationId, phone: { in: forms }, active: true }, select: { email: true } })).catch(() => null);
      const address = String(ci?.participant?.user?.email ?? ci?.participant?.email ?? onTheRoster?.email ?? '').trim();
      if (!address || /@unclaimed\.invalid$/i.test(address)) return;
      const once = theOnceKey(kind, context.checkInId, WhatsAppService.normalize(to), new Date());
      if (await hasBeenToldOnce(this.prisma, once)) return;
      /* One channel per opening: an opening already told by email for this check-in is not told again. */
      if (AN_OPENING.has(kind) && ci?.createdAt) {
        const told = await Promise.resolve((this.prisma as any).notification?.findFirst?.({
          where: { channel: 'email', sender: { in: THE_OPENING_EMAILS }, outcome: { in: ['sent', 'held'] }, toAddress: { equals: address, mode: 'insensitive' }, createdAt: { gte: ci.createdAt } },
          select: { id: true },
        })).catch(() => null);
        if (told) return;
      }
      const words = theWordsForAnEmail(text);
      const frontend = (this.config.get<string>('resend.frontendUrl') || '').replace(/\/$/, '');
      /* A message about a check-in that is still to answer links to it; the thank-you and the report do not. */
      const link = context.checkInId && frontend && oneMessage(kind) !== 'report' && kind !== 'report-thanks' ? { label: 'Open your check-in', url: `${frontend}/checkin/${context.checkInId}` } : null;
      const sender = theSenderFor(kind);
      const send = sender === BY_EMAIL_ROUTINE ? this.email.sendTheRoutineMessageByEmail : sender === BY_EMAIL_AFTER_THEIR_OWN ? this.email.sendTheAnswerByEmail : this.email.sendTheMessageByEmail;
      const went = await send.call(this.email, address, theSubjectFor(words), words, link?.label ?? null, link?.url ?? null, ci?.participantId ?? undefined);
      await nowToldOnce(this.prisma, once, went, { sender, to: address });
      this.logger.log(`A ${kind} message WhatsApp could not take went by email instead (${went}).`);
    } catch (err: any) {
      this.logger.warn(`A ${kind} message WhatsApp could not take could not go by email either: ${err?.message}`);
    }
  }

  /** Numbers the first message is on its way to, by when it was claimed. Only one introduction goes to a number: the very first message. */
  private readonly firstContactsBeingSent = new Map<string, number>();
  private somebodyIsAlreadyWritingFirstTo(to: string): boolean {
    const key = WhatsAppService.normalize(to);
    const at = this.firstContactsBeingSent.get(key);
    if (at === undefined) return false;
    if (Date.now() - at > 10 * 60_000) { this.firstContactsBeingSent.delete(key); return false; }
    return true;
  }

  /**
   * NEVER IN TOUCH: nothing has gone to this number and nothing has come from it, on either number. A staff
   * test from the back office does not count. When the record cannot be read, it is treated as in touch.
   */
  private async neverInTouchWith(to: string): Promise<boolean> {
    const sends = (this.prisma.whatsAppSend as any)?.findFirst;
    const inbound = (this.prisma.whatsAppInboundMessage as any)?.findFirst;
    if (typeof sends !== 'function' || typeof inbound !== 'function') return false;
    const forms = formsOfTheSameNumber(to);
    const phone = WhatsAppService.normalize(to);
    try {
      const went = await (this.prisma.whatsAppSend as any).findFirst({ where: { phone: { in: forms }, sentAt: { not: null }, NOT: { kind: { startsWith: 'admin-test' } } }, select: { id: true } });
      if (went) return false;
      const came = await (this.prisma.whatsAppInboundMessage as any).findFirst({ where: { OR: [{ messageId: { startsWith: inboundKeysFrom('ours', phone) } }, { messageId: { startsWith: inboundKeysFrom('theirs', phone) } }] }, select: { messageId: true } });
      return !came;
    } catch {
      return false;
    }
  }

  /**
   * A MESSAGE GROUNDWORK STARTS, TO A NUMBER THAT IS ON TWO ORGANISATIONS' ROSTERS, SAYS WHICH ONE (B-123). Inside the 24 hours a reminder
   * went as plain words, without "This is Groundwork, writing for Msingi Foods." and "Not you? Reply STOP.", which everybody else's reminder
   * carried; the one person who most needed the organisation named was the one who was not told. A reply to what the person wrote is
   * not started by Groundwork and is left as it is.
   */
  private async namedForSomebodyInTwoOrganisations(organizationId: string | null, to: string, text: string, context: SendContext): Promise<string> {
    if (!isBusinessInitiated(context.kind)) return text;
    try {
      const orgs = await this.whichOrganisations(to);
      if (orgs.length < 2) return text;
      const name = orgs.find((o) => o.id === organizationId)?.name ?? (await this.nameOfTheOrganisation(organizationId));
      return `This is Groundwork, writing for ${name}. ${text} Not you? Reply STOP.`;
    } catch {
      return text;
    }
  }

  /** The organisation's name, for "This is Groundwork, writing for ...". */
  private async nameOfTheOrganisation(organizationId: string | null): Promise<string> {
    if (!organizationId) return 'your organisation';
    const org = await (this.prisma as any).organization?.findUnique?.({ where: { id: organizationId }, select: { name: true } })?.catch?.(() => null);
    return org?.name?.trim() || 'your organisation';
  }

  /**
   * STOP FROM A NUMBER WITH NO ROSTER ENTRY (decision 106 item 2: STOP stops everything to that number).
   * A roster entry carries its own stamp; a number that is only on a sign-in is stopped by the record of
   * the word itself, and resumed by START the same way. The latest of the two decides.
   */
  private async saidStopFrom(to: string): Promise<boolean> {
    const latest = await (this.prisma.whatsAppSend as any)?.findFirst?.({
      where: { phone: { in: formsOfTheSameNumber(to) }, kind: { in: ['stopped', 'resumed'] } },
      orderBy: { createdAt: 'desc' },
      select: { kind: true },
    })?.catch?.(() => null);
    return latest?.kind === 'stopped';
  }

  /** Whether the last word from this number was STOP, by the send record. */
  async hasSaidStop(to: string): Promise<boolean> {
    return this.saidStopFrom(to);
  }

  /** "stop" or "start" from a number, kept in the send record so the sender can read it whoever the number belongs to. */
  async stopOrResume(organizationId: string | null, phoneNumber: string, word: 'stopped' | 'resumed'): Promise<void> {
    await this.prisma.whatsAppSend
      .create({ data: { organizationId, phone: WhatsAppService.normalize(phoneNumber), kind: word, checkInId: null, sentAt: null, failedAt: null, status: null, error: null, createdAt: new Date() } })
      .catch((err: any) => this.logger.warn(`Could not record "${word}" from ${phoneNumber}: ${err?.message}`));
  }

  /** Whether the organisation turned WhatsApp on (the add-on), or already had a number of its own. True when that cannot be read. */
  private async hasTurnedItOn(organizationId: string): Promise<boolean> {
    const org = await (this.prisma as any).organization?.findUnique?.({ where: { id: organizationId }, select: { whatsappAddOnOn: true, whatsappFreeUntil: true } })?.catch?.(() => null);
    if (!org) return true;
    if (org.whatsappAddOnOn) return true;
    /* Every organisation's free WhatsApp month (Hafsah, 13 October 2026, evening): on without anybody turning it on. */
    if (org.whatsappFreeUntil && new Date(org.whatsappFreeUntil).getTime() > Date.now()) return true;
    const own = await this.prisma.whatsAppConnection?.findUnique?.({ where: { organizationId }, select: WHAT_SAYS_IT_WORKS })?.catch?.(() => null);
    return itSendsFromTheirNumber(own);
  }

  /**
   * HOW OFTEN GROUNDWORK HAS WRITTEN FIRST TODAY (decision 83, alongside decision 13). The one place
   * every first message goes through: at most one a day to a person, or two on a day one of their
   * check-ins opens or closes, and none after they replied "Not now" today. Null when this one may go.
   * Read from the send record, by the person's number in every form it is kept in. The day is the
   * UTC day. A message held back here is not written down: it was not attempted, and the sweep that
   * wanted it tries again another day.
   */
  private async howOftenToday(to: string, kind: string | undefined): Promise<string | null> {
    if (!kind || !(FIRST_MESSAGES.has(kind) || APPROVALS.has(kind) || ONLY_HELD_BY_NOT_NOW.has(kind))) return null;
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const rows: { kind: string | null }[] = await (this.prisma.whatsAppSend as any)
      ?.findMany?.({
        where: { phone: { in: formsOfTheSameNumber(to) }, createdAt: { gte: today }, OR: [{ sentAt: { not: null } }, { kind: 'not-now' }] },
        select: { kind: true },
      })
      ?.catch?.(() => []) ?? [];
    if ((rows ?? []).some((r) => r.kind === 'not-now')) return THEY_SAID_NOT_NOW;
    /* Approvals go straight away (decision 92): only the person's own "Not now" holds them, never how many they have had. */
    if (APPROVALS.has(kind) || ONLY_HELD_BY_NOT_NOW.has(kind)) return null;
    /*
     * THE LEAD'S DAILY SUMMARY IS HER ONE ROUTINE MESSAGE OF THE DAY, AND IT WINS (standing decision, 18 October; Drop Access run 1,
     * item 16). On 21 and 22 October Grace's summary was held back by routine mail sent earlier those mornings ("runs out in 7 days",
     * "session 8 is complete"). Other routine mail to a lead now waits for the summary and folds into it (email.service.ts), so the
     * summary is held only by a summary already sent, or by Friday's weekly insight, which takes its place (decision 105 item 2).
     */
    if (kind === 'lead-summary') {
      return (rows ?? []).some((r) => /^(?:lead-summary|anchor-weekly-insight)(?::|$)/.test(r.kind ?? '')) ? NOT_TODAY : null;
    }
    const went = (rows ?? []).filter((r) => r.kind && FIRST_MESSAGES.has(r.kind.split(':')[0])).length;
    if (went >= (OPENING_OR_CLOSING.has(kind) ? 2 : 1)) return NOT_TODAY;
    /* ONE ROUTINE MESSAGE A DAY ACROSS EMAIL AND WHATSAPP (decision 109, item 6): a routine message does not go to somebody who has had a routine
       email today. A check-in opening or closing is an exception, as it always was. */
    if (aRoutineWhatsApp(kind) && (await theirRoutineMessagesToday(this.prisma as any, { phone: to })).email >= 1) return NOT_TODAY;
    return null;
  }

  /** "Not now": nothing more is written first to this person today. Kept in the send record, which the rule above reads. */
  async notNow(organizationId: string | null, phoneNumber: string): Promise<void> {
    await this.prisma.whatsAppSend
      .create({ data: { organizationId, phone: WhatsAppService.normalize(phoneNumber), kind: 'not-now', checkInId: null, sentAt: null, failedAt: null, status: null, error: null, createdAt: new Date() } })
      .catch((err: any) => this.logger.warn(`Could not record "Not now" from ${phoneNumber}: ${err?.message}`));
  }

  /**
   * WHOSE APPROVAL COUNTS, WHICH IS WHOEVER OWNS THE META APP.
   *
   * On our own number that is us, and the names live in WHATSAPP_APPROVED_TEMPLATES. On an
   * organisation's own number it is THEM: their app, their submission, their approval. This read
   * was the env var either way, so a customer who connected their own number and got their own
   * templates approved still had every business-initiated message recorded as not sent - and
   * nothing anywhere said our environment was the reason.
   *
   * Theirs counts only for a message that goes on their number: a connection that is switched on,
   * and a send on 'theirs'. A switched-off connection sends on our number (sendFor), so it is read
   * exactly like no connection, with our list; reading their list there, which starts empty, left
   * everything Groundwork starts outside the 24 hours recorded as not sent (Drop Access, October).
   * A message on our number, for an organisation that has its own, is ours too.
   */
  private async approvedFor(organizationId: string | null, via: WhichNumber = 'theirs'): Promise<readonly string[]> {
    if (organizationId && via === 'theirs') {
      const own = await this.prisma.whatsAppConnection
        .findUnique({ where: { organizationId }, select: { approvedTemplates: true, ...WHAT_SAYS_IT_WORKS } })
        .catch(() => null);
      if (itSendsFromTheirNumber(own)) return own!.approvedTemplates ?? [];
    }
    return this.config.get<string[]>('whatsapp.approvedTemplates') ?? [];
  }

  /** Meta's template message. The plain text the caller composed rides as the body parameter. */
  private async sendTemplate(phoneNumberId: string, accessToken: string, organizationId: string | null, to: string, text: string, template: ATemplate, context: SendContext): Promise<SendResult> {
    let result: SendResult;
    /* A template with more blanks than the product gave words for would be refused by Meta, or worse, sent half empty. */
    const blanks = new Set(template.body.match(/\{\{\d+\}\}/g) ?? []).size;
    if (blanks > (context.params?.length ?? 1)) {
      result = { sent: false, error: `No words for every blank of ${template.name}; not sent` };
      await this.writeItDown(organizationId, to, result, { ...context, kind: `${context.kind}:template` });
      return result;
    }
    try {
      const res = await fetch(`${this.graphBase()}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to: to.replace('+', ''), type: 'template',
          template: { name: template.name, language: { code: template.language }, components: template.components(text, context.params) },
        }),
      });
      result = res.ok ? { sent: true, status: res.status, messageId: theMessageIdIn(await readTheBody(res)) } : { sent: false, status: res.status, error: (await res.text().catch(() => '')).slice(0, 500) };
    } catch (err: any) {
      result = { sent: false, error: err?.message ?? 'template send failed' };
    }
    await this.writeItDown(organizationId, to, result, { ...context, kind: `${context.kind}:template` });
    /* Meta answered and refused it: the same words go by email instead (by-email-instead.ts). */
    if (!result.sent && result.status) await this.byEmailInstead(organizationId, to, text, context, META_REFUSED_IT);
    return this.counted(organizationId, result);
  }

  /**
   * WHO IS WRITING, INSIDE ONE ORGANISATION. The roster's phone first, then the number a person typed
   * into Settings. Scoped to the organisation whose webhook received it, so a number never crosses
   * organisations.
   */
  async whoIsWritingTo(organizationId: string, rawNumber: string): Promise<{ personId: string | null; userId: string | null; externalId: string | null }> {
    const forms = formsOfTheSameNumber(rawNumber);
    const found = await this.prisma.person.findFirst({
      where: { organizationId, phone: { in: forms }, active: true },
      select: { id: true, externalId: true, linkedUserId: true, email: true, phone: true },
    });
    const person = found && (await this.theSameNumber(organizationId, found.phone, rawNumber)) ? found : null;
    if (person) {
      const userId = person.linkedUserId
        ?? (person.email ? (await this.prisma.user.findFirst({ where: { organizationId, email: person.email, deletedAt: null }, select: { id: true } }))?.id ?? null : null);
      return { personId: person.id, userId, externalId: person.externalId };
    }
    const foundUser = await this.prisma.user.findFirst({ where: { organizationId, phoneNumber: { in: forms }, deletedAt: null }, select: { id: true, email: true, phoneNumber: true } });
    const user = foundUser && (await this.theSameNumber(organizationId, foundUser.phoneNumber, rawNumber)) ? foundUser : null;
    if (!user) return { personId: null, userId: null, externalId: null };
    const byEmail = user.email ? await this.prisma.person.findFirst({ where: { organizationId, email: user.email }, select: { id: true, externalId: true } }) : null;
    return { personId: byEmail?.id ?? null, userId: user.id, externalId: byEmail?.externalId ?? null };
  }

  /** When the server starts with a key, any organisation's keys that were saved as typed are sealed. Nothing already connected stops working. */
  async onModuleInit(): Promise<void> {
    try { await this.sealWhatWasKeptPlain(); } catch (err: any) { this.logger.warn(`Could not seal the organisations' WhatsApp keys: ${err?.message}`); }
  }

  /** Seals every organisation's access token and app secret that is still kept as typed. Returns how many rows it sealed. */
  async sealWhatWasKeptPlain(): Promise<number> {
    const rows = await this.prisma.whatsAppConnection.findMany({ select: { id: true, organizationId: true, accessToken: true, appSecret: true } });
    /* Sealed keys this server cannot open (the key was changed or removed) are counted and named by organisation, never by key, so somebody
       finds out before a customer does. Their admin is told on the Connections page. */
    const cannotOpen = (rows ?? []).filter((r) => (['accessToken', 'appSecret'] as const).some((f) => isSealed(r[f]) && !theirKey(r, f))).map((r) => r.organizationId);
    if (cannotOpen.length) this.logger.error(`${cannotOpen.length} organisation(s) have WhatsApp keys that this server cannot open, so nothing is sent from their numbers and their messages are refused until the keys are typed in again: ${cannotOpen.join(', ')}`);
    if (!theServerCanKeepSecrets()) return 0;
    let sealed = 0;
    for (const r of rows ?? []) {
      let did = false;
      /* One field at a time, and only where the value is still the one that was read: a key typed in since is left alone. */
      for (const f of ['accessToken', 'appSecret'] as const) {
        if (!r[f] || isSealed(r[f])) continue;
        const done = await this.prisma.whatsAppConnection.updateMany({ where: { id: r.id, [f]: r[f] }, data: { [f]: sealTheirKey(r.organizationId, f, r[f]) } });
        if (done?.count) did = true;
      }
      if (did) sealed += 1;
    }
    return sealed;
  }

  /** The organisation's connection, with the secrets left out, for its admin to read. */
  async connectionFor(organizationId: string) {
    const c = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    if (!c) return null;
    return {
      phoneNumberId: c.phoneNumberId,
      businessAccountId: c.businessAccountId,
      displayNumber: c.displayNumber,
      verifyToken: c.verifyToken,
      approvedTemplates: c.approvedTemplates,
      enabled: c.enabled,
      connectedAt: c.connectedAt,
      lastInboundAt: c.lastInboundAt,
      lastOutboundAt: c.lastOutboundAt,
      /* U.18: the callback address is proven once Meta's handshake answered, or a message came in through it. */
      webhookProvenAt: c.webhookVerifiedAt ?? c.lastInboundAt ?? null,
      tokenEndsWith: theirKey(c, 'accessToken').slice(-4),
      /* A sealed key this server cannot open. The admin reads what to do; nothing is sent from the number until then. */
      keysNeedTypingAgain: theKeysCannotBeOpened(c),
      ...(theKeysCannotBeOpened(c) ? { keysNeedTypingAgainSays: KEYS_NEED_TYPING_AGAIN } : {}),
    };
  }

  async connect(organizationId: string, dto: { phoneNumberId?: string; businessAccountId?: string; displayNumber?: string; accessToken?: string; appSecret?: string }) {
    const phoneNumberId = dto.phoneNumberId?.trim();
    const accessToken = dto.accessToken?.trim();
    const appSecret = dto.appSecret?.trim();
    /* Secrets are never written in the clear: a NEW secret with no key on the server is not saved, and the admin is told, in words that are about us and not about a setting. The setting's name goes to the log only. A save with no new secret (the display number, say) needs no key. */
    if ((accessToken || appSecret) && !theServerCanKeepSecrets()) {
      this.logger.error(`An organisation (${organizationId}) tried to save WhatsApp keys, and they were not saved: ${whyItCannot()} (SETTINGS_ENCRYPTION_KEY).`);
      throw new BadRequestException(THE_SERVER_HAS_NO_KEY);
    }
    const existing = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    /*
     * NEVER HALF SET UP FROM SOMEBODY TYPING A NUMBER (Drop Access, 21 October; a-connection-that-works.ts). Every key is needed, or
     * nothing is saved and the admin reads why and where a team member's number goes instead. A key already kept stays when it is not
     * typed again; a business account ID or a display number that is not sent is kept, never wiped (findings 1.4 J).
     */
    const businessAccountId = dto.businessAccountId?.trim() || existing?.businessAccountId || '';
    const displayTyped = dto.displayNumber?.trim() || existing?.displayNumber || '';
    const missing = whatIsMissingFrom({ ...dto, phoneNumberId, accessToken, appSecret, businessAccountId, displayNumber: displayTyped }, existing && { accessToken: existing.accessToken, appSecret: existing.appSecret });
    if (missing.length) throw new BadRequestException(NOTHING_WAS_SAVED_BECAUSE(missing));
    if (!/^\d{6,}$/.test(phoneNumberId!)) throw new BadRequestException(A_PHONE_NUMBER_IS_NOT_ITS_ID);
    if (!/^\d{6,}$/.test(businessAccountId)) throw new BadRequestException(`Nothing was saved, because the WhatsApp Business account ID is digits only. You find it in Meta Business, under WhatsApp accounts. ${THIS_IS_FOR_YOUR_OWN_NUMBER}`);
    /* Kept as typed, for people to read; checked in the one stored form. */
    const displayNumber = displayTyped;
    const displayAsStored = await this.tidyFor(organizationId, displayTyped).catch(() => {
      throw new BadRequestException(`Nothing was saved, because the number as people will see it is not a whole phone number. ${THIS_IS_FOR_YOUR_OWN_NUMBER}`);
    });
    /* A team member's own number, typed where the organisation's Business number goes, is refused, and so is a phone number typed as its ID. */
    const someone = (await this.whoseNumberInThisOrganisation(organizationId, displayAsStored)) ?? (await this.whoseNumberInThisOrganisation(organizationId, phoneNumberId!));
    if (someone) throw new BadRequestException(THAT_IS_A_TEAM_MEMBERS_NUMBER(someone.name));
    if (phoneNumberId!.startsWith('0') || phoneNumberId === displayAsStored.replace(/\D/g, '')) throw new BadRequestException(A_PHONE_NUMBER_IS_NOT_ITS_ID);
    const verifyToken = existing?.verifyToken || `gwv_${crypto.randomBytes(16).toString('hex')}`;
    const row = await this.prisma.whatsAppConnection.upsert({
      where: { organizationId },
      create: {
        organizationId, phoneNumberId: phoneNumberId!, businessAccountId, displayNumber,
        /* Built before Prisma chooses create or update, so only sealed when typed: an existing row saved again keeps its own (the update below). */
        accessToken: accessToken ? sealTheirKey(organizationId, 'accessToken', accessToken) : '', appSecret: appSecret ? sealTheirKey(organizationId, 'appSecret', appSecret) : '', verifyToken, enabled: true,
      },
      update: {
        phoneNumberId: phoneNumberId!, businessAccountId, displayNumber, verifyToken,
        ...(accessToken ? { accessToken: sealTheirKey(organizationId, 'accessToken', accessToken) } : {}), ...(appSecret ? { appSecret: sealTheirKey(organizationId, 'appSecret', appSecret) } : {}),
      },
    });
    this.logger.log(`WhatsApp connected for org ${organizationId} on number id ${row.phoneNumberId}`);
    return this.connectionFor(organizationId);
  }

  /** Whose number this is among the people of this organisation (its roster, and the sign-ins of its members), by name. Null when nobody's. */
  private async whoseNumberInThisOrganisation(organizationId: string, raw: string): Promise<{ name: string | null } | null> {
    const forms = formsOfTheSameNumber(raw);
    if (!forms.length) return null;
    const onTheRoster: any = await Promise.resolve((this.prisma as any).person?.findFirst?.({ where: { organizationId, phone: { in: forms } }, select: { givenName: true, familyName: true, displayName: true } })).catch(() => null);
    if (onTheRoster) return { name: (onTheRoster.displayName || [onTheRoster.givenName, onTheRoster.familyName].filter(Boolean).join(' ')).trim() || null };
    const signIn: any = await Promise.resolve((this.prisma as any).user?.findFirst?.({ where: { phoneNumber: { in: forms }, deletedAt: null, memberships: { some: { organizationId } } }, select: { firstName: true, lastName: true } })).catch(() => null);
    if (signIn) return { name: [signIn.firstName, signIn.lastName].filter(Boolean).join(' ').trim() || null };
    return null;
  }

  async setConnectionEnabled(organizationId: string, enabled: boolean) {
    await this.prisma.whatsAppConnection.update({ where: { organizationId }, data: { enabled } });
    return this.connectionFor(organizationId);
  }

  async disconnect(organizationId: string) {
    await this.prisma.whatsAppConnection.delete({ where: { organizationId } }).catch(() => undefined);
    return { disconnected: true };
  }

  /** A test message to the admin's own number, on the organisation's connection. Proves the token and the number id. */
  async sendTest(organizationId: string, toNumber: string) {
    const own = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    if (!own) throw new BadRequestException('Connect a number first.');
    if (!toNumber?.trim()) throw new BadRequestException('Say which number to send the test to.');
    if (!theirKey(own, 'accessToken')) throw new BadRequestException(KEYS_NEED_TYPING_AGAIN);
    const ok = (await this.deliver(own.phoneNumberId, theirKey(own, 'accessToken'), await this.tidyFor(organizationId, toNumber), 'Groundwork is connected to this number. Reply here when a check-in is open and it goes into the record.')).sent;
    if (!ok) throw new BadRequestException('Meta refused the message. Check the token, the number id, and that this number may receive messages from your Meta app.');
    await this.prisma.whatsAppConnection.update({ where: { id: own.id }, data: { lastOutboundAt: new Date() } });
    return { sent: true };
  }

  /** Verify an inbound POST against the organisation's own app secret. Same rule as the platform route. */
  verifySignatureWith(appSecret: string, headers: Record<string, string | string[] | undefined>, raw: Buffer): void {
    /* No secret to check against (a sealed one this server cannot open) is never a reason to accept: an HMAC made with an empty key is
       something anybody can make. */
    if (!appSecret) throw new UnauthorizedException('That message could not be checked as coming from WhatsApp, so it was not accepted.');
    const header = headers['x-hub-signature-256'];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided || !provided.startsWith('sha256=')) throw new UnauthorizedException('That message could not be checked as coming from WhatsApp, so it was not accepted.');
    const expected = crypto.createHmac('sha256', appSecret).update(raw).digest('hex');
    const got = provided.slice('sha256='.length);
    if (got.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(got, 'utf8'), Buffer.from(expected, 'utf8'))) {
      throw new UnauthorizedException('That message could not be checked as coming from WhatsApp, so it was not accepted.');
    }
  }

  /**
   * WHICH ORGANISATIONS A NUMBER IS ON. The platform webhook carries no organisation, so the old
   * lookup was a bare global `user.findUnique` on the phone - one person, whichever tenant. This lists
   * every organisation whose roster or Settings carries the number, and the inbound handler asks the
   * person which they mean when there is more than one, rather than guessing.
   */
  /**
   * A NUMBER IS ONLY OFFERED THE ORGANISATIONS WHERE WHATSAPP WORKS FOR IT (B-107). Neema was offered Lakeview Clinic, where WhatsApp is off,
   * chose it, and then wrote a handover that was taken into a check-in whose next question she never received. Where every organisation is
   * held, all are kept, so the person is told why as before.
   */
  async whichOrganisationsWhereItWorks(rawNumber: string): Promise<{ id: string; name: string }[]> {
    const all = await this.whichOrganisations(rawNumber);
    if (all.length < 2 || !this.addOn) return all;
    const works: { id: string; name: string }[] = [];
    for (const o of all) {
      const may = await this.addOn.mayWeSend(o.id).catch(() => ({ send: true as const }));
      if (may.send) works.push(o);
    }
    return works.length ? works : all;
  }

  async whichOrganisations(rawNumber: string): Promise<{ id: string; name: string }[]> {
    const forms = formsOfTheSameNumber(rawNumber);
    const [people, users] = await Promise.all([
      this.prisma.person.findMany({ where: { phone: { in: forms }, active: true }, select: { phone: true, organization: { select: { id: true, name: true } } } }),
      this.prisma.user.findMany({ where: { phoneNumber: { in: forms }, deletedAt: null }, select: { phoneNumber: true, organization: { select: { id: true, name: true } } } }),
    ]);
    const seen = new Map<string, { id: string; name: string }>();
    for (const row of [...people, ...users] as any[]) {
      if (!row.organization) continue;
      if (!(await this.theSameNumber(row.organization.id, row.phone ?? row.phoneNumber, rawNumber))) continue;
      seen.set(row.organization.id, row.organization);
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Set (or clear) a user's WhatsApp number. Called from Settings (self) or org roster (admin/HR on someone's behalf). */
  async setPhoneNumber(userId: string, rawNumber: string | null): Promise<void> {
    const user = rawNumber?.trim() ? await this.prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } }) : null;
    const number = rawNumber?.trim() ? await this.tidyFor(user?.organizationId ?? null, rawNumber) : null;
    await refuseANumberOnSomebodyElse(this.prisma, number, userId, user?.organizationId ?? null);
    await this.prisma.user.update({ where: { id: userId }, data: { phoneNumber: number } });
    await aSignInsNumberChanged(this.prisma, userId, number);
  }
}
