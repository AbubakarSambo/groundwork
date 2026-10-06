import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserData } from '../../common';
import { CheckInLinksService } from './check-in-links.service';

/**
 * LINKS BETWEEN CHECK-INS (D3, U.16): what this check-in waits on from other teams, and what other
 * teams have asked of it, as the signed-in reader may see them. See check-in-links.ts.
 */
@ApiTags('Grounds')
@ApiBearerAuth()
@Controller('grounds')
export class CheckInLinksController {
  constructor(private readonly links: CheckInLinksService) {}

  @Get(':id/links')
  @ApiOperation({ summary: 'Links between this check-in and other teams’ check-ins, only from check-ins you may open.' })
  async forThisCheckIn(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.links.forReader(id, { userId: user.id, email: user.email, organizationId: user.organizationId, role: user.role });
  }
}
