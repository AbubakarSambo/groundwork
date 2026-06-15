import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PromptsService } from './prompts.service';
import { PlatformAdminGuard } from '../../common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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

class UpsertDraftDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;
}

class ChatTurnDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

class TestChatDto {
  @IsString()
  @IsNotEmpty()
  versionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  messages: ChatTurnDto[];
}

/**
 * Prompt management — platform-admin-only. Prompt versions are global
 * infrastructure; changes are versioned, activation is deliberate.
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

  @Get('platform-funnel')
  @ApiOperation({ summary: 'Usage funnel data' })
  async platformFunnel() {
    return this.prompts.usageFunnel();
  }

  @Get('platform-dashboard')
  @ApiOperation({ summary: 'Cross-org usage dashboard' })
  async platformDashboard() {
    return this.prompts.platformDashboard();
  }

  @Get('org-cohorts')
  @ApiOperation({ summary: 'Per-org signup and engagement cohort view' })
  async orgCohorts() {
    return this.prompts.orgCohorts();
  }

  @Post('test-chat')
  @ApiOperation({ summary: 'Run a test message against a specific prompt version (no DB writes)' })
  async testChat(@Body() dto: TestChatDto) {
    return this.prompts.testChat(dto.versionId, dto.messages);
  }

  @Get('draft/:key')
  @ApiOperation({ summary: 'Get the current draft for a prompt key' })
  async getDraft(@Param('key') key: string) {
    return this.prompts.getDraft(key);
  }

  @Put('draft/:key')
  @ApiOperation({ summary: 'Create or update the draft for a prompt key (upsert)' })
  async upsertDraft(@Param('key') key: string, @Body() dto: UpsertDraftDto) {
    return this.prompts.upsertDraft(key, dto.content, dto.summary);
  }

  @Delete('draft/:key')
  @ApiOperation({ summary: 'Discard the draft for a prompt key' })
  async discardDraft(@Param('key') key: string) {
    return this.prompts.discardDraft(key);
  }

  @Get('by-key/:key')
  @ApiOperation({ summary: 'All versions for a single prompt key' })
  async byKey(@Param('key') key: string) {
    return this.prompts.getByKey(key);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a prompt version' })
  async activate(@Param('id') id: string, @CurrentUser() user: any) {
    const name = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;
    return this.prompts.activate(id, name);
  }
}
