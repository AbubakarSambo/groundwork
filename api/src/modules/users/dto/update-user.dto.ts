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


  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * THEIR WHATSAPP NUMBER, SET BY AN ADMIN.
   *
   * A person can add their own under Settings, and most will not. Somebody rolling WhatsApp out to
   * a field team has the numbers already, in the same list they used to invite everybody, and had
   * no way to put them in: the only routes were SCIM, POST /people, or asking each person to type
   * their own. So the team that most needs checking in by message was the team least likely to.
   *
   * An empty string clears it. Nullable rather than absent, because "remove this number" and "do
   * not touch this number" are different instructions and a form sends both as a blank box.
   */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string | null;
}
