import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CurrentUser, CurrentUserData } from '../../common';
import { AMessageIntoACheckInDto } from '../../common/dto/a-message-into-a-check-in.dto';
import { Asker, AskService } from './ask.service';

/** A question to Ask Groundwork: the same checks as every other door into a conversation. */
export class AQuestionDto extends AMessageIntoACheckInDto {
  /** The check-in the question is about, chosen under "About". Optional. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  groundId?: string;
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
  @ApiOperation({ summary: 'Ask Groundwork a question. The answer is for you alone.' })
  async question(@CurrentUser() user: CurrentUserData, @Body() dto: AQuestionDto) {
    return this.ask.ask(this.asker(user), { message: dto.message, groundId: dto.groundId });
  }

  @Post('answer')
  @HttpCode(200)
  @ApiOperation({ summary: 'Yes or no to the one request Ask Groundwork said back to you. Nothing is done without a yes.' })
  async answer(@CurrentUser() user: CurrentUserData, @Body() dto: AnAnswerDto) {
    return this.ask.answer(this.asker(user), { proposalId: dto.proposalId, answer: dto.answer });
  }
}
