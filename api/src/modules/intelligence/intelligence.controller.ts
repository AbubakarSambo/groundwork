import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IntelligenceService } from './intelligence.service';
import { CurrentUser, CurrentUserData, Roles, Role } from '../../common';

class OutcomeFeedbackDto {
  @IsBoolean()
  feltFair: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

/**
 * The longer survey. Writes the same OutcomeFeedback row as the short route.
 *
 * `feltFair` IS ITS OWN QUESTION, and that is the fix here. This route used to
 * store `feltFair: dto.wouldUseAgain`, so the only column any fairness metric
 * reads was being filled from "would you use this again" - two questions a
 * person can answer in opposite directions. Someone can find a process fair and
 * still not want to repeat it, and someone can find it unfair and use it again
 * because their manager asked them to. `avgFairnessRate` in the outcome-learning
 * summary reads this column, so the conflation would have reported enthusiasm as
 * fairness on the one number that says whether this product is safe for the
 * people inside it.
 *
 * Nothing called this route, so no real answer was ever miscounted. It is being
 * fixed rather than left because a caller would inherit the bug silently.
 */
class GroundFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  /** Required, and asked as a fairness question. Never inferred from anything else. */
  @IsBoolean()
  feltFair: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  whatWorked?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  whatDidnt?: string;

  @IsBoolean()
  wouldUseAgain: boolean;
}

@ApiTags('Learning Loop')
@ApiBearerAuth()
@Controller()
export class IntelligenceController {
  constructor(private readonly intelligence: IntelligenceService) {}

  @Get('grounds/:groundId/outcome-feedback')
  @ApiOperation({ summary: "Get the requesting party's outcome feedback for a ground" })
  async myFeedback(@Param('groundId') groundId: string, @CurrentUser('id') userId: string) {
    return this.intelligence.myFeedback(groundId, userId);
  }

  @Post('grounds/:groundId/outcome-feedback')
  @ApiOperation({ summary: 'Submit post-resolution feedback (did this feel fair and grounded in evidence?)' })
  async submitFeedback(@Param('groundId') groundId: string, @CurrentUser('id') userId: string, @Body() dto: OutcomeFeedbackDto) {
    return this.intelligence.submitFeedback(groundId, userId, dto.feltFair, dto.note);
  }

  @Post('grounds/:groundId/feedback')
  @ApiOperation({ summary: 'Submit structured outcome feedback (rating, what worked/didn\'t, would use again) - one per party per ground' })
  async submitGroundFeedback(
    @Param('groundId') groundId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: GroundFeedbackDto,
  ) {
    return this.intelligence.submitOutcomeFeedback(groundId, userId, dto);
  }

  @Get('dashboard')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin dashboard - ground activity + outcome rates per prompt version' })
  async dashboard(@CurrentUser() user: CurrentUserData) {
    const [groundActivity, outcomeRates] = await Promise.all([
      this.intelligence.groundActivity(user.organizationId),
      this.intelligence.outcomeRates(user.organizationId),
    ]);
    return { groundActivity, outcomeRates };
  }
}
