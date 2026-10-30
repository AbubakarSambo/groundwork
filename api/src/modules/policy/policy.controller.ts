import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserData } from '../../common';
import { PolicyService } from './policy.service';

/** RELEASE 9: the policy board, and setting up from documents. Off, the board says so and nothing is written. */
@ApiTags('Policy')
@ApiBearerAuth()
@Controller('policy')
export class PolicyController {
  constructor(private readonly policy: PolicyService) {}
  private r = (u: CurrentUserData) => ({ userId: u.id, organizationId: u.organizationId, role: u.role });

  @Get() @ApiOperation({ summary: 'The policy board: every rule the organisation runs on, by area, and what waits on a decision' })
  board(@CurrentUser() u: CurrentUserData) { return this.policy.board(this.r(u)); }

  @Get('setup') @ApiOperation({ summary: 'For an admin: the documents added, what to decide first, and each area to approve' })
  setup(@CurrentUser() u: CurrentUserData) { return this.policy.setup(this.r(u)); }

  @Post('documents') @ApiOperation({ summary: 'An admin adds a document; its rules are proposed, and nothing is applied until its area is approved' })
  addDocument(@CurrentUser() u: CurrentUserData, @Body() body: any) { return this.policy.addDocument(this.r(u), body ?? {}); }

  @Post('decide') @ApiOperation({ summary: 'Where two documents disagree, keep one rule' })
  decide(@CurrentUser() u: CurrentUserData, @Body() body: any) { return this.policy.decide(this.r(u), body ?? {}); }

  @Post('approve') @ApiOperation({ summary: 'Approve an area: its rules apply, and the suites follow the ones they can check' })
  approve(@CurrentUser() u: CurrentUserData, @Body() body: any) { return this.policy.approve(this.r(u), body ?? {}); }
}
