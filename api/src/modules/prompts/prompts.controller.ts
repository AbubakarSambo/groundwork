import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { PromptsService } from './prompts.service';
import { PlatformAdminGuard } from '../../common';

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
 * Prompt management — a restricted, platform-admin-only interface. Prompt
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
  async activate(@Param('id') id: string) {
    return this.prompts.activate(id);
  }

  @Get('platform-funnel')
  @ApiOperation({ summary: 'Usage funnel data — session drop-off, scenario breakdown, engagement' })
  async platformFunnel() {
    return this.prompts.usageFunnel();
  }

  @Get('by-key/:key')
  @ApiOperation({ summary: 'All versions for a single prompt key' })
  async byKey(@Param('key') key: string) {
    return this.prompts.getByKey(key);
  }

  @Get('platform-dashboard')
  @ApiOperation({ summary: 'Cross-org usage dashboard — session data, ground activity, prompt performance' })
  async platformDashboard() {
    return this.prompts.platformDashboard();
  }
}
