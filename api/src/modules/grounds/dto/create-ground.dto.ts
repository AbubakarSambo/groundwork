import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsInt, Min, IsOptional, MaxLength, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GroundScenario, GroundMoment, Cadence } from '@prisma/client';

/** GW-69: contraindication screening answers for conflict-scenario grounds. */
export class ContraindicationAnswersDto {
  @ApiPropertyOptional({ description: 'Are there active legal proceedings related to this situation?' })
  @IsOptional()
  @IsBoolean()
  legalProceedings?: boolean;

  @ApiPropertyOptional({ description: 'Does anyone involved fear retaliation for participating?' })
  @IsOptional()
  @IsBoolean()
  fearOfRetaliation?: boolean;

  @ApiPropertyOptional({ description: 'Has a decision already been made and is this process performative?' })
  @IsOptional()
  @IsBoolean()
  decisionAlreadyMade?: boolean;
}

export class CreateGroundDto {
  @ApiProperty({ example: 'New cofounder - Ada' })
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

  @ApiPropertyOptional({ example: 90, description: 'Defaults per scenario if omitted' })
  @IsOptional()
  @IsInt()
  @Min(1)
  timelineDays?: number;

  @ApiPropertyOptional({ enum: Cadence })
  @IsOptional()
  @IsEnum(Cadence)
  cadence?: Cadence;

  @ApiPropertyOptional({ minimum: 0, maximum: 31, description: 'Anchor day. Weekly: 0=Sun..6=Sat. Monthly: 1-31 day of month.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  cadenceAnchorDay?: number;

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

  /** GW-69: contraindication screening for DRIFT / RECOGNITION / CRISIS_ALIGNMENT. */
  @ApiPropertyOptional({ type: ContraindicationAnswersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContraindicationAnswersDto)
  contraindicationAnswers?: ContraindicationAnswersDto;

  /** Optional contributor access code - grants a free ground when valid. */
  @ApiPropertyOptional({ example: 'COAMANA-2026', description: 'Contributor access code granting a free ground creation' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accessCode?: string;
}
