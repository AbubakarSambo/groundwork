import { Controller, Get, Post, Param, Body, UseGuards, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { PromptsService } from './prompts.service';
import { PlatformAdminGuard, CurrentUser } from '../../common';

class CreatePromptVersionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  key: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;
}

/**
 * Prompt management - a restricted, platform-admin-only interface. Prompt
 * versions are global infrastructure (the moat); changes are versioned and
 * logged with a summary, and activation is deliberate. Not in the main product UI.
 */
@ApiTags('Prompt Management')
@ApiBearerAuth()
@UseGuards(PlatformAdminGuard)
@Controller('prompts')
export class PromptsController {
  constructor(private readonly prompts: PromptsService) {}

  @Get()
  @ApiOperation({ summary: 'List all prompt versions (platform admin)' })
  async list() {
    return this.prompts.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new prompt version (inactive until activated)' })
  async create(@Body() dto: CreatePromptVersionDto) {
    return this.prompts.createVersion(dto.key, dto.content, dto.summary);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a prompt version (versioned against outcome data)' })
  async activate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    /* Who activated it by hand, so a start never replaces it (decision 74, item 6). */
    return this.prompts.activate(id, userId || undefined);
  }

  @Get('platform-funnel')
  @ApiOperation({ summary: 'Usage funnel data - session drop-off, scenario breakdown, engagement' })
  async platformFunnel(@Query('range') range?: string) {
    return this.prompts.usageFunnel(range);
  }

  @Get('by-key/:key')
  @ApiOperation({ summary: 'All versions for a single prompt key' })
  async byKey(@Param('key') key: string) {
    return this.prompts.getByKey(key);
  }

  @Get('platform-dashboard')
  @ApiOperation({ summary: 'Cross-org usage dashboard - session data, ground activity, prompt performance' })
  async platformDashboard(@Query('range') range?: string) {
    return this.prompts.platformDashboard(range);
  }

  /**
   * WHO IS IN ONE ORGANISATION. The account list, never their work.
   *
   * The console could say an org had eleven people and not say who any of them were, so support
   * could not answer "did the invitation reach Musa". Emails and phone numbers, because those are
   * how you reach somebody; no check-in, no record entry, no report, not a word anybody wrote.
   */
  @Get('org-list/:organizationId/people')
  @ApiOperation({ summary: "Everyone registered in one organisation: name, email, phone, role. Never their check-ins, records or reports." })
  async peopleIn(@Param('organizationId') organizationId: string) {
    return this.prompts.peopleIn(organizationId);
  }

  @Get('org-list')
  @ApiOperation({ summary: 'All orgs with ground counts, billing status, and last activity' })
  async orgList() {
    return this.prompts.orgList();
  }

  @Get('usage-stats')
  @ApiOperation({ summary: '14-day check-in trend and event totals' })
  async usageStats(@Query('range') range?: string) {
    return this.prompts.usageStats(range);
  }

  @Get('feedback-summary')
  @ApiOperation({ summary: 'Outcome feedback responses - fairness rate and recent notes' })
  async feedbackSummary() {
    return this.prompts.feedbackSummary();
  }

  @Post('test-chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sandbox: one chat turn with a custom system prompt. Never persisted.' })
  async testChat(@Body() body: { systemPrompt: string; messages: { role: 'user' | 'assistant'; content: string }[] }) {
    return this.prompts.testChat(body.systemPrompt, body.messages);
  }

  @Post('test-report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sandbox: generate cross-reference and participant reports from test conversations. Never persisted.' })
  async testReport(@Body() body: {
    systemPrompt: string;
    adminMessages: { role: 'user' | 'assistant'; content: string }[];
    p1Messages: { role: 'user' | 'assistant'; content: string }[];
    p2Messages: { role: 'user' | 'assistant'; content: string }[];
  }) {
    return this.prompts.testReport(body.systemPrompt, body.adminMessages, body.p1Messages, body.p2Messages);
  }
}
