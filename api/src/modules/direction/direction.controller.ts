import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserData } from '../../common';
import { DirectionService } from './direction.service';

/** RELEASE 6: the company's direction, each team's brief, and each person's recommitment. Off, every read says so and nothing is written. */
@ApiTags('Direction')
@ApiBearerAuth()
@Controller('direction')
export class DirectionController {
  constructor(private readonly direction: DirectionService) {}
  private r = (u: CurrentUserData) => ({ userId: u.id, organizationId: u.organizationId, role: u.role });

  @Get() @ApiOperation({ summary: 'The company direction, what it means for each team, whether the organisation has realigned, and the revisions' })
  read(@CurrentUser() u: CurrentUserData) { return this.direction.read(this.r(u)); }

  @Put() @ApiOperation({ summary: 'An admin sets a new direction; the earlier one stays as a revision' })
  setNew(@CurrentUser() u: CurrentUserData, @Body() body: any) { return this.direction.setNew(this.r(u), body ?? {}); }

  @Get('mine') @ApiOperation({ summary: 'Your own goals in the direction’s teams, and whether each is continued, changed or stopped' })
  mine(@CurrentUser() u: CurrentUserData) { return this.direction.mine(this.r(u)); }

  @Post('recommit') @ApiOperation({ summary: 'Continue, change or stop one of your goals under the new direction' })
  recommit(@CurrentUser() u: CurrentUserData, @Body() body: any) { return this.direction.recommit(this.r(u), body ?? {}); }

  @Get('teams/:groundId') @ApiOperation({ summary: 'A team’s brief under the direction' })
  brief(@CurrentUser() u: CurrentUserData, @Param('groundId') groundId: string) { return this.direction.brief(this.r(u), groundId); }

  @Put('teams/:groundId/brief') @ApiOperation({ summary: 'The lead writes the team’s brief' })
  setBrief(@CurrentUser() u: CurrentUserData, @Param('groundId') groundId: string, @Body() body: any) { return this.direction.setBrief(this.r(u), groundId, body ?? {}); }

  @Post('teams/:groundId/approve') @ApiOperation({ summary: 'The lead approves what the direction means for their team' })
  approve(@CurrentUser() u: CurrentUserData, @Param('groundId') groundId: string, @Body() body: any) { return this.direction.approve(this.r(u), groundId, body ?? {}); }
}
