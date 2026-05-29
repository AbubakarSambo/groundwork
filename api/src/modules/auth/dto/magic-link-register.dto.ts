import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class MagicLinkRegisterDto {
  @ApiProperty({ example: 'CleanTex' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  organizationName: string;

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

  @ApiProperty({ example: 'amina@cleantex.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  _hp?: string;
}
