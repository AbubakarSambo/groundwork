import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';

/**
 * YOUR OWN PROFILE, AND NOTHING OF THE ORGANISATION'S (U.3, Hafsah, 26 September).
 *
 * This used to take the organisation's name, contact email, slug and stage too, from any signed-in
 * person, with no role check: a member or a guest could rename the company. They are gone from here,
 * and the global ValidationPipe (forbidNonWhitelisted) now refuses them. PATCH /users/organization,
 * for admins only, is the one way to change the organisation.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) jobTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() emailNotifications?: boolean;
  @ApiPropertyOptional({ description: 'WhatsApp number in any format; normalized to E.164 on save. Pass null to clear.' })
  @IsOptional() @IsString() @MaxLength(30) phoneNumber?: string | null;
}
