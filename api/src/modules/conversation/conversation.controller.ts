import { AMessageIntoACheckInDto } from '../../common/dto';
import { Controller, Get, Post, Param, Body, Res, HttpStatus, UseGuards, HttpCode, Logger } from '@nestjs/common';
import { A_STREAM_FAILED } from '../../common/published-surfaces';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Response } from 'express';
import { ConversationService } from './conversation.service';
import { RemindService } from './remind.service';
import { CurrentUser, JwtAuthGuard } from '../../common';

/** The one posture every door has. See common/dto/a-message-into-a-check-in.dto.ts. */
export class SendMessageDto extends AMessageIntoACheckInDto {}

class WhatWorkedDto {
  /* What they were stuck on, in their words. Short, because it is what matching happens on. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  about: string;

  /* What they did. Their words, kept exactly - a summary of a method is not the method. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  what: string;
}

@ApiTags('Conversation')
@ApiBearerAuth()
// JwtAuthGuard is also applied globally via APP_GUARD in app.module.ts.
// The explicit decorator here makes the requirement visible at the controller level.
@UseGuards(JwtAuthGuard)
@Controller('check-ins')
export class ConversationController {
  /** Add something to your own record, any time (add-something.ts): it goes in as an answer, and is filed where it belongs. */
  @Post('add-something/:groundId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add something to your own record, between check-ins or during one' })
  async addSomething(@Param('groundId') groundId: string, @Body() dto: AMessageIntoACheckInDto, @CurrentUser('id') userId: string) {
    return this.conversation.addSomething(groundId, userId, dto.message);
  }

  private readonly logger = new Logger(ConversationController.name);
  constructor(
    private readonly conversation: ConversationService,
    private readonly remind: RemindService,
  ) {}

  @Get(':id/transcript')
  @ApiOperation({ summary: "Get a check-in transcript (owner only)" })
  async transcript(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.getTranscript(id, userId);
  }

  @Get(':id/end-card')
  @ApiOperation({ summary: 'The end card: ready now, or waited for while it is built (owner only)' })
  async endCard(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.theEndCardWhenReady(id, userId);
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

  @Post(':id/what-worked')
  @ApiOperation({ summary: 'Write down what worked, for whoever hits the same thing next' })
  async whatWorked(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: WhatWorkedDto,
  ) {
    /*
     * A DELIBERATE ACT, WHICH IS THE WHOLE DESIGN. Nothing lifts this out of a check-in on somebody's
     * behalf: a note reaches other people because its author wrote it for them, which is also why
     * nobody has to wonder whether today's answer is going on a noticeboard.
     */
    return this.conversation.offerWhatWorked(id, userId, dto.about, dto.what);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message and get the AI reply' })
  async send(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: SendMessageDto) {
    return this.conversation.sendMessage(id, userId, dto.message, { answering: dto.answering ?? null });
  }

  @Post(':id/messages/stream')
  @ApiOperation({ summary: 'Send a message and stream the AI reply (SSE)' })
  async sendStream(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: SendMessageDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const write = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    try {
      for await (const evt of this.conversation.sendMessageStream(id, userId, dto.message, dto.answering ?? null)) {
        write(evt);
      }
    } catch (err: any) {
      /* The wire gets a stable code and a safe sentence; the internal text goes to the log (F14). */
      this.logger.warn(`Stream on check-in ${id} failed: ${err?.message}`);
      write({ type: 'error', code: 'stream_failed', message: A_STREAM_FAILED });
    } finally {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark a check-in complete' })
  async complete(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() body?: { ended?: boolean }) {
    /* "End session", pressed by the person: their own end, honoured with anything said (26 October). */
    return this.conversation.complete(id, userId, body?.ended === true ? { theyAskedToFinish: true } : {});
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline to take part - penalty-free (owner only)' })
  async decline(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.decline(id, userId);
  }

  @Post(':id/entries/:entryId/dispute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Say a line taken from what you said is not what you said. Owner-scoped; nothing is deleted.' })
  async disputeEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.conversation.disputeEntry(id, entryId, userId);
  }

  @Get(':id/session-report')
  @ApiOperation({ summary: 'The report this session ended on, as it was read (owner only)' })
  async sessionReport(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.getSessionReport(id, userId);
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

  @Post(':groundId/correct-session')
  @ApiOperation({ summary: "Start a self-correction session to correct or add to the participant's own prior session" })
  async startSelfCorrection(
    @Param('groundId') groundId: string,
    @Body() body: { sessionNumber: number },
    @CurrentUser('id') userId: string,
  ) {
    return this.conversation.startSelfCorrectionSession(userId, groundId, body.sessionNumber);
  }
}
