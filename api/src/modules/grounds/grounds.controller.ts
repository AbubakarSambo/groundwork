import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GroundsService } from './grounds.service';
import { CreateGroundDto, AddParticipantDto } from './dto';
import { CurrentUser, CurrentUserData, Roles, Role } from '../../common';
import { Cadence } from '@prisma/client';

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

@ApiTags('Grounds')
@ApiBearerAuth()
@Controller('grounds')
export class GroundsController {
  constructor(private readonly grounds: GroundsService) {}

  @Get()
  @ApiOperation({ summary: 'List grounds in the organization, including grounds as a participant' })
  async list(@CurrentUser() user: CurrentUserData) {
    return this.grounds.list(user.organizationId, user.id, user.email, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ground (status, participants, check-ins)' })
  async get(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.grounds.get(id, user.organizationId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Open a new alignment ground' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateGroundDto) {
    return this.grounds.create(user.organizationId, user.id, dto);
  }

  @Post(':id/participants')
  @ApiOperation({ summary: 'Add the other party (sends an invite - never silent)' })
  async addParticipant(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: AddParticipantDto) {
    return this.grounds.addParticipant(id, user.organizationId, user.id, dto);
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
  @ApiOperation({ summary: 'Get a structural brief for use with a facilitator (initiator only)' })
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update timeline weeks and/or cadence; change is audit-logged on the ground' })
  async updateTimeline(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateTimelineDto) {
    return this.grounds.updateTimeline(id, userId, dto);
  }
}
