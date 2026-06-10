import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GroundsService } from './grounds.service';
import { CreateGroundDto, AddParticipantDto } from './dto';
import { CurrentUser, CurrentUserData, Roles, Role } from '../../common';

@ApiTags('Grounds')
@ApiBearerAuth()
@Controller('grounds')
export class GroundsController {
  constructor(private readonly grounds: GroundsService) {}

  @Get()
  @ApiOperation({ summary: 'List grounds in the organization' })
  async list(@CurrentUser('organizationId') organizationId: string) {
    return this.grounds.list(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ground (status, participants, check-ins)' })
  async get(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    return this.grounds.get(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Open a new alignment ground' })
  async create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateGroundDto) {
    return this.grounds.create(user.organizationId, user.id, dto);
  }

  @Post(':id/participants')
  @ApiOperation({ summary: 'Add the other party (sends an invite — never silent)' })
  async addParticipant(@Param('id') id: string, @CurrentUser() user: CurrentUserData, @Body() dto: AddParticipantDto) {
    return this.grounds.addParticipant(id, user.organizationId, user.id, dto);
  }

  @Post(':id/activate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate the ground after the report is ready (starts billing)' })
  async activate(@Param('id') id: string, @CurrentUser('organizationId') organizationId: string) {
    return this.grounds.activate(id, organizationId);
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
}
