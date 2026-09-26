import { Inject, forwardRef, Controller, BadRequestException, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { HowCheckInsWorkDto } from './dto/how-check-ins-work.dto';
import { GroundsService } from '../grounds/grounds.service';
import { isASubject } from './what-a-call-is-about';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { MyOwnRecordService } from '../people/my-own-record.service';
import { WhoIsWaitingAtTheDoorService } from '../participants/who-is-waiting-at-the-door.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { IsString, IsNotEmpty, MaxLength, MinLength, IsOptional, IsEmail, ValidateNested, IsEnum } from 'class-validator';
import { CompanyStage } from '@prisma/client';
import { Type } from 'class-transformer';
import { TeamSizeSaidDto } from '../auth/dto/create-organisation.dto';
import { CurrentUser, CurrentUserData, Roles, Role, PaginationDto } from '../../common';

class RenameOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  /**
   * THE REST OF "Create an organisation", for the organisation a first Google sign-in has just made
   * (U.3). Both optional: the Settings rename sends only the name.
   */
  @IsOptional() @IsEmail() @MaxLength(255) billingEmail?: string;
  @IsOptional() @ValidateNested() @Type(() => TeamSizeSaidDto) teamSize?: TeamSizeSaidDto;

  /** Moved here from PATCH /auth/me, which let anybody set it (U.3). No screen sets it today. */
  @IsOptional() @IsEnum(CompanyStage) companyStage?: CompanyStage;
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly myRecord: MyOwnRecordService,
    private readonly door: WhoIsWaitingAtTheDoorService,
    /* Releasing a held invitation is the grounds service's job - it owns the participant row and
       the invite. This controller only decides who may ask for it. */
    @Inject(forwardRef(() => GroundsService)) private readonly grounds: GroundsService,
  ) {}

  /**
   * WHO IS WAITING TO BE LET INTO THIS ORGANISATION, AND THE ANSWER.
   *
   * On the users controller because this is the People page's own question - the list of who is in
   * your organisation and the list of who is asking to be are the same subject, and putting the
   * queue somewhere else is how it ends up on a screen nobody opens.
   *
   * ADMIN ONLY, and the service checks the organisation again rather than trusting this decorator:
   * a request id is a guessable-looking string and an admin of one company must not be able to
   * answer another company's queue by holding one.
   */
  @Get('waiting')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Who is waiting to be let into this organisation' })
  async waiting(@CurrentUser('organizationId') organizationId: string) {
    return this.door.waiting(organizationId);
  }

  /**
   * The other queue at the same door: people a lead has added to a check-in with no seat for them.
   * Kept a separate route rather than folded into the list above, because the two need different
   * answers - one is a judgement about a person, the other is a purchase.
   */
  @Get('waiting/seats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'People on a check-in whose invitation is waiting for a seat' })
  async waitingForASeat(@CurrentUser('organizationId') organizationId: string) {
    return this.door.waitingForASeat(organizationId);
  }

  @Post('waiting/seats/release')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Send the invitations that were waiting for a seat, as far as there is room' })
  async releaseSeats(@CurrentUser('organizationId') organizationId: string) {
    return this.grounds.releaseAnyoneWaitingForASeat(organizationId);
  }

  @Post('waiting/:id/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Let somebody into the organisation. They can check in, and they hold a seat.' })
  async approveWaiting(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.door.approve(organizationId, id, adminUserId);
  }

  @Post('waiting/:id/decline')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Do not let somebody in. Their account stays; they cannot check in here.' })
  async declineWaiting(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: { reason?: string },
  ) {
    return this.door.decline(organizationId, id, adminUserId, dto?.reason);
  }

  @Patch('organization')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Rename the organization (admin only)' })
  async renameOrganization(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: RenameOrganizationDto,
  ) {
    return this.usersService.renameOrganization(organizationId, dto.name, { billingEmail: dto.billingEmail, teamSize: dto.teamSize, companyStage: dto.companyStage });
  }

  /**
   * HOW CHECK-INS WORK HERE. Two settings, read and written by an admin.
   *
   * On the organisation rather than on a settings module of its own, next to the rename, because
   * that is what they are: facts about this organisation that only an admin may change.
   */
  @Get('organization/check-ins')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Who may open a check-in here, and whether one waits for approval' })
  async howCheckInsWork(@CurrentUser('organizationId') organizationId: string) {
    return this.usersService.howCheckInsWork(organizationId);
  }

  @Patch('organization/check-ins')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Change who may open a check-in, or whether one waits' })
  async setHowCheckInsWork(
    @CurrentUser('organizationId') organizationId: string,
    /* A CLASS, not an inline type: Nest validates the former and silently accepts anything for the
       latter. See HowCheckInsWorkDto - a one-word typo used to answer 200 and change nothing. */
    @Body() body: HowCheckInsWorkDto,
  ) {
    return this.usersService.setHowCheckInsWork(organizationId, body);
  }

  /**
   * THE PEOPLE ALREADY HERE, FOR ADDING WITHOUT TYPING.
   *
   * A lead inviting colleagues to a check-in had to type every address in full, for people the
   * organisation already knows: "it recognises the people mentioned and suggests them, but then you
   * need to type every email out". Any signed-in member may read this - these are their own
   * colleagues, and the addresses are the ones invitations already go to. Name and address only,
   * never role or standing, and never the caller.
   */
  @Get('colleagues')
  @ApiOperation({ summary: 'The people in your organisation, for adding to a check-in without typing their address' })
  async colleagues(@CurrentUser() user: CurrentUserData) {
    return this.usersService.colleaguesOf(user.organizationId, user.id);
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
   * ONE OPEN REQUEST PER SUBJECT. Clicking the same one twice is somebody wondering whether the
   * first click worked, not two requests, and a queue with the same company in it four times is a
   * queue that gets read less carefully. Per SUBJECT rather than per organisation, because asking
   * about a coach and asking about an integration are two different calls.
   *
   * NOT GATED ON A SUBSCRIPTION. The services are for subscribers and our team says so on the call.
   * Gating the request stops the people deciding whether to subscribe from asking, which is the
   * conversation most likely to end in a subscription - and nothing here charges anybody, so an
   * unqualified request costs a phone call.
   */
  @Post('call-request')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask to talk to us about connecting your systems' })
  async requestACall(@CurrentUser() user: CurrentUserData, @Body() body: { note?: string; subject?: string }) {
    /* An unknown subject is treated as "something else" rather than refused: the call still needs
       making, and losing it over a typo in a client would be the worst possible trade. */
    const subject = isASubject(body?.subject) ? body.subject : 'CALL';
    return this.usersService.requestACall(user.organizationId, user.id, body?.note, subject);
  }

  /** Whether this organisation has already asked, so the page can say so rather than ask again. */
  @Get('call-request')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Whether a call has already been asked for' })
  async callRequested(@CurrentUser('organizationId') organizationId: string) {
    return this.usersService.callAlreadyRequested(organizationId);
  }

  /**
   * WHO SET THIS ORGANISATION UP, and handing that on.
   *
   * The read is available to any admin, because the People page has to know whose row it must not
   * offer to change. The write is owner-only, enforced in the service rather than by a decorator:
   * `@Roles` knows about roles and this is not one.
   */
  @Get('organization/owner')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Who set this organisation up' })
  async whoSetThisUp(@CurrentUser('organizationId') organizationId: string) {
    return this.usersService.whoSetThisUp(organizationId);
  }

  @Patch('organization/owner')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Hand the organisation to another admin' })
  async handOver(@CurrentUser() user: CurrentUserData, @Body() body: { userId?: string }) {
    if (!body?.userId) throw new BadRequestException('Say who you are handing it to.');
    return this.usersService.handOverTheOrganisation(user.organizationId, user.id, body.userId);
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
