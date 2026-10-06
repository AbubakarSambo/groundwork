import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserData } from '../../common';
import { TheBlockerTraceService } from './the-blocker-trace.service';

/**
 * WHERE A BLOCKER STARTED (D3): the steps it went through across check-ins, only from check-ins the
 * signed-in reader may open. Read from what is stored; opening it never builds it. See the-blocker-trace.ts.
 */
@ApiTags('Reports')
@ApiBearerAuth()
@Controller('grounds')
export class TheBlockerTraceController {
  constructor(private readonly trace: TheBlockerTraceService) {}

  @Get(':id/blocker-trace')
  @ApiOperation({ summary: 'Where a blocker in this check-in started, step by step, only through check-ins you may open.' })
  async forThisCheckIn(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.trace.forReader(id, { userId: user.id, email: user.email, organizationId: user.organizationId, role: user.role });
  }
}
