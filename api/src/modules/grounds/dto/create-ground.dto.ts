import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsInt, Min, Max, IsArray, IsOptional, MaxLength, IsBoolean } from 'class-validator';
import { GroundScenario, GroundMoment, Cadence, GroundMode } from '@prisma/client';


export class CreateGroundDto {
  @ApiProperty({ example: 'New cofounder - Ada' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;

  @ApiProperty({ enum: GroundScenario })
  @IsEnum(GroundScenario)
  scenario: GroundScenario;

  /** The kind of work the setup read with the situation (entry's one reading). Kept only when it is one of the kinds this organisation may have. */
  @IsOptional()
  @IsString()
  kindOfWork?: string;

  @ApiProperty({ enum: GroundMoment })
  @IsEnum(GroundMoment)
  moment: GroundMoment;

  // PRIVATE (alignment) or SHARED (delivery). Immutable after creation. Omit to
  // take the family default: sensing scenarios (pulse, drift, crisis, realign)
  // default PRIVATE because their whole value is that nobody sees who said what.
  @ApiPropertyOptional({ enum: GroundMode, description: 'Alignment (PRIVATE) or delivery (SHARED). Cannot be changed later. Defaults per scenario family.' })
  @IsOptional()
  @IsEnum(GroundMode)
  mode?: GroundMode;

  @ApiPropertyOptional({ example: 90, description: 'Defaults per scenario if omitted' })
  @IsOptional()
  @IsInt()
  @Min(1)
  timelineDays?: number;

  @ApiPropertyOptional({ description: 'True when the check-in runs until the lead ends it. There is then no length and no planned last session.' })
  @IsOptional()
  @IsBoolean()
  runsUntilEnded?: boolean;

  @ApiPropertyOptional({ enum: Cadence })
  @IsOptional()
  @IsEnum(Cadence)
  cadence?: Cadence;

  @ApiPropertyOptional({ minimum: 0, maximum: 31, description: 'Anchor day. Weekly: 0=Sun..6=Sat. Monthly: 1-31 day of month.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  cadenceAnchorDay?: number;

  @ApiPropertyOptional({ type: [Number], description: 'Twice or more a week: the weekdays a weekly check-in meets on, 0=Sun..6=Sat.' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  cadenceDays?: number[];

  /**
   * Which days this team works, 0=Sun..6=Sat. Empty or absent means nobody said, and the date
   * maths leaves every date where the cadence put it. Never defaulted to Monday-Friday: that is
   * not a fact about the world, it is one region's office week.
   */
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true })
  workingDays?: number[];

  @ApiPropertyOptional({ description: 'Start date: when the first scheduled check-in opens (ISO)' })
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'End date: no new check-ins scheduled after this (ISO)' })
  @IsOptional()
  @IsString()
  endsAt?: string;

  @ApiPropertyOptional({ example: 'Alignment confirmed', description: 'Pre-agreed intended outcome, shown to both parties before session 1' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  resolutionState?: string;

  @ApiPropertyOptional({ example: 'We are three months into a new cofounder relationship...', description: "Initiator's opening brief written at ground creation" })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  brief?: string;

  @ApiPropertyOptional({ example: 50, description: 'Max participants via join link. Defaults to 4 for invite-only grounds, 100 for broadcast grounds.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  freeParticipantCap?: number;

  /** Optional contributor access code - grants a free ground when valid. */
  @ApiPropertyOptional({ example: 'COAMANA-2026', description: 'Contributor access code granting a free ground creation' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accessCode?: string;

  /**
   * "I am setting it up for others": the creator organises and reads the results, and is never asked
   * to check in. Sent by the wizard since it was built, but until now only `confirmLead` could apply
   * it, and `confirmLead` rejects a ground an admin created themselves - so it was silently lost.
   */
  @ApiPropertyOptional({ description: 'The creator administers this ground and gives no account of their own.' })
  @IsOptional()
  @IsBoolean()
  managingOnly?: boolean;
}
