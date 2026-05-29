import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsInt, Min, IsOptional, MaxLength } from 'class-validator';
import { GroundScenario, GroundMoment, Cadence } from '@prisma/client';

export class CreateGroundDto {
  @ApiProperty({ example: 'New cofounder — Ada' })
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
}
