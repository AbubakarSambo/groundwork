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

class GroundFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

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
