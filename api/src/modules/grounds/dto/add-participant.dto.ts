import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class AddParticipantDto {
  @ApiProperty({ example: 'ada@acme.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'Head of Engineering', description: 'The role as the initiator describes it (shown to the participant - never hidden)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  roleAsDescribed?: string;

  @ApiPropertyOptional({ example: 'Looking forward to aligning on the roadmap with you.', description: 'Optional personal note included in the invite email' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /**
   * WHEN THIS PERSON'S WORK STARTS, IF IT HAS NOT.
   *
   * Five situations are set up about somebody before they begin - a hire whose first day is next
   * month, an advisor whose year has not opened, a manager taking over on the first. Agreeing what
   * good looks like before anybody can be judged against it is the whole point of those grounds.
   *
   * TWO THINGS FOLLOW FROM A FUTURE DATE, and both matter. Nothing that happens before it counts as a
   * period this person went quiet in - see participation-timeline.ts. And they are NOT invited yet: an
   * invitation that arrives before somebody has accepted the job is not a small mistake, and an email
   * that has gone out cannot be recalled.
   *
   * Absent means the work is already underway, which is true of most people on most grounds.
   */
  @ApiPropertyOptional({ example: '2026-09-01', description: 'When this person starts. A future date defers their invite until then.' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Pre-generated invite token from the anonymous entry flow. If absent, a new token is generated.' })
  @IsOptional()
  @IsString()
  inviteToken?: string;
}
