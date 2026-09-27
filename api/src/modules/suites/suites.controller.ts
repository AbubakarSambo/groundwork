import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, CurrentUserData } from '../../common';
import { SuitesService } from './suites.service';
import { OnboardingBoardService } from './the-onboarding-board.service';
import { LeaveBoardService } from './the-leave-board.service';
import { TimeSheetsService } from './the-time-sheets.service';
import { ReviewsService } from './the-reviews.service';
import { LeavingBoardService } from './the-leaving-board.service';

class SwitchDto {
  @IsBoolean() on!: boolean;
  @IsOptional() @IsObject() answers?: Record<string, unknown>;
}

class WordsDto {
  @IsString() @MaxLength(4000) text!: string;
}

class ReviewDecisionDto {
  @IsOptional() @IsString() @MaxLength(1000) decision?: string;
  @IsOptional() @IsString() @MaxLength(2000) reasons?: string;
}

class StartLeavingDto {
  @IsString() @MaxLength(200) personId!: string;
  @IsString() @MaxLength(10) lastDay!: string;
}

class LeavingStepDto {
  @IsOptional() @IsString() @MaxLength(200) ownerUserId?: string | null;
  @IsOptional() @IsBoolean() done?: boolean;
}

class AgreementsDto {
  @IsArray() agreements!: unknown[];
}

/**
 * THE SUITES PAGE (E, U.17). Who may read and switch what is decided in SuitesService, on the
 * server, for both routes: an admin reads and switches; a lead reads which are on; nobody else.
 */
@ApiTags('Suites')
@ApiBearerAuth()
@Controller('suites')
export class SuitesController {
  constructor(
    private readonly suites: SuitesService,
    private readonly onboarding: OnboardingBoardService,
    private readonly leave: LeaveBoardService,
    private readonly time: TimeSheetsService,
    private readonly reviews: ReviewsService,
    private readonly leaving: LeavingBoardService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The suites, as this reader may read them' })
  page(@CurrentUser() user: CurrentUserData) {
    return this.suites.forReader({ userId: user.id, organizationId: user.organizationId });
  }

  @Get('onboard/board')
  @ApiOperation({ summary: 'The onboarding board, while the suite is on, for an admin or the lead of the team' })
  onboardingBoard(@CurrentUser() user: CurrentUserData) {
    return this.onboarding.forReader({ userId: user.id, organizationId: user.organizationId });
  }

  @Get('leave/board')
  @ApiOperation({ summary: 'The leave board, while the suite is on, for an admin or the lead of the team' })
  leaveBoard(@CurrentUser() user: CurrentUserData) {
    return this.leave.board({ userId: user.id, organizationId: user.organizationId });
  }

  @Get('leave/mine')
  @ApiOperation({ summary: 'Your own requests for time off, and your days left. Nobody else reads them here.' })
  myLeave(@CurrentUser() user: CurrentUserData) {
    return this.leave.mine({ userId: user.id, organizationId: user.organizationId });
  }

  @Post('leave/requests/:id/approve')
  @ApiOperation({ summary: 'The approver approves a request for time off' })
  approveLeave(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.leave.decide({ userId: user.id, organizationId: user.organizationId }, id, 'approved');
  }

  @Post('leave/requests/:id/decline')
  @ApiOperation({ summary: 'The approver declines a request for time off' })
  declineLeave(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.leave.decide({ userId: user.id, organizationId: user.organizationId }, id, 'declined');
  }

  @Get('time/board')
  @ApiOperation({ summary: 'Time sheets, while the suite is on, for an admin or the lead of the team. For billing only.' })
  timeBoard(@CurrentUser() user: CurrentUserData) {
    return this.time.board({ userId: user.id, organizationId: user.organizationId });
  }

  @Get('time/mine')
  @ApiOperation({ summary: 'Your own hours, week by week. Nobody else reads them here.' })
  myTime(@CurrentUser() user: CurrentUserData) {
    return this.time.mine({ userId: user.id, organizationId: user.organizationId });
  }

  @Post('time/weeks/:weekOf/people/:personId/approve')
  @ApiOperation({ summary: 'The approver approves one person’s week of hours' })
  approveTime(@Param('weekOf') weekOf: string, @Param('personId') personId: string, @CurrentUser() user: CurrentUserData) {
    return this.time.approve({ userId: user.id, organizationId: user.organizationId }, personId, weekOf);
  }

  @Put('time/agreements')
  @ApiOperation({ summary: 'An admin says what each client agreed. It replaces the list.' })
  setTimeAgreements(@CurrentUser() user: CurrentUserData, @Body() dto: AgreementsDto) {
    return this.time.setAgreements({ userId: user.id, organizationId: user.organizationId }, dto.agreements);
  }

  @Get('reviews/board')
  @ApiOperation({ summary: 'The next performance reviews, while the suite is on, for an admin or the lead of the team' })
  reviewsBoard(@CurrentUser() user: CurrentUserData) {
    return this.reviews.board({ userId: user.id, organizationId: user.organizationId });
  }

  @Post('reviews/due/:dueId/start')
  @ApiOperation({ summary: 'The person who writes the review with them starts it' })
  startReview(@Param('dueId') dueId: string, @CurrentUser() user: CurrentUserData) {
    return this.reviews.start({ userId: user.id, organizationId: user.organizationId }, dueId);
  }

  @Get('reviews/:id')
  @ApiOperation({ summary: 'One review, as this reader may read it' })
  oneReview(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.reviews.one({ userId: user.id, organizationId: user.organizationId }, id);
  }

  @Put('reviews/:id/words')
  @ApiOperation({ summary: 'The writer’s own words' })
  reviewWords(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: WordsDto) {
    return this.reviews.writeWords({ userId: user.id, organizationId: user.organizationId }, id, dto.text);
  }

  @Put('reviews/:id/view')
  @ApiOperation({ summary: 'The person’s own view of their work' })
  reviewView(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: WordsDto) {
    return this.reviews.writeView({ userId: user.id, organizationId: user.organizationId }, id, dto.text);
  }

  @Post('reviews/:id/decision')
  @ApiOperation({ summary: 'The writer decides, with reasons, and the person reads both' })
  decideReview(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: ReviewDecisionDto) {
    return this.reviews.decide({ userId: user.id, organizationId: user.organizationId }, id, dto);
  }

  @Get('leaving/board')
  @ApiOperation({ summary: 'When someone leaves: each list, its steps and owners. Admins only.' })
  leavingBoard(@CurrentUser() user: CurrentUserData) {
    return this.leaving.board({ userId: user.id, organizationId: user.organizationId });
  }

  @Post('leaving/lists')
  @ApiOperation({ summary: 'An admin starts the list for somebody’s last day' })
  startLeaving(@CurrentUser() user: CurrentUserData, @Body() dto: StartLeavingDto) {
    return this.leaving.start({ userId: user.id, organizationId: user.organizationId }, dto);
  }

  @Put('leaving/lists/:id/steps/:step')
  @ApiOperation({ summary: 'An admin names a step’s owner, or marks it done or not done' })
  leavingStep(@Param('id') id: string, @Param('step') step: string, @CurrentUser() user: CurrentUserData, @Body() dto: LeavingStepDto) {
    return this.leaving.step({ userId: user.id, organizationId: user.organizationId }, id, step, dto);
  }

  @Put(':key')
  @ApiOperation({ summary: 'An admin switches one suite on, with its answers, or off' })
  switch(@Param('key') key: string, @CurrentUser() user: CurrentUserData, @Body() dto: SwitchDto) {
    return this.suites.switch({ userId: user.id, organizationId: user.organizationId }, key, dto);
  }
}
