import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CredentialsService } from './credentials.service';
import { ApiAccessService } from './api-access.service';

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
  ) {}

  /**
   * ASK FOR THE API.
   *
   * Beside the credentials, because this is the step before them: a credential
   * without approved access issues fine and then refuses at the token exchange,
   * which is the confusing order to meet these two things in.
   */
  @Post('access-request')
  @ApiOperation({ summary: 'Ask for API access. Say what you intend to build.' })
  askForAccess(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { whatFor?: string },
  ) {
    return this.access.ask(organizationId, userId, dto?.whatFor ?? '');
  }

  /** Where our own request has got to. */
  @Get('access-request')
  @ApiOperation({ summary: "Whether this organisation has API access, and what is left if not" })
  myAccess(@CurrentUser('organizationId') organizationId: string) {
    return this.access.whereMineHasGotTo(organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Issue a credential pair. The secret is shown once and never again.' })
  issue(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { name: string; scopes: string[]; boundToPersonExternalIds?: string[]; sourceSystem?: string },
  ) {
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
