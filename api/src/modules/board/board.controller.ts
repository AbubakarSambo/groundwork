import { Controller, Get, Post, Patch, Delete, Param, Query, Body } from '@nestjs/common';
import { IsString, IsInt, IsOptional, IsArray, MaxLength, Min, ArrayMaxSize } from 'class-validator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BoardService } from './board.service';
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
