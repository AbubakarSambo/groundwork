import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserData } from '../../common';
import { CompanyService } from './company.service';

/**
 * THE COMPANY PAGE (D2, U.15): the organisation's priorities and the check-ins that feed them, as
 * this reader may read them. Everybody in the organisation may ask; a guest from another company
 * is refused. What each reader is given is decided in CompanyService, never on the screen.
 */
@ApiTags('Company')
@ApiBearerAuth()
@Controller('company')
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  @Get()
  @ApiOperation({ summary: 'The company page: priorities and what feeds them, as you may read them.' })
  async page(@CurrentUser() user: CurrentUserData) {
    return this.company.forReader({ userId: user.id, email: user.email, organizationId: user.organizationId, role: user.role });
  }
}
