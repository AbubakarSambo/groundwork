import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

/** The two settings under "Who can join" on People (Hafsah, 21 November 2026). A class, so Nest validates it. */
export class HowPeopleAreAddedDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'guestsMayJoin must be true or false.' })
  guestsMayJoin?: boolean;

  @ApiPropertyOptional({ enum: ['ADMINS', 'ANYONE'] })
  @IsOptional()
  @IsIn(['ADMINS', 'ANYONE'], { message: 'whoMayAddPeople must be ADMINS or ANYONE.' })
  whoMayAddPeople?: 'ADMINS' | 'ANYONE';
}
