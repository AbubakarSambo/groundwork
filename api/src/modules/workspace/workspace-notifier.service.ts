import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkspaceKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Notice, asSlack, asTeams, isAWorkspaceAddress, whatItSays } from './what-a-channel-may-be-told';

const GIVE_UP_AFTER_MS = 5_000;

/**
 * POSTING A NOTICE INTO SOMEBODY'S WORKSPACE.
 *
 * WHAT may be said is decided in `what-a-channel-may-be-told.ts` and not here.
 * This is delivery: one POST, a short timeout, and the outcome written down.
 *
 * A FAILED POST IS RECORDED, NEVER RETRIED IN A LOOP. A channel that was archived
 * six weeks ago fails every time, and a retry loop turns that into a permanent
 * load with nobody looking at it. `lastError` is where somebody sees it instead.
 *
 * AND IT NEVER THROWS INTO THE THING THAT ASKED. A round finishing must not fail
 * because a customer's Slack channel is gone.
 */
@Injectable()
export class WorkspaceNotifierService {
  private readonly logger = new Logger(WorkspaceNotifierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * The one extra host a developer may point a notifier at, and only outside
   * production — driving this without a Slack workspace is otherwise impossible.
   */
  private get alsoAllow(): string | undefined {
    if (this.config.get<string>('NODE_ENV') === 'production') return undefined;
    return this.config.get<string>('WORKSPACE_WEBHOOK_EXTRA_HOST') || undefined;
  }

  async connect(
    organizationId: string,
    kind: WorkspaceKind,
    url: string,
    channelSaid?: string,
  ): Promise<{ kind: WorkspaceKind; channelSaid: string | null; enabled: boolean }> {
    if (!isAWorkspaceAddress(kind, url, this.alsoAllow)) {
      throw new BadRequestException(
        kind === 'SLACK'
          ? 'That is not a Slack incoming-webhook address. It starts https://hooks.slack.com/.'
          : 'That is not a Teams incoming-webhook address.',
      );
    }

    /* Enabled stays as it was on a reconnect, and starts false on a new one:
       a notifier that posts the moment a URL is pasted posts into a channel
       nobody has told yet. */
    const saved = await this.prisma.workspaceNotifier.upsert({
      where: { organizationId_kind: { organizationId, kind } },
      create: { organizationId, kind, url, channelSaid: channelSaid ?? null },
      update: { url, channelSaid: channelSaid ?? null, lastError: null },
      select: { kind: true, channelSaid: true, enabled: true },
    });
    return saved;
  }

  /** Never the URL. Anybody holding it can post into that channel. */
  async whatIsConnected(organizationId: string) {
    const rows = await this.prisma.workspaceNotifier.findMany({
      where: { organizationId },
      select: { kind: true, channelSaid: true, enabled: true, lastPostedAt: true, lastError: true },
      orderBy: { kind: 'asc' },
    });
    return rows;
  }

  async turn(organizationId: string, kind: WorkspaceKind, on: boolean) {
    const found = await this.prisma.workspaceNotifier.findUnique({
      where: { organizationId_kind: { organizationId, kind } },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Nothing is connected there yet.');
    await this.prisma.workspaceNotifier.update({ where: { id: found.id }, data: { enabled: on } });
    return { kind, enabled: on };
  }

  async disconnect(organizationId: string, kind: WorkspaceKind) {
    await this.prisma.workspaceNotifier.deleteMany({ where: { organizationId, kind } });
    return { kind, connected: false };
  }

  /**
   * Tell whoever is connected. Returns what happened for each, so a caller that
   * wants to say "posted to Slack" can, and one that does not can ignore it.
   */
  async tell(organizationId: string, notice: Notice): Promise<{ kind: WorkspaceKind; posted: boolean; because?: string }[]> {
    const notifiers = await this.prisma.workspaceNotifier.findMany({
      where: { organizationId, enabled: true },
    });

    const results = [];
    for (const n of notifiers) {
      const body = n.kind === 'SLACK' ? asSlack(notice) : asTeams(notice);
      const outcome = await this.post(n.url, body);

      await this.prisma.workspaceNotifier.update({
        where: { id: n.id },
        data: outcome.posted
          ? { lastPostedAt: new Date(), lastError: null }
          : { lastError: outcome.because.slice(0, 300) },
      });

      if (!outcome.posted) {
        this.logger.warn(`${n.kind} notice not delivered for ${organizationId}: ${outcome.because}`);
      }
      results.push({ kind: n.kind, posted: outcome.posted, because: outcome.posted ? undefined : outcome.because });
    }
    return results;
  }

  /** A test post, so somebody can see it land before they turn it on. */
  async sayHello(organizationId: string, kind: WorkspaceKind, link: string) {
    const n = await this.prisma.workspaceNotifier.findUnique({
      where: { organizationId_kind: { organizationId, kind } },
    });
    if (!n) throw new NotFoundException('Nothing is connected there yet.');

    const notice: Notice = { what: 'a report is ready', about: 'a test from Groundwork', link };
    const outcome = await this.post(n.url, kind === 'SLACK' ? asSlack(notice) : asTeams(notice));
    await this.prisma.workspaceNotifier.update({
      where: { id: n.id },
      data: outcome.posted ? { lastPostedAt: new Date(), lastError: null } : { lastError: outcome.because.slice(0, 300) },
    });
    return { posted: outcome.posted, said: whatItSays(notice), because: outcome.posted ? undefined : outcome.because };
  }

  private async post(url: string, body: unknown): Promise<{ posted: true } | { posted: false; because: string }> {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(GIVE_UP_AFTER_MS),
      });
      if (!r.ok) {
        /* Slack answers 404 `no_service` for a webhook that was revoked, which is
           the commonest failure and reads as nothing at all without this. */
        const said = (await r.text().catch(() => '')).slice(0, 200);
        return { posted: false, because: `${r.status} ${said}`.trim() };
      }
      return { posted: true };
    } catch (err: any) {
      return { posted: false, because: err?.name === 'TimeoutError' ? 'it did not answer in time' : 'it could not be reached' };
    }
  }
}
