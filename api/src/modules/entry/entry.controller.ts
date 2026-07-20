import { Controller, Post, Get, Patch, Body, Query, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public, CurrentUser, CurrentUserData } from '../../common';
import { EntryService } from './entry.service';
import { IsArray, IsEmail, IsIn, IsInt, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TurnDto {
  @IsString() role: 'user' | 'assistant';
  @IsString() content: string;
}

class EntryChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnDto)
  messages: TurnDto[];

  @IsOptional()
  @IsString()
  scenario?: string;

  @IsOptional()
  @IsString()
  groundLabel?: string;

  @IsOptional()
  @IsString()
  joinToken?: string;
}

class EntryOnboardDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnDto)
  messages: TurnDto[];
}

class EntryOpenerDto {
  @IsOptional()
  @IsString()
  scenario?: string;
}

class EntryFaqDto {
  @IsString()
  @MaxLength(1000)
  question: string;
}

class ParticipantChatDto {
  @IsString() token: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnDto)
  messages: TurnDto[];
}

class EntryReportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnDto)
  messages: TurnDto[];

  @IsOptional()
  @IsString()
  scenario?: string;

  @IsOptional()
  @IsString()
  groundLabel?: string;
}

class ContributorDto {
  @IsString() email: string;
  @IsOptional() @IsString() context?: string;
  @IsOptional() @IsString() inviteToken?: string;
  @IsOptional() @IsString() note?: string;
}

// Coordinator path: the committer is setting the ground up for someone ELSE to
// run. The lead is invited to confirm and becomes the initiator; the committer
// is recorded as createdByUserId only (no participant row, no phantom check-in).
class EntryLeadDto {
  @IsEmail() email: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) contextNote?: string;
}

// The committer's own private session report, sent as a narrowed summary (not
// the full EntryReport) - entry.service.ts's commit() reads whatGroundworkSaw
// off this to populate the ground's brief when no explicit `brief` was given.
// This DTO was missing entirely from 2026-06-24 (e078b0d) until now: the
// client has sent `reportSummary` (not `report`) since that commit, but this
// class never grew a matching field, so the global ValidationPipe's
// forbidNonWhitelisted rejected every commit carrying one with 400 "property
// reportSummary should not exist" - i.e. every commit where the committer had
// completed their own check-in session before saving. The client and service
// were already correct; only this DTO was stale.
class EntryReportSummaryDto {
  @IsIn(['Unresolved', 'Mixed', 'Emerging', 'Clear', 'Aligned'])
  alignmentStatus: 'Unresolved' | 'Mixed' | 'Emerging' | 'Clear' | 'Aligned';

  @IsString()
  whatGroundworkSaw: string;
}

export class EntryCommitDto {
  @IsString() groundLabel: string;
  @IsOptional() @IsString() orgName?: string;
  @IsOptional() @IsString() scenario?: string;
  @IsOptional() @IsString() cadence?: string;
  @IsOptional() @IsInt() cadenceAnchorDay?: number;
  @IsOptional() @IsString() checkInBy?: string;
  @IsOptional() @IsString() lastCheckInBy?: string;

  // Coordinator/lead path only: the onboarding context, used as the ground's
  // brief since the coordinator has no session transcript to derive one from.
  @IsOptional() @IsString() @MaxLength(4000) brief?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EntryReportSummaryDto)
  reportSummary?: EntryReportSummaryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EntryLeadDto)
  lead?: EntryLeadDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnDto)
  history: TurnDto[];

  @IsOptional()
  report?: any;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContributorDto)
  contributors: ContributorDto[];
}

@Controller('entry')
export class EntryController {
  constructor(private service: EntryService) {}

  /** Pre-auth update of the server-side entry draft, authorized by the bearer
   * draftToken issued at entry-save. Carries post-email edits (org name,
   * ground name, cadence, contributors) that previously lived only in
   * localStorage and were lost when the magic link opened elsewhere. */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Patch('draft')
  async patchDraft(@Body() body: { draftToken: string; payload: Record<string, any> }) {
    return this.service.patchDraft(body.draftToken, body.payload);
  }

  @Public()
  @Post('onboard')
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  async onboard(@Body() dto: EntryOnboardDto) {
    return this.service.onboard(dto.messages);
  }

  @Public()
  @Post('opener')
  opener(@Body() dto: EntryOpenerDto) {
    return { reply: this.service.opener(dto.scenario) };
  }

  @Public()
  @Post('chat')
  @Throttle({ global: { limit: 30, ttl: 60000 } })
  async chat(@Body() dto: EntryChatDto) {
    const reply = await this.service.chat(dto.messages, dto.scenario, dto.groundLabel, dto.joinToken);
    const r = reply.toLowerCase();
    const sessionComplete =
      r.includes('[session complete]') ||
      r.includes('your account is now on record') ||
      r.includes('your record is here') ||
      r.includes('your record is saved as is') ||
      r.includes('cannot be verified from this account') ||
      r.includes('your contribution is saved');
    return { reply, sessionComplete };
  }

  @Public()
  @Post('classify-intent')
  async classifyIntent(@Body() dto: { description: string; mode?: string }) {
    return this.service.classifyIntent(dto.description, dto.mode);
  }

  @Public()
  @Post('faq')
  async faq(@Body() dto: EntryFaqDto) {
    const reply = await this.service.faq(dto.question);
    return { reply };
  }

  @Public()
  @Post('participant-chat')
  async participantChat(@Body() dto: ParticipantChatDto) {
    return this.service.participantChat(dto.token, dto.messages);
  }

  @Public()
  @Post('report')
  @Throttle({ global: { limit: 20, ttl: 60000 } })
  async report(@Body() dto: EntryReportDto) {
    const report = await this.service.report(dto.messages, dto.scenario, dto.groundLabel);
    return { report };
  }
}

@Controller('entry')
export class EntryCommitController {
  constructor(private service: EntryService) {}

  @Post('commit')
  async commit(@CurrentUser() user: CurrentUserData, @Body() dto: EntryCommitDto) {
    if (!user?.organizationId) throw new UnauthorizedException('Account not linked to an organisation');
    return this.service.commit(user.organizationId, user.id, dto);
  }

  @Public()
  @Get('join-preview')
  async joinPreview(@Query('t') token: string) {
    return this.service.joinPreview(token);
  }

  @Public()
  @Post('join-commit')
  async joinCommit(@Body() dto: {
    joinToken: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    roleAsDescribed?: string;
    history: { role: 'user' | 'assistant'; content: string }[];
    report?: any;
  }) {
    return this.service.joinCommit(dto);
  }
}
