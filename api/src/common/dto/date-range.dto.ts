import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DateRangeDto {
  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
