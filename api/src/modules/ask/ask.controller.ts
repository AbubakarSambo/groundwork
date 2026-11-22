import { Body, Controller, Get, HttpCode, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ONE_FILE } from '../../common/the-most-a-file-may-weigh';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateIf } from 'class-validator';
import { CurrentUser, CurrentUserData } from '../../common';
import { A_MESSAGE_MAX, A_MESSAGE_IS_TOO_LONG } from '../../common/dto/a-message-into-a-check-in.dto';
import { Asker, AskService } from './ask.service';

/** How the screen names asking from inside a check-in's setup (decision 65). */
export const OPENED_FROM_CHECK_IN_SETUP = 'check_in_setup' as const;

/**
 * A question to Ask Groundwork: the same checks as every other door into a conversation
 * (a-message-into-a-check-in.dto.ts), with one difference. Opened from inside a check-in's own
 * Context and resources page or setup (decision 65), the screen sends `groundId` and
 * `openedFrom: "check_in_setup"` together, and the first message may be empty - it means "start",
 * the same way opening the old context chat needed nothing typed. Every other caller, with no
 * `openedFrom`, keeps the ordinary rule: a message has to say something.
 */
export class AQuestionDto {
  @ValidateIf((o: AQuestionDto) => o.openedFrom !== OPENED_FROM_CHECK_IN_SETUP)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'a message has to say something' })
  @MaxLength(A_MESSAGE_MAX, { message: A_MESSAGE_IS_TOO_LONG })
  message: string;

  /** The check-in the question is about, chosen under "About". Optional. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  groundId?: string;

  /**
   * Set only when Ask Groundwork is opened from inside a check-in (decision 65). Together with
   * `groundId`, and only for somebody who may confirm setup on that check-in (decision 63), this
   * opens the setup conversation directly rather than waiting for the word "context". Sent by
   * anybody else - a participant, or the lead's own message with no `groundId` - it is read as
   * asked, unchanged; ignored, not refused.
   */
  @IsOptional()
  @IsIn([OPENED_FROM_CHECK_IN_SETUP])
  openedFrom?: typeof OPENED_FROM_CHECK_IN_SETUP;
}

/** A yes or a no to one request Ask Groundwork said back. */
export class AnAnswerDto {
  @IsUUID()
  proposalId!: string;

  @IsIn(['yes', 'no'])
  answer!: 'yes' | 'no';
}

/**
 * ASK GROUNDWORK (D1, U.14). The signed-in person's own questions, and nobody else's.
 *
 * `GET /ask` reads your own earlier questions and answers. Naming anybody else, as `GET /ask/:userId`
 * or with `?userId=`, is refused, whatever the reader's role: a lead, an admin and Groundwork's own
 * staff never read somebody's questions. `POST /ask` asks; `POST /ask/answer` is the yes or the no
 * to a request Ask Groundwork said back, and nothing is done without it.
 */
@ApiTags('Ask Groundwork')
@ApiBearerAuth()
@Controller('ask')
export class AskController {
  constructor(private readonly ask: AskService) {}

  private asker(user: CurrentUserData): Asker {
    return { userId: user.id, email: user.email, organizationId: user.organizationId };
  }

  @Get()
  @ApiOperation({ summary: 'Your own questions to Ask Groundwork, and the check-ins you may ask about. Only you may read them.' })
  async mine(@CurrentUser() user: CurrentUserData, @Query('userId') userId?: string) {
    return this.ask.forReader(this.asker(user), userId ?? null);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Refused for anybody but the person who asked.' })
  async someone(@CurrentUser() user: CurrentUserData, @Param('userId') userId: string) {
    return this.ask.forReader(this.asker(user), userId);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Ask Groundwork a question. The answer is for you alone. Send groundId and openedFrom: "check_in_setup" '
      + 'together, from inside a check-in, to open its setup conversation directly (decision 65); message may be '
      + 'empty for the opening turn. Ignored, never refused, for anybody who may not confirm setup on that check-in.',
  })
  async question(@CurrentUser() user: CurrentUserData, @Body() dto: AQuestionDto) {
    return this.ask.ask(this.asker(user), { message: dto.message ?? '', groundId: dto.groundId, openedFrom: dto.openedFrom });
  }

  @Post('document')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', ONE_FILE))
  @ApiOperation({ summary: 'An admin adds a document for the whole organisation. It is read and said back; nothing is added until the yes.' })
  async documentForTheOrganisation(@CurrentUser() user: CurrentUserData, @UploadedFile() file: Express.Multer.File) {
    return this.ask.addADocumentForTheOrganisation(this.asker(user), file);
  }

  @Post('answer')
  @HttpCode(200)
  @ApiOperation({ summary: 'Yes or no to the one request Ask Groundwork said back to you. Nothing is done without a yes.' })
  async answer(@CurrentUser() user: CurrentUserData, @Body() dto: AnAnswerDto) {
    return this.ask.answer(this.asker(user), { proposalId: dto.proposalId, answer: dto.answer });
  }
}
