import { Controller, Post, Get, Body, Query, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public, CurrentUser, CurrentUserData } from '../../common';
import { EntryService } from './entry.service';
import { IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
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

class EntryCommitDto {
  @IsString() groundLabel: string;
  @IsOptional() @IsString() orgName?: string;
  @IsOptional() @IsString() scenario?: string;
  @IsOptional() @IsString() cadence?: string;

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
