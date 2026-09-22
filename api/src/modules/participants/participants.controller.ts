import { Controller, Get, Post, Patch, Param, Query, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, Length } from 'class-validator';
import { ParticipantsService } from './participants.service';
import { Public, CurrentUser, OptionalAuth } from '../../common';
import { Throttle } from '@nestjs/throttler';

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

class UpdateRoleDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  roleAsDescribed: string;
}

class UpdateEmailDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  email: string;
}

class UpdateMyEmailDto {
  @IsString()
  @IsNotEmpty()
  groundId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  email: string;
}


@ApiTags('Participants')
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participants: ParticipantsService) {}

  @Public()
  /* It returns the check-in's label, the lead's name and the invitee's address for a token: throttled
     like every other public token route, so nothing can sit and try tokens. */
  @Throttle({ global: { limit: 30, ttl: 60_000 } })
  @Get('invite')
  @ApiOperation({ summary: 'Preview a participant invite from its token' })
  async preview(@Query('token') token: string) {
    return this.participants.preview(token);
  }

  @Public()
  @OptionalAuth()
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  @Post('accept')
  @ApiOperation({ summary: 'Accept an invite - returns an auth token and the check-in to enter' })
  async accept(@Body() dto: AcceptInviteDto, @Req() req: any) {
    /**
     * Who is asking, if anyone.
     *
     * An accepted invite mints no session on its own. It resumes only for the
     * participant's own signed-in browser - the session they got when they
     * joined - and that is what this carries. The route stays public: a first-time
     * joiner has no session, and requiring one would defeat the invite entirely.
     */
    return this.participants.accept(
      dto.token,
      { firstName: dto.firstName, lastName: dto.lastName },
      req?.user?.id ?? req?.user?.sub ?? null,
    );
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update a participant role label (owner or initiator scoped)' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.participants.updateRole(id, userId, dto.roleAsDescribed);
  }

  /**
   * WHERE THE REPORT GOES, SET BY THE PERSON IT GOES TO.
   *
   * Hafsah, 22 Sep 2026, after answering a team update from an invite link: "no way to really add my
   * email if I am just an invited person". The link carries whatever address the lead typed - a
   * colleague's, a guess, a forwarded one - and once it has been opened the lead cannot change it
   * either (PATCH :id/email refuses a joined person). So the person who answered had nowhere to say
   * where their report should go. This is that place: their own row on this check-in, their own
   * address. Before `:id/email` because Express matches routes in order.
   */
  @ApiBearerAuth()
  @Patch('mine/email')
  @ApiOperation({ summary: 'Set where my own report for this check-in goes' })
  async updateMyEmail(@CurrentUser('id') userId: string, @Body() dto: UpdateMyEmailDto) {
    return this.participants.updateMyEmail(userId, dto.groundId, dto.email);
  }

  @ApiBearerAuth()
  @Patch(':id/email')
  @ApiOperation({ summary: 'Fix a not-yet-accepted participant email and resend the invite (initiator only)' })
  async updateEmail(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateEmailDto,
  ) {
    return this.participants.updateEmail(id, userId, dto.email);
  }

}
