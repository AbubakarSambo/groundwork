import { Controller, Post, Body } from '@nestjs/common';
import { Public, CurrentUser, CurrentUserData } from '../../common';
import { EntryService } from './entry.service';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
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
}

class EntryOpenerDto {
  @IsOptional()
  @IsString()
  scenario?: string;
}

class EntryFaqDto {
  @IsString() question: string;
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

@Public()
@Controller('entry')
export class EntryController {
  constructor(private service: EntryService) {}

  @Post('opener')
  opener(@Body() dto: EntryOpenerDto) {
    return { reply: this.service.opener(dto.scenario) };
  }

  @Post('chat')
  async chat(@Body() dto: EntryChatDto) {
    const reply = await this.service.chat(dto.messages, dto.scenario, dto.groundLabel);
    return { reply };
  }

  @Post('faq')
  async faq(@Body() dto: EntryFaqDto) {
    const reply = await this.service.faq(dto.question);
    return { reply };
  }

  @Post('participant-chat')
  async participantChat(@Body() dto: ParticipantChatDto) {
    return this.service.participantChat(dto.token, dto.messages);
  }

  @Post('report')
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
    return this.service.commit(user.organizationId, user.id, dto);
  }
}
