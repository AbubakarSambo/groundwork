import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsEnum,
  IsBoolean,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { Role } from '../../../common';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'user@cleantex.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'NewSecurePass123!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain at least 1 uppercase and 1 lowercase letter',
  })
  password?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  /**
   * NAMED AS SOMEBODY WHO MAY OPEN A CHECK-IN.
   *
   * Separate from `role` and deliberately so: a named lead runs check-ins for their own team and
   * has no admin powers. Making it a third role would hand them the organisation.
   */
  @ApiPropertyOptional({ description: 'Whether this person may open check-ins' })
  @IsOptional()
  @IsBoolean()
  mayOpenCheckIns?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
