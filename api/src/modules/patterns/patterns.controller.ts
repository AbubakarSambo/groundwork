import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PatternsService } from './patterns.service';
import { CurrentUser, Roles, Role } from '../../common';

@ApiTags('Patterns')
@ApiBearerAuth()
@Controller('patterns')
export class PatternsController {
  constructor(private readonly patterns: PatternsService) {}

  @Get('accuracy')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Per-code accuracy summary for the prompts dashboard (platform admin only)' })
  async accuracySummary() {
    return this.patterns.codeAccuracySummary();
  }

  @Patch(':id/rate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Rate accuracy of a surfaced pattern detection' })
  async rate(
    @Param('id') id: string,
    @Body() body: { accurate: boolean },
    @CurrentUser('id') userId: string,
  ) {
    await this.patterns.rateAccuracy(id, body.accurate, userId);
    return { rated: true };
  }
}
