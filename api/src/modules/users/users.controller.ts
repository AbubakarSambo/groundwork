import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { MyOwnRecordService } from '../people/my-own-record.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, CurrentUserData, Roles, Role, PaginationDto } from '../../common';

class RenameOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly myRecord: MyOwnRecordService,
  ) {}

  @Patch('organization')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Rename the organization (admin only)' })
  async renameOrganization(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: RenameOrganizationDto,
  ) {
    return this.usersService.renameOrganization(organizationId, dto.name);
  }

  @Post('me/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate own membership (self-serve leave org)' })
  async leaveOrg(@CurrentUser('id') userId: string) {
    return this.usersService.leaveOrg(userId);
  }

  /**
   * `GET /users/privacy-audit` IS DELETED, AND NOT BECAUSE IT WAS UNUSED. W13-14.
   *
   * The audit flagged it as an admin endpoint no page calls, and the plan said surface it or
   * drop it. Reading it decided the question: `getPrivacyAudit(userId)` took a user id straight
   * off the query string and **never checked that user was in the caller's organisation**. So
   * any org admin could ask whether an arbitrary user - in any company on the platform - has a
   * record, and across how many grounds.
   *
   * Thin data, but it is the wrong shape: a cross-organisation read reachable by every admin.
   * Wiring it to a page would have shipped that; the endpoint went instead. What it returned is
   * derivable from `GET /users` and a ground list, both properly scoped.
   */

  /**
   * EVERYTHING, WHICH IT WAS NOT.
   *
   * This export covered check-ins, record entries and grounds - all keyed through participants. Every
   * org-scoped record built since is keyed to a person's external id instead, so commitments,
   * contributions, findings, handoffs, onboarding and suggested conversations were all invisible to
   * it. Somebody exercising a subject-access request would have received a real-looking document
   * that omitted most of what the product knows about them, with nothing saying so - a wrong answer
   * to a legal question, signed.
   */
  @Get('me/export')
  @ApiOperation({ summary: 'Export all personal data for the current user (GDPR Article 15)' })
  async exportData(@CurrentUser('id') userId: string) {
    const [fromGrounds, fromOrg] = await Promise.all([
      this.usersService.exportData(userId),
      this.myRecord.orgScopedRecord(userId),
    ]);
    return { ...fromGrounds, organisationWide: fromOrg };
  }

  @Delete('me/data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete and anonymise personal data (GDPR Article 17)' })
  async eraseAccount(@CurrentUser('id') userId: string) {
    return this.usersService.eraseAccount(userId);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List users in the organization' })
  async findAll(@CurrentUser('organizationId') organizationId: string, @Query() pagination: PaginationDto) {
    return this.usersService.findAll(organizationId, pagination);
  }

  /**
   * PUT A WHOLE COMPANY ON, previewed first.
   *
   * `preview` is a query parameter rather than a second route so the two cannot drift apart: it is
   * the same call, stopping one step earlier.
   */
  /**
   * WHERE THE ROLLOUT HAS GOT TO. Read by the screen an admin lands on.
   *
   * Above `:id` deliberately - a route with a literal segment has to be declared before the one
   * with a parameter, or `rollout` is read as somebody's user id and comes back 404.
   */
  /**
   * ASK US TO TALK TO YOUR ENGINEERS.
   *
   * On the users controller because that is where an organisation's own admin actions already live
   * and it is already guarded as one. A module of its own for a single insert would be more files
   * saying the same thing.
   *
   * ONE OPEN REQUEST PER ORGANISATION. Clicking twice is somebody wondering whether the first click
   * worked, not two requests, and a queue with the same company in it four times is a queue that
   * gets read less carefully.
   */
  @Post('call-request')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask to talk to us about connecting your systems' })
  async requestACall(@CurrentUser() user: CurrentUserData, @Body() body: { note?: string }) {
    return this.usersService.requestACall(user.organizationId, user.id, body?.note);
  }

  /** Whether this organisation has already asked, so the page can say so rather than ask again. */
  @Get('call-request')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Whether a call has already been asked for' })
  async callRequested(@CurrentUser('organizationId') organizationId: string) {
    return this.usersService.callAlreadyRequested(organizationId);
  }

  @Get('rollout')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'What an admin has actually done so far, as counts' })
  async rollout(@CurrentUser('organizationId') organizationId: string) {
    return this.usersService.rolloutFacts(organizationId);
  }

  @Post('invitations')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invite many people at once, or preview what would happen' })
  async inviteMany(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { pasted?: string; preview?: boolean },
  ) {
    const org = await this.usersService.organisationName(user.organizationId);
    return this.usersService.inviteMany(user.organizationId, org, body?.pasted ?? '', body?.preview === true);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get a single user' })
  async findOne(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    return this.usersService.findOne(id, organizationId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Invite a user to the organization' })
  @ApiResponse({ status: 201, description: 'User invited' })
  async create(@CurrentUser('organizationId') organizationId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(organizationId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a user' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: CurrentUserData) {
    return this.usersService.update(id, user.organizationId, dto, user.id);
  }

  @Post(':id/resend-invite')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Resend a pending invite' })
  async resendInvite(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    return this.usersService.resendInvite(id, organizationId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate a user' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.usersService.remove(id, user.organizationId, user.id);
  }
}
