import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CredentialsService } from './credentials.service';

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
  constructor(private readonly credentials: CredentialsService) {}

  @Post()
  @ApiOperation({ summary: 'Issue a credential pair. The secret is shown once and never again.' })
  issue(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { name: string; scopes: string[] },
  ) {
    return this.credentials.issue(organizationId, dto?.name, dto?.scopes ?? [], userId);
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
