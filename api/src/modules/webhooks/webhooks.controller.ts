import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WebhooksService } from './webhooks.service';
import { SENDABLE_EVENTS, NOT_YET_EMITTED, DEPRECATED_EVENTS } from './events-we-can-actually-send';

/**
 * Registering endpoints is a human's job in the console, so this is session-authenticated and
 * admin-only - the same reasoning as issuing a credential. A machine token that could register a
 * webhook could point a customer's events at somewhere the customer never chose.
 */
@ApiTags('Webhooks')
@Controller('integrations/webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get('events')
  @ApiOperation({ summary: 'Which events can be subscribed to, and which exist but cannot fire yet' })
  events() {
    return { available: SENDABLE_EVENTS, notYetEmitted: NOT_YET_EMITTED, deprecated: DEPRECATED_EVENTS };
  }

  @Post('endpoints')
  @ApiOperation({ summary: 'Register an endpoint. The signing secret is returned once.' })
  register(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: { url: string; events: string[] },
  ) {
    return this.webhooks.register(organizationId, dto?.url, dto?.events ?? []);
  }

  @Get('endpoints')
  @ApiOperation({ summary: 'List registered endpoints, without their secrets' })
  list(@CurrentUser('organizationId') organizationId: string) {
    return this.webhooks.list(organizationId);
  }

  @Delete('endpoints/:id')
  @ApiOperation({ summary: 'Remove an endpoint' })
  remove(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
    return this.webhooks.remove(organizationId, id);
  }

  @Post('endpoints/:id/rotate-secret')
  @ApiOperation({ summary: 'Rotate the signing secret. The old one keeps working until the next rotation.' })
  rotate(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
    return this.webhooks.rotateSecret(organizationId, id);
  }

  @Post('endpoints/:id/reactivate')
  @ApiOperation({ summary: 'Switch an endpoint back on after it was switched off for being unreachable' })
  reactivate(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
    return this.webhooks.reactivate(organizationId, id);
  }

  @Get('deliveries')
  @ApiOperation({ summary: 'The delivery log, with response codes and bodies. Filter by status.' })
  deliveries(@CurrentUser('organizationId') organizationId: string, @Query('status') status?: string) {
    return this.webhooks.deliveries(organizationId, status);
  }

  @Post('deliveries/:id/replay')
  @ApiOperation({ summary: 'Try one delivery again, keeping its original event id' })
  replay(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
    return this.webhooks.replay(organizationId, id);
  }
}
