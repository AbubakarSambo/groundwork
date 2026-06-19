import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { IsString, IsEmail, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../../common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(
    @Param('groundId') groundId: string,
    @Body() dto: CreateRequestDto,
    @Req() req: { user?: { email?: string } },
  ) {
    const requestedByEmail = req.user?.email ?? 'anonymous';
    return this.prisma.participantRequest.create({
      data: {
        groundId,
        requestedByEmail,
        requestedEmail: dto.requestedEmail,
        requestedName: dto.requestedName,
        reason: dto.reason,
      },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Param('groundId') groundId: string) {
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
  ) {
    return this.prisma.participantRequest.update({
      where: { id: reqId },
      data: { status: dto.status },
    });
  }
}
