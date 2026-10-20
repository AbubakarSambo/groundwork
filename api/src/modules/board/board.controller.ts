import { withoutComparisonsAnywhere } from '../reports/no-comparison-between-people';
import { theDirectMorningIsOnFor } from '../organisation/the-direct-morning-switch';
import { inTheDirectMorningsWords } from '../reports/the-direct-morning-says-the-fact';
import { PrismaService } from '../prisma/prisma.service';
import { Controller, Get, Post, Patch, Delete, Param, Query, Body, BadRequestException, Optional } from '@nestjs/common';
import { IsString, IsInt, IsOptional, IsArray, IsBoolean, IsIn, MaxLength, Min, ArrayMaxSize, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BoardService, type WorkItemInput } from './board.service';
import { CurrentUser } from '../../common';
import { CoverageVariant, DEFAULT_COVERAGE_VARIANT } from './coverage';

class ObjectiveDto {
  @IsString() @MaxLength(160)
  name!: string;

  @IsOptional() @IsInt() @Min(0)
  target?: number | null;

  @IsOptional() @IsInt() @Min(0)
  count?: number;

  /**
   * WHOSE NUMBER THIS IS, WHERE IT IS SOMEBODY'S.
   *
   * Optional, and null is the ordinary case: a target for the whole check-in belonging to nobody in
   * particular, which is every target this product had until a chief of staff set ten of them, one
   * per salesperson. Validated as a participant on this ground by the service - a participant id
   * from somewhere else would attach a person's number to a check-in they are not on.
   */
  @IsOptional() @IsString() @MaxLength(64)
  ownerParticipantId?: string | null;

  /** What the target assumes, one thing per line. The lead's words; an empty list clears it. */
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(300, { each: true })
  assumes?: string[];

  /**
   * SAID PLAINLY BY THE LEAD, NEVER GUESSED FROM THE WORDING (decision 46, 29 September 2026).
   * Optional, and false is the ordinary case. A target with this set is shown to the check-in's
   * lead and nobody else - see whose-number-is-whose-business.ts. This route already checks the
   * caller is the lead (assertInitiatorOfBoardGround), so nobody else can set it.
   */
  @IsOptional() @IsBoolean()
  isADecisionAboutAPerson?: boolean;

  /**
   * AN AIM TO REACH ("AIM") OR A LIMIT NOT TO GO OVER ("LIMIT"), AS THE LEAD CHOSE IT (decision 69).
   * Optional. Absent leaves it as it is; null puts it back to not set, where the board reads the words
   * of the name as it always has. The board serves `directionSuggested` and `directionQuestion` to the
   * lead for a screen to ask with. This route is already the lead's alone.
   */
  /* Decision 75, item 17: the prototype's five kinds. "AIM" is Up, "LIMIT" is Lower is better, then "RATE"
     (a share to keep at or above), "DEADLINE" (a date to meet, with `dueOn`) and "ZERO" (a count to keep at zero). */
  @IsOptional() @IsIn(['AIM', 'LIMIT', 'RATE', 'DEADLINE', 'ZERO'])
  direction?: 'AIM' | 'LIMIT' | 'RATE' | 'DEADLINE' | 'ZERO' | null;
  /** For a date to meet: the day it is due, "2026-10-30"; null takes it off (decision 75, item 17). */
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueOn?: string | null;
}

class ProposePersonDto {
  @IsString() @MaxLength(120)
  key!: string;

  @IsInt() @Min(0)
  lastPeriod!: number;

  /** Months in the job. Absent is absent: nothing here guesses a tenure. */
  @IsOptional() @IsInt() @Min(0)
  months?: number;
}

class ProposeDto {
  /** The number the whole team has to reach. */
  @IsInt() @Min(1)
  total!: number;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProposePersonDto)
  people?: ProposePersonDto[];

  /**
   * OR THE EXPORT THEY ALREADY HAVE, AS ROWS.
   *
   * "I should be able to read the CRM. I am not an API user." The answer is the file every CRM
   * already exports: first row the header, the rest the people. What the product read comes back
   * with the proposal, so a wrong column is obvious in a second rather than buried in a number.
   */
  @IsOptional() @IsArray() @ArrayMaxSize(2000)
  rows?: (string | number | null)[][];
}

class PollDto {
  @IsString() @MaxLength(200)
  question!: string;

  @IsArray() @ArrayMaxSize(12)
  options!: string[];
}

@ApiTags('board')
@ApiBearerAuth()
@Controller('grounds/:id/board')
export class BoardController {
  constructor(private board: BoardService, @Optional() private prisma?: PrismaService) {}

  @Get()
  @ApiOperation({
    summary:
      'The delivery board for a shared-mode ground. Returns renders:false with a reason for private-mode or sensing-family grounds, which have no board by design.',
  })
  async get(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query('coverage') coverage?: string,
  ) {
    const variant: CoverageVariant = coverage === 'bar' ? 'bar' : coverage === 'text' ? 'text' : DEFAULT_COVERAGE_VARIANT;
    /* No sentence that ranks a person against others reaches any reader (reports/no-comparison-between-people.ts). */
    /* The direct morning: the product's own hedges say the fact or nothing, as served (reports/the-direct-morning-says-the-fact.ts). Off, as before. */
    return inTheDirectMorningsWords(withoutComparisonsAnywhere(await this.board.get(id, userId, variant)), await theDirectMorningIsOnFor(this.prisma, id));
  }

  /**
   * PROPOSE, NEVER WRITE.
   *
   * A chief of staff with a total and a team wants ten numbers, and asked four times before giving
   * up. This does the arithmetic and hands back a proposal with the reason against each figure. It
   * writes nothing: she argues with these in front of the people they belong to, so she changes
   * them first and then sets them through the ordinary route, one target at a time.
   */
  @Post('objectives/propose')
  @ApiOperation({ summary: 'Split a total across people, with the reason for each number. Proposes; writes nothing.' })
  proposeObjectives(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: ProposeDto) {
    return this.board.proposeObjectives(id, userId, dto);
  }

  @Post('objectives')
  @ApiOperation({ summary: 'Initiator only: add a target the board tracks against.' })
  async createObjective(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: ObjectiveDto) {
    return this.board.createObjective(id, userId, dto);
  }

  @Patch('objectives/:objectiveId')
  @ApiOperation({ summary: 'Initiator only: update a target, or move its count on.' })
  async updateObjective(
    @Param('id') id: string,
    @Param('objectiveId') objectiveId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<ObjectiveDto>,
  ) {
    return this.board.updateObjective(id, objectiveId, userId, dto);
  }

  @Delete('objectives/:objectiveId')
  @ApiOperation({ summary: 'Initiator only: remove a target.' })
  async deleteObjective(
    @Param('id') id: string,
    @Param('objectiveId') objectiveId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.board.deleteObjective(id, objectiveId, userId);
  }

  @Post('work-items')
  @ApiOperation({ summary: 'Lead only: add a record of the kind of work (a deal, a release, a deadline).' })
  async addWorkItem(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: WorkItemInput) {
    return this.board.addWorkItem(id, userId, dto ?? {});
  }

  @Patch('work-items/:itemId')
  @ApiOperation({ summary: 'Lead only: change a record of the kind of work, or move its stage on.' })
  async updateWorkItem(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser('id') userId: string, @Body() dto: WorkItemInput) {
    return this.board.updateWorkItem(id, itemId, userId, dto ?? {});
  }

  @Post('work-items/:itemId/claim')
  @ApiOperation({ summary: 'Lead only: answer whether a record somebody says is theirs is theirs. Only a yes sets the owner.' })
  async answerAClaimOnARecord(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser('id') userId: string, @Body() dto: { yes?: boolean }) {
    if (typeof dto?.yes !== 'boolean') throw new BadRequestException('Say yes or no.');
    return this.board.answerAClaimOnARecord(id, itemId, userId, dto.yes);
  }

  @Post('decisions/:itemId/answer')
  @ApiOperation({ summary: 'Lead only: answer yes or no to a question the lead wrote down as still to decide. The answer goes in how we work.' })
  async answerADecision(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser('id') userId: string, @Body() dto: { yes?: boolean }) {
    if (typeof dto?.yes !== 'boolean') throw new BadRequestException('Say yes or no.');
    return this.board.answerADecision(id, itemId, userId, dto.yes);
  }

  @Post('waits/:waitId/answer')
  @ApiOperation({ summary: 'Lead only: answer yes or no to a wait on the lead that a yes or a no answers, such as an answer about a price. The answer goes in how we work, and the wait is cleared.' })
  async answerAWaitOnTheLead(@Param('id') id: string, @Param('waitId') waitId: string, @CurrentUser('id') userId: string, @Body() dto: { yes?: boolean }) {
    if (typeof dto?.yes !== 'boolean') throw new BadRequestException('Say yes or no.');
    return this.board.answerAWaitOnTheLead(id, waitId, userId, dto.yes);
  }

  @Post('deals/:dealId/decide')
  @ApiOperation({ summary: 'Lead only: answer yes or no to a decision the lead promised herself about a deal, such as a discount its customer asked for. The answer goes in how we work.' })
  async answerADecisionTheLeadPromised(@Param('id') id: string, @Param('dealId') dealId: string, @CurrentUser('id') userId: string, @Body() dto: { yes?: boolean }) {
    if (typeof dto?.yes !== 'boolean') throw new BadRequestException('Say yes or no.');
    return this.board.answerADecisionTheLeadPromised(id, dealId, userId, dto.yes);
  }

  @Post('stall-rule/answer')
  @ApiOperation({ summary: 'Lead only: set the suggested stall rule (drop a deal after 3 working days with no answer), or say not now. The answer goes in how we work.' })
  async answerTheStallRule(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: { yes?: boolean }) {
    if (typeof dto?.yes !== 'boolean') throw new BadRequestException('Say yes or no.');
    return this.board.answerTheStallRule(id, userId, dto.yes);
  }

  @Post('due-on-an-event/answer')
  @ApiOperation({ summary: 'Lead only, where Release 2 is on: say whether a line from a matter check-in made a fee note due. Yes writes the day; no keeps the line as answered.' })
  async answerADueOnAnEvent(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: { itemId?: string; lineId?: string; yes?: boolean }) {
    if (typeof dto?.yes !== 'boolean') throw new BadRequestException('Say yes or no.');
    if (typeof dto?.itemId !== 'string' || typeof dto?.lineId !== 'string' || !dto.itemId || !dto.lineId) throw new BadRequestException('Say which fee note and which line this is about.');
    return this.board.answerADueOnAnEvent(id, userId, dto.itemId, dto.lineId, dto.yes);
  }

  @Post('price-range/answer')
  @ApiOperation({ summary: 'Lead only: answer whether a price range counts as a budget. The answer goes in how we work, and the board counts which deals are qualified by it.' })
  async answerThePriceRange(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: { yes?: boolean }) {
    if (typeof dto?.yes !== 'boolean') throw new BadRequestException('Say yes or no.');
    return this.board.answerThePriceRange(id, userId, dto.yes);
  }

  @Post('not-relevant')
  @ApiOperation({ summary: 'Lead only: say that what the organisation kept, offered as relevant, is not relevant to this check-in.' })
  async sayItIsNotRelevant(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: { memoryIds?: string[] }) {
    if (!Array.isArray(dto?.memoryIds) || !dto.memoryIds.length) throw new BadRequestException('Say which of what was offered is not relevant.');
    return this.board.sayItIsNotRelevant(id, dto.memoryIds, userId);
  }

  @Delete('work-items/:itemId')
  @ApiOperation({ summary: 'Lead only: remove a record of the kind of work.' })
  async deleteWorkItem(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser('id') userId: string) {
    return this.board.deleteWorkItem(id, itemId, userId);
  }

  @Post('poll')
  @ApiOperation({ summary: 'Initiator only: set the availability question and the times to choose between.' })
  async upsertPoll(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: PollDto) {
    return this.board.upsertPoll(id, userId, dto);
  }

  @Post('poll/:optionId/toggle')
  @ApiOperation({ summary: 'Mark yourself available or not for a poll option. The only editable thing on the board.' })
  async togglePoll(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.board.togglePollAvailability(id, optionId, userId);
  }
}
