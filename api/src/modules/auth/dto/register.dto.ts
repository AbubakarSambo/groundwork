import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { AT_LEAST, A_NUMBER_OR_A_SYMBOL, TOO_SHORT, NO_NUMBER_OR_SYMBOL } from '../the-password-rules';

export class RegisterDto {
  @ApiPropertyOptional({ example: 'CleanTex' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  organizationName?: string;

  @ApiProperty({ example: 'amina@cleantex.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Amina' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Abdullahi' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsNotEmpty()
  @IsString()
  /* The prototype's rules, Hafsah's decision of 26 September. See the-password-rules.ts; "not
     your email address" is checked in the service, which knows the address. */
  @MinLength(AT_LEAST, { message: TOO_SHORT })
  @MaxLength(100)
  @Matches(A_NUMBER_OR_A_SYMBOL, { message: NO_NUMBER_OR_SYMBOL })
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  _hp?: string;
}
