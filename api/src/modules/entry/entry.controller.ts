import { Controller, Post, Body } from '@nestjs/common';
import { Public } from '../../common';
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

  @Post('report')
  async report(@Body() dto: EntryReportDto) {
    const report = await this.service.report(dto.messages, dto.scenario, dto.groundLabel);
    return { report };
  }
}
