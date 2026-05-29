import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AlignmentService } from './alignment.service';
import { CurrentUser, Roles, Role } from '../../common';

@ApiTags('Alignment Feed')
@ApiBearerAuth()
@Controller('alignment-feed')
export class AlignmentController {
  constructor(private readonly alignment: AlignmentService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin alignment feed — completeness, status, surfaced patterns (never content)' })
  async feed(@CurrentUser('organizationId') organizationId: string) {
    return this.alignment.feed(organizationId);
  }
}
