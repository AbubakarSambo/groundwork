import { Controller, Post, Get, Delete, Body, Param, UseGuards, HttpCode, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { API_TERMS } from './the-api-terms';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CredentialsService } from './credentials.service';
import { ApiAccessService } from './api-access.service';
import { UsersService } from '../users/users.service';

/**
 * WHERE AN ADMIN ISSUES AND REVOKES THE PAIRS THEIR SYSTEMS AUTHENTICATE WITH.
 *
 * Internal and session-authenticated, unlike everything else in this module: a human in the console
 * does this, not a machine. Issuing a credential from a machine token would let a leaked credential
 * mint fresh ones and outlive its own revocation.
 */
@ApiTags('Integration credentials')
@Controller('integrations/credentials')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class CredentialsController {
  constructor(
    private readonly credentials: CredentialsService,
    private readonly access: ApiAccessService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  /** The terms an organisation accepts when it asks. One version, dated, so acceptance means something. */
  @Get('terms')
  @ApiOperation({ summary: 'The API terms, as accepted at the point of asking' })
  terms() {
    return API_TERMS;
  }

  /**
   * THE REFERENCE IS BEHIND THE SAME DOOR AS THE API. A generated list of every route was public at
   * /api/docs, which is the one document somebody copying the product would want most. It now opens
   * from a link signed for an approved organisation and good for an hour.
   */
  @Get('docs-link')
  @ApiOperation({ summary: 'A one-hour link to the API reference, for an approved organisation' })
  async docsLink(@CurrentUser('organizationId') organizationId: string) {
    const mine = await this.access.whereMineHasGotTo(organizationId);
    if (!mine.approved) throw new ForbiddenException(mine.says);
    const key = await this.jwt.signAsync({ typ: 'docs', org: organizationId }, { expiresIn: '1h' });
    return { path: `/api/docs?key=${key}`, expiresInMinutes: 60 };
  }

  /**
   * ASK FOR THE API.
   *
   * Beside the credentials, because this is the step before them: a credential
   * without approved access issues fine and then refuses at the token exchange,
   * which is the confusing order to meet these two things in.
   */
  @Post('access-request')
  @ApiOperation({ summary: 'Ask for API access. Say what you intend to build.' })
  async askForAccess(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { whatFor?: string; acceptedTerms?: boolean },
  ) {
    const request = await this.access.ask(organizationId, userId, dto?.whatFor ?? '', !!dto?.acceptedTerms);
    /* ONE REQUEST. The page used to have a separate "Ask for a call"; asking for access is the call.
       Best-effort: the access request is the record, the call is how ops gets told to ring back. */
    await this.users.requestACall(organizationId, userId, dto?.whatFor, 'INTEGRATION').catch(() => undefined);
    return request;
  }

  /** Where our own request has got to. */
  @Get('access-request')
  @ApiOperation({ summary: "Whether this organisation has API access, and what is left if not" })
  myAccess(@CurrentUser('organizationId') organizationId: string) {
    return this.access.whereMineHasGotTo(organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Issue a credential pair. The secret is shown once and never again.' })
  async issue(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { name: string; scopes: string[]; boundToPersonExternalIds?: string[]; sourceSystem?: string },
  ) {
    /* Nothing is issued before access is approved. A key that exists and cannot be used is the
       confusing order; the Connect page shows this section only once access is granted. */
    const mine = await this.access.whereMineHasGotTo(organizationId);
    if (!mine.approved) throw new ForbiddenException(mine.says);
    /* `sourceSystem` is how a REPLACEMENT credential says it speaks for the same system as the one
       it replaces. Give it the same value and the roster stays one roster; leave it out and it is
       derived from the name. See `people/whose-roster-is-this.ts`. */
    return this.credentials.issue(
      organizationId,
      dto?.name,
      dto?.scopes ?? [],
      userId,
      dto?.boundToPersonExternalIds ?? [],
      dto?.sourceSystem,
    );
  }

  @Post(':clientId/replace')
  @HttpCode(200)
  @ApiOperation({ summary: 'Replace a credential: the same integration under a new secret, speaking for the same system. The old one keeps working until you revoke it.' })
  replace(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.credentials.replace(organizationId, clientId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List this organisation credentials, without their secrets' })
  list(@CurrentUser('organizationId') organizationId: string) {
    return this.credentials.list(organizationId);
  }

  @Delete(':clientId')
  @ApiOperation({ summary: 'Revoke one credential without affecting the others' })
  revoke(@CurrentUser('organizationId') organizationId: string, @Param('clientId') clientId: string) {
    return this.credentials.revoke(organizationId, clientId);
  }
}
