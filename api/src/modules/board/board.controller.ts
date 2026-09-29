import { Controller, Get, Post, Patch, Delete, Param, Query, Body } from '@nestjs/common';
import { IsString, IsInt, IsOptional, IsArray, MaxLength, Min, ArrayMaxSize, ValidateNested } from 'class-validator';
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
  constructor(private board: BoardService) {}

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
    return this.board.get(id, userId, variant);
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
