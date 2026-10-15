import { withoutCommitmentsFromGoalsNotToldYet } from '../grounds/a-commitment-from-a-goal-not-told-is-not-read-by-its-person';
import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { verifyEmbedToken, frameAncestors, readOrgClaim } from './their-login-is-the-only-login';
import { freshnessOf } from '../subjects/a-pointer-goes-stale';
import { quietUntil } from '../subjects/detection-holds-its-tongue';
import { theOneToRaise, alreadyNudgedToday, slippedOpening, hasSlipped } from '../assistant/what-somebody-said-they-would-do';
import { whatIsDueFor, openingOnWhatIsDue, WhatIsDue } from './what-is-due-for-this-person';
import {
  whatIsWorthSayingWhenYouArrive,
  mayBeSaidEveryTime,
} from '../assistant/what-is-worth-saying-when-you-arrive';
import { WhatIsTrueService } from '../assistant/what-is-true.service';
import { openingAbout } from './what-they-are-looking-at';

/**
 * Short, and refreshed by the widget before it runs out.
 *
 * This comment described the refresh for months before one existed: the panel had no timer, no 401
 * handler and no way to ask for another session, so a panel open all day stopped working after
 * fifteen minutes and said "I could not reach the record just then" until somebody reloaded the
 * host page. The panel now asks at twelve minutes, and again if a call comes back 401 — see
 * `static/panel.html` and the `needs-session` message in `static/embed.js`.
 */
const SESSION_TTL_SECONDS = 900;

@Injectable()
export class EmbedService {
  private readonly logger = new Logger(EmbedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly truth: WhatIsTrueService,
  ) {}

  async setup(organizationId: string, dto: { allowedDomains?: string[]; placement?: string; outOfScopeDepartments?: string[] }) {
    const domains = (dto.allowedDomains ?? []).map((d) => d.trim()).filter(Boolean);
    /*
     * NO DOMAINS IS NOT A CONFIGURATION, IT IS A PANEL THAT RENDERS NOWHERE.
     *
     * `frame-ancestors` with nothing in it, and `X-Frame-Options: DENY`, so the iframe is refused on
     * every page — and the loader is deliberately silent on a customer's site, so the result is
     * indistinguishable from a broken install. Somebody sets this up, pastes the script tag, sees
     * nothing, and has no way to learn that the empty field is the reason.
     *
     * Refused here rather than reported later: this is the moment somebody is looking at the field.
     */
    if (!domains.length) {
      throw new BadRequestException(
        'Add at least one domain the panel may appear on. With none, the panel is refused on every page and looks like a broken install. Use the origin only, for example https://app.example.com.',
      );
    }
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
    /* Blank means blank: a person with no department is in no department, so an empty string in the
       customer's excluded list must not match them (it did, through `?? ''`). */
    const inAnExcludedDepartment = !!person?.department && config.outOfScopeDepartments.includes(person.department);
    if (!person || !person.active || inAnExcludedDepartment) {
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
  /**
   * @param aboutSubjectExternalId what the HOST PAGE says the person is looking at, if it said
   *   anything. See `what-they-are-looking-at.ts`: the loader has always accepted this and nothing
   *   has ever read it, so the documented "opens grounded rather than cold" did nothing.
   */
  async openingFor(organizationId: string, personId: string, aboutSubjectExternalId?: string) {
    const person = await this.prisma.person.findFirst({ where: { id: personId, organizationId } });
    if (!person) return { opening: null, freshness: [] };

    /* The host's claim, checked against this organisation before it is used for anything. */
    const on = aboutSubjectExternalId?.trim()
      ? await this.prisma.subject.findFirst({
          where: { organizationId, externalId: aboutSubjectExternalId.trim(), sourceDeletedAt: null },
          /* `type`, not `kind` — the column is SubjectType. The panel's word for it is "kind". */
          select: { externalId: true, title: true, type: true },
        })
      : null;

    /*
     * WHAT IS DUE, COUNTED ONCE AND HANDED TO THE PANEL.
     *
     * The launcher could draw a badge and nothing ever set one, and the opening never looked at
     * check-ins at all: a person with a session open right now saw the same launcher and the same
     * hello as a person with nothing due. This is the one read behind the badge, the pulse and the
     * first line. It is the person's own state, read for the person, so it goes to the PANEL and
     * never to the host page (see session()).
     */
    const truth = await this.truth.forPerson(organizationId, person.id).catch(() => null);
    const due = await this.whatIsDue(organizationId, person, truth);

    return {
      person: { externalId: person.externalId, displayName: person.displayName ?? person.userName },
      opening: on
        ? await this.openingOnASubject(organizationId, person, on)
        : await this.opening(organizationId, person, truth, due),
      freshness: await this.freshness(organizationId),
      due,
      /* Echoed so the panel can tell the difference between "we used your context" and "your id
         matched nothing here", which is otherwise invisible on both sides. */
      openedOn: on ? { externalId: on.externalId, title: on.title } : null,
    };
  }

  /** The opening for somebody who is demonstrably on one thing. */
  private async openingOnASubject(
    organizationId: string,
    person: { id: string; displayName: string | null; userName: string; externalId?: string },
    on: { externalId: string; title: string; type: string | null },
  ) {
    const firstName = (person.displayName ?? person.userName).split(' ')[0];
    const waitingOnThem = person.externalId
      ? await this.prisma.commitment.count({
          where: { organizationId, personExternalId: person.externalId, state: 'OPEN', subjectExternalId: on.externalId },
        }).catch(() => 0)
      : 0;
    return openingAbout({ externalId: on.externalId, title: on.title, kind: on.type }, firstName, waitingOnThem);
  }

  private async opening(
    organizationId: string,
    person: { id: string; displayName: string | null; userName: string; externalId?: string; lastNudgedOn?: Date | null },
    truth: Awaited<ReturnType<WhatIsTrueService['forPerson']>> | null = null,
    due: WhatIsDue = { checkIns: [], toStart: [], slippedCommitments: 0, count: 0 },
  ) {
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
      const open = await withoutCommitmentsFromGoalsNotToldYet(this.prisma, await this.prisma.commitment.findMany({
        where: { organizationId, personExternalId: person.externalId, state: 'OPEN' },
        select: { id: true, text: true, dueSaid: true, dueAt: true, state: true, lastFollowedUpAt: true, sourcePersonObjectiveId: true },
      }));
      const one = theOneToRaise(open as any, now);
      if (one) {
        await this.prisma.person.update({ where: { id: person.id }, data: { lastNudgedOn: now } });
        await this.prisma.commitment.update({ where: { id: one.id }, data: { lastFollowedUpAt: now } });
        return slippedOpening(one);
      }
    }

    /*
     * A CHECK-IN THAT IS OPEN BEATS EVERYTHING BELOW THIS LINE.
     *
     * The quiet period and "nothing is connected" used to come first, so an organisation that ran
     * check-ins and had never connected a system - which is every organisation on the API today -
     * greeted somebody whose session was waiting with "Nothing is connected yet". The session is
     * the product; the connected systems are context for it.
     */
    const firstName = (person.displayName ?? person.userName).split(' ')[0];
    if (due.checkIns.length || due.toStart.length) {
      return openingOnWhatIsDue(due, firstName);
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
    /*
     * WHAT IS ACTUALLY WAITING FOR THEM, from the one assembly.
     *
     * The greeting under this offered to answer a question they had not asked, from a thing that
     * already knew what was waiting. Somebody who has to think of the question is somebody who
     * closes the panel.
     *
     * Below the slipped-promise opening rather than above it: that one is the thing they already
     * know about and have not said, and it is rate limited by the calendar because the cost is in
     * being asked. This is not — stating what is waiting is not chasing.
     */
    if (truth) {
      const worth = whatIsWorthSayingWhenYouArrive(truth, firstName);

      /* The one that IS a nudge takes the daily limit, and marks the day whether or not they
         answer — the same rule the slipped promise runs on, for the same reason. */
      if (!mayBeSaidEveryTime(worth.source)) {
        if (alreadyNudgedToday(person.lastNudgedOn, now)) {
          return { line: `Hello ${firstName}. Ask me about your objectives or what you owe this period.`, source: 'orientation' };
        }
        await this.prisma.person.update({ where: { id: person.id }, data: { lastNudgedOn: now } });
      }

      return worth;
    }

    return {
      line: `Hello ${firstName}. Ask me about your objectives or what you owe this period.`,
      source: 'orientation',
      suggestions: ['What am I on?', 'What is due?'],
    };
  }

  /**
   * The person's own due list: check-ins open to them, grounds waiting on them to start, and
   * commitments past the date they gave. Tolerant of a thin database, because the panel must draw
   * even when this cannot be read - a badge that fails closed is a badge, an opening that fails is
   * an empty box.
   */
  private async whatIsDue(
    organizationId: string,
    person: { id: string; externalId?: string },
    truth: Awaited<ReturnType<WhatIsTrueService['forPerson']>> | null,
  ): Promise<WhatIsDue> {
    const sessions = truth?.sessions?.value ?? [];
    const openIds = sessions.filter((s) => s.standing === 'open to you' && s.checkInId).map((s) => s.checkInId as string);
    const rows = openIds.length
      ? await (this.prisma.checkIn?.findMany({
          where: { id: { in: openIds } },
          select: { id: true, sessionNumber: true, participantId: true },
        }) ?? Promise.resolve([])).catch(() => [] as { id: string; sessionNumber: number; participantId: string }[])
      : [];
    const leftOpen = new Map<string, string[]>();
    for (const r of rows) {
      if (r.sessionNumber <= 1) continue;
      const entries = await (this.prisma.recordEntry?.findMany({
        where: {
          participantId: r.participantId,
          type: { in: ['WORRY', 'TENSION', 'COMMITMENT'] as any },
          checkIn: { status: 'COMPLETED' as any, sessionNumber: { lt: r.sessionNumber } },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { text: true },
      }) ?? Promise.resolve([])).catch(() => [] as { text: string }[]);
      leftOpen.set(r.id, entries.map((e) => e.text.replace(/^\[VERIFIABILITY:\w+\] /, '')));
    }
    const commitments = person.externalId
      ? await this.prisma.commitment
          .findMany({ where: { organizationId, personExternalId: person.externalId, state: 'OPEN' }, select: { dueAt: true, dueSaid: true, state: true } })
          .catch(() => [] as any[])
      : [];
    const now = new Date();
    return whatIsDueFor({
      sessions,
      sessionNumbers: new Map(rows.map((r) => [r.id, r.sessionNumber])),
      leftOpen,
      slippedCommitments: commitments.filter((c: any) => hasSlipped(c, now)).length,
    });
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
