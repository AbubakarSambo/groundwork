import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsEnum, IsBoolean } from 'class-validator';
import { CompanyStage } from '@prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) jobTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) orgName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) orgSlug?: string;
  @ApiPropertyOptional({ enum: CompanyStage }) @IsOptional() @IsEnum(CompanyStage) companyStage?: CompanyStage;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailNotifications?: boolean;
  @ApiPropertyOptional({ description: 'WhatsApp number in any format; normalized to E.164 on save. Pass null to clear.' })
  @IsOptional() @IsString() @MaxLength(30) phoneNumber?: string | null;
}
