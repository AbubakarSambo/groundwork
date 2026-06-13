import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class MemberSigninDto {
  @ApiProperty({ example: 'kwame@company.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
