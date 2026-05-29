import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ParticipantsService } from './participants.service';
import { Public } from '../../common';

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
}
