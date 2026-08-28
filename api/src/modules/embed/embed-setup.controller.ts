import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmbedService } from './embed.service';

/**
 * Setting the embed up is a human's job in the console, so this is session-authenticated and admin
 * only - the same reasoning as issuing a credential or registering a webhook. A machine token that
 * could rewrite the allowed domains could make the panel embeddable somewhere the customer never
 * chose.
 */
@ApiTags('Embed setup')
@Controller('integrations/embed')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class EmbedSetupController {
  constructor(private readonly embed: EmbedService) {}

  @Get()
  @ApiOperation({ summary: 'The current embed configuration, without its signing secret' })
  get(@CurrentUser('organizationId') organizationId: string) {
    return this.embed.config(organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Set the domains, placement and out-of-scope departments. Returns a new signing secret.' })
  setup(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: { allowedDomains?: string[]; placement?: string; outOfScopeDepartments?: string[] },
  ) {
    return this.embed.setup(organizationId, dto ?? {});
  }
}
