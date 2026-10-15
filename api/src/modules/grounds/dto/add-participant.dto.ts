import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional, MaxLength, IsDateString, ValidateIf } from 'class-validator';

export class AddParticipantDto {
  @ApiProperty({ example: 'ada@acme.com' })
  /* The message is the one the organiser reads on the setup screen, so it is a sentence rather
     than class-validator's default "email must be an email". */
  /* Not needed when a colleague is picked by id (U.4): the server looks their address up. */
  @ValidateIf((o) => !o.colleagueId)
  @IsEmail({}, { message: 'That does not look like an email address. Check it and try again.' })
  @IsNotEmpty()
  email: string;

  /**
   * A COLLEAGUE PICKED FROM THE LIST, BY ID (U.4). The list of colleagues carries names, roles and
   * teams, never addresses, so picking one sends this and the server finds the address.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  colleagueId?: string;

  @ApiPropertyOptional({ example: 'Head of Engineering', description: 'The role as the initiator describes it (shown to the participant - never hidden)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  roleAsDescribed?: string;

  /** Optional. Never inferred from the address; blank means blank. See who-may-read-this-check-in.ts. */
  @ApiPropertyOptional({ example: 'Finance', description: 'Their department, if the organiser knows it. Optional; never inferred.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  /** The name the lead gives this person, kept beside the address ("Name + email", the anchor's people step). Never read from the address. */
  @ApiPropertyOptional({ example: 'Amani Wekesa', description: 'What the lead calls this person. Optional.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

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
