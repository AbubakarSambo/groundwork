import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OpsPeopleService, SignedInAccount } from './ops-people.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { OpsDoorService } from './the-door-into-the-ops-system';

/**
 * THE DOOR IS OUTSIDE THE ROOM, AND STILL INSIDE THE OPS SYSTEM.
 *
 * Every other route under `/ops` is guarded by a capability, which needs an
 * OpsPerson behind the account. The first person can therefore never get in —
 * reported as "I clicked platform ops but I can't get to my own view."
 *
 * So this one is guarded by `PlatformAdminGuard` instead: a list only existing
 * platform admins can add to, and only with an emailed one-time code. A stronger
 * gate than the one it opens.
 *
 * IT LIVES IN `ops/`, NOT IN `admin/`, ON PURPOSE. Putting it beside the rest of
 * the admin console would mean a product module importing the ops system, which
 * `the-boundary-that-must-not-move.spec.ts` refuses and is right to: an import is
 * how one system starts assuming the other's shape. Its path is `/admin/ops`
 * because that is where the person looking for it will be — a route path is not
 * an import.
 *
 * It carries no OTP, unlike adding a platform admin. Adding one hands somebody
 * every customer's org, usage and pricing; this connects an account to a row in
 * our own back office and touches no customer data at all. A code in front of it
 * would be theatre bought at the cost of the setup step being harder than the
 * dangerous one.
 */
@ApiTags('Operating system')
@ApiBearerAuth()
@Controller('admin/ops')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class OpsDoorController {
  constructor(private readonly door: OpsDoorService, private readonly people: OpsPeopleService) {}

  @Get()
  @ApiOperation({ summary: 'Whether the ops system is set up, and whose account opens it' })
  howThingsStand() {
    return this.door.howThingsStand();
  }

  /**
   * WALKING IN IS THE WRITE. A read of the back office answers from memory (see identify()); this
   * is the one request the client makes on the way in that is allowed to put a platform admin on
   * the roster. The 2026-09-05 decision - a platform admin IS on the team - is kept whole; only a
   * GET stopped writing it (fix plan A15, as corrected).
   */
  @Post('enter')
  @HttpCode(200)
  @ApiOperation({ summary: 'Take your place on the ops roster, if you are a platform admin not yet on it' })
  async enter(@CurrentUser() user: SignedInAccount) {
    const identity = await this.people.identify(user, { admit: true });
    return { onTheRoster: identity !== null, as: identity?.displayName ?? null };
  }

  @Post('setup')
  @HttpCode(200)
  @ApiOperation({ summary: 'Put the periods, workstreams and team in place. Safe to run twice.' })
  setUp() {
    return this.door.setUp();
  }

  @Post(':personKey/account')
  @HttpCode(200)
  @ApiOperation({ summary: 'Connect a Groundwork account to somebody on the team' })
  link(@Param('personKey') personKey: string, @Body() body: { email: string }) {
    return this.door.link(personKey, body?.email);
  }

  @Post(':personKey/account/remove')
  @HttpCode(200)
  @ApiOperation({ summary: 'Disconnect an account. The person stays; only the way in goes.' })
  unlink(@Param('personKey') personKey: string, @Body() body?: { email?: string }) {
    return this.door.unlink(personKey, body?.email);
  }
}
