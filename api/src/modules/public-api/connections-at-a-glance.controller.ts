import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles, Role } from '../../common';
import { ConnectionsAtAGlanceService, type ConnectionsAtAGlance } from './connections-at-a-glance.service';

/** The counts on the admin's Connections page (U.18). Admins only; see the service. */
@ApiTags('integrations')
@Controller('integrations/connections')
@Roles(Role.ADMIN)
export class ConnectionsAtAGlanceController {
  constructor(private readonly glance: ConnectionsAtAGlanceService) {}

  @Get()
  @ApiOperation({ summary: 'Counts for the Connections page. Admins only; counts, never people or words.' })
  async read(@CurrentUser('organizationId') organizationId: string): Promise<ConnectionsAtAGlance> {
    return this.glance.read(organizationId);
  }
}
