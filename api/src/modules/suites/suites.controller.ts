import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import { CurrentUser, CurrentUserData } from '../../common';
import { SuitesService } from './suites.service';
import { OnboardingBoardService } from './the-onboarding-board.service';
import { LeaveBoardService } from './the-leave-board.service';

class SwitchDto {
  @IsBoolean() on!: boolean;
  @IsOptional() @IsObject() answers?: Record<string, unknown>;
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

  @Put(':key')
  @ApiOperation({ summary: 'An admin switches one suite on, with its answers, or off' })
  switch(@Param('key') key: string, @CurrentUser() user: CurrentUserData, @Body() dto: SwitchDto) {
    return this.suites.switch({ userId: user.id, organizationId: user.organizationId }, key, dto);
  }
}
