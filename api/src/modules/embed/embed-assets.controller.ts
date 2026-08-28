import { Controller, Get, Query, Res, Header } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { frameAncestors } from './their-login-is-the-only-login';

/**
 * THE TWO FILES A BROWSER FETCHES, AND THE HEADERS THAT MAKE THE SECOND ONE SAFE.
 *
 * Read from disk once at construction. They are small, they never change between deploys, and
 * reading them per request would put a filesystem call on the path of every page load in every
 * customer's application.
 */
@Controller()
export class EmbedAssetsController {
  private readonly loader: string;
  private readonly panel: string;

  constructor(private readonly prisma: PrismaService) {
    const dir = join(__dirname, 'static');
    this.loader = readFileSync(join(dir, 'embed.js'), 'utf8');
    this.panel = readFileSync(join(dir, 'panel.html'), 'utf8');
  }

  /**
   * Served to every page of a customer's application, so it is cached hard and carries no
   * per-customer anything - the org is decided by the token their page supplies, not by this file.
   */
  @Public()
  @Get('embed.js')
  @ApiExcludeEndpoint()
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  loaderScript() {
    return this.loader;
  }

  /**
   * THE PANEL, AND ITS FRAME-ANCESTORS IS THE WHOLE POINT.
   *
   * Without it, anybody could frame a customer's assistant in their own page and read whatever the
   * person inside typed. The policy is built from the domains that customer registered, and an
   * organisation we cannot identify - or one that has registered nothing - gets `'none'`, which
   * renders nowhere. Refusing to frame is a support conversation; framing anywhere is an incident.
   *
   * `org` is a hint for choosing the policy and grants nothing: the panel is inert until it presents
   * a session token to the API, and that token is checked on every call.
   */
  @Public()
  @Get('embed/panel')
  @ApiExcludeEndpoint()
  async panelPage(@Query('org') org: string | undefined, @Res() res: Response) {
    const config = org
      ? await this.prisma.embedConfig.findUnique({
          where: { organizationId: org },
          select: { allowedDomains: true },
        })
      : null;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy', `frame-ancestors ${frameAncestors(config?.allowedDomains ?? [])}`);
    /* Belt and braces for the older header, which some proxies still act on. */
    res.setHeader('X-Frame-Options', config?.allowedDomains?.length ? 'ALLOWALL' : 'DENY');
    res.setHeader('Cache-Control', 'no-store');
    res.send(this.panel);
  }
}
