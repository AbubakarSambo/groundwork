import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../../common';
import { HowWeDoItService } from './how-we-do-it.service';

/**
 * HOW THIS COMPANY DOES THINGS, inside the product.
 *
 * The machine API has had a knowledge endpoint for a while; nothing in the product did, so the
 * whole understanding half of a check-in only worked for a customer who had pushed their handbook
 * in programmatically.
 *
 * NO `@Roles` DECORATOR ON THESE. The rules are not "is this an admin" - proposing is for anybody
 * who runs check-ins, reading is for everybody, and deciding is the admin's. Three different
 * answers, decided in one place (`who-may-say-how-we-do-it.ts`) rather than spread across
 * decorators that only know about one of them.
 */
@ApiTags('How we do it')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('org/how-we-do-it')
export class HowWeDoItController {
  constructor(private readonly service: HowWeDoItService) {}

  /** What the company says it does, and - for an admin - what is waiting on them. */
  @Get()
  @ApiOperation({ summary: 'How this company does things, and anything waiting to be approved' })
  async list(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.service.list(organizationId, role);
  }

  @Post('propose')
  @ApiOperation({ summary: 'Ask that a document become how the company does something' })
  async propose(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() body: { documentId?: string },
  ) {
    return this.service.propose(organizationId, userId, role, body?.documentId ?? '');
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Make it how the company does something' })
  async approve(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
  ) {
    return this.service.approve(organizationId, userId, role, id);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Leave it as a document on its check-in' })
  async decline(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.decline(organizationId, userId, role, id, body?.reason);
  }
}
