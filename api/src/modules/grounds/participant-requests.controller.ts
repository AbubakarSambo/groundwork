import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IsString, IsEmail, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../../common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from './grounds.service';
import { AddParticipantDto } from './dto/add-participant.dto';

class CreateRequestDto {
  @IsEmail() requestedEmail!: string;
  @IsOptional() @IsString() requestedName?: string;
  @IsString() reason!: string;
}

class UpdateRequestDto {
  @IsString() status!: 'APPROVED' | 'DISMISSED';
}

@Controller('grounds/:groundId/participant-requests')
export class ParticipantRequestsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly grounds: GroundsService,
  ) {}

  /** Confirms the requesting user is a party (initiator or participant) on this ground. */
  private async assertIsParty(groundId: string, userId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { initiatorId: true, participants: { select: { userId: true } } },
    });
    if (!ground) throw new NotFoundException('Ground not found');
    const isParty = ground.initiatorId === userId || ground.participants.some((p) => p.userId === userId);
    if (!isParty) throw new ForbiddenException('You are not a party to this ground');
    return ground;
  }

  /** Confirms the requesting user is the initiator (only the initiator manages requests). */
  private async assertIsInitiator(groundId: string, userId: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { initiatorId: true, organizationId: true } });
    if (!ground) throw new NotFoundException('Ground not found');
    if (ground.initiatorId !== userId) throw new ForbiddenException('Only the initiator can manage participant requests');
    return ground;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Param('groundId') groundId: string,
    @Body() dto: CreateRequestDto,
    @Req() req: { user: { id: string; email: string } },
  ) {
    await this.assertIsParty(groundId, req.user.id);
    return this.prisma.participantRequest.create({
      data: {
        groundId,
        requestedByEmail: req.user.email,
        requestedEmail: dto.requestedEmail,
        requestedName: dto.requestedName,
        reason: dto.reason,
      },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Param('groundId') groundId: string, @Req() req: { user: { id: string } }) {
    await this.assertIsInitiator(groundId, req.user.id);
    return this.prisma.participantRequest.findMany({
      where: { groundId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':reqId')
  async update(
    @Param('groundId') groundId: string,
    @Param('reqId') reqId: string,
    @Body() dto: UpdateRequestDto,
    @Req() req: { user: { id: string; organizationId: string } },
  ) {
    const ground = await this.assertIsInitiator(groundId, req.user.id);

    const request = await this.prisma.participantRequest.findUnique({ where: { id: reqId } });
    if (!request || request.groundId !== groundId) throw new NotFoundException('Participant request not found on this ground');

    const updated = await this.prisma.participantRequest.update({
      where: { id: reqId },
      data: { status: dto.status },
    });

    // Approving a request must actually invite the person - otherwise "approved"
    // is a status change with no effect, and the requester never gets added.
    if (dto.status === 'APPROVED') {
      const inviteDto = new AddParticipantDto();
      inviteDto.email = request.requestedEmail;
      inviteDto.roleAsDescribed = request.requestedName ?? undefined;
      await this.grounds.addParticipant(groundId, ground.organizationId, req.user.id, inviteDto);
    }

    return updated;
  }
}
