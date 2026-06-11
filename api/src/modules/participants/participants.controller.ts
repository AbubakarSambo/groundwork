import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ParticipantsService } from './participants.service';
import { Public, CurrentUser } from '../../common';

class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}

class SaveIntakeDto {
  @IsOptional() @IsString() @MaxLength(4000) foundingIntent?: string;
  @IsOptional() @IsString() @MaxLength(4000) roleIntent?: string;
  @IsOptional() @IsString() @MaxLength(4000) personalIntent?: string;
  @IsOptional() @IsString() @MaxLength(4000) exitIntent?: string;
  @IsOptional() @IsString() @MaxLength(4000) compensationAsk?: string;
  @IsOptional() @IsString() @MaxLength(4000) autonomyAsk?: string;
  @IsOptional() @IsString() @MaxLength(4000) recognitionAsk?: string;
  @IsOptional() @IsString() @MaxLength(4000) growthAsk?: string;
  @IsOptional() @IsString() @MaxLength(4000) relationshipAsk?: string;
  @IsOptional() @IsString() @MaxLength(4000) financialFloor?: string;
  @IsOptional() @IsString() @MaxLength(4000) stressTolerance?: string;
  @IsOptional() @IsString() @MaxLength(4000) relationalTolerance?: string;
}

@ApiTags('Participants')
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participants: ParticipantsService) {}

  @Public()
  @Get('invite')
  @ApiOperation({ summary: 'Preview a participant invite from its token' })
  async preview(@Query('token') token: string) {
    return this.participants.preview(token);
  }

  @Public()
  @Post('accept')
  @ApiOperation({ summary: 'Accept an invite — returns an auth token and the check-in to enter' })
  async accept(@Body() dto: AcceptInviteDto) {
    return this.participants.accept(dto.token, { firstName: dto.firstName, lastName: dto.lastName });
  }

  @ApiBearerAuth()
  @Patch(':checkInId/intake')
  @ApiOperation({ summary: 'Save cofounder pre-check-in intake fields (owner-scoped by check-in)' })
  async saveIntake(
    @Param('checkInId') checkInId: string,
    @Body() dto: SaveIntakeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.participants.saveIntake(checkInId, userId, dto);
  }
}
