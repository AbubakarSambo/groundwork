import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ConversationService } from './conversation.service';
import { CurrentUser } from '../../common';

class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  message: string;
}

@ApiTags('Conversation')
@ApiBearerAuth()
@Controller('check-ins')
export class ConversationController {
  constructor(private readonly conversation: ConversationService) {}

  @Get(':id/transcript')
  @ApiOperation({ summary: "Get a check-in transcript (owner only)" })
  async transcript(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.getTranscript(id, userId);
  }

  @Post(':id/open')
  @ApiOperation({ summary: 'Open the check-in — the engine delivers the opening' })
  async open(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.open(id, userId);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message and get the AI reply' })
  async send(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: SendMessageDto) {
    return this.conversation.sendMessage(id, userId, dto.message);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark a check-in complete' })
  async complete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.complete(id, userId);
  }
}
