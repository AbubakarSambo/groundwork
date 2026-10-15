import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  token: string;

  /**
   * "WHERE DO YOU WORK?" BEFORE THE ACCOUNT EXISTS (U.3 review). When the confirmed address matches
   * an organisation that lets its domain join, or the invite link they came from could not take them,
   * the first answer asks where they work and makes nothing. The second answer carries the choice:
   * the organisation to join (only one that was offered), or `createMyOwn`.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  joinOrganizationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  createMyOwn?: boolean;

  /**
   * The key the browser that signed up was given with a password (U.3 review, a security fix). Only
   * with it is that password put on the account; without it, the person chooses one afterwards.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  passwordKey?: string;
}
