import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { IsBoolean, MinLength } from 'class-validator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GroundsService } from './grounds.service';
import { ConversationService } from '../conversation/conversation.service';
import { CreateGroundDto, AddParticipantDto, CreateGroundForLeadDto } from './dto';
import { CurrentUser, CurrentUserData, Roles, Role } from '../../common';
import { Cadence } from '@prisma/client';
import { IsString, MaxLength } from 'class-validator';

class ConfirmLeadDto {
  @ApiPropertyOptional({ description: "Edit the admin's brief before confirming (optional)" })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  brief?: string;

  @ApiPropertyOptional({ description: 'True if the lead is managing only and will not give their own account. Defaults to false (also checking in).' })
  @IsOptional()
  @IsBoolean()
  managingOnly?: boolean;

  @ApiPropertyOptional({
    description:
      'What the lead is responsible for, in their own words. Their last chance to set it if the admin did not - without a remit they get no contribution read and no role-tuned questions.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remit?: string;
}

class UpdateTimelineDto {
  @ApiPropertyOptional({ description: 'Rename the ground' })
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ example: 12, description: 'Timeline length in weeks' })
  @IsOptional()
  @IsInt()
  @Min(1)
  timelineWeeks?: number;

  @ApiPropertyOptional({ enum: Cadence, description: 'Check-in cadence' })
  @IsOptional()
  @IsEnum(Cadence)
  cadence?: Cadence;

  @ApiPropertyOptional({ description: 'Append a context note to this ground' })
  @IsOptional()
  contextNote?: string;
}

class AddLeadContextDto {
  @ApiPropertyOptional({ description: 'The participant this context is about; omit for context about the whole ground' })
  @IsOptional()
  @IsString()
  participantId?: string;

  @ApiPropertyOptional({ description: 'Private context for the AI. Never shown to the person it is about; never quoted as a claim.' })
  @IsString()
  @MaxLength(4000)
  text!: string;
}

class AddNoteDto {
  /**
   * Capped because this is a note, not a check-in. Somebody writing three
   * thousand words here is writing their account outside the session, which is
   * the thing a note must not become - it has never been questioned.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;
}

class DeclineGroundDto {
  /** Optional, and worth asking for: "no" with no reason is what stops people asking. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

@ApiTags('Grounds')
@ApiBearerAuth()
@Controller('grounds')
export class GroundsController {
  constructor(
    private readonly grounds: GroundsService,
    private readonly conversation: ConversationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List grounds in the organization, including grounds as a participant' })
  async list(@CurrentUser() user: CurrentUserData) {
    return this.grounds.list(user.organizationId, user.id, user.email, user.role);
  }

  @Get('org-roster')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Org-wide list of every ground (team): lead, members, roles, and alignment status - for HR/admin/founder oversight' })
  async getOrgRoster(@CurrentUser('organizationId') organizationId: string) {
    return this.grounds.getOrgRoster(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ground (status, participants, check-ins)' })
  async get(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.grounds.get(id, user.organizationId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Open a new alignment ground' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateGroundDto) {
    // The role decides whether this ground waits for an admin to accept it.
    return this.grounds.create(user.organizationId, user.id, dto, user.role);
  }

  @Post('for-lead')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin creates a ground and names someone else to lead it (e.g. HR onboarding a team, assigning the engineering lead to run it)' })
  async createForLead(@CurrentUser() user: CurrentUserData, @Body() dto: CreateGroundForLeadDto) {
    return this.grounds.createForLead(user.organizationId, user.id, dto);
  }

  @Post(':id/confirm-lead')
  @ApiOperation({ summary: 'The named lead reviews the admin-supplied context, optionally edits it, and confirms - only then does the ground actually begin' })
  async confirmLead(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: ConfirmLeadDto) {
    return this.grounds.confirmLead(id, userId, dto);
  }

  @Post(':id/participants')
  @ApiOperation({ summary: 'Add the other party (sends an invite - never silent)' })
  async addParticipant(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: AddParticipantDto) {
    return this.grounds.addParticipant(id, user.organizationId, user.id, dto);
  }

  @Post(':id/lead-context')
  @ApiOperation({ summary: "Initiator-only: add a private context note for the AI, about a participant or the ground. Never shown to the person; never quoted as a claim." })
  async addLeadContext(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: AddLeadContextDto) {
    return this.grounds.addLeadContext(id, userId, dto);
  }

  @Post(':id/closing-round')
  @ApiOperation({ summary: "Begin the closing round: flag every participant's next session as final (initiator only)" })
  async beginClosingRound(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.grounds.beginClosingRound(id, organizationId, userId);
  }

  @Post(':id/activate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate the ground after the report is ready (starts billing)' })
  async activate(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    return this.grounds.activate(id, organizationId);
  }

  @Get(':id/participants/:participantId/invite-url')
  @ApiOperation({ summary: 'Get the current invite URL for a pending participant (initiator only)' })
  async getParticipantInviteUrl(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.grounds.getParticipantInviteUrl(id, participantId, userId);
  }

  @Post(':id/participants/:participantId/resend-invite')
  @ApiOperation({ summary: 'Resend an expired participant invite (GW-24)' })
  async resendParticipantInvite(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.grounds.resendParticipantInvite(id, participantId, organizationId);
  }

  @Get(':id/mediator-brief')
  @ApiOperation({ summary: 'Get a structural brief for use with a facilitator (initiator or a party on this ground - no separate org-admin access exists)' })
  async mediatorBrief(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getMediatorBrief(id, userId);
  }

  @Get(':id/my-specificity')
  @ApiOperation({ summary: "Return the requesting user's own specificity history for this ground (private, owner only)" })
  async mySpecificity(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getMySpecificity(id, userId);
  }

  @Get(':id/my-record')
  @ApiOperation({ summary: "Return the requesting contributor's full private longitudinal record (specificity, confidence, patterns - gated by billing)" })
  async myRecord(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getMyRecord(id, userId);
  }

  @Get(':id/my-checkin-status')
  @ApiOperation({ summary: 'Return the requesting user\'s own check-in status for this ground' })
  async myCheckinStatus(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getMyCheckinStatus(id, userId);
  }

  @Get('awaiting-approval')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Grounds a member has set up that are waiting for an admin to accept them' })
  async awaitingApproval(@CurrentUser('organizationId') organizationId: string) {
    return this.grounds.listAwaitingApproval(organizationId);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Accept a ground so its people can be invited' })
  async approve(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.grounds.approve(id, user.organizationId, user.id);
  }

  @Post(':id/decline')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Decline a ground. It closes, and nobody is ever invited to it.' })
  async decline(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: DeclineGroundDto) {
    return this.grounds.declineGround(id, user.organizationId, user.id, dto.reason);
  }

  @Get(':id/my-notes')
  @ApiOperation({ summary: "The requesting user's own between-session notes on this ground (private, owner only)" })
  async myNotes(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getMyNotes(id, userId);
  }

  @Post(':id/my-notes')
  @ApiOperation({ summary: 'Write a private note between sessions. Never part of the record or any report.' })
  async addMyNote(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: AddNoteDto) {
    return this.grounds.addMyNote(id, userId, dto.text);
  }

  @Delete(':id/my-notes/:noteId')
  @ApiOperation({ summary: 'Delete one of your own notes' })
  async deleteMyNote(@Param('id') id: string, @Param('noteId') noteId: string, @CurrentUser('id') userId: string) {
    return this.grounds.deleteMyNote(id, userId, noteId);
  }

  @Get(':id/my-transcript')
  @ApiOperation({ summary: "Every turn the requesting user has said in this ground, sessions in order (owner only)" })
  async myTranscript(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversation.getMyGroundTranscript(id, userId);
  }

  @Get(':id/conversation')
  @ApiOperation({ summary: 'Get participant conversation transcripts grouped by party (initiator only)' })
  async getConversation(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getConversation(id, userId);
  }

  @Get(':id/my-solo-report')
  @ApiOperation({ summary: "Return the requesting user's own individual session report (private)" })
  async getMySoloReport(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.getMySoloReport(id, userId);
  }

  @Patch(':id/my-solo-report/share')
  @ApiOperation({ summary: "Set whether the requesting user shares their individual report with other parties" })
  async setMySoloReportShared(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: { shared: boolean }) {
    return this.grounds.setMySoloReportShared(id, userId, dto.shared);
  }

  @Post(':id/sign-off')
  @ApiOperation({ summary: "Confirm the requesting user's account is accurate - the deadline for corrections, in place of a timer" })
  async signOff(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.grounds.signOff(id, userId);
  }

  @Patch(':id/external-visibility')
  @ApiOperation({ summary: "Initiator-only: whether participants can see each other's contact details (email). Names/roster/presence stay visible either way." })
  async setExternalVisibility(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: { restrict: boolean }) {
    return this.grounds.setExternalVisibility(id, userId, dto.restrict);
  }

  @Patch(':id/peer-visibility')
  @ApiOperation({ summary: 'Whether parties can see who else is on this ground and how each is doing' })
  async setPeerVisibility(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { visible: boolean },
  ) {
    return this.grounds.setPeerVisibility(id, userId, !!body.visible);
  }

  @Patch(':id/people-work-together')
  @ApiOperation({ summary: "Whether the parties on this ground see each other's work - decides whether fairness reads have anything to stand on" })
  async setPeopleWorkTogether(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { together: boolean },
  ) {
    return this.grounds.setPeopleWorkTogether(id, userId, !!body.together);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update timeline weeks and/or cadence; change is audit-logged on the ground' })
  async updateTimeline(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateTimelineDto) {
    return this.grounds.updateTimeline(id, userId, dto);
  }
}
