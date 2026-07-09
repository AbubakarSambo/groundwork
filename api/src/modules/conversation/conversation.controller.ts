import { Controller, Get, Post, Param, Body, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Response } from 'express';
import { ConversationService } from './conversation.service';
import { RemindService } from './remind.service';
import { CurrentUser, JwtAuthGuard } from '../../common';

class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  message: string;
}

@ApiTags('Conversation')
@ApiBearerAuth()
// JwtAuthGuard is also applied globally via APP_GUARD in app.module.ts.
// The explicit decorator here makes the requirement visible at the controller level.
@UseGuards(JwtAuthGuard)
@Controller('check-ins')
export class ConversationController {
  constructor(
    private readonly conversation: ConversationService,
    private readonly remind: RemindService,
  ) {}

  @Get(':id/transcript')
  @ApiOperation({ summary: "Get a check-in transcript (owner only)" })
  async transcript(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.getTranscript(id, userId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download the contribution record as plain text (owner only)' })
  async download(@Param('id') id: string, @CurrentUser('id') userId: string, @Res() res: Response) {
    const text = await this.conversation.getDownload(id, userId);
    res.status(HttpStatus.OK)
      .setHeader('Content-Type', 'text/plain; charset=utf-8')
      .setHeader('Content-Disposition', `attachment; filename="groundwork-record-${id.slice(0, 8)}.txt"`)
      .send(text);
  }

  @Post(':id/open')
  @ApiOperation({ summary: 'Open the check-in - the engine delivers the opening' })
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

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline to take part - penalty-free (owner only)' })
  async decline(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.decline(id, userId);
  }

  @Get(':id/artifact')
  @ApiOperation({ summary: 'Get this party\'s single-party record artifact (owner only)' })
  async artifact(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.getSoloArtifact(id, userId);
  }

  @Post(':id/document-received')
  @ApiOperation({ summary: 'Handle a newly attached document - generates AI response asking what it confirms' })
  async documentReceived(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.documentReceived(id, userId);
  }

  @Post(':id/remind')
  @ApiOperation({ summary: 'Send a nudge email to parties who have not yet completed this check-in session' })
  async sendReminder(@Param('id') checkInId: string, @CurrentUser('id') userId: string) {
    return this.remind.sendReminder(checkInId, userId);
  }
}

@ApiTags('Clarification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('grounds')
export class ClarificationController {
  constructor(private readonly conversation: ConversationService) {}

  @Post(':groundId/clarify')
  @ApiOperation({ summary: 'Start a clarification session to correct a specific inference in the report' })
  async startClarification(
    @Param('groundId') groundId: string,
    @Body() body: { inferenceId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.conversation.startClarificationSession(userId, groundId, body.inferenceId);
  }
}
