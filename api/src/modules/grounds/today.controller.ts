import { Body, Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserData } from '../../common';
import { WhatNeedsYouService } from './what-needs-you.service';

/** Today (C1, U.5): what needs you now, across every check-in you can see. */
@ApiTags('Today')
@ApiBearerAuth()
@Controller('today')
export class TodayController {
  constructor(private readonly needs: WhatNeedsYouService) {}

  @Get()
  @ApiOperation({ summary: 'What needs you now, across every check-in you can see' })
  async today(@CurrentUser() user: CurrentUserData) {
    return this.needs.today(user.id, user.email, user.organizationId, user.role);
  }

  @Get('outstanding')
  @ApiOperation({ summary: "Everything that is outstanding for you as a lead: what needs you, what is overdue on your team, the risks. The page the daily message's link goes to." })
  async outstanding(@CurrentUser() user: CurrentUserData) {
    return { outstanding: await this.needs.outstanding(user.id, user.organizationId) };
  }

  @Post('missed-reason')
  @ApiOperation({ summary: 'Give the reason you missed your check-ins. Only you can give it, on your own check-in; your lead sees it beside the line about it.' })
  async missedReason(@CurrentUser() user: CurrentUserData, @Body() body: { checkInId?: string; reason?: string }) {
    const kept = await this.needs.giveTheReasonForMissing(user.id, String(body?.checkInId ?? ''), String(body?.reason ?? ''));
    if (!kept) throw new NotFoundException('There is no missed check-in of yours to give a reason for.');
    return { kept: true };
  }

  @Get('everywhere')
  @ApiOperation({ summary: 'How many things need you in each organisation you belong to' })
  async everywhere(@CurrentUser() user: CurrentUserData) {
    return this.needs.everywhere(user.id, user.email);
  }
}
