import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OpsCapabilityGuard } from './ops-capability.guard';
import { OpsPeopleService } from './ops-people.service';
import { OpsFoundationService } from './ops-foundation.service';

@ApiTags('Operating system')
@ApiBearerAuth()
@Controller('ops')
@UseGuards(JwtAuthGuard, OpsCapabilityGuard)
export class OpsController {
  constructor(
    private readonly people: OpsPeopleService,
    private readonly foundation: OpsFoundationService,
  ) {}

  /**
   * Who the caller is here and what they may do. The front end asks this once
   * and hides what it would only be told 403 about.
   */
  @Get('me')
  @ApiOperation({ summary: 'The caller as this system knows them' })
  async me(@Req() req: { opsIdentity: unknown }) {
    return req.opsIdentity;
  }

  /** The periods we are working in, so every board can date itself. */
  @Get('periods')
  @ApiOperation({ summary: 'Sprints, quarters and cycles' })
  async periods() {
    return this.foundation.periods();
  }

  @Get('workstreams')
  @ApiOperation({ summary: 'The standing areas of the company and who owns each' })
  async workstreams() {
    return this.foundation.workstreams();
  }
}
