import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, MaxLength, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { Public } from '../../common';
import { EntryService } from './entry.service';

const VALID_MODES = ['something_new', 'look_back', 'look_forward', 'both'];

class MessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  content: string;
}

class EntryChatDto {
  @IsString()
  @IsIn(VALID_MODES)
  mode: string;

  @IsArray()
  @Type(() => MessageDto)
  messages: MessageDto[];
}

@ApiTags('Entry')
@Controller('entry')
export class EntryController {
  constructor(private readonly entry: EntryService) {}

  @Public()
  @Post('chat')
  @ApiOperation({ summary: 'Anonymous entry conversation (no auth required)' })
  async chat(@Body() dto: EntryChatDto) {
    return this.entry.chat(dto.mode, dto.messages);
  }
}
