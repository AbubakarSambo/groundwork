import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { AT_LEAST, A_NUMBER_OR_A_SYMBOL, TOO_SHORT, NO_NUMBER_OR_SYMBOL } from '../the-password-rules';

export class SetPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsNotEmpty()
  @IsString()
  /* The prototype's rules, Hafsah's decision of 26 September. See the-password-rules.ts; "not
     your email address" is checked in the service, which knows the address. */
  @MinLength(AT_LEAST, { message: TOO_SHORT })
  @MaxLength(100)
  @Matches(A_NUMBER_OR_A_SYMBOL, { message: NO_NUMBER_OR_SYMBOL })
  password: string;
}
