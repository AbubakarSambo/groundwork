import { Controller, Post, Get, Delete, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceKind } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceNotifierService } from './workspace-notifier.service';

/**
 * Connecting a channel is a human's job in the console, so this is
 * session-authenticated and admin only — the same reasoning as the embed setup.
 * A machine token that could change where notices are posted could redirect an
 * organisation's notices into a channel the customer never chose.
 */
@ApiTags('Workspace notices')
@Controller('integrations/workspace')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class WorkspaceNotifierController {
  constructor(private readonly notifiers: WorkspaceNotifierService) {}

  @Get()
  @ApiOperation({ summary: 'What is connected, whether it is on, and whether the last post landed. Never the address.' })
  what(@CurrentUser('organizationId') organizationId: string) {
    return this.notifiers.whatIsConnected(organizationId);
  }

  @Post(':kind')
  @HttpCode(200)
  @ApiOperation({ summary: 'Connect a Slack or Teams incoming webhook. Arrives switched off.' })
  connect(
    @CurrentUser('organizationId') organizationId: string,
    @Param('kind') kind: string,
    @Body() dto: { url: string; channelSaid?: string },
  ) {
    return this.notifiers.connect(organizationId, kind.toUpperCase() as WorkspaceKind, dto?.url ?? '', dto?.channelSaid);
  }

  @Post(':kind/test')
  @HttpCode(200)
  @ApiOperation({ summary: 'Post one notice now, so somebody can see it land before turning it on' })
  test(
    @CurrentUser('organizationId') organizationId: string,
    @Param('kind') kind: string,
    @Body() dto: { link?: string },
  ) {
    return this.notifiers.sayHello(organizationId, kind.toUpperCase() as WorkspaceKind, dto?.link ?? 'https://app.groundwork.africa');
  }

  @Post(':kind/on')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start posting notices there' })
  on(@CurrentUser('organizationId') organizationId: string, @Param('kind') kind: string) {
    return this.notifiers.turn(organizationId, kind.toUpperCase() as WorkspaceKind, true);
  }

  @Post(':kind/off')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stop posting notices there, keeping the connection' })
  off(@CurrentUser('organizationId') organizationId: string, @Param('kind') kind: string) {
    return this.notifiers.turn(organizationId, kind.toUpperCase() as WorkspaceKind, false);
  }

  @Delete(':kind')
  @ApiOperation({ summary: 'Forget the address entirely' })
  disconnect(@CurrentUser('organizationId') organizationId: string, @Param('kind') kind: string) {
    return this.notifiers.disconnect(organizationId, kind.toUpperCase() as WorkspaceKind);
  }
}
