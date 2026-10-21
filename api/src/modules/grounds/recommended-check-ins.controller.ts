import { Controller, Get, Param, Post, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserData } from '../../common';
import { RecommendedCheckInsService } from './recommended-check-ins.service';

/** What Groundwork recommends on a check-in started from the anchor. The lead's alone. */
@ApiTags('Recommended check-ins')
@ApiBearerAuth()
@Controller('grounds/:groundId/recommended-check-ins')
export class RecommendedCheckInsController {
  constructor(private readonly offers: RecommendedCheckInsService) {}

  @Get()
  @ApiOperation({ summary: 'The check-ins Groundwork recommends, waiting for your answer' })
  list(@CurrentUser() user: CurrentUserData, @Param('groundId') groundId: string) {
    return this.offers.forTheReader(groundId, user.id);
  }

  @Post(':offerId/yes')
  @HttpCode(200)
  @ApiOperation({ summary: 'Yes: what a new check-in would start from. Nothing is created and nobody is invited.' })
  yes(@CurrentUser() user: CurrentUserData, @Param('groundId') groundId: string, @Param('offerId') offerId: string) {
    return this.offers.answer(groundId, offerId, user.id, true);
  }

  @Post(':offerId/not-now')
  @HttpCode(200)
  @ApiOperation({ summary: 'Not now: it is not offered again' })
  notNow(@CurrentUser() user: CurrentUserData, @Param('groundId') groundId: string, @Param('offerId') offerId: string) {
    return this.offers.answer(groundId, offerId, user.id, false);
  }
}
