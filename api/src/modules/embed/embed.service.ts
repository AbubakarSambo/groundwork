import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { verifyEmbedToken, frameAncestors, readOrgClaim } from './their-login-is-the-only-login';
import { freshnessOf } from '../subjects/a-pointer-goes-stale';
import { quietUntil } from '../subjects/detection-holds-its-tongue';
import { theOneToRaise, alreadyNudgedToday, slippedOpening } from '../assistant/what-somebody-said-they-would-do';

/** Short, and refreshed silently by the widget. A panel open all day re-handshakes, it does not expire on somebody. */
const SESSION_TTL_SECONDS = 900;

@Injectable()
export class EmbedService {
  private readonly logger = new Logger(EmbedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async setup(organizationId: string, dto: { allowedDomains?: string[]; placement?: string; outOfScopeDepartments?: string[] }) {
    const domains = (dto.allowedDomains ?? []).map((d) => d.trim()).filter(Boolean);
    for (const d of domains) {
      /* A frame-ancestors entry is an origin, not a url. Accepting a path here would silently
         produce a policy that matches nothing. */
      if (!/^https:\/\/[^/\s]+$/.test(d) && !/^http:\/\/localhost(:\d+)?$/.test(d)) {
        throw new BadRequestException(`"${d}" is not an origin. Use https://app.example.com, with no path.`);
      }
    }
    const secret = `gwe_${randomBytes(32).toString('base64url')}`;
    const row = await this.prisma.embedConfig.upsert({
      where: { organizationId },
      create: {
        organizationId, signingSecret: secret, allowedDomains: domains,
        placement: dto.placement === 'anchor' ? 'anchor' : 'floating',
        outOfScopeDepartments: dto.outOfScopeDepartments ?? [],
      },
      update: {
        allowedDomains: domains,
        placement: dto.placement === 'anchor' ? 'anchor' : 'floating',
        outOfScopeDepartments: dto.outOfScopeDepartments ?? [],
      },
      select: { id: true, allowedDomains: true, placement: true, outOfScopeDepartments: true, signingSecret: true },
    });
    return { ...row, frameAncestors: frameAncestors(row.allowedDomains) };
  }

  async config(organizationId: string) {
    const row = await this.prisma.embedConfig.findUnique({
      where: { organizationId },
      select: { allowedDomains: true, placement: true, outOfScopeDepartments: true, createdAt: true },
    });
    return row ? { ...row, frameAncestors: frameAncestors(row.allowedDomains) } : null;
  }

  /**
   * THE HANDSHAKE, CALLED BY A BROWSER.
   *
   * THIS TOOK A MACHINE TOKEN AND THAT WAS WRONG. A machine credential is the customer's server
   * secret; putting it in a widget on every page of their application would hand it to anybody who
   * opened developer tools. Only visible once there was a loader to write - curl holds a credential
   * quite happily and never notices.
   *
   * So the endpoint is open, and the identity token IS the authentication. The organisation is read
   * from the token's own claim and then used to look up the key the signature is checked against -
   * which sounds circular and is not: claiming to be another organisation means being checked
   * against THAT organisation's secret, which the caller does not have. An unsigned claim selects
   * the lock; only the right key opens it.
   */
  async session(token: string) {
    const claimedOrg = readOrgClaim(token);
    if (!claimedOrg) throw new UnauthorizedException('That token does not name an organisation.');

    const config = await this.prisma.embedConfig.findUnique({ where: { organizationId: claimedOrg } });
    /* Same answer as a bad signature, so this cannot be used to find out which organisations exist. */
    if (!config) throw new UnauthorizedException('That token was not accepted.');
    const organizationId = claimedOrg;

    const verified = verifyEmbedToken(token, config.signingSecret, organizationId);
    if (!verified.ok) throw new UnauthorizedException(verified.reason);

    const person = await this.prisma.person.findFirst({
      where: { organizationId, externalId: verified.claims.sub },
    });

    /*
     * NOTHING, NOT A DISABLED LAUNCHER.
     *
     * Three ways to be out of scope and they all return the same answer: we have never heard of
     * this person, they have left, or their department is one the customer excluded. A launcher
     * that appears and refuses tells somebody they are being kept out of something, which is a
     * conversation the customer did not ask us to start on their behalf.
     */
    if (!person || !person.active || config.outOfScopeDepartments.includes(person.department ?? '')) {
      return { visible: false as const };
    }

    const sessionToken = await this.jwt.signAsync(
      { sub: person.externalId, org: organizationId, typ: 'embed', pid: person.id },
      { expiresIn: SESSION_TTL_SECONDS },
    );

    return {
      visible: true as const,
      sessionToken,
      expiresIn: SESSION_TTL_SECONDS,
      placement: config.placement,
      /* The panel's frame-ancestors policy is chosen by this; it grants nothing on its own. */
      organizationId,
      /*
       * DELIBERATELY THIN. This response is read by the HOST page - the customer's own application
       * - and it only needs to know whether to render and what to render it as. The person's name,
       * their opening line and the state of their systems belong to the PANEL, which fetches them
       * with the session token it was given. Handing them to the host would put somebody's name in
       * a page they are merely visiting.
       */
    };
  }

  /**
   * THE PANEL NEVER OPENS BLANK.
   *
   * "How can I help" is a tax on somebody when the answer is already in this response. A box a
   * person does not know what to say to is where every product of this kind dies, and the first
   * thing it says is the whole of that problem.
   *
   * Resolved server-side in priority order, so the client renders rather than decides. What can be
   * offered today is thin - the lanes that would produce a slipped commitment or a manager's
   * reports do not exist yet - so this returns the honest best available and NOT a placeholder
   * pretending to be one. When those lanes land they slot in above the orientation line.
   */
  /**
   * What the panel needs to draw itself, for a caller that already holds a panel session.
   *
   * Split out from the handshake because the panel gets its token in a fragment and then asks for
   * this - the handshake's own response goes to the HOST page, which must not be handed the
   * person's name and their systems' state just for embedding a widget.
   */
  async openingFor(organizationId: string, personId: string) {
    const person = await this.prisma.person.findFirst({ where: { id: personId, organizationId } });
    if (!person) return { opening: null, freshness: [] };
    return {
      person: { externalId: person.externalId, displayName: person.displayName ?? person.userName },
      opening: await this.opening(organizationId, person),
      freshness: await this.freshness(organizationId),
    };
  }

  private async opening(organizationId: string, person: { id: string; displayName: string | null; userName: string; externalId?: string; lastNudgedOn?: Date | null }) {
    /*
     * THE HIGHEST-VALUE SPECIFIC THING, AND AT MOST ONE, AND NOT TWICE IN A DAY.
     *
     * A slipped commitment beats everything else here because it is the one thing the person
     * already knows about and has not said. But it is also the one that turns a tool into something
     * that chases people, so it is rate limited by the calendar rather than by elapsed hours, and
     * asking marks the day whether or not they answer - the cost is in being asked.
     */
    const now = new Date();
    if (person.externalId && !alreadyNudgedToday(person.lastNudgedOn, now)) {
      const open = await this.prisma.commitment.findMany({
        where: { organizationId, personExternalId: person.externalId, state: 'OPEN' },
        select: { id: true, text: true, dueSaid: true, dueAt: true, state: true, lastFollowedUpAt: true },
      });
      const one = theOneToRaise(open as any, now);
      if (one) {
        await this.prisma.person.update({ where: { id: person.id }, data: { lastNudgedOn: now } });
        await this.prisma.commitment.update({ where: { id: one.id }, data: { lastFollowedUpAt: now } });
        return slippedOpening(one);
      }
    }

    const quiet = quietUntil(
      await this.prisma.detectionQuietPeriod.findMany({ where: { organizationId }, select: { endsAt: true } }),
      new Date(),
    );
    if (quiet) {
      return {
        line: 'Your systems have just been connected, so I am still reading. Ask me what I can see.',
        source: 'quiet_period',
        suggestions: ['What can you see?', 'What is connected?'],
      };
    }
    const subjects = await this.prisma.subject.count({ where: { organizationId, sourceDeletedAt: null } });
    if (subjects === 0) {
      return {
        line: 'Nothing is connected yet, so there is not much I can tell you. Your admin can connect your systems.',
        source: 'nothing_connected',
        suggestions: ['What would you connect?'],
      };
    }
    return {
      line: `Hello ${(person.displayName ?? person.userName).split(' ')[0]}. Ask me about your objectives or what you owe this period.`,
      source: 'orientation',
      suggestions: ['What am I on?', 'What is due?'],
    };
  }

  /**
   * WHAT IT CAN SEE AND HOW CURRENT IT IS, on one line at the top of the panel.
   *
   * An assistant answering confidently from three-week-old data destroys trust faster than a wrong
   * answer, because a wrong answer is obviously wrong and a stale one is not.
   */
  private async freshness(organizationId: string) {
    const rows = await this.prisma.subject.findMany({
      where: { organizationId },
      select: { sourceSystem: true, syncedAt: true, sourceDeletedAt: true },
    });
    const now = new Date();
    const bySystem = new Map<string, { syncedAt: Date; stale: boolean }>();
    for (const r of rows) {
      const cur = bySystem.get(r.sourceSystem);
      if (!cur || r.syncedAt > cur.syncedAt) {
        bySystem.set(r.sourceSystem, { syncedAt: r.syncedAt, stale: freshnessOf(r, now) === 'stale' });
      }
    }
    return [...bySystem.entries()].map(([system, v]) => ({ system, syncedAt: v.syncedAt, stale: v.stale }));
  }
}
