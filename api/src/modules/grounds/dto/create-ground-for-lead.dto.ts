import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsEnum, IsInt, Min, IsOptional, MaxLength, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { GroundScenario, GroundMoment, Cadence } from '@prisma/client';

export class PreAddedParticipantDto {
  @ApiProperty({ example: 'ada@acme.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Field officer' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  roleAsDescribed?: string;
}

/** Admin-initiated ground creation: the admin sets it up, a Lead is invited to
 * run it (become the initiator once they confirm). Distinct from the normal
 * self-serve CreateGroundDto, where the caller is always the initiator. */
export class CreateGroundForLeadDto {
  @ApiProperty({ example: 'eng-lead@acme.com' })
  @IsEmail()
  leadEmail: string;

  @ApiPropertyOptional({ example: 'Priya' })
  @IsOptional()
  @IsString()
  leadName?: string;

  @ApiProperty({ example: 'Q3 engineering alignment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;

  @ApiProperty({ enum: GroundScenario })
  @IsEnum(GroundScenario)
  scenario: GroundScenario;

  @ApiProperty({ enum: GroundMoment })
  @IsEnum(GroundMoment)
  moment: GroundMoment;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  timelineDays?: number;

  @ApiPropertyOptional({ enum: Cadence })
  @IsOptional()
  @IsEnum(Cadence)
  cadence?: Cadence;

  @ApiPropertyOptional({ minimum: 0, maximum: 31 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cadenceAnchorDay?: number;

  @ApiPropertyOptional({ example: 'Review the codebase and development process this quarter.', description: "Admin-authored context - the lead can review and edit it before confirming" })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  brief?: string;

  @ApiPropertyOptional({ description: 'Start date: when the first scheduled check-in opens (ISO)' })
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'End date: no new check-ins scheduled after this (ISO)' })
  @IsOptional()
  @IsString()
  endsAt?: string;

  @ApiPropertyOptional({ type: [PreAddedParticipantDto], description: 'Participants to add now (e.g. the whole team/cohort), invited immediately alongside the lead' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreAddedParticipantDto)
  participants?: PreAddedParticipantDto[];
}
