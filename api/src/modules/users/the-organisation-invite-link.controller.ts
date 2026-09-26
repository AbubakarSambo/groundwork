import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean } from 'class-validator';
import { CurrentUser, CurrentUserData, Public, Roles, Role } from '../../common';
import { TheOrganisationInviteLinkService } from './the-organisation-invite-link.service';

class InviteLinkDto {
  @IsBoolean() on!: boolean;
}

/** The organisation's own invite link (U.3): the admin's switch, the public page, and joining. */
@ApiTags('Users')
@Controller()
export class TheOrganisationInviteLinkController {
  constructor(private readonly link: TheOrganisationInviteLinkService) {}

  @Get('users/organization/invite-link')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Whether the organisation\'s invite link is on, and its code' })
  async state(@CurrentUser('organizationId') organizationId: string) {
    return this.link.state(organizationId);
  }

  @Patch('users/organization/invite-link')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Turn the invite link on (a new link) or off (the old one stops working)' })
  async set(@CurrentUser('organizationId') organizationId: string, @CurrentUser('id') userId: string, @Body() dto: InviteLinkDto) {
    return this.link.set(organizationId, userId, dto.on);
  }

  @Public()
  @Get('join-links/:code')
  @Throttle({ global: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'What an organisation\'s invite link opens: its name and who shared it' })
  async preview(@Param('code') code: string) {
    return this.link.preview(code);
  }

  @Post('join-links/:code/join')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Join the organisation through its invite link, as "Takes part"' })
  async join(@Param('code') code: string, @CurrentUser() user: CurrentUserData) {
    return this.link.join(code, user.id, (user.signedInVia as any) ?? 'password');
  }
}
