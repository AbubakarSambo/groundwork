import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, CurrentUserData } from '../../common';
import { SuitesService } from './suites.service';
import { OnboardingBoardService } from './the-onboarding-board.service';
import { LeaveBoardService } from './the-leave-board.service';
import { TimeSheetsService } from './the-time-sheets.service';
import { ReviewsService } from './the-reviews.service';
import { LeavingBoardService } from './the-leaving-board.service';
import { RoleMapService } from './the-role-map.service';
import { SpendingService } from './the-spending.service';
import { TodosService } from './the-todos.service';
import { CustomersService } from './the-customers.service';
import { EquipmentService } from './the-equipment.service';

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

class BudgetDto {
  @IsString() @MaxLength(120) team!: string;
  @IsNumber() amount!: number;
}

class EquipmentChangeDto {
  @IsOptional() @IsString() @MaxLength(200) holderId?: string | null;
  @IsOptional() @IsString() @MaxLength(300) condition?: string | null;
}

class EquipmentItemDto extends EquipmentChangeDto {
  @IsString() @MaxLength(120) name!: string;
}

class DutiesDto {
  @IsOptional() @IsString() @MaxLength(200) finance?: string | null;
  @IsOptional() @IsString() @MaxLength(200) hr?: string | null;
  @IsOptional() @IsString() @MaxLength(200) chiefExecutive?: string | null;
  @IsOptional() @IsObject() budgetOwners?: Record<string, string | null>;
  @IsOptional() @IsObject() departmentHeads?: Record<string, string | null>;
}

class WorkflowsDto {
  @IsOptional() @IsObject() leave?: Record<string, unknown> | null;
  @IsOptional() @IsObject() time?: Record<string, unknown> | null;
  @IsOptional() @IsObject() spend?: Record<string, unknown> | null;
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
    private readonly roles: RoleMapService,
    private readonly spend: SpendingService,
    private readonly todos: TodosService,
    private readonly customers: CustomersService,
    private readonly equipment: EquipmentService,
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

  @Get('leave/requests/:id/history')
  @ApiOperation({ summary: 'Who did what on one request for time off, in plain sentences, for the people who may already read it' })
  leaveHistory(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.leave.history({ userId: user.id, organizationId: user.organizationId }, id);
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

  @Get('time/weeks/:weekOf/people/:personId/history')
  @ApiOperation({ summary: 'Who did what on one person’s week of hours, in plain sentences, for the people who may already read it' })
  timeHistory(@Param('weekOf') weekOf: string, @Param('personId') personId: string, @CurrentUser() user: CurrentUserData) {
    return this.time.history({ userId: user.id, organizationId: user.organizationId }, personId, weekOf);
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

  @Get('reviews/mine')
  @ApiOperation({ summary: 'The reviews about you, once somebody has started them, and what you can do now' })
  myReviews(@CurrentUser() user: CurrentUserData) {
    return this.reviews.mine({ userId: user.id, organizationId: user.organizationId });
  }

  @Get('reviews/:id')
  @ApiOperation({ summary: 'One review, as this reader may read it' })
  oneReview(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.reviews.one({ userId: user.id, organizationId: user.organizationId }, id);
  }

  @Get('reviews/:id/history')
  @ApiOperation({ summary: 'Who started and decided one review, in plain sentences, for the people who may read the review' })
  reviewHistory(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.reviews.history({ userId: user.id, organizationId: user.organizationId }, id);
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

  @Get('roles/board')
  @ApiOperation({ summary: 'The role map: every role, what it owns, and who holds it. Admins only.' })
  roleMap(@CurrentUser() user: CurrentUserData) {
    return this.roles.board({ userId: user.id, organizationId: user.organizationId });
  }

  @Get('spend/board')
  @ApiOperation({ summary: 'Spending and budgets, while the suite is on, for an admin or the lead of the team' })
  spendBoard(@CurrentUser() user: CurrentUserData) {
    return this.spend.board({ userId: user.id, organizationId: user.organizationId });
  }

  @Post('spend/requests/:id/approve')
  @ApiOperation({ summary: 'The one who approves a request to spend says yes' })
  approveSpend(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.spend.decide({ userId: user.id, organizationId: user.organizationId }, id, 'approved');
  }

  @Post('spend/requests/:id/decline')
  @ApiOperation({ summary: 'The one who approves a request to spend says no' })
  declineSpend(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.spend.decide({ userId: user.id, organizationId: user.organizationId }, id, 'declined');
  }

  @Get('spend/requests/:id/history')
  @ApiOperation({ summary: 'Who did what on one request to spend, in plain sentences, for the people who may already read it' })
  spendHistory(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.spend.history({ userId: user.id, organizationId: user.organizationId }, id);
  }

  @Put('spend/budgets')
  @ApiOperation({ summary: 'An admin sets one team’s budget for this month' })
  setBudget(@CurrentUser() user: CurrentUserData, @Body() dto: BudgetDto) {
    return this.spend.setBudget({ userId: user.id, organizationId: user.organizationId }, dto);
  }

  @Get('todos/board')
  @ApiOperation({ summary: 'To-dos: what each person said they will do in their check-ins, for an admin or the lead of the team' })
  todosBoard(@CurrentUser() user: CurrentUserData) {
    return this.todos.board({ userId: user.id, organizationId: user.organizationId });
  }

  @Get('customers/board')
  @ApiOperation({ summary: 'Customers and deals, while the suite is on, for an admin or the lead of the team' })
  customersBoard(@CurrentUser() user: CurrentUserData) {
    return this.customers.board({ userId: user.id, organizationId: user.organizationId });
  }

  @Get('equipment/board')
  @ApiOperation({ summary: 'Equipment: who has what, and how it is. Admins only.' })
  equipmentBoard(@CurrentUser() user: CurrentUserData) {
    return this.equipment.board({ userId: user.id, organizationId: user.organizationId });
  }

  @Post('equipment/items')
  @ApiOperation({ summary: 'An admin adds an item, with who has it and how it is' })
  addEquipment(@CurrentUser() user: CurrentUserData, @Body() dto: EquipmentItemDto) {
    return this.equipment.add({ userId: user.id, organizationId: user.organizationId }, dto);
  }

  @Put('equipment/items/:id')
  @ApiOperation({ summary: 'An admin changes who has an item, or how it is' })
  changeEquipment(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: EquipmentChangeDto) {
    return this.equipment.change({ userId: user.id, organizationId: user.organizationId }, id, dto);
  }

  @Get('duties')
  @ApiOperation({ summary: 'Who holds each duty (finance, HR, the chief executive, each team’s budget and head). For an admin only.' })
  duties(@CurrentUser() user: CurrentUserData) {
    return this.suites.duties({ userId: user.id, organizationId: user.organizationId });
  }

  @Put('duties')
  @ApiOperation({ summary: 'An admin says who holds each duty. A duty given as null is cleared; one left out is kept.' })
  setDuties(@CurrentUser() user: CurrentUserData, @Body() dto: DutiesDto) {
    return this.suites.setDuties({ userId: user.id, organizationId: user.organizationId }, dto);
  }

  @Get('workflows')
  @ApiOperation({ summary: 'The approval steps of leave, time sheets and spending, and the working days before a request is passed on. For an admin only.' })
  workflows(@CurrentUser() user: CurrentUserData) {
    return this.suites.workflows({ userId: user.id, organizationId: user.organizationId });
  }

  @Put('workflows')
  @ApiOperation({ summary: 'An admin sets the approval steps or the working days for leave, time sheets or spending. A part given as null is cleared; one left out is kept.' })
  setWorkflows(@CurrentUser() user: CurrentUserData, @Body() dto: WorkflowsDto) {
    return this.suites.setWorkflows({ userId: user.id, organizationId: user.organizationId }, dto);
  }

  @Get('spend/mine')
  @ApiOperation({ summary: 'Your own requests to spend, each with where it is. Nobody else reads them here.' })
  mySpending(@CurrentUser() user: CurrentUserData) {
    return this.spend.mine({ userId: user.id, organizationId: user.organizationId });
  }

  @Put(':key')
  @ApiOperation({ summary: 'An admin switches one suite on, with its answers, or off' })
  switch(@Param('key') key: string, @CurrentUser() user: CurrentUserData, @Body() dto: SwitchDto) {
    return this.suites.switch({ userId: user.id, organizationId: user.organizationId }, key, dto);
  }
}
