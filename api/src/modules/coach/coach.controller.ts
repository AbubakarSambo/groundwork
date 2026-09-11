import { Throttle } from '@nestjs/throttler';
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Public } from '../../common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CoachService, MIN_INTENTION_LENGTH } from './coach.service';

/**
 * EVERY FIELD BUT ONE IS REQUIRED, AND THAT IS THE ANTI-VOLUME MECHANISM.
 *
 * A one-click "talk to a coach" button produces requests and no signal. An organisation, a team size
 * and two written lines about the problem is more effort than an idle click and less than a form
 * nobody finishes - and each field is something a person genuinely needs answered before a call, so
 * none of it is friction for its own sake.
 */
export class CoachRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ description: 'The organisation this is for. A request with none behind it is not a client.' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  orgName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Roughly how many people, so a conversation is not spent finding out.' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  teamSize!: string;

  @ApiProperty({ description: `What they want help with, in their own words. At least ${MIN_INTENTION_LENGTH} characters.` })
  @IsString()
  @MinLength(MIN_INTENTION_LENGTH)
  @MaxLength(4000)
  intention!: string;

  @ApiPropertyOptional({ description: 'Whether they have already tried opening a check-in. Changes the first reply.' })
  @IsOptional()
  @IsBoolean()
  triedAlready?: boolean;

  /**
   * When they would like the first conversation. Optional, and validated as a date rather than
   * accepted as any string - "next tuesday" reaching the record would be a request nobody can act
   * on that looks like one they can.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  preferredAt?: string;
}

@ApiTags('coach')
@Controller('coach')
export class CoachController {
  constructor(private readonly coach: CoachService) {}

  /**
   * PUBLIC, because the person this exists for is the one who has not signed up.
   *
   * They are looking at twenty situations, they were told to set this up, and they do not know which
   * one their problem is. Requiring an account first would remove the only path they have.
   */
  @Public()
  @Throttle({ global: { limit: 10, ttl: 60_000 } })
  @Post('request')
  @ApiOperation({ summary: 'Ask to speak to a coach. Creates no ground and invites nobody.' })
  async request(@Body() dto: CoachRequestDto) {
    return this.coach.request(dto);
  }

  /**
   * PLATFORM ADMIN ONLY, and this is not belt-and-braces.
   *
   * These rows hold other people's names, organisations, email addresses and a written description of
   * a problem inside their company. Authentication alone is not enough: any signed-in customer would
   * otherwise be able to read every other prospect's request.
   */
  @UseGuards(PlatformAdminGuard)
  @Get('requests')
  @ApiOperation({ summary: 'Back office: coach requests, newest first' })
  async list(@Query('status') status?: string) {
    return this.coach.list(status);
  }

  @UseGuards(PlatformAdminGuard)
  @Patch('requests/:id')
  @ApiOperation({ summary: 'Back office: move a request along its lifecycle' })
  async setStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.coach.setStatus(id, body.status);
  }
}
