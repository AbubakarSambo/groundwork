import { Controller, Post, Get, Body, Param, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { EmbedSessionGuard, PanelCaller } from '../embed/embed-session.guard';
import { DraftsService } from './drafts.service';

/**
 * PANEL-AUTHENTICATED, not machine-authenticated, and the difference is the point.
 *
 * Drafting is somebody thinking about next quarter inside their own company's software. Every route
 * here acts as one named person - who started it, who disagreed, who settled it - and a machine
 * credential names an organisation and nobody. There is no version of this that a customer's server
 * should be able to do on somebody's behalf.
 */
@ApiTags('Integration API')
@Public()
@Controller('api/org/v1/drafts')
export class DraftsController {
  constructor(private readonly drafts: DraftsService) {}

  @Post()
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Start a draft, grounded in what the last cycle left behind' })
  start(@Req() req: { panel: PanelCaller }, @Body() dto: any) {
    return this.drafts.start(req.panel.organizationId, req.panel.externalId, dto ?? {});
  }

  @Get(':id')
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'The draft as it stands, and why it cannot be finished when it cannot' })
  status(@Req() req: { panel: PanelCaller }, @Param('id') id: string) {
    return this.drafts.status(req.panel.organizationId, id, req.panel.externalId);
  }

  @Post(':id/participants')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Pull a colleague in. They answer in their own conversation.' })
  invite(@Req() req: { panel: PanelCaller }, @Param('id') id: string, @Body() dto: { personExternalId: string }) {
    return this.drafts.invite(req.panel.organizationId, id, req.panel.externalId, dto?.personExternalId);
  }

  @Post(':id/contributions')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Say what you think a field should be. Opens a disagreement if it is one.' })
  contribute(@Req() req: { panel: PanelCaller }, @Param('id') id: string, @Body() dto: { field: string; body: string }) {
    return this.drafts.contribute(req.panel.organizationId, id, req.panel.externalId, dto?.field, dto?.body);
  }

  @Post(':id/contentions/:cid/resolve')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Settle a disagreement by saying which it is' })
  resolve(@Req() req: { panel: PanelCaller }, @Param('id') id: string, @Param('cid') cid: string, @Body() dto: { resolution: string }) {
    return this.drafts.resolveContention(req.panel.organizationId, id, cid, dto?.resolution, req.panel.externalId);
  }

  @Post(':id/seed')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Turn it into an objective. Refused while a required field is contested.' })
  seed(@Req() req: { panel: PanelCaller }, @Param('id') id: string, @Body() dto: { externalId: string; sourceSystem: string }) {
    return this.drafts.seed(req.panel.organizationId, id, dto?.externalId, dto?.sourceSystem, req.panel.externalId);
  }
}
